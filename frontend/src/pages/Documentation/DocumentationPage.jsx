import React from 'react';
import TopNav from '../../components/features/TopNav/TopNav';
import Footer from '../../components/features/Footer/Footer';
import styles from './DocumentationPage.module.css';

const navLinks = [
  { path: '/', label: 'Dashboard' },
  { path: '/generated-decks', label: 'Generated Decks' },
  { path: '/settings', label: 'Settings' }
];

const tocItems = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'brand-setup', label: 'Brand Setup' },
  { id: 'collection-setup', label: 'Collection Setup' },
  { id: 'uploading-documents', label: 'Uploading Documents' },
  { id: 'deck-settings', label: 'Deck Settings' },
  { id: 'managing-items', label: 'Managing Items' },
  { id: 'generating-deck', label: 'Generating Your Deck' }
];

function DocumentationPage() {
  return (
    <div className={styles.pageContainer}>
      <TopNav links={navLinks} />

      <div className={styles.layout}>
        {/* Sidebar TOC */}
        <nav className={styles.sidebar}>
          <p className={styles.tocTitle}>On this page</p>
          <ul className={styles.tocList}>
            {tocItems.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className={styles.tocLink}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <main className={styles.mainContent}>
          <div className={styles.header}>
            <h1 className={styles.title}>Documentation</h1>
            <p className={styles.subtitle}>
              Everything you need to know about creating professional product decks with Proko.
            </p>
          </div>

          {/* Getting Started */}
          <section id="getting-started" className={styles.section}>
            <h2 className={styles.sectionTitle}>Getting Started</h2>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Create your account</h3>
              <p className={styles.text}>
                Sign in with your Google account to get started. Proko uses Google authentication
                so there are no extra passwords to remember.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Dashboard overview</h3>
              <p className={styles.text}>
                After signing in you land on the Dashboard. From here you can create brands,
                add collections, upload documents, and generate decks. The sidebar on the left
                shows all your brands and their collections for quick navigation.
              </p>
            </div>
          </section>

          {/* Brand Setup */}
          <section id="brand-setup" className={styles.section}>
            <h2 className={styles.sectionTitle}>Brand Setup</h2>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Creating a new brand</h3>
              <p className={styles.text}>
                Click <strong>New Brand</strong> in the sidebar to create a brand. Provide
                a brand name, website URL, and optionally upload a logo. The logo appears on
                generated deck cover slides.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Uploading brand context documents</h3>
              <p className={styles.text}>
                Brand context documents give Proko background information about your brand
                for generating intro slides. Upload press materials, brand overviews, or
                company descriptions in PDF, DOCX, or TXT format (up to 25 MB each).
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Processing brand documents</h3>
              <p className={styles.text}>
                Once uploaded, Proko processes your brand documents to extract key information
                used in intro slides such as Brand Introduction, Brand History, Brand Personality,
                and Brand Values.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Configuring deck typography</h3>
              <p className={styles.text}>
                In the brand edit page, set your heading and body font families plus a font color.
                Choose from preset colors or enter a custom hex value. These settings apply to all
                decks generated for this brand.
              </p>
            </div>
          </section>

          {/* Collection Setup */}
          <section id="collection-setup" className={styles.section}>
            <h2 className={styles.sectionTitle}>Collection Setup</h2>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Creating a collection</h3>
              <p className={styles.text}>
                Inside a brand, click <strong>New Collection</strong>. Provide a collection name,
                season, year, and optional description. Each collection becomes a separate deck.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Collection types</h3>
              <p className={styles.text}>
                Proko supports the standard fashion calendar seasons:
              </p>
              <div className={styles.chipGrid}>
                <span className={styles.chip}>Spring/Summer</span>
                <span className={styles.chip}>Fall/Winter</span>
                <span className={styles.chip}>Resort</span>
                <span className={styles.chip}>Pre-Fall</span>
              </div>
            </div>
          </section>

          {/* Uploading Documents */}
          <section id="uploading-documents" className={styles.section}>
            <h2 className={styles.sectionTitle}>Uploading Documents</h2>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Line sheet documents</h3>
              <p className={styles.text}>
                Upload your line sheets in PDF, XLSX, XLS, or CSV format. Proko extracts product
                names, SKUs, descriptions, colors, materials, sizes, pricing, and images from
                these documents.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Purchase order documents</h3>
              <p className={styles.text}>
                Upload purchase order documents to cross-reference with your line sheet data.
                This helps match and enrich product information.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Collection context documents</h3>
              <p className={styles.text}>
                Upload collection-specific context documents (such as lookbook copy or press
                releases) to generate richer intro slides for this collection.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Document processing</h3>
              <p className={styles.text}>
                After upload, documents go through automated processing. Proko reads the
                contents, extracts structured product data, and matches images to items.
                Processing time depends on document size and complexity.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Document status indicators</h3>
              <div className={styles.statusGrid}>
                <div className={styles.statusRow}>
                  <span className={`${styles.statusBadge} ${styles.statusUploaded}`}>Uploaded</span>
                  <span className={styles.statusDescription}>Document received, waiting for processing</span>
                </div>
                <div className={styles.statusRow}>
                  <span className={`${styles.statusBadge} ${styles.statusProcessing}`}>Processing</span>
                  <span className={styles.statusDescription}>Extraction in progress</span>
                </div>
                <div className={styles.statusRow}>
                  <span className={`${styles.statusBadge} ${styles.statusProcessed}`}>Processed</span>
                  <span className={styles.statusDescription}>Complete and ready to use</span>
                </div>
                <div className={styles.statusRow}>
                  <span className={`${styles.statusBadge} ${styles.statusFailed}`}>Failed</span>
                  <span className={styles.statusDescription}>An error occurred — try re-uploading</span>
                </div>
              </div>
            </div>
          </section>

          {/* Deck Settings */}
          <section id="deck-settings" className={styles.section}>
            <h2 className={styles.sectionTitle}>Deck Settings</h2>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Intro slides</h3>
              <p className={styles.text}>
                Proko can generate up to eight intro slides for each deck. Toggle them on or off
                in Deck Settings:
              </p>
              <div className={styles.chipGrid}>
                <span className={styles.chip}>Cover Page</span>
                <span className={styles.chip}>Brand Introduction</span>
                <span className={styles.chip}>Brand History</span>
                <span className={styles.chip}>Brand Personality</span>
                <span className={styles.chip}>Brand Values</span>
                <span className={styles.chip}>Collection Introduction</span>
                <span className={styles.chip}>Core Collections</span>
                <span className={styles.chip}>Flagship Stores</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Product categories</h3>
              <p className={styles.text}>
                Create categories (e.g. Tops, Bottoms, Accessories) and subcategories within them.
                Drag to reorder categories — the order in the list determines the order in the
                generated deck.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Collection item detail fields</h3>
              <p className={styles.text}>
                Toggle which fields appear on each product slide:
              </p>
              <div className={styles.chipGrid}>
                <span className={styles.chip}>Product Name</span>
                <span className={styles.chip}>SKU</span>
                <span className={styles.chip}>Description</span>
                <span className={styles.chip}>Colour</span>
                <span className={styles.chip}>Material</span>
                <span className={styles.chip}>Sizes</span>
                <span className={styles.chip}>Origin</span>
                <span className={styles.chip}>Wholesale Price</span>
                <span className={styles.chip}>RRP</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Slide aspect ratio</h3>
              <p className={styles.text}>
                Choose between 16:9 (widescreen) and 4:3 (standard) aspect ratios for your
                generated slides.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Products per slide</h3>
              <p className={styles.text}>
                Select a layout of 1, 2, 3, or 4 products per slide. Fewer products per
                slide gives each item more space; more products per slide creates a more
                compact deck.
              </p>
            </div>
          </section>

          {/* Managing Collection Items */}
          <section id="managing-items" className={styles.section}>
            <h2 className={styles.sectionTitle}>Managing Collection Items</h2>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>List view vs grid view</h3>
              <p className={styles.text}>
                Switch between list and grid views using the toggle at the top of the items
                panel. List view shows detailed information; grid view shows image thumbnails.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Searching and filtering</h3>
              <p className={styles.text}>
                Use the search bar to find items by SKU, name, or color. Filter by category
                or status to narrow down the list.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Categorizing items</h3>
              <p className={styles.text}>
                Assign each item a category and optional subcategory. You can do this one at
                a time or in bulk by selecting multiple items and using the bulk action menu.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Bulk actions</h3>
              <p className={styles.text}>
                Select multiple items to include or exclude them from the deck, or move them
                to a specific category all at once.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Highlighting key items</h3>
              <p className={styles.text}>
                Mark items as highlighted to give them visual emphasis in the generated deck.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Reordering items</h3>
              <p className={styles.text}>
                Drag items within a category to control the order they appear on slides.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Uncategorized and unmatched items</h3>
              <p className={styles.text}>
                Items that have not been assigned a category appear in the Uncategorized
                section. Items that could not be matched to a product record appear as
                Unmatched. Review and categorize these before generating your deck.
              </p>
            </div>
          </section>

          {/* Generating & Downloading */}
          <section id="generating-deck" className={styles.section}>
            <h2 className={styles.sectionTitle}>Generating and Downloading Your Deck</h2>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Pre-generation requirements</h3>
              <p className={styles.text}>
                All included items must be assigned to a category before you can generate a deck.
                Excluded items do not need to be categorized.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Two-phase generation</h3>
              <p className={styles.text}>
                Deck generation runs in two phases. First, Proko generates the intro slides
                using your brand and collection context. Then it builds the product presentation
                slides. You can track progress in real time.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Downloading</h3>
              <p className={styles.text}>
                Once generation completes, the deck downloads automatically as a .pptx file.
                You can also re-download previous decks from the Generated Decks page.
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Regenerating after changes</h3>
              <p className={styles.text}>
                Made changes to categories, settings, or items? Simply generate the deck
                again. The new version replaces the previous one.
              </p>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default DocumentationPage;
