"""
SOP 規則引擎 — 依據中華電信真實 SOP 7 條規則
"""
from services.data_loader import data_store


# SOP 第 1 條：交通擁塞級別判定
def classify_event(saturation: float) -> str:
    """
    B 級 (壅擠)：0.85 <= Saturation_Score < 0.95
    A 級 (癱瘓)：Saturation_Score >= 0.95
    """
    if saturation >= 0.95:
        return "A"
    elif saturation >= 0.85:
        return "B"
    return "normal"


# SOP 第 2 條：車禍與路障應變 — 主疏散路徑
def get_evacuation_plan(segment_id: str) -> dict:
    """產出疏散方案"""
    road = data_store.find_road_by_id(segment_id)
    if not road:
        # 嘗試用名稱找
        road = data_store.find_road_by_name(segment_id)
    if not road:
        return {"error": f"找不到路段：{segment_id}"}

    # 取得替代路段
    alt_ids = road.get("alternatives", [])
    latest_traffic = data_store.get_latest_traffic()

    valid_alternatives = []
    excluded = []

    for alt_id in alt_ids:
        alt_road = data_store.find_road_by_id(alt_id)
        if not alt_road:
            continue

        # 查找該替代路段當前飽和度
        sat = 0.5  # 預設
        for t in latest_traffic:
            if t["Segment_ID"] == alt_id:
                sat = float(t["Saturation_Score"])
                break

        capacity = alt_road.get("capacity_vph", 1500)

        # 篩選：capacity >= 1000
        if capacity < 1000:
            excluded.append({"name": alt_road["name"], "id": alt_id, "reason": f"容量不足（{capacity} < 1000 vph）（SOP 第 2 條）", "saturation": round(sat, 3)})
            continue

        # 飽和度 >= 0.85 排除（SOP 第 1 條）
        if sat >= 0.85:
            excluded.append({"name": alt_road["name"], "id": alt_id, "reason": f"飽和度 {round(sat*100)}% ≥ 85% 閾值（SOP 第 1 條）", "saturation": round(sat, 3)})
            continue

        valid_alternatives.append({
            "id": alt_id,
            "name": alt_road["name"],
            "saturation": round(sat, 3),
            "capacity": capacity,
            "remaining": int(capacity * (1 - sat)),
            "congested": False,
        })

    # 排序：飽和度低的優先
    valid_alternatives.sort(key=lambda x: x["saturation"])

    return {
        "closed_road": road["name"],
        "closed_id": road.get("segment_id", ""),
        "intersections": road.get("intersections", []),
        "flow_direction": road.get("flow_direction", ""),
        "alternatives": valid_alternatives,
        "excluded": excluded,
    }


# SOP 第 3 條：捷運與接駁分流
def check_mrt_trigger() -> dict:
    """檢查 BS_MRT_BL17 是否觸發"""
    df = data_store.crowd_df
    bl17 = df[df["BS_ID"] == "BS_MRT_BL17"]
    if bl17.empty:
        return {"triggered": False}

    latest = bl17.iloc[-1]
    user_count = int(latest["User_Count"])
    growth_rate = float(latest["Growth_Rate"])

    triggered = growth_rate > 0.30 or user_count > 25000

    return {
        "triggered": triggered,
        "user_count": user_count,
        "growth_rate": growth_rate,
        "actions": [
            "建議北捷「過站不停」",
            "通知公車處調度接駁專車",
            "引導群眾步行至忠孝敦化站 (BS_MRT_BL16/BL18)",
        ] if triggered else [],
    }


# SOP 第 5 條：號誌故障應變
def get_signal_failure_plan(incident: dict) -> dict:
    """號誌故障派遣建議"""
    segment_id = incident.get("affected_segment", "")
    road = data_store.find_road_by_id(segment_id)
    road_name = road["name"] if road else incident.get("location", "未知路段")
    intersections = road.get("intersections", []) if road else []

    return {
        "road": road_name,
        "police_needed": len(intersections) * 2 if intersections else 2,
        "intersections": intersections,
        "cms_message": f"{road_name} 號誌故障，請依現場指揮通行",
    }


# SOP 第 6 條：多語化判定
def check_multilang_trigger() -> dict:
    """任一基地台 Roaming_User_Pct >= 30% 觸發"""
    return data_store.get_multilang_report()


# SOP 第 7 條：ETE 計算
def calculate_ete(severity: str, affected_roads: list = None) -> dict:
    """
    ETE_minutes = base_clearance + congestion_penalty
    base_clearance：Critical=60, High=40, Medium=20
    congestion_penalty = (受影響路段平均 Saturation - 0.5) × 60，< 0 以 0 計
    """
    base_map = {"Critical": 60, "High": 40, "Medium": 20, "A": 60, "B": 40}
    base = base_map.get(severity, 30)

    # 計算 congestion_penalty
    avg_sat = 0.5
    if affected_roads:
        latest = data_store.get_latest_traffic()
        sats = []
        for t in latest:
            if t["Segment_ID"] in affected_roads or t["Road_Name"] in affected_roads:
                sats.append(float(t["Saturation_Score"]))
        if sats:
            avg_sat = sum(sats) / len(sats)

    congestion_penalty = max(0, (avg_sat - 0.5) * 60)
    ete = base + congestion_penalty

    return {
        "base_clearance": base,
        "congestion_penalty": round(congestion_penalty, 1),
        "avg_saturation": round(avg_sat, 3),
        "ete_minutes": round(ete, 1),
        "formula": f"ETE = {base} + ({round(avg_sat,2)} - 0.5)×60 = {round(ete,1)} 分鐘",
    }
