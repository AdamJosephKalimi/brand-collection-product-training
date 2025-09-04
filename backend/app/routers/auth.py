from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..utils.auth import get_current_user, get_optional_user
from ..services.firebase_service import firebase_service
from ..models.user import UserResponse, UserCreate, UserUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

class TokenResponse(BaseModel):
    """Response model for token verification"""
    valid: bool
    user: Optional[UserResponse] = None
    message: str

class LoginResponse(BaseModel):
    """Response model for login"""
    success: bool
    user: UserResponse
    message: str

@router.get("/test-firebase")
async def test_firebase_connection():
    """Test Firebase connection"""
    try:
        # Test Firestore connection
        test_doc = firebase_service.db.collection('test').document('connection')
        test_doc.set({'timestamp': 'test', 'status': 'connected'})
        
        # Test reading back
        doc = test_doc.get()
        if doc.exists:
            # Clean up test document
            test_doc.delete()
            return {
                "status": "success",
                "message": "Firebase connection successful",
                "firestore": "connected",
                "storage": "available"
            }
        else:
            raise Exception("Failed to read test document")
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Firebase connection failed: {str(e)}"
        )

@router.post("/verify-token", response_model=TokenResponse)
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Firebase ID token"""
    try:
        user_info = await firebase_service.verify_token(credentials.credentials)
        
        if not user_info:
            return TokenResponse(
                valid=False,
                message="Invalid or expired token"
            )
        
        # Get or create user in Firestore
        user_data = await firebase_service.get_user(user_info['uid'])
        
        if not user_data:
            # Create new user
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
        
        user_response = UserResponse(
            uid=user_data['uid'],
            email=user_data['email'],
            display_name=user_data.get('display_name'),
            photo_url=user_data.get('photo_url'),
            created_at=user_data.get('created_at'),
            subscription_tier=user_data.get('subscription_tier', 'free'),
            is_active=user_data.get('is_active', True)
        )
        
        return TokenResponse(
            valid=True,
            user=user_response,
            message="Token verified successfully"
        )
        
    except Exception as e:
        return TokenResponse(
            valid=False,
            message=f"Token verification failed: {str(e)}"
        )

@router.post("/login", response_model=LoginResponse)
async def login(user: Dict[str, Any] = Depends(get_current_user)):
    """Login endpoint that returns user data"""
    try:
        user_response = UserResponse(
            uid=user['uid'],
            email=user['email'],
            display_name=user.get('display_name'),
            photo_url=user.get('photo_url'),
            created_at=user.get('created_at'),
            subscription_tier=user.get('subscription_tier', 'free'),
            is_active=user.get('is_active', True)
        )
        
        return LoginResponse(
            success=True,
            user=user_response,
            message="Login successful"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        uid=user['uid'],
        email=user['email'],
        display_name=user.get('display_name'),
        photo_url=user.get('photo_url'),
        created_at=user.get('created_at'),
        subscription_tier=user.get('subscription_tier', 'free'),
        is_active=user.get('is_active', True)
    )

@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    update_data: UserUpdate,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Update current user profile"""
    try:
        # Prepare update data
        update_dict = {}
        if update_data.display_name is not None:
            update_dict['display_name'] = update_data.display_name
        if update_data.photo_url is not None:
            update_dict['photo_url'] = update_data.photo_url
        if update_data.preferences is not None:
            update_dict['preferences'] = update_data.preferences
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid update data provided"
            )
        
        # Update user in Firestore
        success = await firebase_service.update_user(user['uid'], update_dict)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user profile"
            )
        
        # Get updated user data
        updated_user = await firebase_service.get_user(user['uid'])
        
        return UserResponse(
            uid=updated_user['uid'],
            email=updated_user['email'],
            display_name=updated_user.get('display_name'),
            photo_url=updated_user.get('photo_url'),
            created_at=updated_user.get('created_at'),
            subscription_tier=updated_user.get('subscription_tier', 'free'),
            is_active=updated_user.get('is_active', True)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile update failed: {str(e)}"
        )
