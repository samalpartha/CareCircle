import sys
import os
import json
from unittest.mock import MagicMock

# Mock modules
sys.modules['boto3'] = MagicMock()
sys.modules['boto3.dynamodb.conditions'] = MagicMock()

# Add module to path
sys.path.append('/Users/psama0214/Hackathon-New/CareCircle/backend/functions/api-handlers')

try:
    import app
    from importlib import reload
    reload(app)
    print("Import successful")
except ImportError as e:
    print(f"Import failed: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error during import: {e}")
    sys.exit(1)

# Test event for Get Tasks
event = {
    'httpMethod': 'GET',
    'path': '/tasks',
    'requestContext': {'authorizer': {'claims': {'sub': 'test-user'}}},
}

# Mock DynamoDB response
mock_table = app.table
mock_table.query.return_value = {'Items': []}

try:
    response = app.lambda_handler(event, None)
    print(f"Handler executing successfully. Response Status: {response['statusCode']}")
    if response['statusCode'] != 200:
        print(f"Response Body: {response['body']}")
except Exception as e:
    print(f"Handler execution failed: {e}")
    sys.exit(1)
