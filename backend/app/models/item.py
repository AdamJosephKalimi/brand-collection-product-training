from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class Gender(str, Enum):
    """Gender categories for items"""
    MEN = "men"
    WOMEN = "women"
    UNISEX = "unisex"
    KIDS = "kids"
    BOYS = "boys"
    GIRLS = "girls"


class Currency(str, Enum):
    """Currency types"""
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"
    CNY = "CNY"
    CAD = "CAD"
    AUD = "AUD"
    CHF = "CHF"
    HKD = "HKD"
    SGD = "SGD"


class ItemImage(BaseModel):
    """Image associated with an item"""
    url: str = Field(..., description="Firebase Storage signed URL")
    alt: Optional[str] = Field(None, description="Alternative text for image")
    storage_path: Optional[str] = Field(None, description="Path in Firebase Storage")


class ItemSizes(BaseModel):
    """Size to quantity mapping"""
    # This is a dict where key is size (e.g., 'S', 'M', 'L') and value is quantity
    # Example: {'S': 10, 'M': 20, 'L': 15}
    pass  # Used for type hinting, actual implementation uses Dict[str, int]


class Item(BaseModel):
    """Complete item/product data model - One item per color variant"""
    item_id: str = Field(..., description="Unique item identifier")
    collection_id: str = Field(..., description="Parent collection ID")
    
    # Product Identity
    product_name: str = Field(..., min_length=1, max_length=200, description="Product name")
    sku: str = Field(..., description="Full SKU including color code")
    base_sku: Optional[str] = Field(None, description="Base SKU without color code")
    category: str = Field(..., description="Product category")
    subcategory: Optional[str] = Field(None, description="Product subcategory")
    gender: Optional[Gender] = Field(None, description="Target gender")
    
    # Color Information
    color: Optional[str] = Field(None, description="Color name")
    color_code: Optional[str] = Field(None, description="Color code or identifier")
    
    description: Optional[str] = Field(None, max_length=2000, description="Product description")
    
    # Product Details
    materials: List[str] = Field(default_factory=list, description="Materials used")
    care_instructions: List[str] = Field(default_factory=list, description="Care instructions")
    process: List[str] = Field(default_factory=list, description="Manufacturing processes")
    
    # Pricing
    origin: Optional[str] = Field(None, description="Country of origin")
    wholesale_price: Optional[float] = Field(None, ge=0, description="Wholesale price")
    rrp: Optional[float] = Field(None, ge=0, description="Recommended retail price")
    currency: Currency = Field(..., description="Currency for prices")
    
    # Highlighting and Inclusion
    highlighted_item: bool = Field(default=False, description="Whether this is a featured/hero item")
    included: bool = Field(default=True, description="Whether to include this item in the final deck")

    # Sales Talk
    sales_talk: Optional[str] = Field(None, max_length=80, description="Short sales talking points for this item")
    
    # Ordering (within category)
    display_order: int = Field(default=0, ge=0, description="Display order within the item's category")
    
    # Media
    images: List[ItemImage] = Field(default_factory=list, description="Product images")
    
    # Sizes and Quantities
    sizes: Dict[str, int] = Field(default_factory=dict, description="Size to quantity mapping (e.g., {'S': 10, 'M': 20})")
    
    # Tags
    tags: List[str] = Field(default_factory=list, description="Product tags")
    
    # Source Tracking
    source_document_id: Optional[str] = Field(None, description="Document this item was extracted from")
    extraction_confidence: Optional[float] = Field(None, ge=0, le=1, description="AI extraction confidence score")
    manual_review: bool = Field(default=False, description="Whether item has been manually reviewed")
    reviewed_by: Optional[str] = Field(None, description="User ID who reviewed this item")
    reviewed_at: Optional[datetime] = Field(None, description="When item was reviewed")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(from_attributes=True)


class ItemCreate(BaseModel):
    """Model for creating a new item"""
    collection_id: str = Field(..., description="Parent collection ID")
    product_name: str = Field(..., min_length=1, max_length=200)
    sku: str
    base_sku: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    gender: Optional[Gender] = None
    color: Optional[str] = None
    color_code: Optional[str] = None
    description: Optional[str] = Field(None, max_length=2000)
    materials: Optional[List[str]] = None
    care_instructions: Optional[List[str]] = None
    process: Optional[List[str]] = None
    origin: Optional[str] = None
    wholesale_price: Optional[float] = Field(None, ge=0)
    rrp: Optional[float] = Field(None, ge=0)
    currency: Currency
    highlighted_item: Optional[bool] = False
    included: Optional[bool] = True
    sales_talk: Optional[str] = None
    display_order: Optional[int] = Field(default=0, ge=0)
    images: Optional[List[ItemImage]] = None
    sizes: Optional[Dict[str, int]] = None
    tags: Optional[List[str]] = None
    source_document_id: Optional[str] = None
    extraction_confidence: Optional[float] = Field(None, ge=0, le=1)


class ItemUpdate(BaseModel):
    """Model for updating an item"""
    product_name: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = None
    base_sku: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    gender: Optional[Gender] = None
    color: Optional[str] = None
    color_code: Optional[str] = None
    description: Optional[str] = Field(None, max_length=2000)
    materials: Optional[List[str]] = None
    care_instructions: Optional[List[str]] = None
    process: Optional[List[str]] = None
    origin: Optional[str] = None
    wholesale_price: Optional[float] = Field(None, ge=0)
    rrp: Optional[float] = Field(None, ge=0)
    currency: Optional[Currency] = None
    highlighted_item: Optional[bool] = None
    included: Optional[bool] = None
    sales_talk: Optional[str] = Field(None, max_length=80)
    display_order: Optional[int] = Field(None, ge=0)
    images: Optional[List[ItemImage]] = None
    sizes: Optional[Dict[str, int]] = None
    tags: Optional[List[str]] = None
    manual_review: Optional[bool] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class ItemOrderEntry(BaseModel):
    """Single item order entry"""
    item_id: str
    display_order: int


class ItemReorderRequest(BaseModel):
    """Request model for reordering items within a category"""
    item_orders: List[ItemOrderEntry] = Field(
        ..., 
        description="List of {item_id: str, display_order: int} objects"
    )


class ItemResponse(BaseModel):
    """Item response model for API responses"""
    item_id: str
    collection_id: str
    product_name: Optional[str] = None  # Can be None if not enriched
    sku: str
    base_sku: Optional[str] = None
    category: Optional[str] = None  # Can be None if categorization skipped
    subcategory: Optional[str] = None
    gender: Optional[Gender] = None
    color: Optional[str] = None
    color_code: Optional[str] = None
    description: Optional[str] = None
    materials: Optional[List[str]] = None
    care_instructions: Optional[List[str]] = None
    process: Optional[List[str]] = None
    origin: Optional[str] = None
    wholesale_price: Optional[float] = None
    rrp: Optional[float] = None
    currency: Optional[str] = None  # Allow string for flexibility
    highlighted_item: Optional[bool] = False
    included: Optional[bool] = True
    sales_talk: Optional[str] = None
    display_order: Optional[int] = 0
    images: Optional[List[ItemImage]] = None
    sizes: Optional[Dict[str, int]] = None
    tags: Optional[List[str]] = None
    content_hash: Optional[str] = None  # Hash for duplicate detection
    source_document_id: Optional[str] = None  # Legacy field
    source_documents: Optional[Dict[str, Any]] = None  # New field: {purchase_order_id, line_sheet_ids (list)}
    extraction_confidence: Optional[float] = None
    manual_review: Optional[bool] = False
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None  # ISO string format
    created_at: Optional[str] = None  # ISO string format (can be datetime from old items)
    updated_at: Optional[str] = None  # ISO string format (can be datetime from old items)
    
    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
