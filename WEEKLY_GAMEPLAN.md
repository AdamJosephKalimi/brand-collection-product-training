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
**Hybrid: Option A + Option D**

**Phase 1:** PDF Image Extraction (Option A)
- Extract images from PDF
- Match by position/proximity
- Best-effort automatic association

**Phase 2:** Manual Upload (Option D)
- UI to upload missing images
- UI to replace incorrect images
- Fallback for failed extractions

### Implementation Plan

#### Step 1: PDF Image Extraction
```python
# In collection_document_service.py
async def _extract_images_from_pdf(
    file_bytes: bytes,
    document_id: str
) -> List[Dict[str, Any]]:
    """
    Extract images from PDF with position data.
    Returns: [
        {
            'image_index': 0,
            'page_number': 1,
            'position': {'x': 100, 'y': 200},
            'image_bytes': b'...',
            'format': 'png'
        }
    ]
    """
```

#### Step 2: Upload Images to Storage
```python
# Upload each extracted image
storage_path = f"collections/{collection_id}/images/{document_id}_img_{index}.{format}"
image_url = await storage_service.upload_bytes(image_bytes, storage_path)
```

#### Step 3: Associate Images with Products
```python
# During structured product extraction
# Match images to products by:
# - Same page number
# - Proximity to product text
# - SKU/name matching in nearby text
```

#### Step 4: Update Item Generation
```python
# Items inherit images from line sheet structured_products
item['images'] = [
    {
        'url': signed_url,
        'storage_path': path,
        'alt': product_name
    }
]
```

### Tasks
- [ ] Research PDF image extraction libraries (PyMuPDF vs pdfplumber)
- [ ] Implement image extraction from PDF
- [ ] Upload images to Firebase Storage
- [ ] Create image-to-product matching logic
- [ ] Update structured_products schema to include images
- [ ] Update item generation to inherit images
- [ ] Build UI for manual image upload (fallback)
- [ ] Build UI to replace/reorder images

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

**Last Updated:** October 26, 2025  
**Status:** Planning Phase
