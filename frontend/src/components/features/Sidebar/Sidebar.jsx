import React, { useState } from 'react';
import Button from '../../ui/Button/Button';
import styles from './Sidebar.module.css';

/**
 * Sidebar Component
 * 
 * Left navigation sidebar with brands and collections
 * 
 * @param {Array} brands - Array of brand objects with collections
 * @param {string} activeBrand - Active brand ID
 * @param {string} activeCollection - Active collection ID
 * @param {function} onBrandClick - Handler for brand click
 * @param {function} onCollectionClick - Handler for collection click
 * @param {function} onNewBrand - Handler for new brand button
 * @param {function} onNewCollection - Handler for new collection button
 */
function Sidebar({ 
  brands = [],
  activeBrand,
  activeCollection,
  onBrandClick,
  onCollectionClick,
  onNewBrand,
  onNewCollection,
  className = ''
}) {
  const [expandedBrands, setExpandedBrands] = useState([activeBrand]);

  const toggleBrand = (brandId) => {
    setExpandedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
    onBrandClick?.(brandId);
  };

  return (
    <div className={`${styles.sidebar} ${className}`}>
      <div className={styles.sidebarInner}>
        {/* New Brand Button */}
        <Button 
          variant="dark" 
          onClick={onNewBrand}
          className={styles.newBrandButton}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          New Brand
        </Button>

        {/* Brand List */}
        <div className={styles.brandList}>
          {brands.map((brand) => {
            const isExpanded = expandedBrands.includes(brand.id);
            
            return (
              <div key={brand.id} className={styles.brandItem}>
                {/* Brand Header */}
                <button 
                  className={styles.brandHeader}
                  onClick={() => toggleBrand(brand.id)}
                >
                  <div className={styles.brandLeft}>
                    {/* Chevron */}
                    <svg 
                      className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}
                      width="12" 
                      height="12" 
                      viewBox="0 0 12 12" 
                      fill="none"
                    >
                      <path d="M4 3L7 6L4 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    
                    {/* Tag Icon */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2H6L12 8L8 12L2 6V2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <circle cx="5" cy="5" r="1" fill="currentColor"/>
                    </svg>
                    
                    <span className={styles.brandName}>{brand.name}</span>
                  </div>
                  
                  {/* Ellipsis Menu */}
                  <button className={styles.ellipsisButton}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="3" cy="7" r="1" fill="currentColor"/>
                      <circle cx="7" cy="7" r="1" fill="currentColor"/>
                      <circle cx="11" cy="7" r="1" fill="currentColor"/>
                    </svg>
                  </button>
                </button>

                {/* Collections (when expanded) */}
                {isExpanded && brand.collections && (
                  <div className={styles.collectionList}>
                    {brand.collections.map((collection) => (
                      <button
                        key={collection.id}
                        className={`${styles.collectionItem} ${
                          activeCollection === collection.id ? styles.active : ''
                        }`}
                        onClick={() => onCollectionClick?.(collection)}
                      >
                        <div className={styles.collectionLeft}>
                          {/* Folder Icon */}
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path 
                              d="M2 3H6L7 4H12V11H2V3Z" 
                              stroke="currentColor" 
                              strokeWidth="1.5" 
                              fill="none"
                            />
                          </svg>
                          <span>{collection.name}</span>
                        </div>
                        
                        {/* Ellipsis */}
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="3" cy="7" r="1" fill="currentColor"/>
                          <circle cx="7" cy="7" r="1" fill="currentColor"/>
                          <circle cx="11" cy="7" r="1" fill="currentColor"/>
                        </svg>
                      </button>
                    ))}
                    
                    {/* New Collection Button */}
                    <button 
                      className={styles.newCollectionButton}
                      onClick={() => onNewCollection?.(brand.id)}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      New Collection
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
