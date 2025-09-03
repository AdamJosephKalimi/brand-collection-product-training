import os
import json
from typing import Optional, Dict, Any, List
import firebase_admin
from firebase_admin import credentials, firestore, auth, storage
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime

class FirebaseService:
    """Firebase service for authentication and Firestore operations"""
    
    def __init__(self):
        self._db = None
        self._bucket = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        if not firebase_admin._apps:
            # Check if running in development with service account file
            service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
            
            if service_account_path and os.path.exists(service_account_path):
                # Use service account file
                cred = credentials.Certificate(service_account_path)
            else:
                # Use environment variables
                service_account_info = {
                    "type": "service_account",
                    "project_id": os.getenv('FIREBASE_PROJECT_ID'),
                    "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
                    "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
                    "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
                    "client_id": os.getenv('FIREBASE_CLIENT_ID'),
                    "auth_uri": os.getenv('FIREBASE_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
                    "token_uri": os.getenv('FIREBASE_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
                    "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL', 'https://www.googleapis.com/oauth2/v1/certs'),
                    "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
                }
                cred = credentials.Certificate(service_account_info)
            
            firebase_admin.initialize_app(cred, {
                'storageBucket': f"{os.getenv('FIREBASE_PROJECT_ID')}.appspot.com"
            })
        
        self._db = firestore.client()
        self._bucket = storage.bucket()
    
    @property
    def db(self):
        """Get Firestore database client"""
        return self._db
    
    @property
    def bucket(self):
        """Get Firebase Storage bucket"""
        return self._bucket
    
    async def verify_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """Verify Firebase ID token and return user info"""
        try:
            decoded_token = auth.verify_id_token(id_token)
            return {
                'uid': decoded_token['uid'],
                'email': decoded_token.get('email'),
                'name': decoded_token.get('name'),
                'picture': decoded_token.get('picture')
            }
        except Exception as e:
            print(f"Token verification failed: {e}")
            return None
    
    async def get_user(self, uid: str) -> Optional[Dict[str, Any]]:
        """Get user document from Firestore"""
        try:
            doc_ref = self._db.collection('users').document(uid)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    async def create_user(self, uid: str, user_data: Dict[str, Any]) -> bool:
        """Create user document in Firestore"""
        try:
            user_data['created_at'] = datetime.now()
            user_data['updated_at'] = datetime.now()
            self._db.collection('users').document(uid).set(user_data)
            return True
        except Exception as e:
            print(f"Error creating user: {e}")
            return False
    
    async def update_user(self, uid: str, user_data: Dict[str, Any]) -> bool:
        """Update user document in Firestore"""
        try:
            user_data['updated_at'] = datetime.now()
            self._db.collection('users').document(uid).update(user_data)
            return True
        except Exception as e:
            print(f"Error updating user: {e}")
            return False
    
    async def get_user_brands(self, uid: str) -> List[Dict[str, Any]]:
        """Get all brands for a user"""
        try:
            brands_ref = self._db.collection('brands')
            query = brands_ref.where(filter=FieldFilter('user_id', '==', uid))
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            print(f"Error getting user brands: {e}")
            return []
    
    async def get_brand_collections(self, brand_id: str) -> List[Dict[str, Any]]:
        """Get all collections for a brand"""
        try:
            collections_ref = self._db.collection('collections')
            query = collections_ref.where(filter=FieldFilter('brand_id', '==', brand_id))
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            print(f"Error getting brand collections: {e}")
            return []

# Global Firebase service instance
firebase_service = FirebaseService()
