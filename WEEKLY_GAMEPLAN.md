# Weekly Gameplan - Collection & Presentation System

**Week of:** October 26, 2025  
**Focus:** Complete item generation pipeline + presentation outline generation

---

## 🎯 Top 5 Goals

### 1. Category Assignment for Items
### 2. Image Extraction from Line Sheets
### 3. Intro Slides Configuration
### 4. JSON Presentation Outline Generation
### 5. PowerPoint Generation Strategy

---

## 📋 Detailed Breakdown

---

## **Goal 1: Category Assignment for Items**

### Current State
- Items generated with `category: null` and `subcategory: null`
- Collection has categories defined but not applied to items
- No automatic categorization during generation

### Decision Point: When to Categorize?

#### **Option A: During Line Sheet Extraction (Recommended)**
**Timing:** When LLM extracts `structured_products` from line sheet

**Approach:**
1. Generate categories/subcategories FIRST (separate LLM call)
2. Pass categories to product extraction prompt
3. LLM assigns category while extracting each product
4. Products come out pre-categorized

**Pros:**
- ✅ Single pass - categories assigned during extraction
- ✅ LLM has full context of product details
- ✅ No need to re-process items later

**Cons:**
- ❌ Categories must be defined before line sheet upload
- ❌ Slightly more complex prompt

**Flow:**
```
Normalized Text
    ↓
1. Generate Categories (LLM)
   → Returns: ["Dresses", "Tops", "Bottoms", ...]
    ↓
2. Extract Products with Categories (LLM)
   → Prompt includes: "Assign to one of: Dresses, Tops, Bottoms..."
   → Returns: [{name: "Maxi Dress", category: "Dresses", ...}]
    ↓
3. Save structured_products (already categorized)
```

#### **Option B: During Item Generation**
**Timing:** When combining PO + Line Sheet data

**Approach:**
1. Generate items as usual (uncategorized)
2. Fetch collection categories
3. LLM categorizes each item based on product name/description
4. Save items with categories

**Pros:**
- ✅ Categories can be defined after upload
- ✅ Can re-categorize existing items

**Cons:**
- ❌ Extra LLM call during item generation
- ❌ Slower generation process

#### **Option C: Post-Generation Batch Categorization**
**Timing:** After items are created

**Approach:**
1. Generate items (uncategorized)
2. User defines categories
3. Batch categorize all items (LLM or manual)

**Pros:**
- ✅ Most flexible
- ✅ Can adjust categories later

**Cons:**
- ❌ Extra step for user
- ❌ Items unusable until categorized

### Recommended Approach
**Option A** - Categorize during line sheet extraction

**Reasoning:**
- Most efficient (single pass)
- Best user experience (items ready immediately)
- LLM has full product context

### Implementation Plan

#### Step 1: Category Generation (New Endpoint)
```
POST /api/collections/{id}/categories/generate
```
- Fetch line sheet normalized_text
- LLM generates categories/subcategories
- Save to collection document
- Return categories for review

#### Step 2: Update Line Sheet Extraction
- Modify `_extract_products_from_chunk()` in `collection_document_service.py`
- Fetch collection categories before extraction
- Include categories in LLM prompt
- LLM assigns category to each product

#### Step 3: Update Item Generation
- Items inherit category from line sheet `structured_products`
- No additional categorization needed

### Tasks
- [ ] Create category generation endpoint
- [ ] Update line sheet extraction prompt to include categories
- [ ] Test category assignment accuracy
- [ ] Handle "Uncategorized" fallback
- [ ] UI to review/edit categories before line sheet upload

---

## **Goal 2: Image Extraction from Line Sheets**

### Current State
- Line sheets contain product images (PDF)
- Images are NOT extracted during parsing
- Items have empty `images: []` array
- No image-to-product association

### Challenge
**How to associate extracted images with specific products?**

### Approach Options

#### **Option A: PDF Image Extraction with Position Mapping** - ********* I like this *********
**How it works:**
1. Extract all images from PDF with position metadata
2. Extract text with position metadata
3. Match images to products by proximity (same page, nearby text)

**Pros:**
- ✅ Automated
- ✅ Works for most line sheet formats

**Cons:**
- ❌ Complex position matching logic
- ❌ May fail for unusual layouts

**Tools:**
- `PyMuPDF` (fitz) - Extract images with coordinates
- `pdfplumber` - Extract text with positions

#### **Option B: OCR-Based Image Detection**
**How it works:**
1. Convert PDF pages to images
2. Use computer vision to detect product images
3. OCR text near images to identify product
4. Match by SKU or product name

**Pros:**
- ✅ Handles complex layouts
- ✅ More robust matching

**Cons:**
- ❌ Slower (OCR + CV processing)
- ❌ Requires additional services (Google Vision, AWS Rekognition)

#### **Option C: LLM Vision API (GPT-4 Vision)** - ********* I like this *********
**How it works:**
1. Convert PDF pages to images
2. Send each page to GPT-4 Vision
3. LLM identifies products and their images
4. Returns structured data with image references

**Pros:**
- ✅ Most accurate
- ✅ Handles any layout
- ✅ Can extract image descriptions

**Cons:**
- ❌ Expensive (Vision API costs)
- ❌ Slower than text-only extraction

#### **Option D: Manual Upload (Fallback)**
**How it works:**
1. Generate items without images
2. User uploads images per item
3. Associate via UI

**Pros:**
- ✅ Simple to implement
- ✅ 100% accurate

**Cons:**
- ❌ Manual work for user
- ❌ Defeats automation purpose

### Recommended Approach
**Option A: Bounding Box with Position Mapping**

Using PyMuPDF to extract images with positions, filter by size, and match to products by proximity.

**Expected Accuracy:** 85-90%  
**Cost:** Free (compute only)  
**Dev Time:** 9-12 hours over 3 days

---

## **Quick Reference: Implementation Steps**

1. **Extract images** from PDF with positions → Upload to Storage
2. **Extract text blocks** with positions (for matching)
3. **Filter images** by size (remove color swatches, logos)
4. **Match images to products** by proximity (same page, above text, closest distance)
5. **Update structured_products** to include images array
6. **Items inherit images** from line sheet (already implemented)

---

## **Detailed Implementation Plan**

### **Phase 1: Image Extraction & Upload (2-3 hours)**

#### Task 1.1: Create Image Extraction Method
**File:** `backend/app/services/collection_document_service.py`

```python
async def _extract_images_from_pdf(
    self,
    pdf: fitz.Document,
    collection_id: str,
    document_id: str
) -> List[Dict[str, Any]]:
    """
    Extract all images from PDF with position metadata.
    
    Returns: List of dicts with:
    - page_number, image_index
    - bbox: {x0, y0, x1, y1, width, height}
    - center: {x, y}
    - storage_path, url, format
    """
    images = []
    for page_num, page in enumerate(pdf):
        image_list = page.get_images()
        for img_index, img in enumerate(image_list):
            xref = img[0]
            bbox_list = page.get_image_bbox(img)
            base_image = pdf.extract_image(xref)
            image_bytes = base_image["image"]
            
            # Upload to Storage
            storage_path = f"collections/{collection_id}/images/{document_id}/page_{page_num + 1}_img_{img_index}.{base_image['ext']}"
            signed_url = await self.storage_service.upload_bytes(...)
            
            images.append({...})
    return images
```

**Verify:**
- Images extracted with positions
- Images uploaded to Firebase Storage
- URLs returned

---

### **Phase 2: Text Position Extraction (1 hour)**

#### Task 2.1: Extract Text WITH Positions
**File:** `backend/app/services/collection_document_service.py`

```python
async def _extract_text_with_positions(
    self,
    pdf: fitz.Document
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Extract text AND text block positions.
    
    Returns: (full_text, text_blocks)
    text_blocks = [
        {
            'page_number': 1,
            'bbox': {x0, y0, x1, y1, width, height},
            'center': {x, y},
            'text': "Style #: R13W2048..."
        }
    ]
    """
    full_text = ""
    text_blocks = []
    
    for page_num, page in enumerate(pdf):
        blocks = page.get_text("blocks")  # ← Changed from get_text()
        for block in blocks:
            x0, y0, x1, y1, text, block_no, block_type = block
            full_text += text
            text_blocks.append({...})
    
    return full_text, text_blocks
```

**Update pipeline:**
```python
# OLD: text = page.get_text()
# NEW: full_text, text_blocks = await self._extract_text_with_positions(pdf)
```

---

### **Phase 3: Image Filtering (30 min)**

#### Task 3.1: Filter by Size
**File:** `backend/app/services/collection_document_service.py`

```python
def _filter_product_images(
    self,
    images: List[Dict[str, Any]],
    min_width: int = 150,
    min_height: int = 150
) -> List[Dict[str, Any]]:
    """
    Filter out small images (color swatches, logos).
    """
    return [
        img for img in images
        if img['bbox']['width'] >= min_width 
        and img['bbox']['height'] >= min_height
    ]
```

**Handles:**
- ✅ Image 1 (R13): No small images, all pass through
- ✅ Image 2 (Sporty & Rich): Removes color swatches (~50x50px)

---

### **Phase 4: Image-Product Matching (2 hours)**

#### Task 4.1: Match by Proximity
**File:** `backend/app/services/collection_document_service.py`

```python
def _match_images_to_products(
    self,
    products: List[Dict[str, Any]],
    images: List[Dict[str, Any]],
    text_blocks: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Match images to products by proximity.
    
    Strategy:
    1. Find text block containing product SKU
    2. Find images on same page, ABOVE text
    3. Calculate distance, assign closest image
    """
    for product in products:
        sku = product.get('sku')
        
        # Find text block with this SKU
        text_block = find_text_block_with_sku(sku, text_blocks)
        
        if text_block:
            page_num = text_block['page_number']
            text_y = text_block['center']['y']
            
            # Find images on same page, above text
            candidates = [
                img for img in images
                if img['page_number'] == page_num
                and img['center']['y'] < text_y  # Above text
            ]
            
            # Calculate distances
            for img in candidates:
                img['distance'] = calculate_distance(img, text_block)
            
            # Sort by distance, take closest
            candidates.sort(key=lambda x: x['distance'])
            
            if candidates:
                product['images'] = [{
                    'url': candidates[0]['url'],
                    'storage_path': candidates[0]['storage_path'],
                    'alt': product.get('product_name', '')
                }]
    
    return products
```

---

### **Phase 5: Pipeline Integration (1 hour)**

#### Task 5.1: Update Main Pipeline
**File:** `backend/app/services/collection_document_service.py`

**In `_parse_and_store_text()` method:**

```python
# 1. Extract text WITH positions
full_text, text_blocks = await self._extract_text_with_positions(pdf)

# 2. Extract images
all_images = await self._extract_images_from_pdf(pdf, collection_id, document_id)

# 3. Filter product images
product_images = self._filter_product_images(all_images)

# 4. Normalize text (existing)
normalized_text = self._normalize_text(full_text)

# 5. Extract structured products (existing)
structured_products = await self._extract_structured_products(...)

# 6. Match images to products (NEW)
structured_products = self._match_images_to_products(
    structured_products,
    product_images,
    text_blocks
)

# 7. Save to Firestore (existing, now includes images)
doc_ref.update({'structured_products': structured_products, ...})
```

---

### **Phase 6: Item Generation (30 min)**

#### Task 6.1: Verify Images Copy to Items
**File:** `backend/app/services/item_generation_service.py`

**Already implemented! Just verify:**

```python
# In enrich_from_linesheet():
enriched_item = {
    # ... existing fields ...
    'images': linesheet_data.get('images', []),  # ← Should be here
}

# In generate_item_objects():
{
    # ... existing fields ...
    'images': item.get('images', []),  # ← Should be here
}
```

---

### **Phase 7: Testing & Tuning (2-3 hours)**

#### Test Cases:
1. **Image 1 (R13):** 5 products, 5 large images above text
2. **Image 2 (Sporty & Rich):** 8 products, 8 large images + 8 small swatches

#### Success Criteria:
- ✅ 85-90% of products have images
- ✅ Color swatches filtered out
- ✅ Images match correct products
- ✅ Items inherit images

#### Tuning Parameters:
```python
MIN_IMAGE_WIDTH = 150   # Adjust if needed
MIN_IMAGE_HEIGHT = 150
MAX_DISTANCE = 300      # Max pixels between image and text
```

---

## **Implementation Checklist**

### **Phase 1: Image Extraction (2-3 hours)**
- [ ] Create `_extract_images_from_pdf()` method
- [ ] Test image extraction
- [ ] Verify images upload to Storage
- [ ] Verify URLs are returned

### **Phase 2: Text Positions (1 hour)**
- [ ] Create `_extract_text_with_positions()` method
- [ ] Update pipeline to use new method
- [ ] Verify text blocks have positions

### **Phase 3: Image Filtering (30 min)**
- [ ] Create `_filter_product_images()` method
- [ ] Test with both line sheet formats
- [ ] Tune `min_width` and `min_height` thresholds

### **Phase 4: Image Matching (2 hours)**
- [ ] Create `_match_images_to_products()` method
- [ ] Test matching logic
- [ ] Verify images match correct products
- [ ] Handle edge cases (no images, multiple images)

### **Phase 5: Pipeline Integration (1 hour)**
- [ ] Update `_parse_and_store_text()` method
- [ ] Test full pipeline end-to-end
- [ ] Verify structured_products have images

### **Phase 6: Item Generation (30 min)**
- [ ] Verify images copy to enriched items
- [ ] Verify images appear in generated items
- [ ] Test with real PO + line sheet

### **Phase 7: Testing & Tuning (2-3 hours)**
- [ ] Test with Image 1 (R13 line sheet)
- [ ] Test with Image 2 (Sporty & Rich line sheet)
- [ ] Measure accuracy
- [ ] Tune thresholds if needed
- [ ] Handle edge cases

---

## **Estimated Timeline**

- **Day 1 (4-5 hours):** Phases 1-3 (extraction + filtering)
- **Day 2 (3-4 hours):** Phases 4-5 (matching + integration)
- **Day 3 (2-3 hours):** Phases 6-7 (item generation + testing)

**Total:** 9-12 hours over 3 days

---

## **Goal 3: Intro Slides Configuration**

### Current State
- Collection has slide toggle properties in Firestore
- Frontend has checkboxes in "Settings" section
- **No connection between UI and database**
- Checkboxes don't save/load state

### Properties to Connect
```javascript
// In Firestore: collections/{id}
{
  include_cover_page_slide: bool,
  include_brand_introduction_slide: bool,
  include_brand_history_slide: bool,
  include_brand_values_slide: bool,
  include_brand_personality_slide: bool,
  include_flagship_store_and_experiences_slide: bool,
  include_core_collection_and_signature_categories_slide: bool,
  include_product_categories_slide: bool
}
```

### Implementation Plan

#### Step 1: Load Slide Settings from Firestore
```javascript
// In DocumentProcessingForm.js
const [slideSettings, setSlideSettings] = useState({
  include_cover_page_slide: true,
  include_brand_introduction_slide: true,
  // ... all 8 properties
});

// Fetch on collection load
useEffect(() => {
  if (savedIds.collectionId) {
    fetchSlideSettings();
  }
}, [savedIds.collectionId]);
```

#### Step 2: Update Checkboxes to Use State
```javascript
// Replace hardcoded checkboxes with state-driven ones
<input
  type="checkbox"
  checked={slideSettings.include_cover_page_slide}
  onChange={(e) => updateSlideSetting('include_cover_page_slide', e.target.checked)}
/>
```

#### Step 3: Save Settings to Firestore
```javascript
// Auto-save on change OR manual save button
const updateSlideSetting = async (key, value) => {
  setSlideSettings(prev => ({ ...prev, [key]: value }));
  
  // Save to Firestore
  await fetch(`/api/collections/${collectionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ [key]: value })
  });
};
```

#### Step 4: Create Prompts for Each Slide Type

**Prompt Structure:**
```javascript
const SLIDE_PROMPTS = {
  include_cover_page_slide: {
    title: "Cover Page",
    prompt: "Generate a cover page slide with collection name, season, and brand logo placeholder."
  },
  include_brand_introduction_slide: {
    title: "Brand Introduction",
    prompt: "Generate a brand introduction slide with: brand story, founding year, mission statement, and key differentiators."
  },
  include_brand_history_slide: {
    title: "Brand History",
    prompt: "Generate a brand history timeline slide with: key milestones, evolution, and heritage."
  },
  // ... etc
};
```

#### Step 5: Use in Outline Generation
```javascript
// When generating presentation outline
const enabledSlides = Object.entries(slideSettings)
  .filter(([key, value]) => value === true)
  .map(([key]) => SLIDE_PROMPTS[key]);

// Include in LLM prompt
const prompt = `Generate presentation outline including these sections:
${enabledSlides.map(s => `- ${s.title}: ${s.prompt}`).join('\n')}
`;
```

### Tasks
- [ ] Add state management for slide settings
- [ ] Connect checkboxes to Firestore
- [ ] Implement auto-save on toggle
- [ ] Create SLIDE_PROMPTS configuration object
- [ ] Add visual feedback (loading states, save confirmation)
- [ ] Test all 8 slide toggles

---

## **Goal 4: JSON Presentation Outline Generation**

### Current State
- No outline generation exists
- Need to create structured JSON for presentation
- Should respect slide settings from Goal 3

### Desired Output Structure
```json
{
  "presentation_id": "pres_abc123",
  "collection_id": "coll_xyz789",
  "title": "Spring/Summer 2025 Collection",
  "slides": [
    {
      "slide_number": 1,
      "type": "cover_page",
      "title": "Spring/Summer 2025",
      "content": {
        "collection_name": "Coastal Dreams",
        "season": "Spring/Summer 2025",
        "brand_name": "Brand Name"
      }
    },
    {
      "slide_number": 2,
      "type": "brand_introduction",
      "title": "About Our Brand",
      "content": {
        "story": "Founded in...",
        "mission": "To create...",
        "differentiators": ["Sustainable", "Handcrafted", ...]
      }
    },
    {
      "slide_number": 3,
      "type": "product_categories",
      "title": "Collection Categories",
      "content": {
        "categories": [
          {
            "name": "Dresses",
            "item_count": 45,
            "subcategories": ["Maxi", "Mini", "Midi"]
          }
        ]
      }
    },
    {
      "slide_number": 4,
      "type": "product_showcase",
      "title": "Featured Items",
      "content": {
        "items": [
          {
            "item_id": "item_123",
            "product_name": "Coastal Linen Dress",
            "image_url": "...",
            "price": "$335"
          }
        ]
      }
    }
  ],
  "metadata": {
    "total_slides": 15,
    "total_items": 150,
    "generated_at": "2025-10-26T18:00:00Z"
  }
}
```

### Implementation Plan

#### Step 1: Create Outline Generation Endpoint
```
POST /api/collections/{id}/presentation/outline
```

**Request:**
```json
{
  "slide_settings": {
    "include_cover_page_slide": true,
    // ... other settings
  }
}
```

**Response:**
```json
{
  "success": true,
  "outline": { /* JSON structure above */ }
}
```

#### Step 2: Build Outline Generation Service
```python
# backend/app/services/presentation_outline_service.py

class PresentationOutlineService:
    async def generate_outline(
        self,
        collection_id: str,
        slide_settings: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Generate presentation outline based on collection data and settings.
        """
        # 1. Fetch collection data
        # 2. Fetch items (with categories, images)
        # 3. Fetch brand data
        # 4. Build slide sequence based on settings
        # 5. Use LLM to generate content for each slide
        # 6. Return structured JSON
```

#### Step 3: Slide Generation Logic

**For Each Enabled Slide:**
1. Fetch required data (brand, items, categories)
2. Build slide-specific prompt
3. Call LLM to generate content
4. Structure response into JSON
5. Add to outline

**Example - Brand Introduction Slide:**
```python
async def _generate_brand_intro_slide(self, brand_data: Dict) -> Dict:
    prompt = f"""
    Generate a brand introduction slide for: {brand_data['name']}
    
    Brand info:
    - Founded: {brand_data.get('founded_year')}
    - Description: {brand_data.get('description')}
    
    Return JSON with:
    - story (2-3 sentences)
    - mission (1 sentence)
    - differentiators (3-5 bullet points)
    """
    
    response = await llm_service.generate(prompt)
    return {
        "slide_number": 2,
        "type": "brand_introduction",
        "title": "About Our Brand",
        "content": response
    }
```

#### Step 4: Save Outline to Firestore
```python
# Save to: /collections/{id}/presentation_outline
outline_ref = db.collection('collections').document(collection_id)
outline_ref.update({
    'presentation_outline': outline_json,
    'outline_generated_at': datetime.utcnow()
})
```

#### Step 5: Frontend Integration
```javascript
// In DocumentProcessingForm.js
const generateOutline = async () => {
  const response = await fetch(
    `/api/collections/${collectionId}/presentation/outline`,
    {
      method: 'POST',
      body: JSON.stringify({ slide_settings: slideSettings })
    }
  );
  
  const data = await response.json();
  setOutline(data.outline);
  alert(`Outline generated: ${data.outline.metadata.total_slides} slides`);
};
```

### Tasks
- [ ] Create presentation outline service
- [ ] Build slide generation logic for each type
- [ ] Create LLM prompts for each slide type
- [ ] Implement outline endpoint
- [ ] Save outline to Firestore
- [ ] Build frontend UI to trigger generation
- [ ] Display outline preview (JSON or formatted)
- [ ] Add edit capability for outline

---

## **Goal 5: PowerPoint Generation Strategy**

### Current State
- No PPT generation exists
- Have JSON outline (from Goal 4)
- Need to convert to actual .pptx file

### Approach Options

#### **Option A: Python-PPTX Library (Recommended)**
**How it works:**
1. Use `python-pptx` library
2. Read JSON outline
3. Programmatically create slides
4. Add text, images, formatting
5. Save as .pptx file
6. Upload to Firebase Storage

**Pros:**
- ✅ Direct Python → PowerPoint
- ✅ Full control over layout
- ✅ No intermediate formats
- ✅ Well-documented library

**Cons:**
- ❌ Need to design slide templates
- ❌ Manual positioning of elements

**Code Example:**
```python
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation()

# Add title slide
title_slide = prs.slides.add_slide(prs.slide_layouts[0])
title = title_slide.shapes.title
title.text = outline['title']

# Add content slides
for slide_data in outline['slides']:
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    # Add content based on slide_data
    
prs.save('presentation.pptx')
```

#### **Option B: Template-Based (python-pptx + Templates)**
**How it works:**
1. Create PowerPoint template (.pptx) with placeholders
2. Use `python-pptx` to load template
3. Replace placeholders with JSON data
4. Save modified presentation

**Pros:**
- ✅ Professional design (template)
- ✅ Consistent branding
- ✅ Easier than building from scratch

**Cons:**
- ❌ Need to create template first
- ❌ Less flexible

#### **Option C: JSON → HTML → PDF → PPT**
**How it works:**
1. JSON → HTML (with CSS styling)
2. HTML → PDF (using headless Chrome)
3. PDF → PPT (using conversion service)

**Pros:**
- ✅ Easier styling with CSS
- ✅ Web-based preview

**Cons:**
- ❌ Multiple conversion steps
- ❌ Quality loss in conversions
- ❌ Not native PPT (limited editing)

#### **Option D: Google Slides API**
**How it works:**
1. Create Google Slides presentation via API
2. Add slides programmatically
3. Export as .pptx

**Pros:**
- ✅ Cloud-based
- ✅ Collaborative editing
- ✅ Easy sharing

**Cons:**
- ❌ Requires Google API setup
- ❌ Internet dependency
- ❌ Export may lose formatting

#### **Option E: VBA/Macro Approach**
**How it works:**
1. JSON → Excel/CSV (tabular format)
2. VBA macro reads data
3. Macro generates PowerPoint slides

**Pros:**
- ✅ Familiar to Excel users
- ✅ Can leverage existing VBA skills

**Cons:**
- ❌ Requires Excel + PowerPoint installed
- ❌ Not cloud-native
- ❌ Hard to automate server-side

### Recommended Approach
**Option B: Template-Based python-pptx**

**Reasoning:**
- Professional appearance
- Full control
- Native .pptx format
- Server-side generation (no client dependencies)

### Implementation Plan

#### Step 1: Create PowerPoint Template
```
template.pptx with slide layouts:
1. Cover Page (title, subtitle, logo placeholder)
2. Brand Introduction (title, text, image)
3. Product Showcase (title, image grid, prices)
4. Category Overview (title, category list)
5. Closing (thank you, contact info)
```

#### Step 2: Build PPT Generation Service
```python
# backend/app/services/presentation_generator_service.py

from pptx import Presentation
from pptx.util import Inches, Pt

class PresentationGeneratorService:
    async def generate_presentation(
        self,
        collection_id: str,
        outline: Dict[str, Any]
    ) -> str:
        """
        Generate PowerPoint from JSON outline.
        Returns: Storage path to .pptx file
        """
        # 1. Load template
        prs = Presentation('templates/collection_template.pptx')
        
        # 2. For each slide in outline
        for slide_data in outline['slides']:
            self._add_slide(prs, slide_data)
        
        # 3. Save to temp file
        temp_path = f'/tmp/{collection_id}.pptx'
        prs.save(temp_path)
        
        # 4. Upload to Firebase Storage
        storage_path = f'collections/{collection_id}/presentations/presentation.pptx'
        url = await storage_service.upload_file(temp_path, storage_path)
        
        return storage_path
```

#### Step 3: Slide Type Handlers
```python
def _add_slide(self, prs: Presentation, slide_data: Dict):
    slide_type = slide_data['type']
    
    if slide_type == 'cover_page':
        self._add_cover_slide(prs, slide_data)
    elif slide_type == 'brand_introduction':
        self._add_brand_intro_slide(prs, slide_data)
    elif slide_type == 'product_showcase':
        self._add_product_slide(prs, slide_data)
    # ... etc
```

#### Step 4: Create Generation Endpoint
```
POST /api/collections/{id}/presentation/generate
```

**Response:**
```json
{
  "success": true,
  "presentation_url": "https://storage.googleapis.com/.../presentation.pptx",
  "storage_path": "collections/xyz/presentations/presentation.pptx"
}
```

#### Step 5: Frontend Download Button
```javascript
const generatePresentation = async () => {
  const response = await fetch(
    `/api/collections/${collectionId}/presentation/generate`,
    { method: 'POST' }
  );
  
  const data = await response.json();
  
  // Download file
  window.open(data.presentation_url, '_blank');
};
```

### Tasks
- [ ] Research python-pptx library
- [ ] Create PowerPoint template with layouts
- [ ] Build presentation generator service
- [ ] Implement slide type handlers
- [ ] Add image downloading/embedding
- [ ] Create generation endpoint
- [ ] Build frontend UI (generate + download buttons)
- [ ] Test with real collection data
- [ ] Handle edge cases (missing images, long text)

---

## 🗓️ Suggested Timeline

### Day 1-2: Category Assignment
- [ ] Implement category generation
- [ ] Update line sheet extraction
- [ ] Test categorization accuracy

### Day 3-4: Image Extraction
- [ ] Research PDF image extraction
- [ ] Implement extraction logic
- [ ] Test image-to-product matching

### Day 5: Intro Slides Configuration
- [ ] Connect UI to Firestore
- [ ] Create slide prompts
- [ ] Test all toggles

### Day 6-7: Outline Generation
- [ ] Build outline service
- [ ] Implement slide generators
- [ ] Test outline quality

### Day 8-9: PowerPoint Generation
- [ ] Create template
- [ ] Build PPT generator
- [ ] Test end-to-end

### Day 10: Testing & Polish
- [ ] End-to-end testing
- [ ] Bug fixes
- [ ] Documentation

---

## 📊 Success Metrics

### Category Assignment
- ✅ 90%+ items correctly categorized
- ✅ All items have category assigned
- ✅ Categories match collection categories

### Image Extraction
- ✅ 80%+ images correctly associated
- ✅ All images uploaded to Storage
- ✅ Fallback UI for manual upload works

### Intro Slides
- ✅ All 8 toggles save/load correctly
- ✅ Settings persist across sessions
- ✅ Outline respects settings

### Outline Generation
- ✅ Outline generated in < 30 seconds
- ✅ All enabled slides included
- ✅ Content is coherent and relevant

### PowerPoint Generation
- ✅ .pptx file downloads successfully
- ✅ All slides render correctly
- ✅ Images display properly
- ✅ Text is readable and formatted

---

## 🚧 Potential Blockers

### Category Assignment
- **Blocker:** LLM assigns wrong categories
- **Mitigation:** Add category review step, allow manual override

### Image Extraction
- **Blocker:** PDF layout too complex for position matching
- **Mitigation:** Fall back to manual upload UI

### Outline Generation
- **Blocker:** LLM generates inconsistent content
- **Mitigation:** Provide more structured prompts, add validation

### PowerPoint Generation
- **Blocker:** python-pptx doesn't support advanced formatting
- **Mitigation:** Keep template simple, focus on content over design

---

## 📝 Notes & Decisions

### Open Questions
1. Should categories be editable after generation?
2. How many images per item (max)?
3. Should outline be editable before PPT generation?
4. What happens if image extraction fails for some products?

### Decisions Made
- [ ] Category assignment approach: ___________
- [ ] Image extraction method: ___________
- [ ] PPT generation library: ___________
- [ ] Outline editing capability: Yes/No

---

## **Goal 3: Intro Slides Configuration & Generation**

### Current State
- Collection has intro slide settings (8 boolean flags)
- All flags default to `true` in Firestore
- No UI to toggle these settings
- No generation logic for intro slide content
- No storage for generated intro slide content

### Requirements

#### **1. UI: Checkbox Controls**
**Location:** Document Processing Form → Intro Slides section

**Current State:**
- Checkboxes exist but don't save to Firestore
- All default to checked

**Needed:**
- Wire checkboxes to Firestore settings
- Save on change (or with "Save Settings" button)
- Load existing settings on page load

**Settings to Control:**
```javascript
{
  include_cover_page_slide: true,
  include_brand_introduction_slide: true,
  include_brand_history_slide: true,
  include_brand_values_slide: true,
  include_brand_personality_slide: true,
  include_flagship_store_and_experiences_slide: true,
  include_core_collection_and_signature_categories_slide: true,
  include_product_categories_slide: true
}
```

---

#### **2. Backend: Intro Slide Generation Service**

**New Service:** `intro_slide_generation_service.py`

**Responsibilities:**
1. Fetch collection data (brand info, categories, etc.)
2. Check which slides are enabled
3. Generate content for each enabled slide using LLM
4. Return structured slide content

**API Endpoint:**
```
POST /api/collections/{collection_id}/intro-slides/generate
```

**Response:**
```javascript
{
  "slides": [
    {
      "slide_type": "cover_page",
      "title": "FW25 Collection",
      "subtitle": "R13 Denim",
      "content": {...}
    },
    {
      "slide_type": "brand_introduction",
      "title": "About R13",
      "content": {
        "paragraphs": ["..."],
        "key_points": ["..."]
      }
    }
  ]
}
```

---

#### **3. LLM Prompts for Each Slide Type**

**Slide 1: Cover Page**
- Input: Brand name, collection name, season
- Output: Title, subtitle, tagline

**Slide 2: Brand Introduction**
- Input: Brand description, founding story
- Output: Overview paragraph, key facts

**Slide 3: Brand History**
- Input: Brand founding year, milestones
- Output: Timeline, key moments

**Slide 4: Brand Values**
- Input: Brand mission, values
- Output: 3-5 core values with descriptions

**Slide 5: Brand Personality**
- Input: Brand voice, aesthetic
- Output: Personality traits, style descriptors

**Slide 6: Flagship Store & Experiences**
- Input: Store locations, retail strategy
- Output: Store highlights, experience description

**Slide 7: Core Collection & Signature Categories**
- Input: Collection categories
- Output: Category overview, signature pieces

**Slide 8: Product Categories**
- Input: Full category list
- Output: Category breakdown with counts

---

#### **4. Storage: Generated Slide Content**

**Location:** `collections/{collection_id}`

**New Fields:**
```javascript
{
  // Existing fields...
  
  // NEW: Generated intro slide content
  "intro_slides": {
    "generated_at": "2025-11-03T20:00:00Z",
    "slides": [
      {
        "slide_type": "cover_page",
        "title": "FW25 Collection",
        "subtitle": "R13 Denim",
        "content": {...}
      },
      {
        "slide_type": "brand_introduction",
        "title": "About R13",
        "content": {
          "paragraphs": ["..."],
          "key_points": ["..."]
        }
      }
      // ... other slides
    ]
  }
}
```

---

#### **5. UI: Display Generated Slides**

**Location:** Below "Generate Intro Slides" button

**Display Format:**
- Accordion or card-based layout
- Show each slide type
- Display title and content preview
- Allow expand/collapse for full content

**Example:**
```
┌─────────────────────────────────────┐
│ ✅ Cover Page                       │
│ Title: FW25 Collection              │
│ Subtitle: R13 Denim                 │
├─────────────────────────────────────┤
│ ✅ Brand Introduction               │
│ R13 is a contemporary denim brand...│
├─────────────────────────────────────┤
│ ✅ Brand History                    │
│ Founded in 2009 by Chris Leba...    │
└─────────────────────────────────────┘
```

---

### Implementation Plan

#### **Phase 1: UI Checkbox Wiring (1 hour)**
- [ ] Add state management for intro slide settings
- [ ] Wire checkboxes to update Firestore on change
- [ ] Load existing settings on component mount
- [ ] Test save/load functionality

**Files:**
- `frontend/src/components/DocumentProcessingForm.js`

---

#### **Phase 2: Backend Service (3 hours)**
- [ ] Create `intro_slide_generation_service.py`
- [ ] Implement LLM prompts for each slide type
- [ ] Add conditional logic (only generate enabled slides)
- [ ] Create API endpoint in new router
- [ ] Test with Postman/API docs

**Files:**
- `backend/app/services/intro_slide_generation_service.py` (NEW)
- `backend/app/routers/intro_slides.py` (NEW)
- `backend/app/main.py` (register router)

---

#### **Phase 3: Storage Schema (30 min)**
- [ ] Add `intro_slides` field to collection schema
- [ ] Update Firestore after generation
- [ ] Test data persistence

**Files:**
- `backend/app/models/collection.py` (update schema)
- `backend/app/services/intro_slide_generation_service.py` (save logic)

---

#### **Phase 4: UI Display (2 hours)**
- [ ] Add "Generate Intro Slides" button
- [ ] Show loading state during generation
- [ ] Display generated slides in accordion/cards
- [ ] Add refresh button to re-generate
- [ ] Style slide preview cards

**Files:**
- `frontend/src/components/DocumentProcessingForm.js`

---

#### **Phase 5: Testing & Refinement (1 hour)**
- [ ] Test with real collection data
- [ ] Verify all 8 slide types generate correctly
- [ ] Test enable/disable toggles
- [ ] Verify Firestore storage
- [ ] Check UI responsiveness

---

### LLM Prompt Templates

#### **Cover Page Prompt**
```
Generate a cover page for a fashion collection presentation.

Brand: {brand_name}
Collection: {collection_name}
Season: {season}

Return JSON:
{
  "title": "Main title for cover",
  "subtitle": "Subtitle or tagline",
  "tagline": "Optional short tagline"
}
```

#### **Brand Introduction Prompt**
```
Generate a brand introduction slide for {brand_name}.

Brand Description: {brand_description}
Founded: {founded_year}

Return JSON:
{
  "title": "About {brand_name}",
  "overview": "2-3 sentence brand overview",
  "key_points": ["Point 1", "Point 2", "Point 3"]
}
```

*(Similar templates for other 6 slide types)*

---

### Data Flow

```
1. User clicks "Generate Intro Slides"
   ↓
2. Frontend calls POST /api/collections/{id}/intro-slides/generate
   ↓
3. Backend fetches collection data
   ↓
4. Backend checks which slides are enabled
   ↓
5. For each enabled slide:
   - Build LLM prompt with collection data
   - Call OpenAI API
   - Parse response
   ↓
6. Store generated slides in Firestore
   ↓
7. Return slides to frontend
   ↓
8. Frontend displays slides in UI
```

---

### Estimated Time
- **Phase 1 (UI Checkboxes):** 1 hour
- **Phase 2 (Backend Service):** 3 hours
- **Phase 3 (Storage):** 30 min
- **Phase 4 (UI Display):** 2 hours
- **Phase 5 (Testing):** 1 hour

**Total: ~7.5 hours**

---

### Success Criteria
- ✅ Checkboxes save to Firestore settings
- ✅ "Generate Intro Slides" button triggers generation
- ✅ Only enabled slides are generated
- ✅ Generated content stored in Firestore
- ✅ Slides displayed in UI with proper formatting
- ✅ Can re-generate slides (overwrites previous)

---

## 🔗 Related Files

### Documentation
- `DOCUMENT_AND_ITEM_PIPELINE.md` - Current pipeline documentation

### Backend Services
- `backend/app/services/collection_document_service.py` - Document upload & parsing
- `backend/app/services/item_generation_service.py` - Item generation
- `backend/app/services/category_generation_service.py` - Category generation (existing)

### Frontend
- `frontend/src/components/DocumentProcessingForm.js` - Main UI component

### To Be Created
- `backend/app/services/presentation_outline_service.py`
- `backend/app/services/presentation_generator_service.py`
- `backend/app/routers/presentation.py`
- `templates/collection_template.pptx`

---

## PowerPoint Generation Implementation Plan

### Overview

Generate PowerPoint presentations with two main sections:
1. **Intro Slides** - 8 LLM-generated slides (cover, brand intro, history, values, personality, stores, core collection, categories)
2. **Product Slides** - Collection items with dynamic layout (1, 2, or 4 products per slide)

**Technology:** `python-pptx` library for direct PPT generation

---

### Architecture

```
POST /collections/{id}/presentation/generate
    ↓
PresentationGenerationService
    ↓
1. Fetch collection data (intro_slides, items, settings)
2. Create Presentation object
3. Generate intro slides (8 slides)
4. Generate product slides (dynamic layout)
5. Save to Firebase Storage
6. Return download URL
```

---

### Phase 1: Foundation & Setup (Week 1, Day 1-2)

#### **Step 1: Install Dependencies**
```bash
pip install python-pptx Pillow requests
```

**Files to update:**
- `backend/requirements.txt`

---

#### **Step 2: Create Service Skeleton**

**Create:** `backend/app/services/presentation_generation_service.py`

```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN

class PresentationGenerationService:
    def __init__(self, firebase_service, collection_service, item_service):
        self.db = firebase_service.db
        self.storage = firebase_service.storage
        self.collection_service = collection_service
        self.item_service = item_service
        self.prs = None
        self.blank_layout = None
    
    async def generate_presentation(
        self, 
        collection_id: str,
        user_id: str
    ) -> str:
        """Generate complete presentation"""
        # Implementation
        pass
```

**Tasks:**
- [ ] Create service file
- [ ] Add to global services in `main.py`
- [ ] Initialize with dependencies

---

#### **Step 3: Create API Router**

**Create:** `backend/app/routers/presentation.py`

```python
@router.post("/collections/{collection_id}/presentation/generate")
async def generate_presentation(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Generate PowerPoint presentation for collection"""
    user_id = current_user["uid"]
    download_url = await presentation_service.generate_presentation(
        collection_id, 
        user_id
    )
    return {"download_url": download_url}
```

**Tasks:**
- [ ] Create router file
- [ ] Register in `main.py`
- [ ] Test endpoint with Swagger

---

### Phase 2: Intro Slides Implementation (Week 1, Day 3-5)

#### **Step 4: Implement Core Slide Creation**

**In `PresentationGenerationService`:**

```python
async def _generate_intro_slides(self, intro_slides):
    """Generate all 8 intro slides"""
    for slide_data in intro_slides['slides']:
        slide_type = slide_data['slide_type']
        
        if slide_type == 'cover_page':
            self._create_cover_slide(slide_data)
        elif slide_type == 'brand_introduction':
            self._create_brand_intro_slide(slide_data)
        # ... etc for all 8 types
```

**Tasks:**
- [ ] Implement `_generate_intro_slides()` dispatcher
- [ ] Create blank slide helper
- [ ] Add text formatting utilities

---

#### **Step 5: Implement Individual Slide Layouts**

**Slide 1: Cover Page**
```python
def _create_cover_slide(self, data):
    """Layout: Centered title, subtitle, tagline"""
    # Title: Inches(1), Inches(2.5), 8x1, 44pt, bold, centered
    # Subtitle: Inches(1), Inches(3.7), 8x0.5, 24pt, centered
    # Tagline: Inches(1), Inches(6), 8x0.5, 18pt, italic, centered
```

**Slide 2: Brand Introduction**
```python
def _create_brand_intro_slide(self, data):
    """Layout: Title, overview paragraph, bullet points"""
    # Title: top, 32pt, bold
    # Overview: paragraph below title, 16pt
    # Key points: bullets, 14pt
```

**Slide 3: Brand History**
```python
def _create_brand_history_slide(self, data):
    """Layout: Title, founding info, milestones"""
    # Title: top, 32pt, bold
    # Founded: year, founder, origin, 18pt
    # Milestones: bullets, 14pt
```

**Slide 4: Brand Values**
```python
def _create_brand_values_slide(self, data):
    """Layout: Title, value cards"""
    # Title: top, 32pt, bold
    # Each value: name (bold) + description
```

**Slide 5: Brand Personality**
```python
def _create_brand_personality_slide(self, data):
    """Layout: Title, traits, descriptors, voice"""
    # Title: top, 32pt, bold
    # Personality traits: comma-separated
    # Style descriptors: comma-separated
    # Brand voice: paragraph
```

**Slide 6: Flagship Stores**
```python
def _create_flagship_stores_slide(self, data):
    """Layout: Title, store locations, retail experience"""
    # Title: top, 32pt, bold
    # Each store: city (bold) + description
    # Retail experience: paragraph at bottom
```

**Slide 7: Core Collection**
```python
def _create_core_collection_slide(self, data):
    """Layout: Title, overview, signature categories"""
    # Title: top, 32pt, bold
    # Overview: paragraph
    # Each category: name (bold) + description + key pieces
```

**Slide 8: Product Categories**
```python
def _create_product_categories_slide(self, data):
    """Layout: Title, overview, category list"""
    # Title: top, 32pt, bold
    # Overview: paragraph
    # Each category: name (bold) + product count + description
```

**Tasks:**
- [ ] Implement all 8 slide layout methods
- [ ] Test with real data
- [ ] Adjust positioning/sizing
- [ ] Verify text doesn't overflow

---

### Phase 3: Product Slides Implementation (Week 2, Day 1-3)

#### **Step 6: Dynamic Layout System**

**Create layout configurations:**

```python
def get_product_layout(self, products_per_slide: int):
    """Returns layout config for product slides"""
    
    if products_per_slide == 1:
        return {
            'positions': [
                {'left': Inches(3), 'top': Inches(2)}
            ],
            'image_size': Inches(4),
            'detail_height': Inches(1.5)
        }
    
    elif products_per_slide == 2:
        return {
            'positions': [
                {'left': Inches(1), 'top': Inches(2)},
                {'left': Inches(6), 'top': Inches(2)}
            ],
            'image_size': Inches(3),
            'detail_height': Inches(1.2)
        }
    
    elif products_per_slide == 4:
        return {
            'positions': [
                {'left': Inches(1), 'top': Inches(1.5)},
                {'left': Inches(5.5), 'top': Inches(1.5)},
                {'left': Inches(1), 'top': Inches(4.5)},
                {'left': Inches(5.5), 'top': Inches(4.5)}
            ],
            'image_size': Inches(2.5),
            'detail_height': Inches(1)
        }
```

**Tasks:**
- [ ] Implement layout config method
- [ ] Test positioning for each layout
- [ ] Ensure no overlap

---

#### **Step 7: Image Handling**

```python
def download_image(self, url: str) -> BytesIO:
    """Download image from URL"""
    import requests
    from io import BytesIO
    
    response = requests.get(url, timeout=10)
    return BytesIO(response.content)

def add_product_image(self, slide, url, left, top, size):
    """Add product image to slide"""
    try:
        img_stream = self.download_image(url)
        slide.shapes.add_picture(img_stream, left, top, width=size)
    except Exception as e:
        logger.error(f"Failed to add image: {e}")
        # Add placeholder or skip
```

**Tasks:**
- [ ] Implement image download
- [ ] Add error handling
- [ ] Test with real product images
- [ ] Handle missing images gracefully

---

#### **Step 8: Product Slide Generation**

```python
async def _generate_product_slides(self, items, products_per_slide):
    """Generate product slides with dynamic layout"""
    
    # Chunk items
    chunks = [items[i:i+products_per_slide] 
              for i in range(0, len(items), products_per_slide)]
    
    # Get layout
    layout_config = self.get_product_layout(products_per_slide)
    
    # Generate slides
    for chunk in chunks:
        slide = self.prs.slides.add_slide(self.blank_layout)
        
        for idx, product in enumerate(chunk):
            pos = layout_config['positions'][idx]
            
            # Add image
            if product.images and len(product.images) > 0:
                img_url = product.images[0].url
                self.add_product_image(
                    slide, 
                    img_url,
                    pos['left'],
                    pos['top'],
                    layout_config['image_size']
                )
            
            # Add product details
            details_top = pos['top'] + layout_config['image_size'] + Inches(0.2)
            textbox = slide.shapes.add_textbox(
                pos['left'],
                details_top,
                layout_config['image_size'],
                layout_config['detail_height']
            )
            
            tf = textbox.text_frame
            tf.word_wrap = True
            
            # Product name
            p = tf.paragraphs[0]
            p.text = product.name
            p.font.size = Pt(12)
            p.font.bold = True
            
            # SKU
            p = tf.add_paragraph()
            p.text = f"SKU: {product.sku}"
            p.font.size = Pt(10)
            
            # Price
            p = tf.add_paragraph()
            p.text = f"${product.retail_price}"
            p.font.size = Pt(11)
```

**Tasks:**
- [ ] Implement chunking logic
- [ ] Add product details formatting
- [ ] Test with different products_per_slide settings
- [ ] Handle edge cases (last slide not full)

---

### Phase 4: File Storage & Download (Week 2, Day 4)

#### **Step 9: Save to Firebase Storage**

```python
async def save_and_upload(self, collection_id: str) -> str:
    """Save PPT and upload to Firebase Storage"""
    
    # Save to temp file
    temp_path = f"/tmp/{collection_id}_{datetime.now().timestamp()}.pptx"
    self.prs.save(temp_path)
    
    # Upload to Firebase Storage
    blob = self.storage.bucket().blob(
        f"presentations/{collection_id}/presentation.pptx"
    )
    blob.upload_from_filename(temp_path)
    blob.make_public()
    
    # Clean up temp file
    os.remove(temp_path)
    
    return blob.public_url
```

**Tasks:**
- [ ] Implement save logic
- [ ] Upload to Firebase Storage
- [ ] Generate download URL
- [ ] Clean up temp files
- [ ] Test download

---

#### **Step 10: Update Collection Document**

```python
# Store presentation metadata in Firestore
await self.db.collection('collections').document(collection_id).update({
    'presentation': {
        'generated_at': datetime.utcnow(),
        'download_url': download_url,
        'slide_count': len(self.prs.slides),
        'products_per_slide': products_per_slide
    }
})
```

**Tasks:**
- [ ] Update collection document
- [ ] Store metadata
- [ ] Test retrieval

---

### Phase 5: Frontend Integration (Week 2, Day 5)

#### **Step 11: Add Generate Button**

**In `DocumentProcessingForm.js`:**

```javascript
const [generatingPresentation, setGeneratingPresentation] = useState(false);
const [presentationUrl, setPresentationUrl] = useState(null);

const generatePresentation = async () => {
  setGeneratingPresentation(true);
  try {
    const token = await getAuthToken();
    const response = await fetch(
      `http://localhost:8000/collections/${savedIds.collectionId}/presentation/generate`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const data = await response.json();
    setPresentationUrl(data.download_url);
    alert('Presentation generated successfully!');
  } catch (error) {
    alert(`Failed to generate presentation: ${error.message}`);
  } finally {
    setGeneratingPresentation(false);
  }
};
```

**Tasks:**
- [ ] Add state for presentation generation
- [ ] Add generate button
- [ ] Show loading state
- [ ] Display download link

---

#### **Step 12: Display Download Link**

```jsx
{presentationUrl && (
  <div className="mt-3 alert alert-success">
    <strong>✅ Presentation Ready!</strong>
    <br />
    <a 
      href={presentationUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="btn btn-primary mt-2"
    >
      Download PowerPoint
    </a>
  </div>
)}
```

**Tasks:**
- [ ] Add download UI
- [ ] Test download flow
- [ ] Handle errors

---

### Phase 6: Polish & Testing (Week 3)

#### **Step 13: Styling Improvements**

**Tasks:**
- [ ] Add brand colors (from collection/brand)
- [ ] Consistent fonts across slides
- [ ] Add logo to slides (if available)
- [ ] Improve spacing/alignment
- [ ] Test with different screen sizes

---

#### **Step 14: Error Handling**

**Tasks:**
- [ ] Handle missing intro_slides
- [ ] Handle missing items
- [ ] Handle image download failures
- [ ] Handle storage upload failures
- [ ] Add retry logic
- [ ] User-friendly error messages

---

#### **Step 15: Testing**

**Test Cases:**
- [ ] Generate with 1 product per slide
- [ ] Generate with 2 products per slide
- [ ] Generate with 4 products per slide
- [ ] Generate with no products
- [ ] Generate with missing images
- [ ] Generate with all 8 intro slides
- [ ] Generate with some intro slides disabled
- [ ] Test download link
- [ ] Test file opens in PowerPoint
- [ ] Test with large collections (100+ items)

---

### Success Criteria

✅ **Backend:**
- Presentation generation service complete
- All 8 intro slide types render correctly
- Product slides render with 1, 2, or 4 layouts
- Images download and embed successfully
- File saves to Firebase Storage
- Download URL returned

✅ **Frontend:**
- Generate button works
- Loading state displays
- Download link appears
- Error handling works

✅ **Quality:**
- Slides look professional
- Text doesn't overflow
- Images are properly sized
- Layout is consistent
- File opens in PowerPoint/Google Slides

---

### Files to Create/Modify

**New Files:**
- `backend/app/services/presentation_generation_service.py`
- `backend/app/routers/presentation.py`

**Modified Files:**
- `backend/app/main.py` (register router, add service)
- `backend/requirements.txt` (add python-pptx, Pillow)
- `frontend/src/components/DocumentProcessingForm.js` (add UI)

---

**Last Updated:** November 6, 2025  
**Status:** Planning Phase - Ready to Implement
