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
 * @param {function} onDeleteBrand - Handler for delete brand (receives brandId, brandName)
 * @param {function} onDeleteCollection - Handler for delete collection (receives collectionId, collectionName)
 */
function Sidebar({
  brands = [],
  activeBrand,
  activeCollection,
  onBrandClick,
  onCollectionClick,
  onNewBrand,
  onNewCollection,
  onDeleteBrand,
  onDeleteCollection,
  onEditBrand,
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
                <div 
                  className={styles.brandHeader}
                  onClick={() => toggleBrand(brand.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleBrand(brand.id)}
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
                  
                  <div className={styles.brandActions}>
                    {/* Edit Button */}
                    <button
                      className={styles.editButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditBrand?.(brand.id);
                      }}
                      title="Edit brand"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M14.166 2.5009C14.3849 2.28203 14.6447 2.10842 14.9307 1.98996C15.2167 1.87151 15.5232 1.81055 15.8327 1.81055C16.1422 1.81055 16.4487 1.87151 16.7347 1.98996C17.0206 2.10842 17.2805 2.28203 17.4993 2.5009C17.7182 2.71977 17.8918 2.97961 18.0103 3.26558C18.1287 3.55154 18.1897 3.85804 18.1897 4.16757C18.1897 4.4771 18.1287 4.7836 18.0103 5.06956C17.8918 5.35553 17.7182 5.61537 17.4993 5.83424L6.24935 17.0842L1.66602 18.3342L2.91602 13.7509L14.166 2.5009Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {/* Delete Button */}
                    <button
                      className={styles.deleteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBrand?.(brand.id, brand.name);
                      }}
                      title="Delete brand"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 4H11M5 4V3C5 2.5 5.5 2 6 2H8C8.5 2 9 2.5 9 3V4M10 4V11C10 11.5 9.5 12 9 12H5C4.5 12 4 11.5 4 11V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Collections (when expanded) */}
                {isExpanded && brand.collections && (
                  <div className={styles.collectionList}>
                    {brand.collections.map((collection) => (
                      <div
                        key={collection.id}
                        className={`${styles.collectionItem} ${
                          activeCollection === collection.id ? styles.active : ''
                        }`}
                        onClick={() => onCollectionClick?.(collection)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onCollectionClick?.(collection)}
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
                        
                        {/* Delete Button */}
                        <button
                          className={styles.deleteButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCollection?.(collection.id, collection.name);
                          }}
                          title="Delete collection"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 4H11M5 4V3C5 2.5 5.5 2 6 2H8C8.5 2 9 2.5 9 3V4M10 4V11C10 11.5 9.5 12 9 12H5C4.5 12 4 11.5 4 11V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
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
