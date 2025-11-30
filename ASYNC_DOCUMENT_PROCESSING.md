# Async Document Processing Implementation Plan

## Overview
Implement asynchronous document processing workflow for collection assets (linesheets and purchase orders) with progress tracking, cancellation, and error handling.

---

## User Experience Flow

### **Collection Info Tab** (Always Accessible)
1. User uploads linesheet (Required)
2. User uploads PO (Required - update label from "Optional" to "Required")
3. User clicks **"Process Documents"** button
4. Processing starts (3-8 minutes)
   - Show progress indicator with phase names
   - Show **"Cancel Processing"** button
5. On success:
   - Show success message
   - Enable **Deck Settings** tab (becomes clickable)
   - Enable **"Continue to Deck Settings"** button
   - Save categories and structured products to DB
6. On error:
   - Show error message with details
   - Show **"Retry Processing"** button
   - Keep uploaded files

### **Deck Settings Tab** (Unlocked after Collection Info processing completes)
1. User configures deck settings
2. **Collection Items** tab also accessible at this time
3. **Generate Deck** tab still locked

### **Collection Items Tab** (Unlocked after Collection Info processing completes)
1. User clicks **"Generate Items"** button
2. Processing starts (2-5 minutes)
   - Show progress indicator with step names
   - Show **"Cancel Processing"** button
3. On success:
   - Display items list
   - Enable **Generate Deck** tab
   - Save items to DB
4. On error:
   - Show error message with details
   - Show **"Retry Processing"** button

### **Generate Deck Tab** (Unlocked after items are generated)
1. User generates deck
2. Existing functionality

---

## Tab Access Rules

### **Tab Visibility/Enablement:**
- **Collection Info:** Always visible and accessible
- **Deck Settings:** Hidden/disabled until Collection Info processing completes
- **Collection Items:** Hidden/disabled until Collection Info processing completes
- **Generate Deck:** Hidden/disabled until Collection Items processing completes

### **State Persistence:**
On page load, check completion state:
- If categories exist → Enable Deck Settings + Collection Items tabs
- If items exist → Enable all tabs including Generate Deck
- If processing in progress → Resume showing progress UI

---

## Processing Phases

### **Process Documents (Collection Info Tab)**
1. **Phase 1:** Extracting images from documents
2. **Phase 2:** Extracting text with positions
3. **Phase 3:** Filtering product images
4. **Phase 4:** Generating categories
5. **Phase 5:** Extracting structured products
6. **Phase 6:** Matching images to products

**Saves to DB:**
- Categories → `collections/{collection_id}.categories`
- Structured products → `collections/{collection_id}/documents/{document_id}.structured_products`
- Images → Firebase Storage

### **Generate Items (Collection Items Tab)**
1. **Step 1:** Fetching purchase order
2. **Step 2:** Parsing purchase order
3. **Step 3:** Identifying columns with AI
4. **Step 4:** Extracting SKU data
5. **Step 5:** Enriching from linesheet
6. **Step 6:** Generating item objects
7. **Step 7:** Saving (generic status - don't show DB details)

**Saves to DB:**
- Items → `collections/{collection_id}/items/{item_id}`

---

## Technical Architecture

### **Backend Components**

#### **1. Background Job Queue**
- **Technology:** FastAPI BackgroundTasks + Firestore State Tracking
- **Purpose:** Handle long-running processing tasks asynchronously
- **Why FastAPI BackgroundTasks:**
  - ✅ No extra infrastructure (no Redis needed)
  - ✅ Built into FastAPI
  - ✅ State persists in Firestore (you already have this)
  - ✅ Simpler setup and deployment
  - ✅ Lower cost ($0 extra)
  - ✅ Can migrate to Redis later if needed
- **Job Types:**
  - `process_collection_documents` (3-8 minutes)
  - `generate_collection_items` (2-5 minutes)
- **Stale Job Detection:**
  - On server startup, check for stale "processing" jobs
  - Auto-restart jobs that were interrupted by server restart
  - User sees "Restarting processing..." message

#### **2. Processing Status Storage**
**Location:** Firestore `collections/{collection_id}.processing_status`

**Schema:**
```json
{
  "document_processing": {
    "status": "idle|processing|completed|failed|cancelled",
    "task_id": "background_task_123",
    "started_at": "2024-11-28T19:30:00Z",
    "completed_at": "2024-11-28T19:38:00Z",
    "last_updated": "2024-11-28T19:35:00Z",
    "current_phase": "Generating categories",
    "progress": {
      "phase": 4,
      "total_phases": 6,
      "percentage": 67
    },
    "error": {
      "message": "Failed to parse document",
      "phase": "Extracting text",
      "details": "..."
    }
  },
  "item_generation": {
    "status": "idle|processing|completed|failed|cancelled",
    "task_id": "background_task_456",
    "started_at": "2024-11-28T19:40:00Z",
    "completed_at": "2024-11-28T19:45:00Z",
    "last_updated": "2024-11-28T19:43:00Z",
    "current_step": "Enriching from linesheet",
    "progress": {
      "step": 5,
      "total_steps": 7,
      "percentage": 71
    },
    "error": {
      "message": "No purchase order found",
      "step": "Fetching purchase order",
      "details": "..."
    }
  }
}
```

#### **3. New API Endpoints**

**Upload without processing:**
- `POST /api/collections/{id}/documents`
  - Add optional `process=false` parameter
  - Just upload file, don't start processing

**Start processing:**
- `POST /api/collections/{id}/documents/process`
  - Starts FastAPI background task
  - Returns immediately with 202 Accepted
  - Updates processing_status to "processing" in Firestore
  - Background task updates progress in Firestore as it runs

**Check processing status:**
- `GET /api/collections/{id}/processing-status`
  - Returns current status for both document processing and item generation
  - Reads from Firestore (not from background task directly)
  - Frontend polls this endpoint every 2-3 seconds

**Cancel processing:**
- `POST /api/collections/{id}/documents/process/cancel`
  - Sets cancellation flag in Firestore
  - Background task checks flag periodically and stops gracefully
  - Deletes partial data
  - Updates status to "cancelled"

**Generate items:**
- `POST /api/collections/{id}/items/generate`
  - Starts FastAPI background task
  - Returns immediately with 202 Accepted
  - Updates processing_status to "processing" in Firestore
  - Background task updates progress in Firestore as it runs

**Cancel item generation:**
- `POST /api/collections/{id}/items/generate/cancel`
  - Sets cancellation flag in Firestore
  - Background task checks flag periodically and stops gracefully
  - Deletes partial items
  - Updates status to "cancelled"

#### **4. Worker Implementation**

**Reuse existing pipeline logic:**
- `collection_document_service.py` → Extract to worker functions
- `item_generation_service.py` → Extract to worker functions

**Background task functions:**
```python
# backend/app/services/background_tasks.py
async def process_collection_documents_task(
    collection_id: str, 
    document_ids: List[str],
    db: firestore.Client
):
    """
    FastAPI background task for processing collection documents.
    Updates processing_status in Firestore with progress.
    Checks for cancellation flag between phases.
    """
    try:
        # Initialize status
        update_progress(db, collection_id, "document_processing", 
                       phase=1, total_phases=6, message="Extracting images")
        
        # Phase 1: Extract images
        if check_cancelled(db, collection_id, "document_processing"):
            return
        # ... existing logic from collection_document_service
        
        # Phase 2: Extract text
        update_progress(db, collection_id, "document_processing",
                       phase=2, total_phases=6, message="Extracting text")
        if check_cancelled(db, collection_id, "document_processing"):
            return
        # ... existing logic
        
        # Continue for all phases...
        
        # Mark as completed
        update_progress(db, collection_id, "document_processing",
                       status="completed", phase=6, total_phases=6)
    except Exception as e:
        # Mark as failed
        update_progress(db, collection_id, "document_processing",
                       status="failed", error=str(e))

async def generate_collection_items_task(
    collection_id: str,
    db: firestore.Client
):
    """
    FastAPI background task for generating collection items.
    Updates processing_status in Firestore with progress.
    Checks for cancellation flag between steps.
    """
    try:
        # Step 1: Fetch PO
        update_progress(db, collection_id, "item_generation",
                       step=1, total_steps=7, message="Fetching purchase order")
        if check_cancelled(db, collection_id, "item_generation"):
            return
        # ... existing logic from item_generation_service
        
        # Continue for all steps...
        
        # Mark as completed
        update_progress(db, collection_id, "item_generation",
                       status="completed", step=7, total_steps=7)
    except Exception as e:
        # Mark as failed
        update_progress(db, collection_id, "item_generation",
                       status="failed", error=str(e))
```

**Helper functions:**
```python
def update_progress(db, collection_id, process_type, **kwargs):
    """Update processing status in Firestore"""
    collection_ref = db.collection('collections').document(collection_id)
    collection_ref.update({
        f'processing_status.{process_type}': {
            'last_updated': datetime.utcnow().isoformat(),
            **kwargs
        }
    })

def check_cancelled(db, collection_id, process_type) -> bool:
    """Check if cancellation was requested"""
    doc = db.collection('collections').document(collection_id).get()
    status = doc.to_dict().get('processing_status', {}).get(process_type, {})
    return status.get('status') == 'cancelled'
```

---

### **Frontend Components**

#### **1. Processing Status Hook**
```javascript
// hooks/useProcessingStatus.js
export const useProcessingStatus = (collectionId) => {
  // Polls processing status endpoint
  // Returns: { documentProcessing, itemGeneration, isPolling }
  // Auto-starts polling if status is "processing"
}
```

#### **2. Progress Indicator Component**
```javascript
// components/ProcessingProgress.jsx
<ProcessingProgress 
  status={status}
  currentPhase={currentPhase}
  progress={progress}
  onCancel={handleCancel}
/>
```

#### **3. Tab Access Logic**
```javascript
// In CollectionSettingsPage.jsx
const tabAccess = {
  collectionInfo: true, // Always accessible
  deckSettings: hasCategories,
  collectionItems: hasCategories,
  generateDeck: hasItems
}
```

#### **4. State Detection on Load**
```javascript
useEffect(() => {
  // Check processing status
  if (processingStatus === 'processing') {
    // Resume showing progress UI
    startPolling();
  }
  
  // Check completion state
  if (hasCategories) {
    enableTab('deckSettings');
    enableTab('collectionItems');
  }
  if (hasItems) {
    enableTab('generateDeck');
  }
}, [collectionId]);
```

---

## Implementation Steps

### **Phase 1: Backend Infrastructure** ✅ COMPLETE
1. ✅ Create background task service file (`background_tasks.py`)
2. ✅ Add processing_status schema to Firestore (documented, will be created on first use)
3. ✅ Implement progress update helpers
4. ✅ Implement cancellation check helpers
5. ✅ Add stale job detection on server startup

### **Phase 2: Backend API Endpoints** ✅ COMPLETE
1. ✅ Update upload endpoint to support `process=false` (parameter added, TODO in service)
2. ✅ Create `/documents/process` endpoint
3. ✅ Create `/processing-status` endpoint
4. ✅ Create `/documents/process/cancel` endpoint
5. ✅ Create `/items/generate/cancel` endpoint
6. ✅ Update existing `/items/generate` to use background tasks

### **Phase 3: Background Task Implementation** ✅ COMPLETE
1. ✅ Refactored `_parse_and_store_text()` with progress callback
2. ✅ Wired up document processing background task
3. ✅ Add progress updates at each phase (6 phases)
4. ✅ Add cancellation checks between phases and documents
5. ✅ Wired up item generation background task
6. ✅ Add progress updates at each step (7 steps)
7. ✅ Add cancellation checks between steps
8. ✅ Implement cleanup functions for partial data
9. ✅ Error handling with Firestore status updates
10. 📝 TODO: Support multiple linesheets in item generation

### **Phase 4: Frontend Hooks** ✅ COMPLETE
1. ✅ Created `useProcessingStatus` hook with automatic polling
2. ✅ Created `useProcessDocuments` mutation hook
3. ✅ Created `useCancelDocumentProcessing` mutation hook
4. ✅ Created `useGenerateItems` mutation hook
5. ✅ Created `useCancelItemGeneration` mutation hook
6. ✅ All hooks follow React Query patterns with proper invalidation

### **Phase 5: Frontend UI Components** ✅ COMPLETE
1. ✅ Created `ProcessingProgress` component with progress bar, status icons, and cancel button
2. ✅ Updated upload service to support `process=false` parameter
3. ✅ Updated `CollectionSettingsPage` to upload with `process=false` (staging only)
4. ✅ Added "Process Documents" button to Upload Collection Assets section header
5. ✅ Added `ProcessingProgress` component for document processing
6. ✅ Document processing button disabled when no documents or processing active
7. ✅ Cancel button integrated with `useCancelDocumentProcessing` hook
8. ✅ Added "Generate Items" button to Collection Items tab header
9. ✅ Added `ProcessingProgress` component for item generation
10. ✅ Item generation button disabled when no categories or processing active
11. ✅ Cancel button integrated with `useCancelItemGeneration` hook

### **Phase 6: Tab Access Control** ✅ COMPLETE
1. ✅ Updated `Tabs` component to support disabled state
2. ✅ Added disabled tab styling (opacity 0.5, not clickable)
3. ✅ Implemented tab enablement logic based on processing completion
4. ✅ Deck Settings & Collection Items tabs: Enabled when `document_processing.status === 'completed'` AND categories exist
5. ✅ Generate Deck tab: Enabled when `item_generation.status === 'completed'` AND items exist
6. ✅ Added state detection on page load to resume polling if processing active
7. ✅ Disabled "Continue to Deck Settings" button until categories ready
8. ✅ Automatic tab enablement when processing completes

### **Phase 7: Error Handling**
1. ✅ Display error messages with details
2. ✅ Implement retry functionality
3. ✅ Add error logging and monitoring

### **Phase 8: Testing**
1. ✅ Test full workflow end-to-end
2. ✅ Test page refresh during processing
3. ✅ Test browser close/reopen during processing
4. ✅ Test cancellation
5. ✅ Test error scenarios
6. ✅ Test with/without PO

---

## Error Handling

### **Document Processing Errors**
- **Phase 1-3 (Image/Text extraction):** Show error, allow retry, keep files
- **Phase 4 (Category generation):** Show error, allow retry with different prompt
- **Phase 5-6 (Product extraction):** Show error, allow retry, partial data may exist

### **Item Generation Errors**
- **Step 1 (No PO):** Show error, prompt to upload PO
- **Step 2-3 (Parse/Column ID):** Show error, allow retry
- **Step 4-6 (Data extraction):** Show error, allow retry, partial items may exist

### **Cancellation Cleanup**
- Stop background job
- Delete partial data:
  - Partial structured_products
  - Partial items
  - Extracted images (optional - may keep for retry)
- Reset processing_status to "idle"
- Show "Processing cancelled" message

---

## Cancellation Implementation

### **Backend:**
```python
@router.post("/{collection_id}/documents/process/cancel")
async def cancel_document_processing(collection_id: str):
    # 1. Set cancellation flag in Firestore
    collection_ref = db.collection('collections').document(collection_id)
    collection_ref.update({
        'processing_status.document_processing.status': 'cancelled'
    })
    
    # 2. Background task will check this flag and stop gracefully
    # 3. Background task will delete partial data
    # 4. Return success immediately
    return {"success": True, "message": "Cancellation requested"}
```

### **Frontend:**
```javascript
const handleCancel = async () => {
  if (confirm('Are you sure you want to cancel processing?')) {
    await cancelProcessing(collectionId);
    // UI updates automatically via polling
  }
}
```

---

## Progress Polling Strategy

### **Polling Interval:**
- Every 2 seconds while processing
- Stop polling when status is "completed", "failed", or "cancelled"
- Resume polling if page detects "processing" status on load

### **Optimization:**
- Use React Query for automatic caching and deduplication
- Only poll when tab is visible (use `document.visibilityState`)
- Exponential backoff on errors

---

## Database Schema Updates

### **Collection Document:**
```javascript
{
  // Existing fields...
  "processing_status": {
    "document_processing": { /* ... */ },
    "item_generation": { /* ... */ }
  }
}
```

### **No changes needed to:**
- Categories storage
- Structured products storage
- Items storage
- Documents storage

---

## UI/UX Details

### **Process Documents Button (Collection Info)**
- Label: "Process Documents"
- Disabled when: No files uploaded OR already processing
- Shows loading spinner when clicked
- Replaced by progress indicator during processing

### **Cancel Processing Button**
- Appears during processing
- Red/warning color
- Confirmation dialog before cancelling

### **Continue to Deck Settings Button**
- Disabled until processing completes
- Green/primary color when enabled
- Optional - user can also click tab directly

### **Generate Items Button (Collection Items)**
- Label: "Generate Items"
- Disabled when: No PO uploaded OR already processing OR no structured products
- Shows loading spinner when clicked
- Replaced by progress indicator during processing

### **Tab Styling**
- Disabled tabs: Grayed out, not clickable, cursor: not-allowed
- Enabled tabs: Normal styling, clickable
- Active tab: Highlighted

### **Progress Indicator**
- Shows current phase/step name
- Shows progress bar (percentage)
- Shows elapsed time
- Shows "Cancel Processing" button
- Example: "Phase 4 of 6: Generating categories... 67% (2m 30s)"

---

## Success Criteria

### **Functional Requirements:**
- ✅ User can upload files without immediate processing
- ✅ User can trigger processing manually
- ✅ Processing happens in background (doesn't block UI)
- ✅ User sees real-time progress updates
- ✅ User can cancel processing at any time
- ✅ User can refresh page without losing progress
- ✅ User can close browser and resume later
- ✅ Tabs unlock progressively based on completion
- ✅ Errors are displayed with retry option
- ✅ Duplicate processing is prevented

### **Performance Requirements:**
- ✅ Upload response < 2 seconds
- ✅ Processing status check < 500ms
- ✅ Progress updates every 2-3 seconds
- ✅ Cancellation response < 2 seconds

### **User Experience Requirements:**
- ✅ Clear visual feedback at every step
- ✅ No confusion about what's happening
- ✅ No data loss on refresh/close
- ✅ Guided workflow (can't skip steps)
- ✅ Helpful error messages

---

## Future Enhancements

### **Phase 2 (Post-MVP):**
- Email notification when processing completes
- Webhook support for external integrations
- Batch processing multiple collections
- Processing history/logs
- Estimated time remaining
- Pause/resume processing (instead of just cancel)

### **Phase 3 (Advanced):**
- Real-time progress via WebSockets (instead of polling)
- Parallel processing of multiple documents
- Smart retry with exponential backoff
- Processing analytics and insights

---

## Notes

- PO is now **required** (update label from "Optional" to "Required")
- Reuse existing processing pipeline logic as much as possible
- Keep Step 7 (Saving) generic - don't expose DB implementation details
- All processing state stored in Firestore for persistence
- FastAPI BackgroundTasks run in-process (no separate worker needed)
- Frontend polls Firestore via API endpoint every 2-3 seconds
- On server restart, stale jobs are detected and auto-restarted
- Background tasks check cancellation flag between phases/steps

---

## Questions/Decisions Log

1. **Q:** Should categories be generated automatically or manually?
   **A:** Automatically during document processing (Phase 4)

2. **Q:** Should items be generated automatically or manually?
   **A:** Manually via button on Collection Items tab

3. **Q:** What happens on page refresh during processing?
   **A:** Resume showing progress UI, continue polling

4. **Q:** Should tabs be hidden or just disabled?
   **A:** Hidden/disabled until requirements met

5. **Q:** Is PO optional or required?
   **A:** Required (update label)

6. **Q:** Should we show detailed DB operations in progress?
   **A:** No, keep Step 7 generic as "Saving"

7. **Q:** Can user access multiple tabs simultaneously?
   **A:** Yes, once unlocked (Deck Settings + Collection Items both accessible after step 1)

8. **Q:** Should we use Redis + RQ or FastAPI BackgroundTasks?
   **A:** FastAPI BackgroundTasks - simpler, no extra infrastructure, state stored in Firestore, can migrate to Redis later if needed
