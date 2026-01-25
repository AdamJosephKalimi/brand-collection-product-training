#!/usr/bin/env python3
"""Temporary script to inspect line sheet documents in Firestore"""
import firebase_admin
from firebase_admin import credentials, firestore
import os

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate('firebase-service-account.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

# The two line sheet document IDs from user
doc_ids = [
    'c0ca5cab-0dfe-4d16-b513-5d5b7c14956a',
    '71f51e67-ba65-4532-b06a-9bd5947920f6'
]

print("Searching for line sheet documents...")

# Find collections that contain these documents
collections_ref = db.collection('collections')
for col_doc in collections_ref.stream():
    col_id = col_doc.id
    docs_ref = col_doc.reference.collection('documents')
    
    for doc_id in doc_ids:
        doc = docs_ref.document(doc_id).get()
        if doc.exists:
            data = doc.to_dict()
            print(f'\n{"="*60}')
            print(f'Document ID: {doc_id}')
            print(f'Collection ID: {col_id}')
            print(f'Name: {data.get("name")}')
            print(f'Type: {data.get("type")}')
            print(f'{"="*60}')
            
            # Check for structured_products
            if 'structured_products' in data:
                sp = data['structured_products']
                print(f'structured_products exists: YES')
                print(f'Type: {type(sp).__name__}')
                print(f'Count: {len(sp) if sp else 0}')
                if sp and len(sp) > 0:
                    print(f'\nFirst 5 SKUs:')
                    for i, p in enumerate(sp[:5]):
                        if isinstance(p, dict):
                            print(f'  {i+1}. {p.get("sku", "NO SKU FIELD")}')
            else:
                print(f'structured_products exists: NO')
                # Check for similar field names
                print(f'\nAll top-level fields:')
                for key in sorted(data.keys()):
                    val = data[key]
                    if isinstance(val, list):
                        print(f'  {key}: list[{len(val)}]')
                    elif isinstance(val, dict):
                        print(f'  {key}: dict')
                    else:
                        print(f'  {key}: {type(val).__name__}')

print("\n\nDone.")
