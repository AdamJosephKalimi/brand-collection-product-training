import React, { useState } from 'react';
import styles from './BrandCard.module.css';

/**
 * BrandCard Component
 * 
 * Displays a brand with its logo, name, collections, and actions
 * 
 * @param {string} brandName - Name of the brand
 * @param {string} brandLogo - URL to the brand logo image
 * @param {array} collections - Array of collection objects with { id, name }
 * @param {function} onEditBrand - Callback when edit icon is clicked
 * @param {function} onAddCollection - Callback when "New Collection" is clicked
 * @param {function} onCollectionClick - Callback when a collection is clicked
 */
function BrandCard({ 
  brandName,
  brandLogo,
  collections = [],
  onEditBrand,
  onAddCollection,
  onCollectionClick
}) {
  const [logoError, setLogoError] = useState(false);
  const showPlaceholder = !brandLogo || logoError;
  
  // Get first letter of brand name for placeholder
  const brandInitial = brandName ? brandName.charAt(0).toUpperCase() : '?';
  
  return (
    <div className={styles.brandCard}>
      {/* Top Section: Logo, Name, Edit Icon */}
      <div className={styles.brandTop}>
        <div className={styles.brandTitle}>
          {/* Brand Logo */}
          <div className={styles.brandLogo}>
            {showPlaceholder ? (
              <div className={styles.logoPlaceholder}>
                {brandInitial}
              </div>
            ) : (
              <img 
                src={brandLogo} 
                alt={`${brandName} logo`}
                onError={() => setLogoError(true)}
              />
            )}
          </div>
          
          {/* Brand Name */}
          <h3 className={styles.brandName}>{brandName}</h3>
        </div>
        
        {/* Edit Icon */}
        <button 
          className={styles.editButton}
          onClick={onEditBrand}
          aria-label="Edit brand"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path 
              d="M14.166 2.5009C14.3849 2.28203 14.6447 2.10842 14.9307 1.98996C15.2167 1.87151 15.5232 1.81055 15.8327 1.81055C16.1422 1.81055 16.4487 1.87151 16.7347 1.98996C17.0206 2.10842 17.2805 2.28203 17.4993 2.5009C17.7182 2.71977 17.8918 2.97961 18.0103 3.26558C18.1287 3.55154 18.1897 3.85804 18.1897 4.16757C18.1897 4.4771 18.1287 4.7836 18.0103 5.06956C17.8918 5.35553 17.7182 5.61537 17.4993 5.83424L6.24935 17.0842L1.66602 18.3342L2.91602 13.7509L14.166 2.5009Z" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      
      {/* Divider */}
      <div className={styles.divider} />
      
      {/* Bottom Section: Collections List */}
      <div className={styles.brandBottom}>
        {/* Collection Items */}
        {collections.map((collection) => (
          <button
            key={collection.id}
            className={styles.collectionItem}
            onClick={() => onCollectionClick(collection)}
          >
            <svg 
              className={styles.folderIcon}
              width="14" 
              height="14" 
              viewBox="0 0 14 14" 
              fill="none"
            >
              <path 
                d="M13 11.375C13 11.6071 12.9078 11.8296 12.7437 11.9937C12.5796 12.1578 12.3571 12.25 12.125 12.25H1.875C1.64294 12.25 1.42038 12.1578 1.25628 11.9937C1.09219 11.8296 1 11.6071 1 11.375V2.625C1 2.39294 1.09219 2.17038 1.25628 2.00628C1.42038 1.84219 1.64294 1.75 1.875 1.75H5.25L6.125 3.5H12.125C12.3571 3.5 12.5796 3.59219 12.7437 3.75628C12.9078 3.92038 13 4.14294 13 4.375V11.375Z" 
                fill="#2C3528"
              />
            </svg>
            <span className={styles.collectionName}>{collection.name}</span>
          </button>
        ))}
        
        {/* New Collection Button */}
        <button
          className={styles.newCollectionButton}
          onClick={onAddCollection}
        >
          <svg 
            className={styles.addIcon}
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            fill="none"
          >
            <path 
              d="M6 1V11M1 6H11" 
              stroke="#7D3B51" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          <span>New Collection</span>
        </button>
      </div>
    </div>
  );
}

export default BrandCard;
