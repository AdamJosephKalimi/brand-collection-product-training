# PRD — AI Product Training Slide Builder (V1.0 - Multi-user)

**Product name:** Product Training AI (working title)
**Owner:** Adam Kalimi
**Date:** 2025-08-28 (Updated 2025-09-02)
**Version:** 1.0

## 1) Summary

Build a web application for creating and managing product training decks for fashion brands. The app will allow a user to:

- Sign in with a Google account to manage multiple brands and collections.
- Create a **Brand** and add essential information (logo, primary colors, etc.).
- Create a **Collection** within a brand, and upload multiple document types (**Lookbook**, **Linesheets**, **Product Training**, **Purchase Orders**) for RAG indexing and automated content generation.
- Generate a customizable **Product Training** deck in PPT format based on an AI-generated **Outline**.
- View and edit the generated deck within an in-app **PPT Editor**.
- Control deck composition with flexible pagination rules (such as 1, 2, or 4 products per slide) and a robust section selection process.

Stack: **React (frontend)**, **FastAPI (Python backend)**, **OpenAI API**, **Pinecone vector store**, **python-pptx or similar** for slide generation, and **Firestore** for data persistence.

## 2) Goals & Non‑Goals

### Goals (V1.0)

1. **User Authentication & Data Persistence:** Implement Google Sign-in and a backend database (Firestore) to allow users to create and manage their own brands and collections.
2. **Brand & Collection Management:** Enable users to create a `Brand` and a `Collection` with associated documents.
3. **Automated Document Parsing & RAG:** Implement automated parsing of uploaded spreadsheets (e.g., Purchase Orders), PDFs, and Docx files. Integrate a vector store (Pinecone) to enable RAG for all uploaded documents. The there should be an orchestrated pipeline that includes document parsing, chunking the text, creating embeddings, indexing the embeddings into a vector store and storing the chunks and files into a DB like Firebase. The tool should also be able to pull out images from the documents as well and store them so they can be placed into the generated PPT.
4. **Flexible Deck Generation:** Allow users to build a training deck from a dynamic outline, selecting specific sections and products. Each section will be generated via a specialized prompt to an LLM, not exposed to the user. We can additionally offer users the ability to add their own prompt in for each section in V2. The user prompt will either augment or replace the default prompt. The content for the deck will be based on either the documents that are submitted, the LLM’s general knowledge on the topic of the brand, or online research conducted by the LLM.
    1. One thing to consider is whether or not we want to present users with citations of where the information was pulled from.
5. Users can select from a short list of language options for actual tool as well as for the copy for the decks
6. **Customizable Product Pagination:** Implement a user-selectable rule for product overview slides, with options for 1, 2, or 4 items per slide.
7. **PPT Generation & Editing:** Generate a deck in PPT format and provide a basic in-app editor for modifications and custom slide creation.

### Non‑Goals (V1.0)

- Allow users to import previously created sections, such as the intro section from another Product Training (v2)

## 3) Primary Personas

- **Buyer / Planner:** Imports line sheet, picks sections, generates training deck.
- **Retail Trainer / Store Lead:** Consumes the deck; needs clarity and visual polish.
- **Sales Associate (end reader):** Needs concise, trustworthy info.

## 4) Assumptions

- A suitable open-source PPT editing library or component exists that can be integrated into the React frontend.
- A Python library like `python-pptx` can be used on the backend to programmatically generate PPT files.
- A backend database (Firestore) is available for storing user, brand, and collection data.
- A dedicated library for spreadsheet parsing (e.g., `pandas`) can be integrated on the backend.
- The system will use a service account or custom token for Firebase authentication on the backend.

## 5) Scope & Requirements

### 5.1 Functional Requirements (FR)

**FR‑1.** **Authentication:** Users can sign in and out using Google.
**FR‑2.** **Brand Management:**
* Create a new Brand (name, optional logo, primary color).
* View and edit a list of owned Brands.
**FR‑3.** **Collection Management:**
* Create a new Collection within a Brand.
* Upload and manage **Collection Documents** (Line Sheet PDF, Lookbook PDF/images, Purchase Order spreadsheet, etc.).
* Implement CRUD operations for documents within a collection.
**FR‑4.** **Outline Creation:**
* Users can create a new outline for a Product Training deck.
* **Brand Intro Sections:** Users can select which sections to include:
* Cover Page
* Brand Introduction/DNA
* Brand History / Evolution
* Brand Personality
* Brand Values
* Core Collection / Signature Categories
* Flagship Stores & Experiences
* Product Categories
* **Collection Details:** Users can specify:
* Collection Title Slide (name).
* Collection Categories (comma-separated list, with the ability to create multiple categories and sub-categories).
* Selected items from the line sheet to include in the deck.
* Users can hide items they don’t want included.
* Users can choose to only display items that appear in both the Line Sheet and Purchase Order.
* A template for product slides (1, 2, or 4 items per slide).
**FR‑5.** **Deck Generation:** The backend processes the outline and generates a PPT file.
**FR‑6.** **PPT Editor:** A component for viewing the generated PPT with basic editing capabilities and custom slide creation.
**FR‑7.** **Exports:**
* Export the finalized deck to PPTX format.
* Export to PDF (if feasible via the PPT library).
**FR‑8.** **Progress & Errors:** Show generation progress and human-readable error messages.

### 5.2 Non‑Functional Requirements (NFR)

- **Performance:** A typical 50-item deck for a new collection generated in le120 seconds.
- **Reliability:** Graceful failures with persistent logs.
- **Cost:** $\le 0.75 in OpenAI costs for a 50-item deck (target).
- **Security:** API keys and sensitive user data are stored securely on the backend.
- **Accessibility:** Keyboard navigation and alt text.

### 5.3 Out of Scope (V1.0)

- Automated brand asset extraction.
- Per-market product filtering.
- Multi-language/localization.
- Shared brand/collection access.
- Advanced PPT editor features (e.g., complex styling, animations).
- Reusing sections from other presentations.

## 6) Data & Integrations

### 6.1 Data Models (Firestore)

- **`users` collection:**
    - `userId` (Document ID)
    - `email`
    - `brands` (array of brand IDs)
- **`brands` collection:**
    - `brandId` (Document ID)
    - `ownerId` (User ID)
    - `name`
    - `logoUrl`
    - `primaryColor` (required)
    - `secondaryColor` (not required)
- **`collections` collection:**
    - `collectionId` (Document ID)
    - `brandId`
    - `ownerId`
    - `name`
    - `documents` (array of document objects with `url`, `type`, `name`).
    - `lineSheetData` (structured JSON from line sheet upload).
- **`outlines` collection:**
    - `outlineId` (Document ID)
    - `collectionId`
    - `ownerId`
    - `sections` (JSON object defining sections and included items).

### 6.2 Line Sheet JSON — Minimal Contract (V1.0)

```
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
            "materials": ["100% Cotton (Selvedge)"],
            "care": ["Cold wash inside-out", "Line dry"],
            "process": ["Selvedge loom", "Indigo rope-dye"],
            "price": 198,
            "images": [
                {
                    "url": "https://example.com/img/AC-001-front.jpg",
                    "alt": "Front view"
                },
                {
                    "url": "https://example.com/img/AC-001-detail.jpg",
                    "alt": "Detail view"
                }
            ],
            "variants": [
                {
                    "color": "Raw Indigo",
                    "sizes": ["28", "30", "32", "34"]
                }
            ],
            "tags": ["selvedge", "raw", "indigo"]
        }
    ]
}

```

**Validation rules:** `items[].id`, `items[].name` required. Missing `brand/season` can be overridden by user inputs.

### 6.3 PPT Library Integration

- Backend composes a deck using a Python library like `python-pptx` to programmatically add slides, text, and images.
- The backend will generate the PPTX file, save it to a temporary file store, and provide a download URL.

## 7) System Architecture

### 7.1 High-Level Diagram (V1.0)

```
[React App] <─── User Authentication ───> [Firebase Auth]
     │          (Google Sign-in)           │
     │                                     │
     ├──<──────────── REST API ────────────> [FastAPI Backend] <─── DB Read/Write ───> [Firestore]
     │                                        │
     │                                        ├─> Prompt Builder ──> OpenAI (text)
     │                                        │
     │                                        └─> Deck Composer ──> PPT Library (render → PPTX)
     │                                                                  │
     └─────<──────── Preview/Download ────────<──────── File Store <────┘

```

### 7.2 Backend (FastAPI)

**Services**

- `AuthService`: Manages user authentication and session tokens.
- `BrandService`: Handles CRUD for brands.
- `CollectionService`: Handles CRUD for collections and documents.
- `OutlineService`: Manages outline creation and data storage.
- `PromptBuilder`: Creates section-specific prompts for OpenAI. **Note:** These prompts will not be exposed to the end user.
- `ContentService`: Calls OpenAI, returns structured copy blocks.
- `DeckComposer`: Assembles the PPT deck structure, enforces pagination rules.
- `RenderService`: Invokes the PPT library to produce the PPTX file.
- `StorageService`: Handles temp storage for artifacts and permanent storage for user-uploaded files.

**REST Endpoints**

- `POST /api/auth/google` → `{token}` (for backend auth)
- `POST /api/brands` → create new brand
- `GET /api/brands/{brandId}` → get brand details
- `POST /api/collections` → create new collection
- `POST /api/collections/{collectionId}/documents` → upload new document
- `POST /api/outlines/generate` → accepts `{outlineId}`; returns `{deckId, status}`
- `GET /api/decks/{deckId}/export?format=pptx` → file download

### 7.3 Frontend (React)

**Pages/Components**

- **Login Page:** Google Sign-in button.
- **Brands Page:** List of brands, "Create New Brand" button.
- **Collections Page:** List of collections for a brand, document upload interface.
- **Outline Builder:** Main interface for building the deck outline.
- **PPT Editor:** The editor component for viewing and editing the generated PPT.

## 8) UX Flows

1. **Login:** User signs in with Google and is redirected to the main Brands page.
2. **Brand & Collection Creation:** User creates a new Brand, then a new Collection within it, uploading documents.
3. **Outline Creation:**
    - User navigates to the Outline Builder for a specific collection.
    - User selects desired sections for Brand Intro and Collection Details.
    - User manually adds Collection Categories and selects which items from the line sheet to include.
    - User can select to include only items that appear in both the Line Sheet and a Purchase Order document.
    - User chooses a slide template for product overview slides (1, 2, or 4 items per slide).
4. **Generation:** User clicks **Generate**. The UI shows progress. The backend compiles the outline, gets AI copy, and creates the PPTX file.
5. **Review & Export:**
    - The generated deck opens in the **PPT Editor**.
    - User can make minor edits or add custom slides.
    - User clicks **Export PPT** to download the final file.

## 9) Content Generation (OpenAI & RAG)

### 9.1 RAG & Context Management

- The backend will use a vector store (Pinecone) to index and enable RAG for all uploaded documents, including PDFs and spreadsheets. The content from these documents will be used to generate specific copy for the training deck.

### 9.2 Prompt Templates (V1.0)

**Brand Introduction / DNA**

This slide is clearly introducing the **brand story + identity**, with a mix of:

1. **Founding info** (who, when, where)
2. **Core style identity** (ex: grunge, rebellious, avant-garde)
3. **Design inspiration** (ex: rock culture, street style, materials, craftsmanship)
4. **Iconic elements / symbolism** (ex: jeans, flannel, leather jackets, rattlesnake emblem)
5. **Philosophy / ethos** (ex: independence, nonconformity, redefining fashion)

> Prompt (for automation):
> 
> 
> You are creating a *brand introduction training slide* for retail staff. Research the brand and generate 1–2 paragraphs that give an engaging and aspirational introduction. Where relevant, cover:
> 
> - The brand name, founder, and origin
> - The origin or story behind the name (if applicable)
> - The brand’s core style and design language
> - Key inspirations that shape the creative direction
> - Signature or iconic products
> - Any symbols, motifs, or emblems tied to the brand identity
> - The brand ethos or philosophy (what it stands for)
> 
> **Task**: Present the introduction in a tone that is factual yet inspiring, designed to help retail staff quickly understand both the heritage and emotional identity of the brand. Focus on the most distinctive and relevant details, and avoid unnecessary or minor information.
> 

**Brand History / Evolution**

> What the slide covers
> 
> 1. Contextual positioning
> 2. Founder’s background
> 3. Founding ethos
> 4. Evolution of the brand
> 5. Key production details
> 6. Current footprint
> 7. Philosophical takeaway
> 
> > Prompt (for automation):
> > 
> > 
> > You are creating a *brand history training slide* for retail staff. Research the brand and select the most relevant and notable details from its history. Focus on the founder’s background, the brand’s origins and first products, important milestones in its evolution, distinctive production details, global presence, and how the brand positions itself in contrast to others.
> > 
> > **Task**: Write 1–2 paragraphs in an aspirational and engaging tone that tell the story of the brand in a way that is both factual and inspiring. Emphasize aspects that best capture the brand’s identity and help retail staff connect with its heritage and cultural meaning. Avoid unnecessary or minor details, and highlight only the most impactful elements.
> > 
> > OR MORE SPECIFIC:
> > 
> > You are creating a *brand history training slide* for retail staff. Research the brand and select the most relevant and notable details from its history. Cover the following aspects where they are meaningful:
> > 
> > 1. Contextual positioning (how the brand contrasts with others or the culture it emerged from)
> > 2. Founder’s background
> > 3. Founding ethos or values
> > 4. Evolution of the brand from its origins to today
> > 5. Key production details (materials, craftsmanship, innovation, sourcing)
> > 6. Current footprint (markets, global presence, retail distribution)
> > 7. Philosophical takeaway (the deeper cultural or symbolic meaning of the brand)
> > 
> > **Task**: Write 1–2 paragraphs in an aspirational and engaging tone that tell the story of the brand in a way that is both factual and inspiring. Highlight the elements that best capture the brand’s identity and help retail staff connect with its heritage and cultural meaning. Keep the narrative focused and impactful, avoiding minor or irrelevant details.
> > 

**Brand Personality**

**What the example covers (R13)**

1. **Quote** (Kurt Cobain → ties to rebellious spirit)
2. **Core values / traits** presented as branded “pillars”:
    - Rebellion (反叛)
    - Inclusivity (包容性)
    - Girl Power / Feminism (女性力量)
    - Individuality (个性) Each is explained with short narrative context (e.g., historical reference for “Girl Power”).

🔹 **Reusable Structure**

- **Inspiration / cultural quote** (optional, if the brand is associated with one)
- **Core personality traits** (3–5 values, each with a short description)
- **Cultural references** where relevant (music, art, subcultures)

> Prompt (for automation):
> 
> 
> You are creating a *brand personality training slide* for retail staff. Research the brand and identify its most defining personality traits and values. Where relevant, include:
> 
> - A cultural or inspirational quote associated with the brand’s identity (e.g., from an artist, musician, designer, or campaign). Only include if clearly existing.
> - 3–5 personality traits or values that represent the brand (e.g., rebellious, inclusive, luxurious, innovative, sustainable)
> - A short explanation for each trait, highlighting how it connects to the brand’s ethos, creative inspiration, or cultural influence
> 
> **Task**: Write the content in an aspirational yet clear tone, suitable for training retail staff. Focus on what makes the brand emotionally distinctive and memorable, avoiding generic or vague traits.
> 

**Brand Values**

### **What the R13 example covers**

1. **质量 (Quality)** → craftsmanship, luxury materials, attention to detail
2. **创造力 (Creativity)** → relentless pursuit of inspiration, imagination, fresh ideas for customers
3. **真实性 (Authenticity)** → pride in tradition, respect for heritage (denim → RTW → footwear), protecting integrity while innovating

So it’s a **set of 3–5 brand pillars**, each with a concise explanation.

🔹 **Reusable Structure**

- 3–5 values (single words or short concepts)
- Each followed by 1–2 sentence explanation
- Values usually reflect **craftsmanship, creativity, authenticity, sustainability, inclusivity, empowerment, innovation**, depending on brand

> Prompt (for automation):
> 
> 
> You are creating a *brand values training slide* for retail staff. Research the brand and identify its 3–5 core values. For each value, provide:
> 
> - A short headline word or phrase (e.g., “Quality”, “Creativity”, “Authenticity”, “Sustainability”)
> - A 1–2 sentence explanation of how this value is expressed in the brand’s products, culture, or philosophy
> 
> **Task**: Write the content in a way that is factual, aspirational, and easy to remember for retail staff. Focus on values that are genuinely distinctive to the brand and central to its identity, avoiding generic statements unless they are essential.
> 

**Core Collections / Signature Categories**

### **What the R13 example covers**

1. **牛仔 (Denim)** → rebellious symbol, crafted in Italy + Japan, production locations specified
2. **格纹衬衫 (Plaid Shirts)** → grunge heritage, Japanese flannel, craftsmanship + creative cuts
3. **靴子 (Boots)** → iconic rock-punk staple, made in Italy with artisanal techniques
4. **运动鞋 (Sneakers)** → mix of comfort + style, specific named models (Courtney, Riot, Kurt), material origins (Japan/Italy), production in Tuscany

So the structure is:

- **Category name** (short, bolded)
- **1–2 sentence description** linking: identity relevance + materials + craftsmanship + innovation

🔹 **Reusable Structure**

- 3–6 product categories central to the brand (denim, bags, sneakers, tailoring, accessories, etc.)
- Each has:
    - **Category name** (headline)
    - **Short explanation** covering: heritage/identity role, material origin, craftsmanship/production location, and/or innovation

> Prompt (for automation):
> 
> 
> You are creating a *core collections training slide* for retail staff. Research the brand and identify its 3–6 signature product categories. For each category:
> 
> - Provide a short headline (the product category name)
> - Write 1–2 sentences explaining why this category is central to the brand. Highlight its symbolic meaning, key materials or fabrics, craftsmanship, and production details if relevant.
> 
> **Task**: Present the information in a way that is factual, aspirational, and easy for retail staff to remember when speaking to customers. Focus on the categories that best represent the brand’s DNA and are consistently featured across collections.
> 

**Flagship Stores & Experiences**

This **品牌旗舰店 (Flagship Stores)** slide is trickier because brands vary a lot:

- **Global luxury houses** (Louis Vuitton, Dior) → multiple flagships in major cities worldwide.
- **Smaller or niche brands** (like R13) → maybe only 1–2 notable flagships.
- **Some emerging brands** → no official flagship, but important shop-in-shops, pop-ups, or online experiences.

So the template has to **adapt flexibly**:

- If there are **flagships**, showcase them.
- If not, highlight **concept stores, pop-ups, collaborations, or digital flagship experiences** (e.g., online store, metaverse activation).

🔹 **Reusable Structure for Flagship Store Slide**

1. **Headline**: Brand Flagship Stores (or “Brand Flagship Experiences” if broader)
2. **For each notable location** (0–3 items, depending on brand):
    - **Year + city/store name**
    - **Description** (size, design concept, architect/collaboration, customer experience, symbolic meaning)
3. **If none** → pivot to *online flagship* or *notable pop-up concept stores*.

> Prompt (for automation):
> 
> 
> You are creating a *flagship stores training slide* for retail staff. Research the brand and identify its most significant flagship stores, concept stores, or major retail experiences. Where relevant, cover:
> 
> - Year and location of opening
> - Key design or architectural elements
> - The unique customer experience or atmosphere of the store
> - Any symbolic or cultural meaning behind the store design
> 
> **Flexibility:**
> 
> - If the brand has multiple flagship stores, list the 2–3 most iconic ones.
> - If the brand has only one, focus on that flagship in detail.
> - If the brand has no official flagship stores, highlight other notable retail experiences such as pop-ups, collaborations, or digital flagships.
> 
> **Task**: Write the content in a way that is factual yet aspirational, helping retail staff understand how the brand expresses itself through its physical (or digital) spaces.
> 

**Product Categories**

Prompt (for automation): You are creating a product categories training slide for retail staff. Use the brand’s current season linesheet as input. Steps: Identify all major product categories in the linesheet (e.g., Hoodie, Jacket, Polo, Knitwear, Footwear, Accessories). For each category, choose one representative product to illustrate it. Select an item that is visually clear and best reflects that category. Provide: - The category name - The selected product image (link or image reference from the linesheet) Task: Generate a clean list of product categories with labels and one associated image per category. The output should be formatted so it can be used to build a visual training slide, similar to a catalog overview.

**Collection Title Slide**

> Prompt (for automation):
> 
> 
> You are creating a *collection title slide* for retail staff training. Provide the following:
> 
> - The official collection name or season (e.g., “Spring/Summer 2025”)
> - The theme or campaign tagline, if available
> - 1–2 short lines of text that introduce the spirit of this collection in an aspirational tone (optional, only if relevant text is provided by the brand)
> - One hero campaign image for the season (from lookbook or official campaign visuals)
> 
> **Task**: Present the information in a clean, impactful way. The text should be minimal and inspirational, with the visual image being the main focus. Suitable for use as the title slide of a new section in a training deck.
> 

**Collection Intro Slide**

> Prompt (for automation):
> 
> 
> You are creating a *collection introduction training slide* for retail staff. Research the brand’s current collection and summarize it in 1–2 sections of text. Where relevant, cover:
> 
> - The **collection title or season** (e.g., FW25, The Riding Collection)
> - The **design philosophy**: what inspired this collection (art, culture, subcultures, lifestyle, historical references, emotional themes)
> - The **design features**: key fabrics, silhouettes, colors, or construction techniques that define the collection
> - The **cultural or lifestyle meaning**: how this collection connects to the brand ethos and what it represents for the customer
> 
> **Task**: Write the content in an aspirational yet clear tone, suitable for retail staff training. Focus on storytelling that makes the collection memorable, while also highlighting practical design features. Keep the text structured, concise, and engaging, to be paired with a lookbook image on the slide.
>