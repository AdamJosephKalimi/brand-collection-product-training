"""
Presentation Generation Service

Generates PowerPoint presentations from collection data including:
- Intro slides (LLM-generated content)
- Product slides (collection items with dynamic layout)
"""

import logging
import os
import tempfile
from datetime import datetime
from typing import Dict, Any, Optional
from io import BytesIO

import requests
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN

from app.services.firebase_service import firebase_service
from app.services.collection_service import collection_service

logger = logging.getLogger(__name__)


class PresentationGenerationService:
    """Service for generating PowerPoint presentations from collection data"""
    
    def __init__(self):
        self.db = firebase_service.db
        self.bucket = firebase_service.bucket
        self.prs = None
        self.blank_layout = None
        self.title_slide_layout = None
        self.title_content_layout = None
    
    async def generate_presentation(
        self, 
        collection_id: str,
        user_id: str,
        products_per_slide: int = 1
    ) -> str:
        """
        Generate complete PowerPoint presentation for a collection.
        
        Args:
            collection_id: ID of the collection
            user_id: ID of the user requesting generation
            products_per_slide: Number of products per slide (1, 2, or 4)
            
        Returns:
            Download URL for the generated presentation
        """
        try:
            logger.info(f"Starting presentation generation for collection: {collection_id}")
            
            # 1. Fetch collection data
            collection = await collection_service.get_collection(collection_id, user_id)
            
            if not collection:
                raise ValueError(f"Collection not found: {collection_id}")
            
            intro_slides = collection.intro_slides
            
            if not intro_slides or not intro_slides.get('slides'):
                raise ValueError(f"No intro slides found for collection: {collection_id}")
            
            logger.info(f"Found {len(intro_slides['slides'])} intro slides")
            
            # 2. Initialize presentation
            self.prs = Presentation()
            self.blank_layout = self.prs.slide_layouts[6]  # Blank layout
            self.title_slide_layout = self.prs.slide_layouts[0]  # Title Slide
            self.title_content_layout = self.prs.slide_layouts[1]  # Title and Content
            
            # 3. Generate intro slides
            await self._generate_intro_slides(intro_slides)
            
            # 4. Generate product slides
            await self._generate_product_slides(collection_id, products_per_slide)
            
            # 5. Save and upload
            download_url = await self._save_and_upload(collection_id)
            
            logger.info(f"✅ Presentation generated successfully: {download_url}")
            
            return download_url
            
        except Exception as e:
            logger.error(f"Error generating presentation: {e}")
            raise
    
    async def _generate_intro_slides(self, intro_slides: Dict[str, Any]):
        """
        Generate intro slides from intro_slides data.
        Currently supports: cover_page, brand_history
        
        Args:
            intro_slides: Dictionary containing slides array
        """
        logger.info("Generating intro slides...")
        
        slides_generated = 0
        
        for slide_data in intro_slides['slides']:
            slide_type = slide_data.get('slide_type')
            
            if slide_type == 'cover_page':
                logger.info("Creating cover page slide...")
                self._create_cover_slide(slide_data)
                slides_generated += 1
                
            elif slide_type == 'brand_history':
                logger.info("Creating brand history slide...")
                self._create_brand_history_slide(slide_data)
                slides_generated += 1
                
            elif slide_type == 'brand_introduction':
                logger.info("Creating brand introduction slide...")
                self._create_brand_introduction_slide(slide_data)
                slides_generated += 1
                
            elif slide_type == 'brand_values':
                logger.info("Creating brand values slide...")
                self._create_brand_values_slide(slide_data)
                slides_generated += 1
                
            elif slide_type == 'brand_personality':
                logger.info("Creating brand personality slide...")
                self._create_brand_personality_slide(slide_data)
                slides_generated += 1
                
            elif slide_type == 'flagship_stores':
                logger.info("Creating flagship stores slide...")
                self._create_flagship_stores_slide(slide_data)
                slides_generated += 1
                
            elif slide_type == 'core_collection':
                logger.info("Creating core collection slide...")
                self._create_core_collection_slide(slide_data)
                slides_generated += 1
            
            else:
                logger.debug(f"Unknown slide type: {slide_type}")
        
        logger.info(f"Generated {slides_generated} slides")
    
    def _create_cover_slide(self, data: Dict[str, Any]):
        """
        Create cover page slide using Title Slide layout.
        
        Uses PowerPoint's built-in Title Slide layout with:
        - Title placeholder for collection title
        - Subtitle placeholder for brand name
        - Manual textbox for tagline (if exists)
        
        Args:
            data: Slide data containing title, subtitle, content
        """
        slide = self.prs.slides.add_slide(self.title_slide_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = content.get('title', data.get('title', 'Collection'))
        
        # Format title
        tf = title.text_frame
        p = tf.paragraphs[0]
        p.font.size = Pt(44)
        p.font.bold = True
        
        # Use subtitle placeholder (usually placeholders[1] in title slide)
        if len(slide.placeholders) > 1:
            subtitle = slide.placeholders[1]
            subtitle.text = content.get('subtitle', data.get('subtitle', ''))
            
            # Format subtitle
            tf = subtitle.text_frame
            p = tf.paragraphs[0]
            p.font.size = Pt(24)
        
        # Tagline - add as manual textbox at bottom
        if content.get('tagline'):
            tagline_box = slide.shapes.add_textbox(
                left=Inches(1),
                top=Inches(6.5),
                width=Inches(8),
                height=Inches(0.5)
            )
            tf = tagline_box.text_frame
            tf.text = content.get('tagline')
            
            # Format tagline
            p = tf.paragraphs[0]
            p.font.size = Pt(18)
            p.font.italic = True
            p.alignment = PP_ALIGN.CENTER
        
        logger.info("Cover slide created (using Title Slide layout)")
    
    def _create_brand_history_slide(self, data: Dict[str, Any]):
        """
        Create brand history slide using Title and Content layout.
        
        Uses PowerPoint's built-in Title and Content layout with:
        - Title placeholder for "Brand History"
        - Content placeholder for founding info and milestones (bullets work automatically)
        
        Args:
            data: Slide data containing title, content with founding info and milestones
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Brand History')
        
        # Use content placeholder (placeholders[1] in title and content layout)
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        # Add founding details
        founding_year = content.get('founding_year', '')
        founder = content.get('founder', '')
        origin = content.get('origin', '')
        
        # First paragraph - founding info
        p = tf.paragraphs[0]
        if founding_year or founder:
            p.text = f"Founded: {founding_year}"
            if founder:
                p.text += f" by {founder}"
            p.font.size = Pt(18)
            p.level = 0
        
        # Second paragraph - origin
        if origin:
            p = tf.add_paragraph()
            p.text = f"Origin: {origin}"
            p.font.size = Pt(18)
            p.level = 0
        
        # Add spacing before milestones
        if founding_year or founder or origin:
            p = tf.add_paragraph()
            p.text = ""
        
        # Milestones header
        milestones = content.get('milestones', [])
        if milestones:
            p = tf.add_paragraph()
            p.text = "Key Milestones:"
            p.font.size = Pt(20)
            p.font.bold = True
            p.level = 0
            
            # Add each milestone as bullet (bullets work automatically in content placeholder!)
            for milestone in milestones:
                p = tf.add_paragraph()
                p.text = milestone
                p.level = 1  # Indent level 1 (sub-bullet under "Key Milestones")
                p.font.size = Pt(14)
        
        logger.info("Brand history slide created (using Title and Content layout)")
    
    def _create_brand_introduction_slide(self, data: Dict[str, Any]):
        """
        Create brand introduction slide using Title and Content layout.
        
        Args:
            data: Slide data containing title, content with overview and key_points
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Brand Introduction')
        
        # Use content placeholder
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        # Add overview
        overview = content.get('overview', '')
        if overview:
            p = tf.paragraphs[0]
            p.text = overview
            p.font.size = Pt(16)
            p.level = 0
            
            # Add spacing
            p = tf.add_paragraph()
            p.text = ""
        
        # Add key points as bullets
        key_points = content.get('key_points', [])
        if key_points:
            for point in key_points:
                p = tf.add_paragraph()
                p.text = point
                p.level = 0
                p.font.size = Pt(14)
        
        logger.info("Brand introduction slide created (using Title and Content layout)")
    
    def _create_brand_values_slide(self, data: Dict[str, Any]):
        """
        Create brand values slide using Title and Content layout.
        
        Args:
            data: Slide data containing title, content with values array
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Brand Values')
        
        # Use content placeholder
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        # Add values
        values = content.get('values', [])
        if values:
            p = tf.paragraphs[0]
            first = True
            
            for value in values:
                if not first:
                    p = tf.add_paragraph()
                first = False
                
                # Value name and description
                value_name = value.get('name', '') if isinstance(value, dict) else str(value)
                value_desc = value.get('description', '') if isinstance(value, dict) else ''
                
                p.level = 0
                p.font.size = Pt(14)
                
                if value_desc:
                    # Add value name in bold
                    run = p.add_run()
                    run.text = f"{value_name}: "
                    run.font.bold = True
                    run.font.size = Pt(14)
                    
                    # Add description in normal text
                    run = p.add_run()
                    run.text = value_desc
                    run.font.size = Pt(14)
                else:
                    # Just the value name
                    p.text = value_name
        
        logger.info("Brand values slide created (using Title and Content layout)")
    
    def _create_brand_personality_slide(self, data: Dict[str, Any]):
        """
        Create brand personality slide using Title and Content layout.
        
        Args:
            data: Slide data containing title, content with personality traits
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Brand Personality')
        
        # Use content placeholder
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        # Add personality traits
        traits = content.get('personality_traits', [])
        descriptors = content.get('descriptors', [])
        voice = content.get('brand_voice', '')
        
        p = tf.paragraphs[0]
        first = True
        
        # Traits section
        if traits:
            if not first:
                p = tf.add_paragraph()
            first = False
            
            p.text = "Personality Traits:"
            p.font.size = Pt(16)
            p.font.bold = True
            p.level = 0
            
            for trait in traits:
                p = tf.add_paragraph()
                p.text = trait
                p.level = 1
                p.font.size = Pt(14)
        
        # Descriptors section
        if descriptors:
            p = tf.add_paragraph()
            p.text = ""
            
            p = tf.add_paragraph()
            p.text = "Descriptors:"
            p.font.size = Pt(16)
            p.font.bold = True
            p.level = 0
            
            for descriptor in descriptors:
                p = tf.add_paragraph()
                p.text = descriptor
                p.level = 1
                p.font.size = Pt(14)
        
        # Brand voice section
        if voice:
            p = tf.add_paragraph()
            p.text = ""
            
            p = tf.add_paragraph()
            p.text = f"Brand Voice: {voice}"
            p.font.size = Pt(14)
            p.level = 0
        
        logger.info("Brand personality slide created (using Title and Content layout)")
    
    def _create_flagship_stores_slide(self, data: Dict[str, Any]):
        """
        Create flagship stores slide using Title and Content layout.
        
        Args:
            data: Slide data containing title, content with stores and retail experience
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Flagship Stores & Experiences')
        
        # Use content placeholder
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        # Add stores
        stores = content.get('store_locations', content.get('stores', []))
        retail_experience = content.get('retail_experience', '')
        
        p = tf.paragraphs[0]
        first = True
        
        if stores:
            # Add "Store Locations:" header
            p = tf.paragraphs[0]
            p.text = "Store Locations:"
            p.font.size = Pt(16)
            p.font.bold = True
            p.level = 0
            
            for store in stores:
                p = tf.add_paragraph()
                
                # Store location (bold) and description
                location = store.get('city', store.get('location', '')) if isinstance(store, dict) else str(store)
                description = store.get('description', '') if isinstance(store, dict) else ''
                
                p.level = 1
                
                if description:
                    # Add location in bold
                    run = p.add_run()
                    run.text = f"{location}: "
                    run.font.bold = True
                    run.font.size = Pt(13)
                    
                    # Add description in normal text
                    run = p.add_run()
                    run.text = description
                    run.font.size = Pt(13)
                else:
                    # Just the location
                    p.text = location
                    p.font.size = Pt(13)
        
        # Retail experience section
        if retail_experience:
            if stores:
                p = tf.add_paragraph()
                p.text = ""
            
            p = tf.add_paragraph()
            p.text = "Retail Experience:"
            p.font.size = Pt(16)
            p.font.bold = True
            p.level = 0
            
            p = tf.add_paragraph()
            p.text = retail_experience
            p.level = 1
            p.font.size = Pt(14)
        
        logger.info("Flagship stores slide created (using Title and Content layout)")
    
    def _create_core_collection_slide(self, data: Dict[str, Any]):
        """
        Create core collection slide using Title and Content layout.
        
        Args:
            data: Slide data containing title, content with overview and signature categories
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Core Collection & Signature Categories')
        
        # Use content placeholder
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        # Add overview
        overview = content.get('overview', '')
        if overview:
            p = tf.paragraphs[0]
            p.text = overview
            p.font.size = Pt(12)  # Smaller font for better spacing
            p.level = 0
            
            # Add spacing
            p = tf.add_paragraph()
            p.text = ""
        
        # Add signature categories
        categories = content.get('signature_categories', [])
        if categories:
            p = tf.add_paragraph()
            p.text = "Signature Categories:"
            p.font.size = Pt(16)
            p.font.bold = True
            p.level = 0
            
            for category in categories:
                p = tf.add_paragraph()
                
                # Category name and description
                cat_name = category.get('category', category.get('name', '')) if isinstance(category, dict) else str(category)
                cat_desc = category.get('description', '') if isinstance(category, dict) else ''
                key_pieces = category.get('key_pieces', []) if isinstance(category, dict) else []
                
                p.level = 1
                
                if cat_desc:
                    # Add category name in bold
                    run = p.add_run()
                    run.text = f"{cat_name}: "
                    run.font.bold = True
                    run.font.size = Pt(13)
                    
                    # Add description in normal text
                    run = p.add_run()
                    run.text = cat_desc
                    run.font.size = Pt(13)
                else:
                    # Just the category name
                    p.text = cat_name
                    p.font.size = Pt(13)
                
                # Add key pieces if available
                if key_pieces:
                    pieces_text = ", ".join(key_pieces)
                    p = tf.add_paragraph()
                    p.text = f"Key pieces: {pieces_text}"
                    p.level = 2
                    p.font.size = Pt(11)
                    p.font.italic = True
        
        logger.info("Core collection slide created (using Title and Content layout)")
    
    async def _fetch_collection_items(self, collection_id: str) -> list:
        """
        Fetch all items for a collection from Firestore.
        
        Args:
            collection_id: ID of the collection
            
        Returns:
            List of item dictionaries
        """
        try:
            # Items are stored as a subcollection under each collection document
            items_ref = self.db.collection('collections').document(collection_id).collection('items')
            items_docs = items_ref.stream()
            
            items = []
            for doc in items_docs:
                item_data = doc.to_dict()
                item_data['item_id'] = doc.id
                items.append(item_data)
            
            logger.info(f"Fetched {len(items)} items for collection {collection_id}")
            return items
            
        except Exception as e:
            logger.error(f"Error fetching items: {e}")
            return []
    
    async def _generate_product_slides(self, collection_id: str, products_per_slide: int):
        """
        Generate product slides based on collection items.
        
        Args:
            collection_id: ID of the collection
            products_per_slide: Number of products per slide (1, 2, or 4)
        """
        logger.info(f"Generating product slides ({products_per_slide} per slide)...")
        
        # Fetch items
        items = await self._fetch_collection_items(collection_id)
        
        if not items:
            logger.warning("No items found for product slides")
            return
        
        # Group items by category
        items_by_category = {}
        for item in items:
            category = item.get('category', 'Uncategorized')
            if category not in items_by_category:
                items_by_category[category] = []
            items_by_category[category].append(item)
        
        logger.info(f"Grouped {len(items)} items into {len(items_by_category)} categories")
        
        # Generate slides based on layout
        slides_generated = 0
        
        for category, category_items in items_by_category.items():
            logger.info(f"Generating slides for category: {category} ({len(category_items)} items)")
            
            # Create category divider slide
            self._create_category_divider_slide(category)
            slides_generated += 1
            
            # Create product slides
            if products_per_slide == 1:
                for item in category_items:
                    self._create_1up_product_slide(item)
                    slides_generated += 1
            elif products_per_slide == 2:
                # Group items in pairs
                for i in range(0, len(category_items), 2):
                    items_group = category_items[i:i+2]
                    self._create_2up_product_slide(items_group)
                    slides_generated += 1
            elif products_per_slide == 3:
                # Group items in sets of 3
                for i in range(0, len(category_items), 3):
                    items_group = category_items[i:i+3]
                    self._create_3up_product_slide(items_group)
                    slides_generated += 1
            elif products_per_slide == 4:
                # Group items in sets of 4
                for i in range(0, len(category_items), 4):
                    items_group = category_items[i:i+4]
                    self._create_4up_product_slide(items_group)
                    slides_generated += 1
        
        logger.info(f"Generated {slides_generated} product slides")
    
    def _create_category_divider_slide(self, category: str):
        """
        Create a divider slide for a product category.
        
        Args:
            category: Category name
        """
        slide = self.prs.slides.add_slide(self.blank_layout)
        
        # Category title - centered
        title_box = slide.shapes.add_textbox(
            left=Inches(1),
            top=Inches(3.5),
            width=Inches(8),
            height=Inches(1)
        )
        tf = title_box.text_frame
        tf.text = category
        
        # Format title
        p = tf.paragraphs[0]
        p.font.size = Pt(48)
        p.font.bold = True
        p.alignment = PP_ALIGN.CENTER
        
        logger.info(f"Category divider slide created: {category}")
    
    def _download_image_as_stream(self, image_dict: dict) -> Optional[BytesIO]:
        """
        Download image from Firebase Storage or URL and return as BytesIO stream.
        
        Args:
            image_dict: Image dictionary with 'storage_path' and/or 'url'
            
        Returns:
            BytesIO stream of image data, or None if download fails
        """
        try:
            storage_path = image_dict.get('storage_path')
            image_url = image_dict.get('url')
            
            # Try storage path first (preferred)
            if storage_path:
                try:
                    logger.debug(f"Downloading image from storage path: {storage_path}")
                    blob = self.bucket.blob(storage_path)
                    image_bytes = blob.download_as_bytes()
                    return BytesIO(image_bytes)
                except Exception as e:
                    logger.warning(f"Failed to download from storage path: {e}")
                    # Fall through to URL fallback
            
            # Fallback to URL
            if image_url:
                try:
                    logger.debug(f"Downloading image from URL: {image_url}")
                    response = requests.get(image_url, timeout=10)
                    response.raise_for_status()
                    return BytesIO(response.content)
                except Exception as e:
                    logger.warning(f"Failed to download from URL: {e}")
            
            logger.warning("No valid storage_path or url found in image dict")
            return None
            
        except Exception as e:
            logger.error(f"Error downloading image: {e}")
            return None
    
    def _create_1up_product_slide(self, item: dict):
        """
        Create a slide with 1 product (full slide layout).
        
        Layout:
        - Product image: Left side (if available)
        - Product details: Right side
        
        Args:
            item: Item dictionary
        """
        slide = self.prs.slides.add_slide(self.blank_layout)
        
        # Extract item data
        product_name = item.get('product_name', 'Unknown Product')
        sku = item.get('sku', '')
        color = item.get('color', '')
        subcategory = item.get('subcategory', '')
        origin = item.get('origin', '')
        description = item.get('description', '')
        materials = item.get('materials', [])
        wholesale_price = item.get('wholesale_price')
        rrp = item.get('rrp')
        currency = item.get('currency', 'USD')
        images = item.get('images', [])
        
        # Left side: Product image or placeholder
        image_added = False
        
        if images and len(images) > 0:
            # Try to download and embed the first image
            image_stream = self._download_image_as_stream(images[0])
            
            if image_stream:
                try:
                    # Add image to slide with size constraints
                    # Smaller width (3.5" instead of 4.5") and max height (5")
                    picture = slide.shapes.add_picture(
                        image_stream,
                        left=Inches(0.75),  # Adjusted for smaller width
                        top=Inches(1.5),    # More top padding
                        width=Inches(3.5),  # Smaller width
                        height=Inches(5)    # Max height constraint
                    )
                    image_added = True
                    logger.debug(f"Image added for product: {product_name}")
                except Exception as e:
                    logger.warning(f"Failed to add image to slide: {e}")
        
        # Show placeholder if no image was added
        if not image_added:
            image_box = slide.shapes.add_textbox(
                left=Inches(0.5),
                top=Inches(1),
                width=Inches(4.5),
                height=Inches(6)
            )
            tf = image_box.text_frame
            
            if images and len(images) > 0:
                tf.text = "[Image Not Available]"
            else:
                tf.text = "[No Image]"
            
            p = tf.paragraphs[0]
            p.font.size = Pt(16)
            p.font.italic = True
            p.alignment = PP_ALIGN.CENTER
        
        # Right side: Product details
        details_box = slide.shapes.add_textbox(
            left=Inches(5.5),
            top=Inches(1),
            width=Inches(4),
            height=Inches(6)
        )
        tf = details_box.text_frame
        
        # Product name
        p = tf.paragraphs[0]
        p.text = product_name
        p.font.size = Pt(24)
        p.font.bold = True
        
        # SKU
        if sku:
            p = tf.add_paragraph()
            p.text = f"SKU: {sku}"
            p.font.size = Pt(12)
            p.font.italic = True
        
        # Subcategory
        if subcategory:
            p = tf.add_paragraph()
            p.text = f"Subcategory: {subcategory}"
            p.font.size = Pt(13)
        
        # Color
        if color:
            p = tf.add_paragraph()
            p.text = f"Color: {color}"
            p.font.size = Pt(14)
        
        # Origin
        if origin:
            p = tf.add_paragraph()
            p.text = f"Origin: {origin}"
            p.font.size = Pt(13)
        
        # Spacing
        p = tf.add_paragraph()
        p.text = ""
        
        # Description
        if description:
            p = tf.add_paragraph()
            p.text = description
            p.font.size = Pt(12)
        
        # Spacing
        p = tf.add_paragraph()
        p.text = ""
        
        # Materials
        if materials:
            p = tf.add_paragraph()
            p.text = "Materials:"
            p.font.size = Pt(12)
            p.font.bold = True
            
            for material in materials:
                p = tf.add_paragraph()
                p.text = f"• {material}"
                p.font.size = Pt(11)
        
        # Pricing
        if wholesale_price or rrp:
            p = tf.add_paragraph()
            p.text = ""
            
            p = tf.add_paragraph()
            pricing_text = ""
            if wholesale_price:
                pricing_text += f"Wholesale: {currency} {wholesale_price:.2f}"
            if rrp:
                if pricing_text:
                    pricing_text += " | "
                pricing_text += f"RRP: {currency} {rrp:.2f}"
            p.text = pricing_text
            p.font.size = Pt(11)
        
        logger.info(f"1-up product slide created: {product_name}")
    
    def _create_2up_product_slide(self, items: list):
        """
        Create a slide with 2 products (side by side).
        
        Layout: Two columns, each with image on left and details on right.
        
        Args:
            items: List of 1-2 item dictionaries
        """
        slide = self.prs.slides.add_slide(self.blank_layout)
        
        # Process up to 2 items
        for idx, item in enumerate(items[:2]):
            # Calculate position based on column (0 = left, 1 = right)
            column_offset = idx * 5  # 5 inches between columns
            
            # Extract item data
            product_name = item.get('product_name', 'Unknown Product')
            sku = item.get('sku', '')
            color = item.get('color', '')
            subcategory = item.get('subcategory', '')
            origin = item.get('origin', '')
            description = item.get('description', '')
            materials = item.get('materials', [])
            wholesale_price = item.get('wholesale_price')
            rrp = item.get('rrp')
            currency = item.get('currency', 'USD')
            images = item.get('images', [])
            
            # Product image or placeholder (left side of column)
            image_added = False
            image_left = Inches(0.5 + column_offset)
            image_top = Inches(1.5)
            image_width = Inches(2)
            image_height = Inches(3)
            
            if images and len(images) > 0:
                image_stream = self._download_image_as_stream(images[0])
                
                if image_stream:
                    try:
                        slide.shapes.add_picture(
                            image_stream,
                            left=image_left,
                            top=image_top,
                            width=image_width,
                            height=image_height
                        )
                        image_added = True
                    except Exception as e:
                        logger.warning(f"Failed to add image: {e}")
            
            # Show placeholder if no image
            if not image_added:
                image_box = slide.shapes.add_textbox(
                    left=image_left,
                    top=image_top,
                    width=image_width,
                    height=image_height
                )
                tf = image_box.text_frame
                tf.text = "[No Image]" if not images else "[Image Not Available]"
                p = tf.paragraphs[0]
                p.font.size = Pt(12)
                p.font.italic = True
                p.alignment = PP_ALIGN.CENTER
            
            # Product details (right side of column)
            details_left = Inches(2.75 + column_offset)
            details_width = Inches(2)
            
            details_box = slide.shapes.add_textbox(
                left=details_left,
                top=Inches(1),
                width=details_width,
                height=Inches(6)
            )
            tf = details_box.text_frame
            tf.word_wrap = True
            
            # Product name
            p = tf.paragraphs[0]
            p.text = product_name
            p.font.size = Pt(16)
            p.font.bold = True
            
            # SKU
            if sku:
                p = tf.add_paragraph()
                p.text = f"SKU: {sku}"
                p.font.size = Pt(9)
                p.font.italic = True
            
            # Subcategory
            if subcategory:
                p = tf.add_paragraph()
                p.text = f"Subcat: {subcategory}"
                p.font.size = Pt(9)
            
            # Color
            if color:
                p = tf.add_paragraph()
                p.text = f"Color: {color}"
                p.font.size = Pt(10)
            
            # Origin
            if origin:
                p = tf.add_paragraph()
                p.text = f"Origin: {origin}"
                p.font.size = Pt(9)
            
            # Spacing
            p = tf.add_paragraph()
            p.text = ""
            
            # Description (truncate if too long)
            if description:
                p = tf.add_paragraph()
                # Limit description to 150 chars for 2-up layout
                if len(description) > 150:
                    p.text = description[:147] + "..."
                else:
                    p.text = description
                p.font.size = Pt(9)
            
            # Materials (condensed)
            if materials:
                p = tf.add_paragraph()
                p.text = "Materials:"
                p.font.size = Pt(9)
                p.font.bold = True
                
                # Show first 3 materials
                for material in materials[:3]:
                    p = tf.add_paragraph()
                    p.text = f"• {material}"
                    p.font.size = Pt(8)
                
                if len(materials) > 3:
                    p = tf.add_paragraph()
                    p.text = f"+ {len(materials) - 3} more"
                    p.font.size = Pt(8)
                    p.font.italic = True
            
            # Pricing
            if wholesale_price or rrp:
                p = tf.add_paragraph()
                p.text = ""
                
                p = tf.add_paragraph()
                pricing_text = ""
                if wholesale_price:
                    pricing_text += f"W: {currency} {wholesale_price:.2f}"
                if rrp:
                    if pricing_text:
                        pricing_text += " | "
                    pricing_text += f"RRP: {currency} {rrp:.2f}"
                p.text = pricing_text
                p.font.size = Pt(9)
        
        logger.info(f"2-up product slide created with {len(items)} item(s)")
    
    def _create_3up_product_slide(self, items: list):
        """
        Create a slide with 3 products (line sheet style).
        
        Layout: Images in top row, details in bottom row (3 columns).
        
        Args:
            items: List of 1-3 item dictionaries
        """
        slide = self.prs.slides.add_slide(self.blank_layout)
        
        # Column positions (left edge for each product) - 3 columns with more space
        column_positions = [1.0, 4.0, 7.0]  # Inches - more centered and spaced
        column_width = 2.5  # Width for each column (wider than 4-up)
        
        # Process up to 3 items
        for idx, item in enumerate(items[:3]):
            if idx >= len(column_positions):
                break
                
            col_left = Inches(column_positions[idx])
            
            # Extract item data
            product_name = item.get('product_name', 'Unknown Product')
            sku = item.get('sku', '')
            color = item.get('color', '')
            subcategory = item.get('subcategory', '')
            origin = item.get('origin', '')
            description = item.get('description', '')
            materials = item.get('materials', [])
            wholesale_price = item.get('wholesale_price')
            rrp = item.get('rrp')
            currency = item.get('currency', 'USD')
            images = item.get('images', [])
            
            # Top row: Product image
            image_added = False
            image_width = Inches(2.5)  # Larger than 4-up
            image_height = Inches(3.5)  # Larger than 4-up
            image_top = Inches(0.75)
            
            if images and len(images) > 0:
                image_stream = self._download_image_as_stream(images[0])
                
                if image_stream:
                    try:
                        slide.shapes.add_picture(
                            image_stream,
                            left=col_left,
                            top=image_top,
                            width=image_width,
                            height=image_height
                        )
                        image_added = True
                    except Exception as e:
                        logger.warning(f"Failed to add image: {e}")
            
            # Show placeholder if no image
            if not image_added:
                image_box = slide.shapes.add_textbox(
                    left=col_left,
                    top=image_top,
                    width=image_width,
                    height=image_height
                )
                tf = image_box.text_frame
                tf.text = "[No Image]" if not images else "[N/A]"
                p = tf.paragraphs[0]
                p.font.size = Pt(11)
                p.font.italic = True
                p.alignment = PP_ALIGN.CENTER
            
            # Bottom row: Product details
            details_top = Inches(4.5)
            details_height = Inches(3)  # 3" height
            
            details_box = slide.shapes.add_textbox(
                left=col_left,
                top=details_top,
                width=Inches(column_width),
                height=details_height
            )
            tf = details_box.text_frame
            tf.word_wrap = True
            
            # Product name
            p = tf.paragraphs[0]
            p.text = product_name
            p.font.size = Pt(11)
            p.font.bold = True
            
            # SKU
            if sku:
                p = tf.add_paragraph()
                p.text = f"SKU: {sku}"
                p.font.size = Pt(8)
                p.font.italic = True
            
            # Color
            if color:
                p = tf.add_paragraph()
                p.text = f"Color: {color}"
                p.font.size = Pt(8)
            
            # Subcategory
            if subcategory:
                p = tf.add_paragraph()
                p.text = f"Subcat: {subcategory}"
                p.font.size = Pt(8)
            
            # Origin
            if origin:
                p = tf.add_paragraph()
                p.text = f"Origin: {origin}"
                p.font.size = Pt(8)
            
            # Description (dynamic font sizing, word wrap enabled)
            if description:
                p = tf.add_paragraph()
                p.text = description
                
                # Dynamic font size based on length
                if len(description) <= 80:
                    p.font.size = Pt(8)
                elif len(description) <= 120:
                    p.font.size = Pt(7)
                else:
                    p.font.size = Pt(6)
            
            # Materials (show first 4)
            if materials:
                p = tf.add_paragraph()
                p.text = "Materials:"
                p.font.size = Pt(8)
                p.font.bold = True
                
                # Show first 4 materials
                for material in materials[:4]:
                    p = tf.add_paragraph()
                    p.text = f"• {material}"
                    p.font.size = Pt(7)
                
                # If more than 4, show count
                if len(materials) > 4:
                    p = tf.add_paragraph()
                    p.text = f"+ {len(materials) - 4} more"
                    p.font.size = Pt(7)
                    p.font.italic = True
            
            # Pricing
            if wholesale_price:
                p = tf.add_paragraph()
                p.text = f"W: {currency} {wholesale_price:.2f}"
                p.font.size = Pt(8)
            
            if rrp:
                p = tf.add_paragraph()
                p.text = f"RRP: {currency} {rrp:.2f}"
                p.font.size = Pt(8)
        
        logger.info(f"3-up product slide created with {len(items)} item(s)")
    
    def _create_4up_product_slide(self, items: list):
        """
        Create a slide with 4 products (line sheet style).
        
        Layout: Images in top row, details in bottom row (4 columns).
        
        Args:
            items: List of 1-4 item dictionaries
        """
        slide = self.prs.slides.add_slide(self.blank_layout)
        
        # Column positions (left edge for each product)
        column_positions = [0.5, 2.9, 5.3, 7.7]  # Inches
        column_width = 2.1  # Width for each column
        
        # Process up to 4 items
        for idx, item in enumerate(items[:4]):
            if idx >= len(column_positions):
                break
                
            col_left = Inches(column_positions[idx])
            
            # Extract item data
            product_name = item.get('product_name', 'Unknown Product')
            sku = item.get('sku', '')
            color = item.get('color', '')
            subcategory = item.get('subcategory', '')
            origin = item.get('origin', '')
            description = item.get('description', '')
            materials = item.get('materials', [])
            wholesale_price = item.get('wholesale_price')
            rrp = item.get('rrp')
            currency = item.get('currency', 'USD')
            images = item.get('images', [])
            
            # Top row: Product image
            image_added = False
            image_width = Inches(1.8)
            image_height = Inches(2.5)
            image_top = Inches(1)
            
            if images and len(images) > 0:
                image_stream = self._download_image_as_stream(images[0])
                
                if image_stream:
                    try:
                        slide.shapes.add_picture(
                            image_stream,
                            left=col_left,
                            top=image_top,
                            width=image_width,
                            height=image_height
                        )
                        image_added = True
                    except Exception as e:
                        logger.warning(f"Failed to add image: {e}")
            
            # Show placeholder if no image
            if not image_added:
                image_box = slide.shapes.add_textbox(
                    left=col_left,
                    top=image_top,
                    width=image_width,
                    height=image_height
                )
                tf = image_box.text_frame
                tf.text = "[No Image]" if not images else "[N/A]"
                p = tf.paragraphs[0]
                p.font.size = Pt(10)
                p.font.italic = True
                p.alignment = PP_ALIGN.CENTER
            
            # Bottom row: Product details
            details_top = Inches(4)
            details_height = Inches(3.5)  # Extended to 7.5" from top
            
            details_box = slide.shapes.add_textbox(
                left=col_left,
                top=details_top,
                width=Inches(column_width),
                height=details_height
            )
            tf = details_box.text_frame
            tf.word_wrap = True
            
            # Product name
            p = tf.paragraphs[0]
            p.text = product_name
            p.font.size = Pt(9)
            p.font.bold = True
            
            # SKU
            if sku:
                p = tf.add_paragraph()
                p.text = f"SKU: {sku}"
                p.font.size = Pt(7)
                p.font.italic = True
            
            # Color
            if color:
                p = tf.add_paragraph()
                p.text = f"Color: {color}"
                p.font.size = Pt(7)
            
            # Subcategory
            if subcategory:
                p = tf.add_paragraph()
                p.text = f"Subcat: {subcategory}"
                p.font.size = Pt(7)
            
            # Origin
            if origin:
                p = tf.add_paragraph()
                p.text = f"Origin: {origin}"
                p.font.size = Pt(7)
            
            # Description (dynamic font sizing, word wrap enabled)
            if description:
                p = tf.add_paragraph()
                p.text = description
                
                # Dynamic font size based on length
                if len(description) <= 60:
                    p.font.size = Pt(7)
                elif len(description) <= 100:
                    p.font.size = Pt(6)
                else:
                    p.font.size = Pt(5)
            
            # Materials (show first 4)
            if materials:
                p = tf.add_paragraph()
                p.text = "Materials:"
                p.font.size = Pt(7)
                p.font.bold = True
                
                # Show first 4 materials
                for material in materials[:4]:
                    p = tf.add_paragraph()
                    p.text = f"• {material}"
                    p.font.size = Pt(6)
                
                # If more than 4, show count
                if len(materials) > 4:
                    p = tf.add_paragraph()
                    p.text = f"+ {len(materials) - 4} more"
                    p.font.size = Pt(6)
                    p.font.italic = True
            
            # Pricing
            if wholesale_price:
                p = tf.add_paragraph()
                p.text = f"W: {currency} {wholesale_price:.2f}"
                p.font.size = Pt(7)
            
            if rrp:
                p = tf.add_paragraph()
                p.text = f"RRP: {currency} {rrp:.2f}"
                p.font.size = Pt(7)
        
        logger.info(f"4-up product slide created with {len(items)} item(s)")
    
    async def _save_and_upload(self, collection_id: str) -> str:
        """
        Save presentation to temp file, upload to Firebase Storage, and clean up.
        
        Args:
            collection_id: ID of the collection
            
        Returns:
            Public download URL for the presentation
        """
        try:
            # Generate temp file path
            temp_dir = tempfile.gettempdir()
            timestamp = datetime.now().timestamp()
            temp_path = os.path.join(temp_dir, f"{collection_id}_{timestamp}.pptx")
            
            logger.info(f"Saving presentation to: {temp_path}")
            
            # Save presentation
            self.prs.save(temp_path)
            
            # Upload to Firebase Storage
            blob = self.bucket.blob(
                f"presentations/{collection_id}/presentation.pptx"
            )
            
            logger.info(f"Uploading to Firebase Storage: {blob.name}")
            blob.upload_from_filename(temp_path)
            
            # Make public and get URL with cache busting
            blob.make_public()
            cache_buster = datetime.now().timestamp()
            download_url = f"{blob.public_url}?v={cache_buster}"
            
            # Clean up temp file
            os.remove(temp_path)
            logger.info(f"Temp file cleaned up: {temp_path}")
            
            # Update collection document with presentation metadata
            collection_ref = self.db.collection('collections').document(collection_id)
            collection_ref.update({
                'presentation': {
                    'generated_at': datetime.utcnow(),
                    'download_url': download_url,
                    'slide_count': len(self.prs.slides)
                }
            })
            
            logger.info(f"Presentation metadata saved to Firestore")
            
            return download_url
            
        except Exception as e:
            logger.error(f"Error saving and uploading presentation: {e}")
            # Clean up temp file if it exists
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise


# Global service instance
presentation_generation_service = PresentationGenerationService()
