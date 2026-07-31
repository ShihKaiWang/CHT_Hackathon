"""
資料載入層 — 讀取中華電信 5 個官方資料檔案
適配真實資料格式
"""
import json
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


class DataStore:
    """單例資料快取"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance

    def load(self):
        if self._loaded:
            return

        # 1. city_traffic_flow.csv
        self.traffic_df = pd.read_csv(DATA_DIR / "city_traffic_flow.csv")

        # 2. signaling_crowd_density.csv
        self.crowd_df = pd.read_csv(DATA_DIR / "signaling_crowd_density.csv")

        # 3. road_network_geometry.json（真實格式是陣列）
        with open(DATA_DIR / "road_network_geometry.json", "r", encoding="utf-8") as f:
            raw = json.load(f)
        # 相容兩種格式：陣列 或 {roads: [...]}
        if isinstance(raw, list):
            self.road_network = raw
        else:
            self.road_network = raw.get("roads", raw)

        # 4. emergency_traffic_sop.txt
        with open(DATA_DIR / "emergency_traffic_sop.txt", "r", encoding="utf-8") as f:
            self.sop_text = f.read()

        # 5. live_incidents.json
        with open(DATA_DIR / "live_incidents.json", "r", encoding="utf-8") as f:
            self.incidents = json.load(f)

        self._loaded = True

    def reload(self):
        """重新讀取資料"""
        self._loaded = False
        self.load()

    # ============ 車流資料 ============

    def get_traffic_timeseries(self) -> dict:
        """轉換為前端需要的時序格式"""
        df = self.traffic_df
        timestamps = sorted(df["Timestamp"].unique())

        # 取前 5 個最常出現的路段作為折線圖
        top_roads = df["Road_Name"].value_counts().head(5).index.tolist()
        road_labels = {}
        labels = "ABCDE"
        for i, name in enumerate(top_roads):
            road_labels[name] = f"路段{labels[i]}_{name}"

        flow = []
        for ts in timestamps:
            time_str = ts.split(" ")[1] if " " in ts else ts
            row = {"time": time_str}
            subset = df[df["Timestamp"] == ts]
            for name, label in road_labels.items():
                match = subset[subset["Road_Name"] == name]
                if not match.empty:
                    row[label] = int(match.iloc[0]["Vehicle_Count"])
                # 缺值不放入（前端 Recharts 會自動跳過 undefined）
            flow.append(row)

        # 飽和度用資料最完整的時間點（路段最多的）
        ts_counts = df.groupby("Timestamp").size()
        best_ts = ts_counts.idxmax()
        best_data = df[df["Timestamp"] == best_ts]
        saturation = []
        for _, r in best_data.iterrows():
            sat = float(r["Saturation_Score"])
            status = "critical" if sat >= 0.95 else "warning" if sat >= 0.85 else "normal"
            saturation.append({
                "id": r["Segment_ID"],
                "name": r["Road_Name"],
                "saturation": round(sat, 3),
                "status": status,
            })

        return {"flow": flow, "saturation": saturation}

    def get_latest_traffic(self) -> list:
        """取得最新時間點的車流資料"""
        df = self.traffic_df
        latest_ts = df["Timestamp"].max()
        latest = df[df["Timestamp"] == latest_ts]
        return latest.to_dict(orient="records")

    def get_alerts(self) -> list:
        """依據最嚴重時間點的飽和度 + 事件產出告警列表"""
        df = self.traffic_df

        # 取路段最多的時間點（代表事件高峰期）
        ts_counts = df.groupby("Timestamp").size()
        peak_ts = ts_counts.idxmax()
        peak_data = df[df["Timestamp"] == peak_ts]

        alerts = []
        alert_id = 1
        time_str = peak_ts.split(" ")[1] if " " in peak_ts else "22:45"

        for _, r in peak_data.iterrows():
            sat = float(r["Saturation_Score"])
            if sat >= 0.95:
                alerts.append({
                    "id": alert_id,
                    "time": time_str,
                    "type": "saturation",
                    "level": "critical",
                    "message": f"{r['Road_Name']}飽和度達 {int(sat*100)}%（A 級癱瘓）",
                    "road": r["Road_Name"],
                })
                alert_id += 1
            elif sat >= 0.85:
                alerts.append({
                    "id": alert_id,
                    "time": time_str,
                    "type": "saturation",
                    "level": "warning",
                    "message": f"{r['Road_Name']}飽和度 {int(sat*100)}%（B 級壅擠）",
                    "road": r["Road_Name"],
                })
                alert_id += 1

        # 事件型告警（使用事件本身的時間）
        for inc in self.incidents:
            inc_time = inc["timestamp"].split(" ")[1] if " " in inc["timestamp"] else "22:10"
            alerts.append({
                "id": alert_id,
                "time": inc_time,
                "type": "incident",
                "level": "critical" if inc.get("severity") in ["Critical", "High"] else "warning",
                "message": f"{inc['location']}：{inc['description'][:40]}",
                "road": inc.get("location", "")[:15],
            })
            alert_id += 1

        # 按時間排序（最新在前）
        alerts.sort(key=lambda x: x["time"], reverse=True)
        return alerts

    # ============ 基地台信令 ============

    def get_multilang_report(self) -> dict:
        """檢查漫遊率，產出多語通報"""
        df = self.crowd_df

        # Roaming_User_Pct 可能是 "5%" 字串或數字
        def parse_roaming(val):
            if isinstance(val, str):
                return float(val.replace("%", "")) / 100
            return float(val)

        df_copy = df.copy()
        df_copy["roaming_float"] = df_copy["Roaming_User_Pct"].apply(parse_roaming)
        max_roaming = float(df_copy["roaming_float"].max())
        triggered = max_roaming >= 0.30

        # 找到最高漫遊率的站點
        max_row = df_copy.loc[df_copy["roaming_float"].idxmax()]

        reports = {
            "zh": f"⚠️ 交通通報：光復南路與忠孝東路口因路面塌陷暫時封閉，請改走市民大道或仁愛路。預計修復時間約 60 分鐘。",
            "en": "⚠️ Traffic Alert: Guangfu S. Rd / Zhongxiao E. Rd intersection closed due to road collapse. Please use Civic Blvd or Ren-ai Rd. Estimated repair: 60 min.",
            "ja": "⚠️ 交通情報：光復南路と忠孝東路の交差点は路面陥没のため通行止めです。市民大道または仁愛路をご利用ください。復旧見込み：60分。",
            "ko": "⚠️ 교통 안내: 광복남로/중효동로 교차로가 도로 함몰로 폐쇄되었습니다. 시민대도 또는 런아이로로 우회해 주세요. 복구 예상: 60분.",
        }

        if not triggered:
            reports = {"zh": reports["zh"]}

        return {
            "roaming_rate": round(max_roaming, 2),
            "triggered": triggered,
            "trigger_station": str(max_row.get("Location_Name", "")),
            "reports": reports,
        }

    # ============ 路網 ============

    def find_road_by_id(self, segment_id: str) -> dict | None:
        """依 segment_id 查找"""
        for road in self.road_network:
            if road.get("segment_id") == segment_id:
                return road
        return None

    def find_road_by_name(self, name: str) -> dict | None:
        """依路段名稱查找"""
        for road in self.road_network:
            if road.get("name") and (road["name"] in name or name in road["name"]):
                return road
        return None

    def get_road_name_by_id(self, segment_id: str) -> str:
        """ID 轉名稱"""
        road = self.find_road_by_id(segment_id)
        return road["name"] if road else segment_id

    def get_alternatives_by_id(self, segment_id: str) -> list:
        """取得某路段的替代路線（回傳完整資料）"""
        road = self.find_road_by_id(segment_id)
        if not road:
            return []
        alt_ids = road.get("alternatives", [])
        result = []
        for alt_id in alt_ids:
            alt_road = self.find_road_by_id(alt_id)
            if alt_road:
                result.append(alt_road)
        return result


# 全域實例
data_store = DataStore()
data_store.load()
