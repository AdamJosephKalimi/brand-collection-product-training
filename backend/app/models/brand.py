from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SubscriptionTier(str, Enum):
    """Subscription tier levels"""
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class PresentationStyle(str, Enum):
    """Presentation style options"""
    MINIMAL = "minimal"
    BOLD = "bold"
    CLASSIC = "classic"
    MODERN = "modern"


class BrandColors(BaseModel):
    """Brand color palette"""
    primary: str = Field(..., description="Primary brand color hex")
    secondary: Optional[str] = Field(None, description="Secondary brand color hex")
    accent: Optional[str] = Field(None, description="Accent color hex")
    text: Optional[str] = Field("#2C3E50", description="Text color hex")
    background: Optional[str] = Field("#FFFFFF", description="Background color hex")


class Typography(BaseModel):
    """Brand typography settings"""
    heading_font: Optional[str] = Field("Playfair Display", description="Heading font family")
    body_font: Optional[str] = Field("Open Sans", description="Body font family")
    font_sizes: Optional[Dict[str, str]] = Field(
        default_factory=lambda: {
            "h1": "48px",
            "h2": "36px",
            "h3": "24px",
            "body": "16px"
        }
    )


class StyleGuidelines(BaseModel):
    """Brand style guidelines"""
    tone_of_voice: Optional[str] = Field(None, description="Brand tone of voice")
    target_audience: Optional[str] = Field(None, description="Target audience description")
    key_values: List[str] = Field(default_factory=list, description="Brand key values")
    presentation_style: Optional[PresentationStyle] = Field(PresentationStyle.MODERN)
    language_preferences: List[str] = Field(default_factory=lambda: ["en"])


class SocialMedia(BaseModel):
    """Social media handles"""
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    linkedin: Optional[str] = None
    tiktok: Optional[str] = None
    youtube: Optional[str] = None


class ContactInfo(BaseModel):
    """Contact information"""
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class BrandStatistics(BaseModel):
    """Brand usage statistics"""
    total_collections: int = 0
    total_products: int = 0
    total_presentations: int = 0
    total_documents: int = 0
    storage_used_bytes: int = 0


class Brand(BaseModel):
    """Complete brand data model"""
    brand_id: str = Field(..., description="Unique brand identifier")
    owner_id: str = Field(..., description="Owner user ID (Google ID)")
    collaborators: List[str] = Field(default_factory=list, description="List of collaborator user IDs")
    
    # Brand Identity
    name: str = Field(..., min_length=1, max_length=100, description="Brand name")
    tagline: Optional[str] = Field(None, max_length=200, description="Brand tagline")
    description: Optional[str] = Field(None, max_length=1000, description="Brand description")
    
    # Brand Assets
    logo_url: Optional[str] = Field(None, description="Brand logo URL")
    logo_storage_path: Optional[str] = Field(None, description="Firebase Storage path for logo")
    brand_colors: Optional[BrandColors] = None
    typography: Optional[Typography] = None
    
    # Brand Guidelines
    style_guidelines: Optional[StyleGuidelines] = None
    
    # Social & Contact
    website_url: Optional[HttpUrl] = None
    social_media: Optional[SocialMedia] = None
    contact_info: Optional[ContactInfo] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed: Optional[datetime] = None
    is_active: bool = Field(default=True)
    subscription_tier: SubscriptionTier = Field(default=SubscriptionTier.FREE)
    
    # Statistics
    stats: Optional[BrandStatistics] = Field(default_factory=BrandStatistics)
    
    model_config = ConfigDict(from_attributes=True)

class BrandCreate(BaseModel):
    """Model for creating a new brand"""
    name: str = Field(..., min_length=1, max_length=100)
    tagline: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    brand_colors: Optional[BrandColors] = None
    typography: Optional[Typography] = None
    style_guidelines: Optional[StyleGuidelines] = None
    website_url: Optional[HttpUrl] = None
    social_media: Optional[SocialMedia] = None
    contact_info: Optional[ContactInfo] = None

class BrandUpdate(BaseModel):
    """Model for updating a brand"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    tagline: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    logo_url: Optional[str] = None
    logo_storage_path: Optional[str] = None
    brand_colors: Optional[BrandColors] = None
    typography: Optional[Typography] = None
    style_guidelines: Optional[StyleGuidelines] = None
    website_url: Optional[HttpUrl] = None
    social_media: Optional[SocialMedia] = None
    contact_info: Optional[ContactInfo] = None
    subscription_tier: Optional[SubscriptionTier] = None

class BrandResponse(BaseModel):
    """Brand response model for API responses"""
    brand_id: str
    owner_id: str
    name: str
    tagline: Optional[str]
    description: Optional[str]
    logo_url: Optional[str]
    brand_colors: Optional[BrandColors]
    website_url: Optional[str]
    social_media: Optional[SocialMedia]
    subscription_tier: SubscriptionTier
    stats: Optional[BrandStatistics]
    created_at: datetime
    updated_at: datetime
    is_active: bool


class CollaboratorRole(str, Enum):
    """Collaborator permission roles"""
    VIEWER = "viewer"
    EDITOR = "editor"
    ADMIN = "admin"


class BrandCollaborator(BaseModel):
    """Model for brand collaborator"""
    user_id: str
    email: str
    role: CollaboratorRole
    added_at: datetime = Field(default_factory=datetime.utcnow)
    added_by: str  # User ID who added this collaborator


class AddCollaboratorRequest(BaseModel):
    """Request model for adding a collaborator"""
    email: str
    role: CollaboratorRole = CollaboratorRole.VIEWER
