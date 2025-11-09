"""
Intro Slide Generation Service

Generates intro slide content for fashion collection presentations using LLM.
Supports 8 slide types: cover page, brand introduction, brand history, brand values,
brand personality, flagship stores, core collection, and product categories.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import HTTPException, status

from app.services.firebase_service import firebase_service
from app.services.brand_service import brand_service
from app.services.collection_service import collection_service
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class IntroSlideGenerationService:
    """Service for generating intro slide content using LLM"""
    
    def __init__(self):
        """Initialize the intro slide generation service"""
        self.db = firebase_service.db
        self.brand_service = brand_service
        self.collection_service = collection_service
        self.llm_service = llm_service
        logger.info("IntroSlideGenerationService initialized")
    
    async def generate_intro_slides(
        self, 
        collection_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """
        Generate intro slides for a collection based on enabled settings.
        
        Args:
            collection_id: The collection ID
            user_id: The authenticated user's ID
            
        Returns:
            Dictionary containing generated slides and metadata
            
        Raises:
            HTTPException: If collection not found or user doesn't have access
        """
        try:
            logger.info(f"Generating intro slides for collection {collection_id}")
            
            # 1. Fetch collection and brand data
            collection = await self.collection_service.get_collection(collection_id, user_id)
            brand = await self.brand_service.get_brand(collection.brand_id, user_id)
            
            logger.info(f"Fetched collection: {collection.name}, brand: {brand.name}")
            
            # Extract collection info
            brand_name = brand.name
            collection_name = collection.name
            collection_type = collection.season.value if collection.season else None
            year = collection.year
            categories = collection.categories
            settings = collection.settings
            
            # Get product names (for product-related slides)
            product_names = []
            if settings.include_core_collection_and_signature_categories_slide:
                # Fetch items to get product names
                try:
                    items_ref = self.db.collection('items').where('collection_id', '==', collection_id)
                    items_docs = items_ref.stream()
                    product_names = [doc.to_dict().get('product_name') for doc in items_docs if doc.to_dict().get('product_name')]
                    logger.info(f"Fetched {len(product_names)} product names")
                except Exception as e:
                    logger.warning(f"Could not fetch product names: {e}")
            
            # 2. Check enabled slides and generate
            slides = []
            
            if settings.include_cover_page_slide:
                logger.info("Generating cover page slide...")
                slide = await self._generate_cover_page(brand_name, collection_name, collection_type, year)
                slides.append(slide)
            
            if settings.include_brand_introduction_slide:
                logger.info("Generating brand introduction slide...")
                slide = await self._generate_brand_introduction(brand_name)
                slides.append(slide)
            
            if settings.include_brand_history_slide:
                logger.info("Generating brand history slide...")
                slide = await self._generate_brand_history(brand_name)
                slides.append(slide)
            
            if settings.include_brand_values_slide:
                logger.info("Generating brand values slide...")
                slide = await self._generate_brand_values(brand_name)
                slides.append(slide)
            
            if settings.include_brand_personality_slide:
                logger.info("Generating brand personality slide...")
                slide = await self._generate_brand_personality(brand_name)
                slides.append(slide)
            
            if settings.include_flagship_store_and_experiences_slide:
                logger.info("Generating flagship stores slide...")
                slide = await self._generate_flagship_stores(brand_name)
                slides.append(slide)
            
            if settings.include_core_collection_and_signature_categories_slide:
                logger.info("Generating core collection slide...")
                slide = await self._generate_core_collection(brand_name, collection_name, categories, product_names)
                slides.append(slide)
            
            # 3. Prepare result
            result = {
                "generated_at": datetime.utcnow().isoformat(),
                "slides": slides
            }
            
            # 4. Store results in Firestore
            logger.info(f"Storing {len(slides)} generated slides in Firestore...")
            collection_ref = self.db.collection('collections').document(collection_id)
            collection_ref.update({
                'intro_slides': result
            })
            
            logger.info(f"✅ Successfully generated {len(slides)} intro slides")
            
            # 5. Return generated slides
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating intro slides: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate intro slides: {str(e)}"
            )
    
    # ========================================
    # LLM Prompt Methods (8 Slide Types)
    # ========================================
    
    async def _generate_cover_page(
        self, 
        brand_name: str, 
        collection_name: str,
        collection_type: Optional[str],
        year: Optional[int]
    ) -> Dict[str, Any]:
        """
        Generate cover page slide for the collection presentation.
        
        Args:
            brand_name: Name of the brand
            collection_name: Name of the collection
            collection_type: Season/type (e.g., "fall_winter", "spring_summer")
            year: Collection year
            
        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            # Build prompt
            season_text = f"{collection_type.replace('_', ' ').title()} " if collection_type else ""
            year_text = f"{year} " if year else ""
            
            prompt = f"""Generate a cover page for a fashion collection presentation.

Brand: {brand_name}
Collection: {collection_name}
Season: {season_text}{year_text}

Create an engaging cover page with a title, subtitle, and tagline that captures the essence of this collection.

Return ONLY valid JSON in this exact format:
{{
    "title": "Main title for the cover (collection name with season/year)",
    "subtitle": "Brand name or collection tagline",
    "tagline": "Short compelling tagline (5-10 words)"
}}"""

            logger.info(f"Calling LLM for cover page: {brand_name} - {collection_name}")
            
            # Call LLM
            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=200
            )
            
            # Parse response
            content = response if isinstance(response, dict) else {}
            
            logger.info(f"Generated cover page: {content.get('title', 'N/A')}")
            
            return {
                "slide_type": "cover_page",
                "title": content.get("title", f"{season_text}{year_text}{collection_name}"),
                "subtitle": content.get("subtitle", brand_name),
                "content": content
            }
            
        except Exception as e:
            logger.error(f"Error generating cover page: {e}")
            # Return fallback content
            return {
                "slide_type": "cover_page",
                "title": f"{collection_name}",
                "subtitle": brand_name,
                "content": {
                    "title": f"{collection_name}",
                    "subtitle": brand_name,
                    "tagline": "Fashion Collection"
                }
            }
    
    async def _generate_brand_introduction(self, brand_name: str) -> Dict[str, Any]:
        """
        Generate brand introduction slide.
        
        Args:
            brand_name: Name of the brand
            
        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            prompt = f"""Generate a brand introduction slide for {brand_name}.

Create a compelling brand introduction that captures the essence and identity of {brand_name}.
Include a brief overview and 3-4 key points about the brand.

Return ONLY valid JSON in this exact format:
{{
    "title": "About {brand_name}",
    "overview": "2-3 sentence brand overview",
    "key_points": ["Point 1", "Point 2", "Point 3"]
}}"""

            logger.info(f"Calling LLM for brand introduction: {brand_name}")
            
            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=300
            )
            
            content = response if isinstance(response, dict) else {}
            
            logger.info(f"Generated brand introduction for {brand_name}")
            
            return {
                "slide_type": "brand_introduction",
                "title": content.get("title", f"About {brand_name}"),
                "content": content
            }
            
        except Exception as e:
            logger.error(f"Error generating brand introduction: {e}")
            return {
                "slide_type": "brand_introduction",
                "title": f"About {brand_name}",
                "content": {
                    "title": f"About {brand_name}",
                    "overview": f"{brand_name} is a contemporary fashion brand.",
                    "key_points": []
                }
            }
    
    async def _generate_brand_history(self, brand_name: str) -> Dict[str, Any]:
        """
        Generate brand history slide.
        
        Args:
            brand_name: Name of the brand
            
        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            prompt = f"""Generate a brand history slide for {brand_name}.

Create a compelling brand history that tells the story of {brand_name}.
Include founding information and key milestones.

Return ONLY valid JSON in this exact format:
{{
    "title": "Brand History",
    "founding_year": "Year founded",
    "founder": "Founder name(s)",
    "origin": "City/Country of origin",
    "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"]
}}"""

            logger.info(f"Calling LLM for brand history: {brand_name}")
            
            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=400
            )
            
            content = response if isinstance(response, dict) else {}
            
            logger.info(f"Generated brand history for {brand_name}")
            
            return {
                "slide_type": "brand_history",
                "title": content.get("title", "Brand History"),
                "content": content
            }
            
        except Exception as e:
            logger.error(f"Error generating brand history: {e}")
            return {
                "slide_type": "brand_history",
                "title": "Brand History",
                "content": {
                    "title": "Brand History",
                    "founding_year": "N/A",
                    "founder": "N/A",
                    "origin": "N/A",
                    "milestones": []
                }
            }
    
    async def _generate_brand_values(self, brand_name: str) -> Dict[str, Any]:
        """
        Generate brand values slide.
        
        Args:
            brand_name: Name of the brand
            
        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            prompt = f"""Generate a brand values slide for {brand_name}.

Identify and describe the core values that define {brand_name}.
Include 3-5 key values with brief descriptions.

Return ONLY valid JSON in this exact format:
{{
    "title": "Brand Values",
    "values": [
        {{
            "name": "Value name",
            "description": "Brief description of this value"
        }}
    ]
}}"""

            logger.info(f"Calling LLM for brand values: {brand_name}")
            
            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=400
            )
            
            content = response if isinstance(response, dict) else {}
            
            logger.info(f"Generated brand values for {brand_name}")
            
            return {
                "slide_type": "brand_values",
                "title": content.get("title", "Brand Values"),
                "content": content
            }
            
        except Exception as e:
            logger.error(f"Error generating brand values: {e}")
            return {
                "slide_type": "brand_values",
                "title": "Brand Values",
                "content": {
                    "title": "Brand Values",
                    "values": []
                }
            }
    
    async def _generate_brand_personality(self, brand_name: str) -> Dict[str, Any]:
        """
        Generate brand personality slide.
        
        Args:
            brand_name: Name of the brand
            
        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            prompt = f"""Generate a brand personality slide for {brand_name}.

Describe the personality and aesthetic that defines {brand_name}.
Include personality traits, style descriptors, and brand voice.

Return ONLY valid JSON in this exact format:
{{
    "title": "Brand Personality",
    "personality_traits": ["Trait 1", "Trait 2", "Trait 3"],
    "style_descriptors": ["Descriptor 1", "Descriptor 2", "Descriptor 3"],
    "brand_voice": "Description of the brand's voice and tone"
}}"""

            logger.info(f"Calling LLM for brand personality: {brand_name}")
            
            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=400
            )
            
            content = response if isinstance(response, dict) else {}
            
            logger.info(f"Generated brand personality for {brand_name}")
            
            return {
                "slide_type": "brand_personality",
                "title": content.get("title", "Brand Personality"),
                "content": content
            }
            
        except Exception as e:
            logger.error(f"Error generating brand personality: {e}")
            return {
                "slide_type": "brand_personality",
                "title": "Brand Personality",
                "content": {
                    "title": "Brand Personality",
                    "personality_traits": [],
                    "style_descriptors": [],
                    "brand_voice": ""
                }
            }
    
    async def _generate_flagship_stores(self, brand_name: str) -> Dict[str, Any]:
        """
        Generate flagship stores & experiences slide.
        
        Args:
            brand_name: Name of the brand
            
        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            prompt = f"""Generate a flagship stores and experiences slide for {brand_name}.

Describe {brand_name}'s retail presence, flagship store locations, and brand experiences.
Include key store locations and what makes the retail experience special.

Return ONLY valid JSON in this exact format:
{{
    "title": "Flagship Stores & Experiences",
    "store_locations": [
        {{
            "city": "City name",
            "description": "Brief description of this location"
        }}
    ],
    "retail_experience": "Description of the overall retail experience and brand atmosphere"
}}"""

            logger.info(f"Calling LLM for flagship stores: {brand_name}")
            
            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=400
            )
            
            content = response if isinstance(response, dict) else {}
            
            logger.info(f"Generated flagship stores for {brand_name}")
            
            return {
                "slide_type": "flagship_stores",
                "title": content.get("title", "Flagship Stores & Experiences"),
                "content": content
            }
            
        except Exception as e:
            logger.error(f"Error generating flagship stores: {e}")
            return {
                "slide_type": "flagship_stores",
                "title": "Flagship Stores & Experiences",
                "content": {
                    "title": "Flagship Stores & Experiences",
                    "store_locations": [],
                    "retail_experience": ""
                }
            }
    
    async def _generate_core_collection(
        self, 
        brand_name: str,
        collection_name: str,
        categories: List[Dict[str, Any]],
        product_names: List[str]
    ) -> Dict[str, Any]:
        """
        Generate core collection & signature categories slide.
        
        Args:
            brand_name: Name of the brand
            collection_name: Name of the collection
            categories: List of category objects from collection
            product_names: List of actual product names from items
            
        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            # Extract category names
            category_names = [cat.get('name', cat) if isinstance(cat, dict) else str(cat) for cat in categories]
            
            # Build prompt with real data
            categories_text = ", ".join(category_names) if category_names else "Various categories"
            products_text = ", ".join(product_names[:10]) if product_names else "Collection pieces"  # Limit to first 10
            
            prompt = f"""Generate a core collection slide for {brand_name} {collection_name}.

Based on {brand_name}'s brand aesthetic and the following products, tell the story of this collection.
What defines this collection? Which pieces are the heroes/signatures that embody the creative vision?

Collection Categories: {categories_text}
Sample Products: {products_text}

Use your knowledge of {brand_name}'s brand identity (grunge, denim heritage, edgy aesthetic) combined with 
the actual product names provided. Focus on creative direction and what makes this collection special.

Return ONLY valid JSON in this exact format:
{{
    "title": "Core Collection & Signature Categories",
    "overview": "Tell the story of this collection - what defines it? (2-3 sentences)",
    "signature_categories": [
        {{
            "category": "Category name from the list above",
            "description": "What makes this category special in this collection's story",
            "key_pieces": ["Product name 1", "Product name 2"]
        }}
    ]
}}"""

            logger.info(f"Calling LLM for core collection: {brand_name} {collection_name}")
            
            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=600
            )
            
            content = response if isinstance(response, dict) else {}
            
            logger.info(f"Generated core collection for {collection_name}")
            
            return {
                "slide_type": "core_collection",
                "title": content.get("title", "Core Collection & Signature Categories"),
                "content": content
            }
            
        except Exception as e:
            logger.error(f"Error generating core collection: {e}")
            return {
                "slide_type": "core_collection",
                "title": "Core Collection & Signature Categories",
                "content": {
                    "title": "Core Collection & Signature Categories",
                    "overview": f"{collection_name} collection",
                    "signature_categories": []
                }
            }
    


# Global service instance
intro_slide_generation_service = IntroSlideGenerationService()
