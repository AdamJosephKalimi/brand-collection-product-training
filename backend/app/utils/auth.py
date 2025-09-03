from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from ..services.firebase_service import firebase_service

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user from Firebase token
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    
    # Verify the Firebase ID token
    user_info = await firebase_service.verify_token(credentials.credentials)
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Get or create user in Firestore
    user_data = await firebase_service.get_user(user_info['uid'])
    
    if not user_data:
        # Create new user if doesn't exist
        new_user_data = {
            'uid': user_info['uid'],
            'email': user_info['email'],
            'display_name': user_info.get('name'),
            'photo_url': user_info.get('picture'),
            'is_active': True,
            'subscription_tier': 'free'
        }
        
        success = await firebase_service.create_user(user_info['uid'], new_user_data)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        user_data = new_user_data
    
    return user_data

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
    """
    Optional dependency to get current user (returns None if not authenticated)
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
