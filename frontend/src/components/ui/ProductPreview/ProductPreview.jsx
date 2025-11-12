import React from 'react';
import styles from './ProductPreview.module.css';

/**
 * ProductPreview Component
 * 
 * Displays a preview of a collection item with image and details
 * 
 * @param {string} productName - Product name
 * @param {string} sku - Product SKU
 * @param {string} material - Material type
 * @param {string} color - Color name
 * @param {string} composition - Material composition
 * @param {string} sizes - Available sizes
 * @param {string} origin - Country of origin
 * @param {number} wholesale - Wholesale price
 * @param {number} rrp - Recommended retail price
 * @param {string} currency - Currency symbol (default: $)
 * @param {string} imageUrl - Product image URL
 */
function ProductPreview({ 
  productName = 'Product Name',
  sku,
  material,
  color,
  composition,
  sizes,
  origin,
  wholesale,
  rrp,
  currency = '$',
  imageUrl,
  className = ''
}) {
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
        <h3 className={styles.productName}>{productName}</h3>
        
        {sku && (
          <p className={styles.detailText}>SKU: {sku}</p>
        )}
        
        {material && (
          <p className={styles.detailText}>{material}</p>
        )}
        
        {color && (
          <p className={styles.detailText}>{color}</p>
        )}
        
        {composition && (
          <p className={styles.detailText}>{composition}</p>
        )}
        
        {sizes && (
          <p className={styles.detailText}>Sizes: {sizes}</p>
        )}
        
        {origin && (
          <p className={styles.detailText}>Origin: {origin}</p>
        )}
        
        {wholesale !== undefined && (
          <p className={styles.detailText}>
            Wholesale: {currency}{wholesale.toFixed(2)}
          </p>
        )}
        
        {rrp !== undefined && (
          <p className={styles.rrpText}>
            RRP: {currency}{rrp.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}

export default ProductPreview;
