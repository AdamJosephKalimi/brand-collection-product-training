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
        self._w_scale = 1.0  # Horizontal scale factor (1.0 for 4:3, 1.333 for 16:9)
        self._h_offset = 0  # Horizontal offset in inches to center 10"-wide content in wider slides
    
    async def generate_presentation(
        self,
        collection_id: str,
        user_id: str,
        products_per_slide: int = 1,
        slide_aspect_ratio: str = "16:9"
    ) -> str:
        """
        Generate complete PowerPoint presentation for a collection.

        Args:
            collection_id: ID of the collection
            user_id: ID of the user requesting generation
            products_per_slide: Number of products per slide (1, 2, or 4)
            slide_aspect_ratio: Slide aspect ratio ("4:3" or "16:9")

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

            # Set slide dimensions based on aspect ratio
            if slide_aspect_ratio == "16:9":
                self.prs.slide_width = Inches(13.333)
                self.prs.slide_height = Inches(7.5)
                self._w_scale = 13.333 / 10.0  # ~1.333
                self._h_offset = (13.333 - 10.0) / 2.0  # ~1.667" per side
            else:
                # 4:3 (default python-pptx dimensions)
                self.prs.slide_width = Inches(10)
                self.prs.slide_height = Inches(7.5)
                self._w_scale = 1.0
                self._h_offset = 0

            self.blank_layout = self.prs.slide_layouts[6]  # Blank layout
            self.title_slide_layout = self.prs.slide_layouts[0]  # Title Slide
            self.title_content_layout = self.prs.slide_layouts[1]  # Title and Content

            # Center intro layout placeholders for widescreen (no-op for 4:3)
            self._center_layout_placeholders()

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
    
    def _center_layout_placeholders(self):
        """
        Center title and content placeholders in the intro slide layouts
        for widescreen. Modifies the LAYOUT-level placeholders so that
        slide-level shapes inherit correct centered positions.

        CRITICAL: Must read ALL four geometry properties (left, top, width,
        height) BEFORE writing ANY of them. Setting just `ph.left` on a
        placeholder that inherits its xfrm from the slide master creates a
        new xfrm element with zeroed width/height, making it invisible.
        """
        if self._h_offset == 0:
            return
        slide_w = self.prs.slide_width
        for layout in [self.title_slide_layout, self.title_content_layout]:
            for ph in layout.placeholders:
                if ph.placeholder_format.idx in (0, 1):
                    # Read ALL inherited values BEFORE any setter triggers xfrm creation
                    w = ph.width
                    h = ph.height
                    t = ph.top
                    # Write all four to create a complete xfrm element
                    ph.left = (slide_w - w) // 2
                    ph.top = t
                    ph.width = w
                    ph.height = h

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
        
        # Tagline - add as manual textbox at bottom, centered across full slide width
        if content.get('tagline'):
            tagline_width = 8.0  # inches
            slide_w = 13.333 if self._w_scale > 1 else 10.0
            tagline_left = (slide_w - tagline_width) / 2.0
            tagline_box = slide.shapes.add_textbox(
                left=Inches(tagline_left),
                top=Inches(6.5),
                width=Inches(tagline_width),
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
        
        Args:
            data: Slide data containing title, content with founding, evolution, market_context, philosophical_takeaway
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Brand History')
        
        # Use content placeholder
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        first_paragraph = True
        
        # Extract nested founding structure
        founding = content.get('founding', {})
        if founding and isinstance(founding, dict):
            year = founding.get('year', '')
            founder_info = founding.get('founder', {})
            origin_info = founding.get('origin', {})
            
            # Founder name and background
            founder_name = founder_info.get('name', '') if isinstance(founder_info, dict) else str(founder_info) if founder_info else ''
            founder_bg = founder_info.get('background', '') if isinstance(founder_info, dict) else ''
            
            # Origin city and country
            city = origin_info.get('city', '') if isinstance(origin_info, dict) else str(origin_info) if origin_info else ''
            country = origin_info.get('country', '') if isinstance(origin_info, dict) else ''
            
            # Build founding text
            if year or founder_name:
                p = tf.paragraphs[0] if first_paragraph else tf.add_paragraph()
                first_paragraph = False
                
                founding_text = f"Founded in {year}" if year else "Founded"
                if founder_name:
                    founding_text += f" by {founder_name}"
                if city or country:
                    location = f"{city}, {country}" if city and country else city or country
                    founding_text += f" in {location}"
                
                p.text = founding_text
                p.font.size = Pt(14)
                p.font.bold = True
                p.level = 0
            
            if founder_bg:
                p = tf.add_paragraph()
                p.text = founder_bg
                p.font.size = Pt(13)
                p.level = 0
        
        # Fallback for flat structure (backward compatibility)
        elif content.get('founding_year') or content.get('founder'):
            p = tf.paragraphs[0] if first_paragraph else tf.add_paragraph()
            first_paragraph = False
            p.text = f"Founded: {content.get('founding_year', '')}"
            if content.get('founder'):
                p.text += f" by {content.get('founder')}"
            p.font.size = Pt(14)
            p.level = 0
        
        # Add evolution section
        evolution = content.get('evolution', {})
        if evolution and isinstance(evolution, dict):
            early_identity = evolution.get('early_identity', '')
            key_shifts = evolution.get('key_shifts', [])
            signature_elements = evolution.get('signature_elements', [])
            
            if early_identity or key_shifts or signature_elements:
                p = tf.add_paragraph()
                p.text = ""  # Spacing
                
                p = tf.add_paragraph()
                p.text = "Brand Evolution:"
                p.font.size = Pt(14)
                p.font.bold = True
                p.level = 0
                
                if early_identity:
                    p = tf.add_paragraph()
                    p.text = early_identity
                    p.font.size = Pt(12)
                    p.level = 1
                
                for shift in key_shifts:
                    p = tf.add_paragraph()
                    p.text = shift
                    p.font.size = Pt(12)
                    p.level = 1
                
                if signature_elements:
                    p = tf.add_paragraph()
                    p.text = ""  # Spacing
                    
                    p = tf.add_paragraph()
                    p.text = "Signature Elements:"
                    p.font.size = Pt(13)
                    p.font.bold = True
                    p.level = 0
                    
                    for element in signature_elements:
                        p = tf.add_paragraph()
                        p.text = element
                        p.font.size = Pt(12)
                        p.level = 1
        
        # Add market context
        market_context = content.get('market_context', {})
        if market_context and isinstance(market_context, dict):
            positioning = market_context.get('positioning', '')
            production = market_context.get('production_philosophy', '')
            footprint = market_context.get('current_footprint', '')
            
            if positioning or production or footprint:
                p = tf.add_paragraph()
                p.text = ""  # Spacing
                
                if positioning:
                    p = tf.add_paragraph()
                    run = p.add_run()
                    run.text = "Market Position: "
                    run.font.bold = True
                    run.font.size = Pt(12)
                    run = p.add_run()
                    run.text = positioning
                    run.font.size = Pt(12)
                    p.level = 0
                
                if production:
                    p = tf.add_paragraph()
                    run = p.add_run()
                    run.text = "Production: "
                    run.font.bold = True
                    run.font.size = Pt(12)
                    run = p.add_run()
                    run.text = production
                    run.font.size = Pt(12)
                    p.level = 0
        
        # Add philosophical takeaway
        takeaway = content.get('philosophical_takeaway', '')
        if takeaway:
            p = tf.add_paragraph()
            p.text = ""  # Spacing
            
            p = tf.add_paragraph()
            p.text = takeaway
            p.font.size = Pt(12)
            p.font.italic = True
            p.level = 0
        
        logger.info("Brand history slide created (using Title and Content layout)")
    
    def _create_brand_introduction_slide(self, data: Dict[str, Any]):
        """
        Create brand introduction slide using Title and Content layout.
        
        Args:
            data: Slide data containing title, content with overview, brand_identity, name_and_history
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Brand Introduction')
        
        # Use content placeholder
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        first_paragraph = True
        
        # Add overview section (nested object with summary and positioning)
        overview = content.get('overview', {})
        if isinstance(overview, dict):
            summary = overview.get('summary', '')
            positioning = overview.get('positioning', '')
            
            if summary:
                p = tf.paragraphs[0] if first_paragraph else tf.add_paragraph()
                first_paragraph = False
                p.text = summary
                p.font.size = Pt(14)
                p.level = 0
            
            if positioning:
                p = tf.add_paragraph()
                p.text = positioning
                p.font.size = Pt(14)
                p.level = 0
        elif overview:  # Fallback if it's a string
            p = tf.paragraphs[0] if first_paragraph else tf.add_paragraph()
            first_paragraph = False
            p.text = str(overview)
            p.font.size = Pt(14)
            p.level = 0
        
        # Add brand identity section
        brand_identity = content.get('brand_identity', {})
        if brand_identity:
            essence = brand_identity.get('essence', '')
            differentiators = brand_identity.get('differentiators', [])
            unique_facts = brand_identity.get('unique_facts', [])
            
            if essence:
                p = tf.add_paragraph()
                p.text = ""  # Spacing
                
                p = tf.add_paragraph()
                run = p.add_run()
                run.text = "Brand Essence: "
                run.font.bold = True
                run.font.size = Pt(14)
                run = p.add_run()
                run.text = essence
                run.font.size = Pt(14)
                p.level = 0
            
            if differentiators:
                p = tf.add_paragraph()
                p.text = ""  # Spacing
                
                p = tf.add_paragraph()
                p.text = "What Sets Us Apart:"
                p.font.bold = True
                p.font.size = Pt(14)
                p.level = 0
                
                for diff in differentiators:
                    p = tf.add_paragraph()
                    p.text = diff
                    p.font.size = Pt(13)
                    p.level = 1
            
            if unique_facts:
                p = tf.add_paragraph()
                p.text = ""  # Spacing
                
                p = tf.add_paragraph()
                p.text = "Did You Know:"
                p.font.bold = True
                p.font.size = Pt(14)
                p.level = 0
                
                for fact in unique_facts:
                    p = tf.add_paragraph()
                    p.text = fact
                    p.font.size = Pt(13)
                    p.level = 1
        
        # Add name and history section if present
        name_history = content.get('name_and_history', {})
        if name_history:
            name_origin = name_history.get('name_origin', '')
            background = name_history.get('background', '')
            
            if name_origin or background:
                p = tf.add_paragraph()
                p.text = ""  # Spacing
                
                if name_origin:
                    p = tf.add_paragraph()
                    run = p.add_run()
                    run.text = "Name Origin: "
                    run.font.bold = True
                    run.font.size = Pt(14)
                    run = p.add_run()
                    run.text = name_origin
                    run.font.size = Pt(14)
                    p.level = 0
                
                if background:
                    p = tf.add_paragraph()
                    p.text = background
                    p.font.size = Pt(13)
                    p.level = 0
        
        logger.info("Brand introduction slide created (using Title and Content layout)")
    
    def _create_brand_values_slide(self, data: Dict[str, Any]):
        """
        Create brand values slide using Title and Content layout.
        
        Args:
            data: Slide data containing title, content with values array (headline + explanation)
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Brand Values')
        
        # Use content placeholder
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        # Add values - LLM returns {headline, explanation} for each value
        values = content.get('values', [])
        if values:
            p = tf.paragraphs[0]
            first = True
            
            for value in values:
                if not first:
                    p = tf.add_paragraph()
                first = False
                
                # Value headline and explanation (also support name/description as fallback)
                value_name = value.get('headline', value.get('name', '')) if isinstance(value, dict) else str(value)
                value_desc = value.get('explanation', value.get('description', '')) if isinstance(value, dict) else ''
                
                p.level = 0
                
                if value_desc:
                    # Add value name in bold
                    run = p.add_run()
                    run.text = f"{value_name}: "
                    run.font.bold = True
                    run.font.size = Pt(14)
                    
                    # Add explanation in normal text
                    run = p.add_run()
                    run.text = value_desc
                    run.font.size = Pt(14)
                else:
                    # Just the value name
                    p.text = value_name
                    p.font.size = Pt(14)
        
        logger.info("Brand values slide created (using Title and Content layout)")
    
    def _create_brand_personality_slide(self, data: Dict[str, Any]):
        """
        Create brand personality slide using Title and Content layout.
        
        Args:
            data: Slide data containing title, content with quote and traits (name + explanation)
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Brand Personality')
        
        # Use content placeholder
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        first_paragraph = True
        
        # Add quote section if present
        quote = content.get('quote', {})
        if quote and isinstance(quote, dict):
            quote_text = quote.get('text', '')
            attribution = quote.get('attribution', '')
            
            if quote_text:
                p = tf.paragraphs[0] if first_paragraph else tf.add_paragraph()
                first_paragraph = False
                p.text = f'"{quote_text}"'
                p.font.size = Pt(14)
                p.font.italic = True
                p.level = 0
                
                if attribution:
                    p = tf.add_paragraph()
                    p.text = f"— {attribution}"
                    p.font.size = Pt(12)
                    p.level = 0
                
                # Add spacing after quote
                p = tf.add_paragraph()
                p.text = ""
        
        # Add traits section - LLM returns {name, explanation} for each trait
        traits = content.get('traits', content.get('personality_traits', []))
        if traits:
            p = tf.paragraphs[0] if first_paragraph else tf.add_paragraph()
            first_paragraph = False
            
            p.text = "Personality Traits:"
            p.font.size = Pt(14)
            p.font.bold = True
            p.level = 0
            
            for trait in traits:
                p = tf.add_paragraph()
                
                if isinstance(trait, dict):
                    trait_name = trait.get('name', '')
                    explanation = trait.get('explanation', '')
                    
                    if explanation:
                        run = p.add_run()
                        run.text = f"{trait_name}: "
                        run.font.bold = True
                        run.font.size = Pt(13)
                        
                        run = p.add_run()
                        run.text = explanation
                        run.font.size = Pt(13)
                    else:
                        p.text = trait_name
                        p.font.size = Pt(13)
                else:
                    p.text = str(trait)
                    p.font.size = Pt(13)
                
                p.level = 1
        
        logger.info("Brand personality slide created (using Title and Content layout)")
    
    def _create_flagship_stores_slide(self, data: Dict[str, Any]):
        """
        Create flagship stores slide using Title and Content layout.
        
        Args:
            data: Slide data containing title, content with flagship_stores array and alternative_experiences
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Flagship Stores & Experiences')
        
        # Use content placeholder
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        first_paragraph = True
        
        # Add flagship stores - LLM returns nested structure with name, location, design_elements, etc.
        stores = content.get('flagship_stores', content.get('store_locations', content.get('stores', [])))
        alternative = content.get('alternative_experiences', '')
        
        if stores:
            for store in stores:
                if isinstance(store, dict):
                    # Get store name and location
                    store_name = store.get('name', '')
                    location = store.get('location', {})
                    city = location.get('city', '') if isinstance(location, dict) else str(location)
                    country = location.get('country', '') if isinstance(location, dict) else ''
                    year_opened = store.get('year_opened', '')
                    
                    # Build store header
                    location_str = f"{city}, {country}" if city and country else city or country
                    header = store_name or location_str
                    if year_opened and header:
                        header = f"{header} ({year_opened})"
                    
                    if header:
                        p = tf.paragraphs[0] if first_paragraph else tf.add_paragraph()
                        first_paragraph = False
                        p.text = header
                        p.font.size = Pt(14)
                        p.font.bold = True
                        p.level = 0
                    
                    # Add design elements
                    design = store.get('design_elements', '')
                    if design:
                        p = tf.add_paragraph()
                        run = p.add_run()
                        run.text = "Design: "
                        run.font.bold = True
                        run.font.size = Pt(12)
                        run = p.add_run()
                        run.text = design
                        run.font.size = Pt(12)
                        p.level = 1
                    
                    # Add customer experience
                    experience = store.get('customer_experience', '')
                    if experience:
                        p = tf.add_paragraph()
                        run = p.add_run()
                        run.text = "Experience: "
                        run.font.bold = True
                        run.font.size = Pt(12)
                        run = p.add_run()
                        run.text = experience
                        run.font.size = Pt(12)
                        p.level = 1
                    
                    # Add cultural meaning
                    cultural = store.get('cultural_meaning', '')
                    if cultural:
                        p = tf.add_paragraph()
                        run = p.add_run()
                        run.text = "Significance: "
                        run.font.bold = True
                        run.font.size = Pt(12)
                        run = p.add_run()
                        run.text = cultural
                        run.font.size = Pt(12)
                        p.level = 1
                    
                    # Add spacing between stores
                    p = tf.add_paragraph()
                    p.text = ""
                else:
                    # Simple string store
                    p = tf.paragraphs[0] if first_paragraph else tf.add_paragraph()
                    first_paragraph = False
                    p.text = str(store)
                    p.font.size = Pt(13)
                    p.level = 0
        
        # Alternative experiences section (if no flagship stores)
        if alternative and not stores:
            p = tf.paragraphs[0] if first_paragraph else tf.add_paragraph()
            first_paragraph = False
            p.text = alternative
            p.font.size = Pt(14)
            p.level = 0
        
        logger.info("Flagship stores slide created (using Title and Content layout)")
    
    def _create_core_collection_slide(self, data: Dict[str, Any]):
        """
        Create core collection slide using Title and Content layout.
        
        Args:
            data: Slide data containing title, content with signature_categories (headline, description, iconic_staple)
        """
        slide = self.prs.slides.add_slide(self.title_content_layout)
        content = data.get('content', {})
        
        # Use title placeholder
        title = slide.shapes.title
        title.text = data.get('title', 'Core Collection & Signature Categories')
        
        # Use content placeholder
        content_placeholder = slide.placeholders[1]
        tf = content_placeholder.text_frame
        
        first_paragraph = True
        
        # Add signature categories - LLM returns {headline, description, iconic_staple}
        categories = content.get('signature_categories', [])
        if categories:
            p = tf.paragraphs[0] if first_paragraph else tf.add_paragraph()
            first_paragraph = False
            p.text = "Signature Categories:"
            p.font.size = Pt(14)
            p.font.bold = True
            p.level = 0
            
            for category in categories:
                p = tf.add_paragraph()
                
                if isinstance(category, dict):
                    # Get headline (primary), fall back to category/name
                    cat_name = category.get('headline', category.get('category', category.get('name', '')))
                    cat_desc = category.get('description', '')
                    iconic_staple = category.get('iconic_staple')
                    
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
                    
                    # Add iconic staple if available and not null
                    if iconic_staple and iconic_staple != 'null':
                        p = tf.add_paragraph()
                        run = p.add_run()
                        run.text = "Iconic Staple: "
                        run.font.bold = True
                        run.font.size = Pt(12)
                        run = p.add_run()
                        run.text = str(iconic_staple)
                        run.font.size = Pt(12)
                        p.level = 2
                else:
                    # Simple string category
                    p.text = str(category)
                    p.font.size = Pt(13)
                    p.level = 1
        
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

        # Sort by category (alphabetical, nulls last) then display_order
        # Matches item_service.get_collection_items sort order
        items.sort(key=lambda x: (x.get('category') or 'zzz', x.get('display_order', 0)))

        # Group items by category (preserves sort order within each group)
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
            left=Inches(1 * self._w_scale),
            top=Inches(3.5),
            width=Inches(8 * self._w_scale),
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
    
    def _add_slide_title(self, slide, items):
        """
        Add a 'Category - SubCategory' title to the top-left of a product slide.

        Args:
            slide: The slide object to add the title to
            items: A single item dict or list of item dicts on this slide
        """
        if isinstance(items, dict):
            items = [items]
        if not items:
            return

        first = items[0]
        category = first.get('category', '')
        subcategory = first.get('subcategory', '')

        if category and subcategory:
            title_text = f"{category} - {subcategory}"
        elif category:
            title_text = category
        else:
            return

        title_box = slide.shapes.add_textbox(
            left=Inches(0.4),
            top=Inches(0.25),
            width=Inches(5),
            height=Inches(0.4)
        )
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.italic = True

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
        self._add_slide_title(slide, item)

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
                        left=Inches(0.75 * self._w_scale),
                        top=Inches(1.5),
                        width=Inches(3.5),
                        height=Inches(5)
                    )
                    image_added = True
                    logger.debug(f"Image added for product: {product_name}")
                except Exception as e:
                    logger.warning(f"Failed to add image to slide: {e}")
        
        # Show placeholder if no image was added
        if not image_added:
            image_box = slide.shapes.add_textbox(
                left=Inches(0.5 * self._w_scale),
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
            left=Inches(5.5 * self._w_scale),
            top=Inches(1),
            width=Inches(4 * self._w_scale),
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
        self._add_slide_title(slide, items)

        # Process up to 2 items
        for idx, item in enumerate(items[:2]):
            # Calculate position based on column (0 = left, 1 = right)
            column_offset = idx * 5 * self._w_scale  # 5 inches between columns, scaled

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
            image_left = Inches(0.5 * self._w_scale + column_offset)
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
            details_left = Inches(2.75 * self._w_scale + column_offset)
            details_width = Inches(2 * self._w_scale)
            
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
        self._add_slide_title(slide, items)

        # Column positions (left edge for each product) - 3 columns with more space
        column_positions = [1.0 * self._w_scale, 4.0 * self._w_scale, 7.0 * self._w_scale]
        column_width = 2.5 * self._w_scale
        
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
            
            # Top row: Product image (keep original size, don't stretch)
            image_added = False
            image_width = Inches(2.5)  # Original 3-up image width
            image_height = Inches(3.5)
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
        self._add_slide_title(slide, items)

        # Column positions (left edge for each product)
        column_positions = [0.5 * self._w_scale, 2.9 * self._w_scale, 5.3 * self._w_scale, 7.7 * self._w_scale]
        column_width = 2.1 * self._w_scale
        
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
            storage_path = f"presentations/{collection_id}/presentation.pptx"
            collection_ref = self.db.collection('collections').document(collection_id)
            collection_ref.update({
                'presentation': {
                    'generated_at': datetime.utcnow(),
                    'download_url': download_url,
                    'slide_count': len(self.prs.slides),
                    'storage_path': storage_path
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
