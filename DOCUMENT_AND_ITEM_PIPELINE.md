# Document Upload & Item Generation Pipeline

This document explains the two-stage process for creating collection items from purchase orders and line sheets.

---

## Overview

The system uses a **two-stage pipeline**:

1. **Document Upload** - Parse and extract structured data from documents
2. **Item Generation** - Combine PO and Line Sheet data to create final items

---

## Stage 1: Document Upload Pipeline

### Trigger
User uploads documents (PO + Line Sheet) and clicks **"Save Documents"**

### Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UPLOAD TO FIREBASE STORAGE                               │
│    • PO: /collections/{id}/documents/purchase_order.xlsx    │
│    • Line Sheet: /collections/{id}/documents/line_sheet.pdf │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CREATE FIRESTORE METADATA                                │
│    • Document ID, name, type, storage path                  │
│    • Initial fields: parsed_text, normalized_text = null    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PARSE DOCUMENT CONTENT                                   │
│    • PDF: OCR + table detection → raw text                  │
│    • Excel: Extract all rows/columns → raw text             │
│    • Result: parsed_text field populated                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. NORMALIZE TEXT                                           │
│    • Clean up formatting, remove noise                      │
│    • Standardize whitespace and structure                   │
│    • Result: normalized_text field populated                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. EXTRACT STRUCTURED DATA (LINE SHEETS ONLY)               │
│    • Split normalized_text into 20K character chunks        │
│    • Send each chunk to LLM (GPT-4)                         │
│    • LLM extracts: SKU, name, price, color, material, etc.  │
│    • Deduplicate products across chunks                     │
│    • Result: structured_products field populated            │
│                                                              │
│    ⚠️  Purchase Orders skip this step                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. SAVE TO FIRESTORE                                        │
│    • Update document with all extracted data                │
│    • Line Sheet: Has structured_products ready              │
│    • PO: Has parsed_text ready for later processing         │
└─────────────────────────────────────────────────────────────┘
```

### What Gets Stored

#### Purchase Order Document
```json
{
  "document_id": "doc_abc123",
  "type": "purchase_order",
  "storage_path": "collections/.../purchase_order.xlsx",
  "parsed_text": "Raw Excel content as text",
  "normalized_text": "Cleaned text",
  "structured_products": null  ← Not extracted for PO
}
```

#### Line Sheet Document
```json
{
  "document_id": "doc_xyz789",
  "type": "line_sheet",
  "storage_path": "collections/.../line_sheet.pdf",
  "parsed_text": "Raw PDF content",
  "normalized_text": "Cleaned text",
  "structured_products": [  ← LLM EXTRACTED
    {
      "sku": "PA05669305",
      "product_name": "Baggy Jeans",
      "wholesale_price": 134,
      "rrp": 335,
      "color": "Medium Wash",
      "material": "100% Cotton",
      "origin": "United States"
    }
    // ... more products
  ]
}
```

### Key Points

- ✅ **Synchronous** - Upload waits for parsing to complete
- ✅ **Line sheets get LLM extraction** during upload
- ✅ **Purchase orders do NOT** get LLM extraction
- ✅ **Progressive updates** - Firestore updated as chunks are processed
- ✅ **Deduplication** - Products are deduplicated across chunks

---

## Stage 2: Item Generation Pipeline

### Trigger
User clicks **"🚀 Generate Items"** button

### Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FETCH PURCHASE ORDER DOCUMENT                            │
│    • Query Firestore for type = "purchase_order"            │
│    • Get document metadata and storage path                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. DOWNLOAD PO FILE FROM STORAGE                            │
│    • Download Excel file from Firebase Storage              │
│    • Load into memory as bytes                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PARSE EXCEL FILE                                         │
│    • Extract raw headers and rows                           │
│    • No interpretation yet, just structure                  │
│    • Result: { headers: [...], rows: [[...], ...] }        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. IDENTIFY COLUMNS WITH LLM                                │
│    • Send headers + sample rows to GPT-4                    │
│    • LLM identifies which columns contain:                  │
│      - SKU                                                   │
│      - Color/Color Code                                     │
│      - Sizes (S, M, L, 30, 32, etc.)                        │
│      - Quantities per size                                  │
│    • Result: Column mapping                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. EXTRACT SKU DATA FROM PO                                 │
│    • Use column mapping to extract data                     │
│    • For each row, extract:                                 │
│      - Full SKU (e.g., "PA05669305BL139")                   │
│      - Base SKU (e.g., "PA05669305")                        │
│      - Color code (e.g., "BL139" or "4018")                 │
│      - Sizes and quantities (e.g., {"30": 10, "32": 20})    │
│    • Result: List of PO items with SKU + size data          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. ENRICH FROM LINE SHEET                                   │
│    • Fetch Line Sheet document from Firestore               │
│    • Get structured_products (already LLM extracted)        │
│    • For each PO item:                                      │
│      - Match by base SKU                                    │
│      - Add: product_name, prices, origin, material          │
│    • Result: Enriched items with complete data              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. GENERATE ITEM OBJECTS                                    │
│    • Create final item structure for each SKU/color         │
│    • Generate unique item_id                                │
│    • Generate content_hash (SKU + color_code)               │
│    • Add timestamps, metadata                               │
│    • Result: Complete item objects ready for Firestore      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. SAVE TO FIRESTORE WITH DUPLICATE DETECTION               │
│    • For each item:                                         │
│      - Check if content_hash already exists                 │
│      - If exists: Skip (duplicate)                          │
│      - If new: Save to /collections/{id}/items/{item_id}    │
│    • Update collection stats                                │
│    • Result: Items saved, stats returned                    │
└─────────────────────────────────────────────────────────────┘
```

### Example Data Flow

#### Input: PO Row
```
SKU: PA05669305BL139
Size 30: 10
Size 32: 20
Size 34: 15
```

#### Input: Line Sheet Product
```json
{
  "sku": "PA05669305",
  "product_name": "Baggy Jeans",
  "wholesale_price": 134,
  "rrp": 335,
  "color": "Medium Wash",
  "material": "100% Cotton",
  "origin": "United States"
}
```

#### Output: Final Item
```json
{
  "item_id": "item_a1b2c3d4e5f6g7h8",
  "collection_id": "coll_xyz789",
  "content_hash": "a1b2c3d4e5f6g7h8",
  
  // From PO
  "sku": "PA05669305BL139",
  "base_sku": "PA05669305",
  "color_code": "BL139",
  "sizes": {
    "30": 10,
    "32": 20,
    "34": 15
  },
  
  // From Line Sheet
  "product_name": "Baggy Jeans",
  "color": "Medium Wash",
  "wholesale_price": 134,
  "rrp": 335,
  "material": ["100% Cotton"],
  "origin": "United States",
  
  // Metadata
  "category": null,
  "subcategory": null,
  "highlighted_item": false,
  "source_documents": {
    "purchase_order_id": "doc_abc123",
    "line_sheet_id": "doc_xyz789"
  },
  "created_at": "2025-10-23T20:00:00Z",
  "updated_at": "2025-10-23T20:00:00Z"
}
```

### Duplicate Detection

Items are deduplicated using a **content hash** based on:
- SKU
- Color code

If you run "Generate Items" multiple times:
- ✅ Existing items are skipped
- ✅ Only new items are created
- ✅ Stats show: `items_created` vs `items_skipped`

### Key Points

- ✅ **Separate from upload** - Must click "Generate Items"
- ✅ **Combines two sources** - PO (sizes/quantities) + Line Sheet (product details)
- ✅ **LLM identifies columns** - Handles different PO formats
- ✅ **Duplicate detection** - Safe to re-run
- ✅ **Returns statistics** - Shows what was created/skipped

---

## Summary

### Document Upload
**Purpose:** Parse and extract structured data from documents

**What happens:**
- Files uploaded to Storage
- Text extracted and normalized
- **Line sheets get LLM extraction** → `structured_products`
- Purchase orders stored as-is for later processing

**Result:** Documents ready for item generation

### Item Generation
**Purpose:** Create final items by combining PO and Line Sheet data

**What happens:**
- PO parsed for SKUs, sizes, quantities
- Line Sheet `structured_products` fetched (already extracted)
- Data matched by base SKU
- Final items created and saved

**Result:** Items in `/collections/{id}/items` ready for display

---

## File Locations

### Backend Services
- **Document Upload:** `backend/app/services/collection_document_service.py`
- **Item Generation:** `backend/app/services/item_generation_service.py`

### API Endpoints
- **Upload Document:** `POST /api/collections/{id}/documents`
- **Generate Items:** `POST /api/collections/{id}/items/generate`
- **Get Items:** `GET /api/collections/{id}/items`

### Frontend
- **UI Component:** `frontend/src/components/DocumentProcessingForm.js`
- **Document Upload:** `saveDocuments()` function
- **Item Generation:** `generateItems()` function

---

## Common Questions

### Q: Why two separate steps?
**A:** Document upload is generic (works for any document type). Item generation is specific to PO + Line Sheet matching logic.

### Q: Can I upload just a Line Sheet?
**A:** Yes, but you won't be able to generate items without a Purchase Order (need size/quantity data).

### Q: What if I upload a new PO?
**A:** Click "Generate Items" again. Duplicate detection will skip existing items and only create new ones.

### Q: Where does the LLM get called?
**A:** Twice:
1. During Line Sheet upload (extract products)
2. During Item Generation (identify PO columns)

### Q: How long does it take?
**A:** 
- Document Upload: 30-60 seconds (depends on document size)
- Item Generation: 10-30 seconds (depends on number of SKUs)
