import json
from decimal import Decimal
import boto3
from boto3.dynamodb.types import TypeSerializer

kg = {"plastic": 2.0, "wet": 0.0, "ewaste": 1.0}
item = {"est": kg, "other": [1.5, 2]}

item_for_db = json.loads(json.dumps(item), parse_float=Decimal)

serializer = TypeSerializer()
try:
    print(serializer.serialize(item_for_db))
except Exception as e:
    print("Error:", e)
