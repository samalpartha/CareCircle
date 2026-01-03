#!/bin/bash
echo "🧪 Testing CareCircle API..."
echo ""

TOKEN="eyJraWQiOiJQUUlmMHJYT0tZRkR0OW51eklcL0JnOXhMWEVcL2hvbVhRQWxVcG9DNllhNzg9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJkNDA4NTRhOC1iMGMxLTcwZjgtYjQ0Ny0wODExOWI0ODdmYTYiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tXC91cy1lYXN0LTFfeFFkMWp3OW5WIiwiY29nbml0bzp1c2VybmFtZSI6InNhbWFscGFydGhhIiwicHJlZmVycmVkX3VzZXJuYW1lIjoic2FtYWxwYXJ0aGEiLCJvcmlnaW5fanRpIjoiZWE3OWU3NGMtNDcwOS00ZjgwLWFkNTctZTFiYmEyN2NiOTAzIiwiYXVkIjoiM2ZucGZvcWczZjJ2ZXZwZnFxdHQ5cnF1aTAiLCJldmVudF9pZCI6Ijc3YTdmMTQ3LWY2YzUtNDEzNi05MDhjLWY0YTEyMTc3OGEwNiIsImN1c3RvbTpsYW5ndWFnZSI6IkVuZ2xpc2giLCJ0b2tlbl91c2UiOiJpZCIsImN1c3RvbTp6aXBjb2RlIjoiMDYwNjciLCJhdXRoX3RpbWUiOjE3NjY4NzA4NTYsImV4cCI6MTc2Njg3NDQ1NiwiaWF0IjoxNzY2ODcwODU2LCJqdGkiOiI3YzE5YmRkNC05ZmRmLTQ0Y2ItYjJlNS1iMjJlYjZjODE3YWMiLCJlbWFpbCI6InNhbWFscGFydGhhQGdtYWlsLmNvbSJ9.IwMcSDHAYcwKVyJac5QWXFoGrhdws7qlgWt2moXeWdzihNtyzSqI0rKaYSjNwviQzrvjduhTi6k-qwhOwmFfbQCCWd-XsAph90KfAX9fL4a7e-FKTZTz7WPva1MfmQwBMnHZOlLH8QjsREEI47bhT_0IiPoPJlwiKZjWhwJTcgJgwnjwh3BkhBUW95osI9RgNvSLAua2c4WcdOaS2ov8yRBtqDl7wlSUl4uLfYOKewv3Q1uTan3dcX-xAeoUY8F_NojWFJ9Eq-zPMUiLk939WKuk-9nhalISFmiOHEaZlXN307JabmaC8txLbN8dnuKhG3Z_EFrRHEL7ckLKW3YnNQ"

echo "Test 1: GET /alerts"
curl -s -X GET "https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod/alerts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP: %{http_code}\n\n"

echo "Test 2: GET /tasks"
curl -s -X GET "https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP: %{http_code}\n\n"

echo "Test 3: POST /analyze/transcript"
curl -s -X POST "https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod/analyze/transcript" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transcript":"I feel dizzy","duration":10,"language":"en"}' \
  -w "\nHTTP: %{http_code}\n\n"

echo "✅ Testing complete!"





