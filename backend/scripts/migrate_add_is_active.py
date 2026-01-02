"""
One-time migration script to add is_active: true to all existing collections.

Run from the backend directory:
    python scripts/migrate_add_is_active.py
"""

import os
import sys
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def migrate_collections():
    """Add is_active: true to all collections that don't have the field."""
    
    # Initialize Firebase if not already initialized
    if not firebase_admin._apps:
        service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', './firebase-service-account.json')
        
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
        else:
            abs_path = os.path.join(os.getcwd(), 'firebase-service-account.json')
            if os.path.exists(abs_path):
                cred = credentials.Certificate(abs_path)
            else:
                print(f"ERROR: Firebase service account file not found at: {service_account_path} or {abs_path}")
                return
        
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # Get all collections
    collections_ref = db.collection('collections')
    docs = collections_ref.stream()
    
    updated_count = 0
    skipped_count = 0
    
    for doc in docs:
        data = doc.to_dict()
        
        # Check if is_active field exists
        if 'is_active' not in data:
            # Add is_active: true
            doc.reference.update({
                'is_active': True,
                'updated_at': datetime.utcnow()
            })
            print(f"✓ Updated collection: {doc.id} ({data.get('name', 'unnamed')})")
            updated_count += 1
        else:
            print(f"- Skipped collection: {doc.id} (already has is_active: {data['is_active']})")
            skipped_count += 1
    
    print(f"\n=== Migration Complete ===")
    print(f"Updated: {updated_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Total: {updated_count + skipped_count}")

if __name__ == '__main__':
    print("Starting migration: Adding is_active field to collections...\n")
    migrate_collections()
