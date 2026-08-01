@echo off
aws ssm put-parameter --name /cht-hackathon/jwt-secret --value cht9secretjwt2026hackathon --type SecureString --overwrite --region us-east-1
aws ssm put-parameter --name /cht-hackathon/dispatch-pin --value 0000 --type SecureString --overwrite --region us-east-1
aws ssm put-parameter --name /cht-hackathon/bedrock-model-id --value us.anthropic.claude-haiku-4-5-20251001-v1:0 --type String --overwrite --region us-east-1
aws ssm put-parameter --name /cht-hackathon/sns-topic-arn --value arn:aws:sns:us-east-1:714134783639:cht-hackathon-alerts --type String --overwrite --region us-east-1
echo Done!
