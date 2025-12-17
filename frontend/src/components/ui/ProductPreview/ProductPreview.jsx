import React from 'react';
import styles from './ProductPreview.module.css';

/**
 * ProductPreview Component
 * 
 * Displays a preview of a collection item with image and details.
 * Each field can be shown/hidden via visibility props.
 * 
 * @param {string} productName - Product name
 * @param {string} sku - Product SKU
 * @param {string} description - Product description
 * @param {string} color - Color name
 * @param {string} material - Material composition (e.g., "95% Cotton, 5% Cashmere")
 * @param {string} sizes - Available sizes
 * @param {string} origin - Country of origin
 * @param {number} wholesale - Wholesale price
 * @param {number} rrp - Recommended retail price
 * @param {string} currency - Currency symbol (default: $)
 * @param {string} imageUrl - Product image URL
 * @param {object} visibility - Object controlling which fields are visible
 */
function ProductPreview({ 
  productName = 'Product Name',
  sku,
  description,
  color,
  material,
  sizes,
  origin,
  wholesale,
  rrp,
  currency = '$',
  imageUrl,
  visibility = {},
  className = ''
}) {
  // Default all visibility to true if not specified
  const {
    showProductName = true,
    showSku = true,
    showDescription = true,
    showColor = true,
    showMaterial = true,
    showSizes = true,
    showOrigin = true,
    showWholesale = true,
    showRrp = true
  } = visibility;

  return (
    <div className={`${styles.previewCard} ${className}`}>
      {/* Product Image */}
      <div className={styles.imageWrapper}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={productName}
            className={styles.productImage}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span>No Image</span>
          </div>
        )}
      </div>
      
      {/* Product Details */}
      <div className={styles.details}>
        {showProductName && (
          <h3 className={styles.productName}>{productName}</h3>
        )}
        
        {showSku && sku && (
          <p className={styles.detailText}>SKU: {sku}</p>
        )}
        
        {showDescription && description && (
          <p className={styles.detailText}>{description}</p>
        )}
        
        {showColor && color && (
          <p className={styles.detailText}>{color}</p>
        )}
        
        {showMaterial && material && (
          <p className={styles.detailText}>{material}</p>
        )}
        
        {showSizes && sizes && (
          <p className={styles.detailText}>Sizes: {sizes}</p>
        )}
        
        {showOrigin && origin && (
          <p className={styles.detailText}>Origin: {origin}</p>
        )}
        
        {showWholesale && wholesale !== undefined && (
          <p className={styles.detailText}>
            Wholesale: {currency}{wholesale.toFixed(2)}
          </p>
        )}
        
        {showRrp && rrp !== undefined && (
          <p className={styles.rrpText}>
            RRP: {currency}{rrp.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}

export default ProductPreview;
