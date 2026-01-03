import React from 'react';
import styles from './DeckListItem.module.css';
import DeckListItemButton from '../DeckListItemButton/DeckListItemButton';

/**
 * DeckListItem Component
 * 
 * A list item displaying a generated deck with metadata and action buttons
 * 
 * @param {string} collectionId - Collection ID for navigation
 * @param {string} title - Deck title (e.g., "SS2025 Training")
 * @param {string} generatedAt - Date string for when deck was generated
 * @param {number} slideCount - Number of slides in the deck
 * @param {number} productCount - Number of products in the deck
 * @param {function} onEditClick - Handler for Edit Deck button
 * @param {function} onDownloadClick - Handler for Download button
 * @param {boolean} isDownloading - Whether download is in progress
 * @param {string} className - Additional CSS classes
 */
function DeckListItem({
  collectionId,
  title = 'Training Deck',
  generatedAt,
  slideCount = 0,
  productCount = 0,
  onEditClick,
  onDownloadClick,
  isDownloading = false,
  className = ''
}) {
  // Format the date
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Unknown date';
    
    try {
      let date;
      if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue._seconds) {
        // Firestore Timestamp
        date = new Date(dateValue._seconds * 1000);
      } else if (dateValue.seconds) {
        // Firestore Timestamp alternative format
        date = new Date(dateValue.seconds * 1000);
      } else {
        date = new Date(dateValue);
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className={`${styles.listItem} ${className}`}>
      <div className={styles.info}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.date}>Generated on {formatDate(generatedAt)}</p>
        <div className={styles.details}>
          <span className={styles.detail}>{slideCount} slides</span>
          <span className={styles.separator}>•</span>
          <span className={styles.detail}>{productCount} products</span>
        </div>
      </div>
      
      <div className={styles.buttons}>
        <DeckListItemButton
          variant="edit"
          onClick={() => onEditClick?.(collectionId)}
        />
        <DeckListItemButton
          variant="download"
          onClick={() => onDownloadClick?.(collectionId)}
          disabled={isDownloading}
        />
      </div>
    </div>
  );
}

export default DeckListItem;
