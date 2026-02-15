import React from 'react';
import styles from './BrandSection.module.css';
import DeckListItem from '../DeckListItem/DeckListItem';

/**
 * BrandSection Component
 * 
 * A section displaying a brand with its logo and list of generated decks
 * 
 * @param {string} brandId - Brand ID
 * @param {string} brandName - Brand display name
 * @param {string} brandLogoUrl - URL for brand logo image
 * @param {array} decks - Array of deck objects with collection metadata
 * @param {function} onEditDeck - Handler for Edit Deck button (receives collectionId)
 * @param {function} onDownloadDeck - Handler for Download button (receives collectionId)
 * @param {string} downloadingId - Collection ID currently being downloaded (for loading state)
 * @param {string} className - Additional CSS classes
 */
function BrandSection({
  brandId,
  brandName = 'Brand',
  brandLogoUrl,
  decks = [],
  onEditDeck,
  onDownloadDeck,
  downloadingId = null,
  className = ''
}) {
  return (
    <section className={`${styles.section} ${className}`}>
      <header className={styles.header}>
        <div className={styles.logoWrapper}>
          {brandLogoUrl ? (
            <img 
              src={brandLogoUrl} 
              alt={`${brandName} logo`} 
              className={styles.logo}
            />
          ) : (
            <div className={styles.logoPlaceholder}>
              {brandName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 className={styles.brandName}>{brandName}</h2>
      </header>

      <div className={styles.deckList}>
        {decks.map((deck) => (
          <DeckListItem
            key={deck.collection_id}
            collectionId={deck.collection_id}
            title={deck.collection_name}
            generatedAt={deck.generated_at}
            slideCount={deck.slide_count}
            productCount={deck.product_count}
            onEditClick={onEditDeck}
            onDownloadClick={(collectionId) => onDownloadDeck?.(collectionId, deck.collection_name)}
            isDownloading={downloadingId === deck.collection_id}
          />
        ))}
      </div>
    </section>
  );
}

export default BrandSection;
