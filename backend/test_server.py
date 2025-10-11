"""Test server to verify storage routes are loading"""
from app.main import app
import json

# Get all routes
routes = []
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        routes.append({
            'path': route.path,
            'methods': list(route.methods) if route.methods else []
        })

# Check for storage routes
storage_routes = [r for r in routes if '/storage-test' in r['path']]

print("=" * 50)
print("STORAGE TEST ROUTES:")
print("=" * 50)
if storage_routes:
    for route in storage_routes:
        print(f"  {route['methods'][0] if route['methods'] else 'GET':6} {route['path']}")
else:
    print("  NO STORAGE ROUTES FOUND!")

print("\n" + "=" * 50)
print("ALL ROUTES:")
print("=" * 50)
for route in routes:
    if route['methods']:
        print(f"  {route['methods'][0]:6} {route['path']}")
