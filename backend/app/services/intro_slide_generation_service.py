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
from app.services.pinecone_service import pinecone_service

logger = logging.getLogger(__name__)

LANGUAGE_NAMES = {
    "en": "English",
    "zh": "Chinese (Simplified)",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
}


class IntroSlideGenerationService:
    """Service for generating intro slide content using LLM"""
    
    def __init__(self):
        """Initialize the intro slide generation service"""
        self.db = firebase_service.db
        self.brand_service = brand_service
        self.collection_service = collection_service
        self.llm_service = llm_service
        logger.info("IntroSlideGenerationService initialized")

    @staticmethod
    def _language_instruction(language: str) -> str:
        """Build a language instruction suffix for LLM prompts. Returns empty string for English."""
        if language == "en":
            return ""
        lang_name = LANGUAGE_NAMES.get(language, language)
        return f"\n\nIMPORTANT: Generate ALL text content in {lang_name}."

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
            
            # Determine output language
            selected_language = settings.selected_language if settings else "en"
            logger.info(f"Deck output language: {selected_language}")

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
            brand_id = collection.brand_id
            slides = []

            if settings.include_cover_page_slide:
                logger.info("Generating cover page slide...")
                slide = await self._generate_cover_page(brand_name, collection_name, collection_type, year, language=selected_language)
                slides.append(slide)

            if settings.include_brand_introduction_slide:
                logger.info("Generating brand introduction slide...")
                slide = await self._generate_brand_introduction(brand_name, brand_id, language=selected_language)
                slides.append(slide)

            if settings.include_brand_history_slide:
                logger.info("Generating brand history slide...")
                slide = await self._generate_brand_history(brand_name, brand_id, language=selected_language)
                slides.append(slide)

            if settings.include_brand_values_slide:
                logger.info("Generating brand values slide...")
                slide = await self._generate_brand_values(brand_name, brand_id, language=selected_language)
                slides.append(slide)

            if settings.include_brand_personality_slide:
                logger.info("Generating brand personality slide...")
                slide = await self._generate_brand_personality(brand_name, brand_id, language=selected_language)
                slides.append(slide)

            if settings.include_flagship_store_and_experiences_slide:
                logger.info("Generating flagship stores slide...")
                slide = await self._generate_flagship_stores(brand_name, brand_id, language=selected_language)
                slides.append(slide)

            if settings.include_collection_introduction_slide:
                logger.info("Generating collection introduction slide...")
                slide = await self._generate_collection_introduction(
                    brand_name, collection_name, collection_type, year,
                    brand_id=brand_id, collection_id=collection_id,
                    language=selected_language
                )
                slides.append(slide)

            if settings.include_core_collection_and_signature_categories_slide:
                logger.info("Generating core collection slide...")
                slide = await self._generate_core_collection(brand_name, collection_name, categories, product_names, brand_id, language=selected_language)
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
    
    async def _retrieve_brand_context(self, brand_id: str, query: str, top_k: int = 5) -> str:
        """
        Retrieve relevant brand context from Pinecone for RAG injection.

        Args:
            brand_id: The brand ID to search context for
            query: Semantic search query tailored to the slide type
            top_k: Number of chunks to retrieve

        Returns:
            Formatted context string, or empty string if no context available
        """
        try:
            results = await pinecone_service.search_brand_context(
                brand_id=brand_id,
                query=query,
                top_k=top_k
            )
            if results:
                chunks = [r["metadata"]["text"] for r in results if r.get("metadata", {}).get("text")]
                if chunks:
                    return "\n\n".join(chunks)
        except Exception as e:
            logger.warning(f"Failed to retrieve brand context for RAG: {e}")
        return ""

    def _build_context_block(self, rag_context: str, label: str = "BRAND REFERENCE MATERIAL") -> str:
        """Build the RAG context block to prepend to prompts."""
        if not rag_context:
            return ""
        return f"""
IMPORTANT: The following is verified information from official documents.
Use this as your ONLY source of facts. Extract and use SPECIFIC names, numbers,
colors, and details EXACTLY as they appear below. Do NOT paraphrase, generalize,
or invent details that are not in this material. Never contradict the documents.

--- {label} ---
{rag_context}
--- END {label} ---

"""

    async def _retrieve_collection_context(self, collection_id: str, query: str, top_k: int = 5) -> str:
        """
        Retrieve relevant collection context from Pinecone for RAG injection.

        Args:
            collection_id: The collection ID to search context for
            query: Semantic search query tailored to the slide type
            top_k: Number of chunks to retrieve

        Returns:
            Formatted context string, or empty string if no context available
        """
        try:
            logger.info(f"Searching Pinecone for collection context: collection_id={collection_id}, query='{query[:80]}...', top_k={top_k}")
            results = await pinecone_service.search_collection_context(
                collection_id=collection_id,
                query=query,
                top_k=top_k
            )
            logger.info(f"Pinecone returned {len(results) if results else 0} results for collection {collection_id}")
            if results:
                for i, r in enumerate(results[:3]):
                    score = r.get("score", "N/A")
                    text_preview = r.get("metadata", {}).get("text", "")[:100]
                    logger.info(f"  Result {i+1}: score={score}, text='{text_preview}...'")
                chunks = [r["metadata"]["text"] for r in results if r.get("metadata", {}).get("text")]
                if chunks:
                    return "\n\n".join(chunks)
        except Exception as e:
            logger.warning(f"Failed to retrieve collection context for RAG: {e}")
        return ""

    # ========================================
    # LLM Prompt Methods (8 Slide Types)
    # ========================================
    
    async def _generate_cover_page(
        self,
        brand_name: str,
        collection_name: str,
        collection_type: Optional[str],
        year: Optional[int],
        language: str = "en"
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
}}{self._language_instruction(language)}"""

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
    
    async def _generate_brand_introduction(self, brand_name: str, brand_id: str = None, language: str = "en") -> Dict[str, Any]:
        """
        Generate brand introduction slide.

        Args:
            brand_name: Name of the brand
            brand_id: Brand ID for RAG context retrieval

        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            # Retrieve RAG context
            context_block = ""
            if brand_id:
                rag_context = await self._retrieve_brand_context(
                    brand_id, f"{brand_name} brand introduction overview identity"
                )
                context_block = self._build_context_block(rag_context)

            prompt = f"""{context_block}Generate a brand introduction slide for {brand_name}.

Create a compelling brand introduction that captures the essence and identity of {brand_name}.
The intro should include unique and core brand details, key elements that 
differentiate the brand, any history on the brand name if applicable. 
Unique facts that would be important to understanding the brand's positioning. 
What the brand is most known for at a high level. The context is a brand deck for training retail staff. 
It's important to highlight unique and core brand details that could help a staff 
member really understand the brand. Though there may be elements of brand history and identity, it should serve as an overview. 
Write up to 250 words but only write as much as necessary to communicate message.

Return ONLY valid JSON in this exact format:
{{
"title": "About {brand_name}",
"overview": {{
    "summary": "2–3 sentence high-level introduction to the brand",
    "positioning": "How the brand is positioned in the market and what it is most known for"
}},
"brand_identity": {{
    "essence": "Core idea or philosophy behind the brand",
    "differentiators": [
    "Key element that differentiates the brand",
    "Another unique differentiator"
    ],
    "unique_facts": [
    "Distinctive fact that helps understand the brand",
    "Notable detail relevant to retail staff"
    ]
}},
"name_and_history": {{
    "name_origin": "Meaning or origin of the brand name, if applicable",
    "background": "Brief brand history, only if relevant to understanding the brand"
}}
}}{self._language_instruction(language)}"""

            logger.info(f"Calling LLM for brand introduction: {brand_name}")

            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=800
            )

            content = response if isinstance(response, dict) else {}

            logger.info(f"Generated brand introduction for {brand_name}: keys={list(content.keys())}")
            
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
    
    async def _generate_brand_history(self, brand_name: str, brand_id: str = None, language: str = "en") -> Dict[str, Any]:
        """
        Generate brand history slide.

        Args:
            brand_name: Name of the brand
            brand_id: Brand ID for RAG context retrieval

        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            # Retrieve RAG context
            context_block = ""
            if brand_id:
                rag_context = await self._retrieve_brand_context(
                    brand_id, f"{brand_name} brand history founding story heritage"
                )
                context_block = self._build_context_block(rag_context)

            prompt = f"""{context_block}Generate a brand history slide for {brand_name}.

Create a compelling brand history that tells the story of {brand_name}.
Include the founder and brief background on how their experience led to the founding of the brand.
Describe the evolution of the brand and any signature pieces or aesthetics.
Include key historical facts that help explain the brand's current position in the market.

You may also include, if relevant:
1. Contextual positioning
2. Founding ethos or values
3. Brand evolution over time
4. Key production details
5. Current footprint
6. Philosophical or cultural takeaway

Only include elements that best help retail staff understand the brand's heritage and identity.
Write up to 200 words, using only as much detail as necessary.

Return ONLY valid JSON in this exact format:
{{
    "title": "Brand History",
    "founding": {{
        "year": "Year founded",
        "founder": {{
            "name": "Founder name(s)",
            "background": "Brief background on the founder and what led to founding the brand"
        }},
        "origin": {{
            "city": "City of origin",
            "country": "Country of origin"
        }}
    }},
    "evolution": {{
        "early_identity": "How the brand began and its initial aesthetic or purpose",
        "key_shifts": [
            "Major evolution in style, product focus, or brand direction",
            "Another important transformation or expansion"
        ],
        "signature_elements": [
            "Signature pieces, materials, or aesthetics the brand became known for"
        ]
    }},
    "market_context": {{
        "positioning": "How the brand contrasted with competitors or cultural norms",
        "production_philosophy": "Notable materials, craftsmanship, innovation, or sourcing practices",
        "current_footprint": "Present-day scale, markets, or retail distribution"
    }},
    "philosophical_takeaway": "The deeper cultural, symbolic, or ideological meaning of the brand today"
}}{self._language_instruction(language)}"""

            logger.info(f"Calling LLM for brand history: {brand_name}")

            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=800
            )

            content = response if isinstance(response, dict) else {}

            logger.info(f"Generated brand history for {brand_name}: keys={list(content.keys())}")
            
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
    
    async def _generate_brand_values(self, brand_name: str, brand_id: str = None, language: str = "en") -> Dict[str, Any]:
        """
        Generate brand values slide.

        Args:
            brand_name: Name of the brand
            brand_id: Brand ID for RAG context retrieval

        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            # Retrieve RAG context
            context_block = ""
            if brand_id:
                rag_context = await self._retrieve_brand_context(
                    brand_id, f"{brand_name} brand values principles philosophy"
                )
                context_block = self._build_context_block(rag_context)

            prompt = f"""{context_block}Generate a brand values slide for {brand_name}.

You are creating a brand values training slide for retail staff for the brand {brand_name}. Identify its 3–5 core values.
For each value, provide:
- A short headline word or phrase (e.g., "Quality", "Creativity", "Authenticity", "Sustainability")
- A 1–2 sentence explanation of how this value is expressed in the brand's products, culture, or philosophy

Focus on values that are genuinely distinctive to the brand and central to its identity, avoiding generic statements unless they are essential.

Return ONLY valid JSON in this exact format:
{{
    "title": "Brand Values",
    "values": [
        {{
            "headline": "Short value headline (e.g., Quality, Creativity)",
            "explanation": "1–2 sentence explanation of how this value is expressed in the brand's products, culture, or philosophy"
        }}
    ]
}}{self._language_instruction(language)}"""

            logger.info(f"Calling LLM for brand values: {brand_name}")

            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=800
            )

            content = response if isinstance(response, dict) else {}

            logger.info(f"Generated brand values for {brand_name}: keys={list(content.keys())}")
            
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
    
    async def _generate_brand_personality(self, brand_name: str, brand_id: str = None, language: str = "en") -> Dict[str, Any]:
        """
        Generate brand personality slide.

        Args:
            brand_name: Name of the brand
            brand_id: Brand ID for RAG context retrieval

        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            # Retrieve RAG context
            context_block = ""
            if brand_id:
                rag_context = await self._retrieve_brand_context(
                    brand_id, f"{brand_name} brand personality style aesthetic tone"
                )
                context_block = self._build_context_block(rag_context)

            prompt = f"""{context_block}Generate a brand personality slide for {brand_name}.

You are creating a brand personality training slide for retail staff for the brand {brand_name}. Identify its most defining personality traits and values.
Where relevant, include:
- A cultural or inspirational quote associated with the brand's identity (e.g., from an artist, musician, designer, or campaign). Only include if clearly existing.
- 3–5 personality traits or values that represent the brand
- A short explanation for each trait, highlighting how it connects to the brand's ethos, creative inspiration, or cultural influence

Focus on what makes the brand emotionally distinctive and memorable, avoiding generic or vague traits.
Maximum 150 words, but only include as many words as necessary.

Return ONLY valid JSON in this exact format:
{{
    "title": "Brand Personality",
    "quote": {{
        "text": "Cultural or inspirational quote associated with the brand's identity",
        "attribution": "Source of the quote (artist, designer, campaign, etc.)"
    }},
    "traits": [
        {{
            "name": "Personality trait or value",
            "explanation": "Short explanation connecting to the brand's ethos, creative inspiration, or cultural influence"
        }}
    ]
}}{self._language_instruction(language)}"""

            logger.info(f"Calling LLM for brand personality: {brand_name}")

            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=800
            )

            content = response if isinstance(response, dict) else {}

            logger.info(f"Generated brand personality for {brand_name}: keys={list(content.keys())}")
            
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
                    "quote": None,
                    "traits": []
                }
            }
    
    async def _generate_flagship_stores(self, brand_name: str, brand_id: str = None, language: str = "en") -> Dict[str, Any]:
        """
        Generate flagship stores & experiences slide.

        Args:
            brand_name: Name of the brand
            brand_id: Brand ID for RAG context retrieval

        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            # Retrieve RAG context
            context_block = ""
            if brand_id:
                rag_context = await self._retrieve_brand_context(
                    brand_id, f"{brand_name} flagship stores retail locations experiences"
                )
                context_block = self._build_context_block(rag_context)

            prompt = f"""{context_block}Generate a flagship stores and experiences slide for {brand_name}.

You are creating a flagship stores training slide for retail staff for the brand {brand_name}. Identify its most significant flagship stores, concept stores, or major retail experiences.
Where relevant, cover:
- Year and location of opening
- Key design or architectural elements
- The unique customer experience or atmosphere of the store
- Any symbolic or cultural meaning behind the store design

Flexibility:
- If the brand has multiple flagship stores, list the most iconic one, two, or three.
- If the brand has only one, focus on that flagship in detail.
- If the brand has no official flagship stores, highlight other notable retail experiences such as pop-ups, collaborations, or digital flagships.

Write the content in a way that is factual yet aspirational, helping retail staff understand how the brand expresses itself through its physical (or digital) spaces.
Maximum 150 words.

Return ONLY valid JSON in this exact format:
{{
    "title": "Flagship Stores & Experiences",
    "flagship_stores": [
        {{
            "name": "Store name or location identifier",
            "year_opened": "Year of opening",
            "location": {{
                "city": "City",
                "country": "Country"
            }},
            "design_elements": "Key design or architectural elements",
            "customer_experience": "Unique customer experience or atmosphere",
            "cultural_meaning": "Symbolic or cultural meaning behind the store design"
        }}
    ],
    "alternative_experiences": "If no flagship stores exist: pop-ups, collaborations, or digital flagships (omit if flagship_stores are provided)"
}}{self._language_instruction(language)}"""

            logger.info(f"Calling LLM for flagship stores: {brand_name}")

            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=800
            )

            content = response if isinstance(response, dict) else {}

            stores = content.get('flagship_stores', [])
            logger.info(f"Generated flagship stores for {brand_name}: {len(stores)} stores returned")
            
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
                    "flagship_stores": [],
                    "alternative_experiences": None
                }
            }
    
    async def _generate_core_collection(
        self,
        brand_name: str,
        collection_name: str,
        categories: List[Dict[str, Any]],
        product_names: List[str],
        brand_id: str = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Generate core collection & signature categories slide.

        Args:
            brand_name: Name of the brand
            collection_name: Name of the collection
            categories: List of category objects from collection
            product_names: List of actual product names from items
            brand_id: Brand ID for RAG context retrieval

        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            # Extract category names
            category_names = [cat.get('name', cat) if isinstance(cat, dict) else str(cat) for cat in categories]

            # Build prompt with real data
            categories_text = ", ".join(category_names) if category_names else "Various categories"
            products_text = ", ".join(product_names[:10]) if product_names else "Collection pieces"  # Limit to first 10

            # Retrieve RAG context
            context_block = ""
            if brand_id:
                rag_context = await self._retrieve_brand_context(
                    brand_id, f"{brand_name} core collection signature categories key products"
                )
                context_block = self._build_context_block(rag_context)

            prompt = f"""{context_block}Generate a core collections slide for {brand_name}.

You are creating a core collections training slide for retail staff for the brand {brand_name}. Identify its 3–6 signature product categories.
Only include as many as needed (there may only be 3 and that's okay).

For each category:
- Provide a short headline (the product category name)
- Write 1–2 sentences explaining why this category is central to the brand. Highlight its symbolic meaning, key materials or fabrics, craftsmanship, and production details if relevant.
- If there is an iconic staple product in the category that appears in every collection, you may include it if truly relevant. Do not include if not renowned.

Present the information in a way that is factual, aspirational, and easy for retail staff to remember when speaking to customers.
Focus on the categories that best represent the brand's DNA and are consistently featured across collections.
Maximum 150 words.

Collection Categories: {categories_text}
Sample Products: {products_text}

Return ONLY valid JSON in this exact format:
{{
    "title": "Core Collections & Signature Categories",
    "signature_categories": [
        {{
            "headline": "Product category name",
            "description": "1–2 sentences explaining why this category is central to the brand, including symbolic meaning, key materials/fabrics, craftsmanship, or production details if relevant",
            "iconic_staple": "Iconic staple product in this category (only if truly renowned, otherwise null)"
        }}
    ]
}}{self._language_instruction(language)}"""

            logger.info(f"Calling LLM for core collection: {brand_name} {collection_name}")

            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=800
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
                "title": "Core Collections & Signature Categories",
                "content": {
                    "title": "Core Collections & Signature Categories",
                    "signature_categories": []
                }
            }
    

    async def _generate_collection_introduction(
        self,
        brand_name: str,
        collection_name: str,
        collection_type: Optional[str],
        year: Optional[int],
        brand_id: str = None,
        collection_id: str = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Generate collection introduction slide using collection context documents.

        Args:
            brand_name: Name of the brand
            collection_name: Name of the collection
            collection_type: Season type (spring_summer, fall_winter, etc.)
            year: Collection year
            brand_id: Brand ID for brand RAG context
            collection_id: Collection ID for collection RAG context

        Returns:
            Dictionary containing slide type, title, and content
        """
        try:
            # Retrieve collection context from Pinecone
            collection_context_block = ""
            if collection_id:
                logger.info(f"Retrieving collection context from Pinecone for collection_id={collection_id}")
                collection_context = await self._retrieve_collection_context(
                    collection_id,
                    f"{brand_name} {collection_name} collection creative direction inspiration colors prints backstory"
                )
                logger.info(f"Collection RAG context retrieved: {len(collection_context)} chars, preview: {collection_context[:200] if collection_context else 'EMPTY'}")
                collection_context_block = self._build_context_block(
                    collection_context, label="COLLECTION REFERENCE MATERIAL"
                )
            else:
                logger.warning("No collection_id provided — skipping collection context retrieval")

            # Also retrieve brand context for brand voice/identity
            brand_context_block = ""
            if brand_id:
                brand_context = await self._retrieve_brand_context(
                    brand_id, f"{brand_name} brand identity personality aesthetic"
                )
                logger.info(f"Brand RAG context retrieved: {len(brand_context)} chars")
                brand_context_block = self._build_context_block(brand_context)

            season_label = ""
            if collection_type:
                season_label = collection_type.replace("_", "/").title()
            year_label = str(year) if year else ""
            full_label = f"{season_label} {year_label}".strip()

            prompt = f"""{collection_context_block}{brand_context_block}Generate a collection introduction slide for {brand_name} — {collection_name}{f' ({full_label})' if full_label else ''}.

This is for a brand training deck for retail staff. The slide should help staff understand
the story behind this collection so they can speak to it authentically with customers.

CRITICAL INSTRUCTIONS:
- You MUST use SPECIFIC details from the reference material above (exact collection names,
  exact color names, exact piece names, exact print names, exact prices).
- Do NOT paraphrase or generalize. If the document says "dusty sage green", write "dusty sage green",
  not "earth tones" or "forest greens".
- Do NOT invent product names, piece names, or details that are not in the reference material.
- If the reference material names specific pieces (e.g. jackets, jeans, coats), reference them
  by their exact names as stated in the documents.
- If the reference material mentions a collection name (e.g. "Concrete Gardens"), use that name.
- Write up to 250 words but only write as much as necessary.

Return ONLY valid JSON in this exact format:
{{
"title": "Collection Introduction: {collection_name}",
"collection_story": {{
    "narrative": "2-3 sentence overview using SPECIFIC details from the reference material",
    "creative_direction": "The creative vision — use exact quotes and details from the documents"
}},
"key_themes": {{
    "color_palette": "List the EXACT color names from the reference material",
    "prints_and_patterns": "Name the SPECIFIC prints and patterns from the documents",
    "silhouettes": "Describe silhouettes using the language from the reference material"
}},
"highlights": [
    "A specific key piece BY NAME with details from the reference material",
    "Another specific highlight BY NAME from the reference material"
]
}}{self._language_instruction(language)}"""

            logger.info(f"Calling LLM for collection introduction: {brand_name} {collection_name}")

            response = await self.llm_service.generate_json_completion(
                prompt=prompt,
                temperature=0.3,
                max_tokens=800
            )

            content = response if isinstance(response, dict) else {}

            logger.info(f"Generated collection introduction for {collection_name}: keys={list(content.keys())}")

            return {
                "slide_type": "collection_introduction",
                "title": content.get("title", f"Collection Introduction: {collection_name}"),
                "content": content
            }

        except Exception as e:
            logger.error(f"Error generating collection introduction: {e}")
            return {
                "slide_type": "collection_introduction",
                "title": f"Collection Introduction: {collection_name}",
                "content": {
                    "title": f"Collection Introduction: {collection_name}",
                    "collection_story": {
                        "narrative": f"The {collection_name} collection by {brand_name}.",
                        "creative_direction": ""
                    },
                    "key_themes": {},
                    "highlights": []
                }
            }


# Global service instance
intro_slide_generation_service = IntroSlideGenerationService()
