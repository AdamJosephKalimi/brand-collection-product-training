from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserProfile(BaseModel):
    """User profile data model"""
    uid: str = Field(..., description="Firebase user ID")
    email: EmailStr = Field(..., description="User email address")
    display_name: Optional[str] = Field(None, description="User display name")
    photo_url: Optional[str] = Field(None, description="User profile photo URL")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(default=True)
    subscription_tier: str = Field(default="free", description="User subscription tier")
    preferences: Dict[str, Any] = Field(default_factory=dict)

class UserCreate(BaseModel):
    """Model for creating a new user"""
    email: EmailStr
    display_name: Optional[str] = None
    photo_url: Optional[str] = None

class UserUpdate(BaseModel):
    """Model for updating user profile"""
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

class UserResponse(BaseModel):
    """User response model for API responses"""
    uid: str
    email: str
    display_name: Optional[str]
    photo_url: Optional[str]
    created_at: datetime
    subscription_tier: str
    is_active: bool
