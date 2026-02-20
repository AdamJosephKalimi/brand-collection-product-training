from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class Season(str, Enum):
    """Collection season types"""
    SPRING_SUMMER = "spring_summer"
    FALL_WINTER = "fall_winter"
    RESORT = "resort"
    PRE_FALL = "pre_fall"
    YEAR_ROUND = "year_round"


class CollectionStatus(str, Enum):
    """Collection status"""
    DRAFT = "draft"
    PUBLISHED = "published"


class CollectionVisibility(str, Enum):
    """Collection visibility settings"""
    PRIVATE = "private"
    TEAM = "team"
    PUBLIC = "public"


class CitationStyle(str, Enum):
    """Citation style for references"""
    INLINE = "inline"
    FOOTNOTES = "footnotes"
    ENDNOTES = "endnotes"
    NONE = "none"


class CollectionTheme(BaseModel):
    """Collection theme and mood"""
    name: str = Field(..., description="Theme name")
    mood_board_urls: List[str] = Field(default_factory=list)
    color_palette: List[str] = Field(default_factory=list, description="Hex color codes")
    keywords: List[str] = Field(default_factory=list)
    inspiration: Optional[str] = None


class ProductSubcategory(BaseModel):
    """Product subcategory within a category"""
    name: str
    product_count: int = 0
    display_order: int


class CollectionSettings(BaseModel):
    """Collection display and presentation settings"""
    selected_language: str = Field(default="en")
    available_languages: List[str] = Field(default_factory=lambda: ["en"])
    products_per_slide: int = Field(default=2, ge=1, le=4)  # 1, 2, or 4
    slide_aspect_ratio: str = Field(default="16:9")  # "4:3" or "16:9"
    
    # Product display controls
    show_product_name: bool = Field(default=True)
    show_sku: bool = Field(default=True)
    show_descriptions: bool = Field(default=True)
    show_color: bool = Field(default=True)
    show_material: bool = Field(default=True)
    show_sizes: bool = Field(default=True)
    show_origin: bool = Field(default=True)
    show_wholesale_price: bool = Field(default=True)
    show_rrp: bool = Field(default=True)
    
    citation_style: CitationStyle = Field(default=CitationStyle.FOOTNOTES)
    
    # Presentation defaults
    presentation_template: str = Field(default="minimal_modern")
    
    # Slide inclusions
    include_cover_page_slide: bool = Field(default=True)
    include_brand_introduction_slide: bool = Field(default=True)
    include_brand_history_slide: bool = Field(default=True)
    include_brand_personality_slide: bool = Field(default=True)
    include_brand_values_slide: bool = Field(default=True)
    include_collection_introduction_slide: bool = Field(default=True)
    include_core_collection_and_signature_categories_slide: bool = Field(default=True)
    include_flagship_store_and_experiences_slide: bool = Field(default=True)
    
    auto_generate_index: bool = Field(default=True)


class ProductCategory(BaseModel):
    """Product category within a collection"""
    name: str
    product_count: int = 0
    display_order: int
    subcategories: List['ProductSubcategory'] = Field(default_factory=list)


class CollectionWorkflow(BaseModel):
    """Workflow and approval tracking"""
    approval_required: bool = Field(default=False)
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    review_notes: Optional[str] = None


class CollectionStatistics(BaseModel):
    """Collection usage statistics"""
    total_products: int = 0
    total_documents: int = 0
    total_collection_documents: int = 0
    total_chunks: int = 0
    total_vectors: int = 0
    total_presentations: int = 0
    last_presentation_generated: Optional[datetime] = None


class PresentationMetadata(BaseModel):
    """Presentation metadata for generated decks"""
    generated_at: Optional[datetime] = None
    download_url: Optional[str] = None
    slide_count: int = 0
    storage_path: Optional[str] = None

class Collection(BaseModel):
    """Complete collection data model"""
    collection_id: str = Field(..., description="Unique collection identifier")
    brand_id: str = Field(..., description="Parent brand ID")
    
    # Collection Identity
    name: str = Field(..., min_length=1, max_length=100, description="Collection name")
    season: Optional[Season] = Field(None, description="Collection season")
    year: Optional[int] = Field(None, ge=2000, le=2100)
    description: Optional[str] = Field(None, max_length=1000, description="Collection description")
    
    # Collection Theme
    theme: Optional[CollectionTheme] = None
    
    # Collection Settings
    settings: CollectionSettings = Field(default_factory=CollectionSettings)
    
    # Product Categories
    categories: List[ProductCategory] = Field(default_factory=list)
    
    # Collection Items
    items: List[str] = Field(default_factory=list, description="Array of item IDs")
    
    # Metadata
    created_by: str = Field(..., description="User ID who created the collection")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None
    status: CollectionStatus = Field(default=CollectionStatus.DRAFT)
    visibility: CollectionVisibility = Field(default=CollectionVisibility.PRIVATE)
    is_active: bool = Field(default=True, description="Soft delete flag - False means deleted")
    
    # Statistics
    stats: CollectionStatistics = Field(default_factory=CollectionStatistics)
    
    # Workflow (optional)
    workflow: Optional[CollectionWorkflow] = None
    
    # Intro Slides (generated content)
    intro_slides: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)

class CollectionCreate(BaseModel):
    """Model for creating a new collection"""
    brand_id: str = Field(..., description="Parent brand ID")
    name: str = Field(..., min_length=1, max_length=100)
    season: Optional[Season] = None
    year: Optional[int] = Field(None, ge=2000, le=2100)
    description: Optional[str] = Field(None, max_length=1000)
    theme: Optional[CollectionTheme] = None
    settings: Optional[CollectionSettings] = None
    categories: Optional[List[ProductCategory]] = None
    items: Optional[List[str]] = None

class CollectionUpdate(BaseModel):
    """Model for updating a collection"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    season: Optional[Season] = None
    year: Optional[int] = Field(None, ge=2000, le=2100)
    description: Optional[str] = Field(None, max_length=1000)
    theme: Optional[CollectionTheme] = None
    settings: Optional[CollectionSettings] = None
    categories: Optional[List[ProductCategory]] = None
    items: Optional[List[str]] = None
    status: Optional[CollectionStatus] = None
    visibility: Optional[CollectionVisibility] = None
    workflow: Optional[CollectionWorkflow] = None
    intro_slides: Optional[Dict[str, Any]] = None

class CollectionResponse(BaseModel):
    """Collection response model for API responses"""
    collection_id: str
    brand_id: str
    name: str
    season: Optional[Season]
    year: Optional[int]
    description: Optional[str]
    theme: Optional[CollectionTheme]
    settings: CollectionSettings
    categories: List[ProductCategory]
    items: List[str]
    status: CollectionStatus
    visibility: CollectionVisibility
    is_active: bool = True
    stats: CollectionStatistics
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    workflow: Optional[CollectionWorkflow]
    intro_slides: Optional[Dict[str, Any]] = None
    presentation: Optional[Dict[str, Any]] = None


class CollectionWithDocuments(Collection):
    """Collection model with document references"""
    document_ids: List[str] = Field(default_factory=list)
    

class CollectionPermission(BaseModel):
    """Permission model for collection access"""
    collection_id: str
    user_id: str
    permission_level: str  # 'read', 'write', 'admin'
    granted_by: str
    granted_at: datetime = Field(default_factory=datetime.utcnow)


class ShareCollectionRequest(BaseModel):
    """Request model for sharing a collection"""
    email: str
    permission_level: str = "read"  # 'read', 'write', 'admin'
    message: Optional[str] = None
