# PRD — AI Product Training Slide Builder (POC)

**Product name:** Product Training AI (working title)
**Owner:** Adam Kalimi
**Date:** 2025-08-28
**Version:** 0.9 (POC)

---

## 1) Summary

Build a small web app that turns a fashion **line sheet (JSON)** plus a few user selections into a branded **Product Training** slide deck (30–100 slides typical). The app:

* lets the user paste/upload a line sheet JSON (POC avoids OCR/PDF parsing),
* select which training sections to include (Brand Intro/History/Personality, Key Themes & Seasonal Highlights, FAQs, Selected Items Overview from the line sheet, Product Details: materials/care/process),
* uses OpenAI to draft on-brand copy and Presenton to assemble slides,
* renders a preview and supports **Export to PDF** (and **PPTX** if feasible via Presenton),
* enforces layout rule **3 products per slide** for product overview pages.

Stack: **React + Bootstrap (frontend)**, **FastAPI (Python backend)**, **OpenAI API**, **Presenton** for slide generation.

---

## 2) Goals & Non‑Goals

### Goals

1. **End-to-end POC** from JSON line sheet → AI-generated content → slide deck preview → export.
2. **Section toggles** so user chooses which sections to include.
3. **Product slides pagination** with a hard rule: **max 3 items per slide** (auto-paginate N items to ⌈N/3⌉ slides).
4. **Minimal theming**: clean, legible default template with brand name on the cover; optional logo upload if trivial.
5. **Single-user, no-auth** POC; API key provided via server-side env.

### Non‑Goals (POC)

* OCR/PDF parsing of line sheets (support JSON only).
* Complex brand guideline ingestion (colors/typography libraries).
* Multi-language/localization.
* Collaboration, comments, version history.
* Deep web research/citation management; POC limits claims to safe, general knowledge unless the user enables “web-research mode” (future).

---

## 3) Primary Personas

* **Buyer / Planner:** imports line sheet, picks sections, generates training deck.
* **Retail Trainer / Store Lead:** consumes the deck; needs clarity and visual polish.
* **Sales Associate (end reader):** needs concise, trustworthy info.

---

## 4) Assumptions

* User can provide **line sheet JSON** (either pasted or file upload).
* Presenton can be driven programmatically (CLI or library) to output **HTML/PDF** and possibly **PPTX**. If PPTX isn’t viable in POC, PDF export is sufficient.
* OpenAI key is configured server-side; only text (no product images are sent to OpenAI by default).

---

## 5) Scope & Requirements

### 5.1 Functional Requirements (FR)

**FR‑1.** Upload/Input Line Sheet JSON (paste textarea and JSON file upload). Validate schema; show errors.
**FR‑2.** Capture **Brand Name** (text input) and optional **Brand Logo** (image upload; optional).
**FR‑3.** **Section Selector** (checkboxes):

* Brand intro, history, personality
* Key themes & seasonal highlights
* FAQs (care, fabrics, slogans, washing tips)
* Selected items overview (from line sheet)
* Product details (materials, care/washing methods, production processes like “selvedge denim”)
  **FR‑4.** **Generate Deck**: backend composes prompts, drafts copy, and assembles Presenton slide structure.
  **FR‑5.** **Product Pagination**: for item overview pages, show **3 items per slide** in a grid; auto-create as many slides as needed.
  **FR‑6.** **Preview** deck (client-side HTML preview or embedded PDF preview).
  **FR‑7.** **Export** deck: PDF (required); PPTX (nice-to-have if supported by Presenton).
  **FR‑8.** **Basic Theme**: cover slide includes brand name and season; body slides use consistent fonts/margins; image-first product cards.
  **FR‑9.** **Progress & Errors**: show generation progress and human-readable error messages.
  **FR‑10.** **Determinism Toggle (optional)**: slider for temperature (default low for concise copy).

### 5.2 Non‑Functional Requirements (NFR)

* **Performance:** First deck for a 50‑item line sheet generated in ≤ 90 seconds on a modest VM.
* **Reliability:** Graceful failures with persistent logs.
* **Cost:** ≤ \$0.75 in OpenAI costs for a 50‑item deck (target; adjust prompts accordingly).
* **Security:** API keys only on server; no PII logs; rate-limit deck generation per IP.
* **Accessibility:** Keyboard navigation; alt text if images are present.

### 5.3 Out of Scope (POC)

* Automated brand asset extraction, multi-brand decks, per-market product filtering, multi-user auth.

---

## 6) Data & Integrations

### 6.1 Line Sheet JSON — Minimal Contract (POC)

```json
{
  "brand": "Acme Denim",
  "season": "FW2025",
  "currency": "USD",
  "items": [
    {
      "id": "AC-001",
      "name": "Selvedge Slim Jean",
      "sku": "SLV-SLIM-RAW",
      "category": "Bottoms",
      "subcategory": "Jeans",
      "gender": "Unisex",
      "description": "13oz raw selvedge denim, mid-rise, tapered leg.",
      "materials": ["100% Cotton (Selvedge)"]
    ,  "care": ["Cold wash inside-out", "Line dry"],
      "process": ["Selvedge loom", "Indigo rope-dye"],
      "price": 198,
      "images": [
        {"url": "https://example.com/img/AC-001-front.jpg", "alt": "Front view"},
        {"url": "https://example.com/img/AC-001-detail.jpg", "alt": "Detail view"}
      ],
      "variants": [
        {"color": "Raw Indigo", "sizes": ["28", "30", "32", "34"]}
      ],
      "tags": ["selvedge", "raw", "indigo"]
    }
  ]
}
```

**Validation rules:** `items[].id`, `items[].name` required. Optional arrays may be empty. Missing `brand/season` can be overridden by user inputs.

### 6.2 Joor Adapter (Future, optional in POC)

* If available, implement `/integrations/joor/import?season=FW2025` using Joor API keys to fetch JSON; normalize into the contract above.
* Otherwise, keep **manual JSON upload** as the POC path.

### 6.3 Presenton Integration

* Backend composes a **Presenton deck spec** (Markdown/JSON depending on Presenton’s API).
* Render server-side to **PDF** (preferred for POC certainty) and, if supported without heavy lift, **PPTX**.
* Store generated artifact temporarily and give the client a download URL.

---

## 7) System Architecture

### 7.1 High-Level Diagram (POC)

```
[React + Bootstrap] ──(JSON, settings)──> [FastAPI]
     │                                 │
     │                                 ├─> Prompt Builder ──> OpenAI (text)
     │                                 │
     │                                 └─> Deck Composer ──> Presenton (render → PDF/PPTX)
     │                                                       │
     └─────<────── Preview/Download ─────<──── File Store <──┘
```

### 7.2 Backend (FastAPI)

**Services**

* `SchemaValidator`: validate/normalize line sheet JSON.
* `PromptBuilder`: create section-specific prompts.
* `ContentService`: call OpenAI, return structured copy blocks.
* `DeckComposer`: assemble Presenton spec, enforce 3-per-slide pagination.
* `RenderService`: invoke Presenton to produce HTML/PDF/PPTX.
* `StorageService`: temp storage for artifacts; signed URLs.

**REST Endpoints**

* `POST /api/linesheets/validate` → `{valid, errors, normalized}`
* `POST /api/decks/generate` → accepts `{brand, season?, sections[], linesheet}`; returns `{deckId, status}`
* `GET  /api/decks/{deckId}` → `{status, meta, previewUrl?}`
* `GET  /api/decks/{deckId}/export?format=pdf|pptx` → file download
* `DELETE /api/decks/{deckId}` → cleanup temp files

### 7.3 Frontend (React + Bootstrap)

**Pages/Components**

* **Home** (single page POC):

  * Brand Name (required), Season (optional), Logo upload (optional)
  * Line Sheet JSON **textarea** and **file upload**
  * Section checkboxes (default all ON)
  * **Generate** button with progress bar
  * **Preview Panel** (PDF or HTML)
  * **Export Buttons**: PDF (primary), PPTX (secondary if available)

### 7.4 Storage

* Temp directory (e.g., `/tmp/decks/{deckId}`) with TTL cleanup job (e.g., 24 hours).
* No database required for POC; in-memory registry keyed by `deckId`.

---

## 8) UX Flows

1. **Upload & Configure**

* User pastes or uploads JSON → validation feedback inline.
* Enters Brand Name → optional Logo.
* Checks sections → hits **Generate**.

2. **Generation**

* Backend drafts copy per selected sections.
* Deck is composed and rendered.
* UI shows spinner/progress.

3. **Review & Export**

* Preview shows first page of PDF or HTML.
* Click **Export PDF** (and **Export PPTX** if available).
* Option to **Regenerate** with different section toggles.

---

## 9) Content Generation (OpenAI)

### 9.1 Prompt Templates (POC)

**Brand intro/history/personality**

> "You are a retail training copywriter. Using the line sheet metadata below (brand, season, item categories), write a concise brand overview (100–150 words) covering history and personality. Keep claims generic and safe; avoid unverifiable specifics. Output: markdown with a title and 3–5 bullets."

**Key themes & seasonal highlights**

> "Based on categories/tags in the line sheet and the provided brand name/season, infer 2–3 plausible seasonal themes and 3 highlights (materials, silhouettes, colors). Avoid specific historical claims. Output: title + bullets."

**FAQs**

> "Draft a short FAQ (6–10 Q\&A) focused on care, materials, sizing, fabric types (e.g., selvedge), and store-ready talking points. Keep answers 1–2 sentences."

**Product details explainer**

> "Write short explainer blurbs (60–90 words each) for up to 3 processes or material concepts found in the line sheet (e.g., ‘What is selvedge denim?’)."

**Safety guardrails**

* Keep content generic unless the user supplies exact copy.
* No external claims about brand history beyond safe generalities.
* Optionally, a future **Web Research mode** adds citations.

### 9.2 Structured Output Shape

```json
{
  "sections": {
    "brand_overview": {"markdown": "..."},
    "themes": {"markdown": "..."},
    "faqs": {"markdown": "..."},
    "explainers": [{"title": "Selvedge Denim", "markdown": "..."}]
  }
}
```

---

## 10) Slide Composition Rules & Templates

**Cover Slide**

* Brand Name (from input), Season (from JSON or input), optional logo.

**Table of Contents (optional)**

* List selected sections in order.

**Section Heading Slides**

* Title + short kicker (one-liner).

**Copy Slides (Brand Overview, Themes, FAQs, Explainers)**

* Single-column layout with 24–32 pt titles and 18–20 pt body.
* Limit lists to ≤ 6 bullets per slide; split if longer.

**Product Overview Slides**

* **Rule:** **3 product cards per slide** (2×2 minus one, or 3 in a row depending on template).
* Each card: product image (primary if available), name, 3 bullets (e.g., material, care, price).
* If no image, show name + bullets; include a small placeholder.

**Visual Theme**

* Neutral background, generous whitespace, consistent margins.
* Title font size scales with heading level; never below 18 pt for body.
* Optional highlight color derived from brand name hash (POC-friendly).

---

## 11) Exports & Preview

* **Preview:** Embed PDF viewer (e.g., generated server-side) OR HTML preview if Presenton supports.
* **Export:** `PDF` required; `PPTX` best-effort via Presenton if supported in POC timeline.
* **File naming:** `{brand}_{season}_ProductTraining_{timestamp}.pdf`.

---

## 12) Configuration & Deployment

**Env Vars (server)**

* `OPENAI_API_KEY`
* `PRESENTON_MODE` (`html|pdf|pptx`)
* `MAX_ITEMS_PER_SLIDE=3` (kept constant for POC)

**Local Dev**

* Frontend: `React + Bootstrap` (Vite or CRA).
* Backend: `FastAPI` with `uvicorn`.
* Presenton: install per README; expose CLI to backend.

**Project Structure (suggested)**

```
repo/
  frontend/
    src/
      components/
      pages/
      api/
  backend/
    app/
      main.py
      routers/
        linesheets.py
        decks.py
      services/
        prompt_builder.py
        content_service.py
        deck_composer.py
        render_service.py
        storage_service.py
      models/
        deck.py
        linesheet.py
      utils/
  templates/
  tmp/
```

---

## 13) Acceptance Criteria

1. User can **paste or upload** a valid line sheet JSON and see **validation** feedback.
2. User can **select sections** and **enter brand name**.
3. Clicking **Generate** creates a deck with selected sections populated by OpenAI text.
4. **Product Overview** is automatically paginated at **3 items per slide** (verify with 10+ items).
5. User can **preview** the deck and **export PDF**.
6. Typical 50‑item deck generates in **≤ 90 seconds** on a standard dev machine.
7. No secrets in client bundle; API key lives server‑side.

---

## 14) QA Plan (POC)

* **Unit:** schema validation, pagination math, prompt assembly.
* **Integration:** OpenAI call returns expected shapes; Presenton renders without fatal errors.
* **E2E:** Cypress/Playwright happy path: upload → select → generate → preview → export.
* **Manual:** Visual check of typography, bullets per slide, 3-per-slide rule, broken images fallback.

---

## 15) Risks & Mitigations

* **Hallucinations / Incorrect claims** → Guardrails in prompts; generic copy; future web-research mode with citations.
* **Presenton export limitations** → Prioritize PDF; keep PPTX as stretch.
* **Large line sheets** → Streamed generation or chunk prompts; cap bullets per item.
* **Image URLs invalid** → Placeholder image; log missing assets.

---

## 16) Milestones & Timeline (POC)

* **M1 (Day 1–2):** Repo scaffolding; JSON schema & validation UI.
* **M2 (Day 3–4):** Prompt builder + OpenAI integration returning copy blocks.
* **M3 (Day 5–6):** Deck composer + Presenton integration; basic theme; 3-per-slide pagination.
* **M4 (Day 7):** Preview & PDF export; error handling; tidy UI.
* **M5 (Day 8):** QA pass; docs; packaging.

---

## 17) Near-Term Roadmap (post-POC)

* Joor API adapter; brand asset theming; per-market product filters; multi-language; role-based access; slide template editor; research mode with citations; image CDN caching and auto-cropping; collaboration & notes.

---

## 18) Glossary

* **Line Sheet:** Structured list of products for a season/collection.
* **Product Training:** Internal deck used to train sales staff on a brand/collection.

---

## Appendix A — Example Deck Composition Pseudocode

```python
# Pseudocode for 3-per-slide pagination
items = linesheet["items"]
pages = [items[i:i+3] for i in range(0, len(items), 3)]
for page in pages:
    add_product_slide(cards=[map_to_card(it) for it in page])
```

## Appendix B — API Contract Examples

**POST /api/decks/generate**

```json
{
  "brand": "Acme Denim",
  "season": "FW2025",
  "sections": [
    "brand_overview",
    "themes",
    "faqs",
    "product_overview",
    "explainers"
  ],
  "linesheet": { /* see schema above */ }
}
```

**200 Response**

```json
{
  "deckId": "dk_7f3ab1",
  "status": "rendering"
}
```

**GET /api/decks/{deckId}**

```json
{
  "deckId": "dk_7f3ab1",
  "status": "ready",
  "previewUrl": "/files/dk_7f3ab1/preview.pdf",
  "meta": {"slides": 42, "brand": "Acme Denim", "season": "FW2025"}
}
```

---

## Appendix C — Presenton Deck Outline (Illustrative)

```markdown
# Cover: {brand} — {season}

## Brand Overview
- (bullets from OpenAI)

## Seasonal Themes
- (bullets from OpenAI)

## FAQs
- Q/A list

## Product Overview — Page 1
- 3 product cards

## Product Overview — Page 2
- 3 product cards

## Explainers
- What is Selvedge Denim?
- Care & Washing Basics
```
