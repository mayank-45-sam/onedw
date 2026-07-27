import urllib.request
import json

url = 'http://localhost:8000/api/v1/categories'
with urllib.request.urlopen(url, timeout=10) as response:
    body = response.read().decode('utf-8')
    data = json.loads(body)
    print(json.dumps(data, indent=2))
