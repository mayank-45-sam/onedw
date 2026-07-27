import sys
sys.path.insert(0, '.')
from main import app

schema = app.openapi()
info = schema['info']
print(f"OpenAPI: {info['title']}")
paths = [p for p in schema['paths'] if '/auth' in p or '/users' in p]
print(f'Auth/Users endpoints: {len(paths)}')
for p in sorted(paths):
    methods = list(schema['paths'][p].keys())
    print(f'  {p}: {methods}')

all_paths = sorted(schema['paths'].keys())
print(f'\nAll endpoints: {len(all_paths)}')
for p in all_paths:
    methods = list(schema['paths'][p].keys())
    print(f'  {p}: {methods}')

print('\nREGISTRATION: OK')
