import React, { useState } from 'react';
import styles from './CategorySection.module.css';
import PillCounter from '../PillCounter/PillCounter';

/**
 * CategorySection Component
 * 
 * Collapsible section header for categorized, uncategorized, or unmatched items
 * 
 * @param {string} type - 'categorized' | 'uncategorized' | 'unmatched'
 * @param {string} title - Section title (e.g., "Outerwear", "Uncategorized")
 * @param {number} itemCount - Number of items in this category
 * @param {array} filters - Filter options (only for categorized type) [{label, active}]
 * @param {function} onFilterClick - Filter click handler
 * @param {boolean} defaultExpanded - Whether section starts expanded
 * @param {function} onToggle - Toggle expand/collapse handler
 */
function CategorySection({
  type = 'categorized',
  title = 'Category Name',
  itemCount = 0,
  filters = [],
  onFilterClick,
  onGroupBySubcategory,
  onReorderSubcategories,
  defaultExpanded = true,
  onToggle,
  children,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  return (
    <div className={`${styles.section} ${styles[type]} ${className}`}>
      <div className={styles.header}>
        {/* Left side */}
        <div className={styles.leftContent}>
          {/* Expand/Collapse Arrow */}
          <button 
            className={`${styles.toggleButton} ${isExpanded ? styles.expanded : ''}`}
            onClick={handleToggle}
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path 
                d="M3 4.5L6 7.5L9 4.5" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Title */}
          <h3 className={styles.title}>{title}</h3>

          {/* Item Count Pill */}
          <PillCounter
            count={itemCount}
            label={itemCount === 1 ? 'item' : 'items'}
            variant={
              type === 'categorized' ? 'default' :
              type === 'uncategorized' ? 'secondary' :
              'warning'
            }
          />

          {/* Warning Icon (unmatched only) */}
          {type === 'unmatched' && (
            <svg className={styles.warningIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path 
                d="M8 1L15 14H1L8 1Z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M8 6V9" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round"
              />
              <circle cx="8" cy="11.5" r="0.5" fill="currentColor"/>
            </svg>
          )}
        </div>

        {/* Right side - Filters and actions (categorized only) */}
        {type === 'categorized' && (filters.length > 0 || onGroupBySubcategory || onReorderSubcategories) && (
          <div className={styles.filters}>
            {/* Reorder Subcategories action */}
            {onReorderSubcategories && filters.length > 1 && (
              <button
                className={`${styles.filterButton} ${styles.groupAction}`}
                onClick={onReorderSubcategories}
                title="Reorder subcategories"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
                  <path d="M2 3H10M2 6H10M2 9H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M4 1.5L2 3L4 4.5M8 7.5L10 9L8 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Reorder
              </button>
            )}
            {/* Group by Subcategory action */}
            {onGroupBySubcategory && filters.length > 1 && (
              <button
                className={`${styles.filterButton} ${styles.groupAction}`}
                onClick={onGroupBySubcategory}
                title="Group items by subcategory"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
                  <path d="M1.5 3H10.5M1.5 6H7.5M1.5 9H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Group
              </button>
            )}
            {/* View All button */}
            {filters.length > 0 && (
              <button
                className={`${styles.filterButton} ${styles.viewAll} ${!filters.some(f => f.active) ? styles.active : ''}`}
                onClick={() => onFilterClick && onFilterClick(null)}
              >
                View All
              </button>
            )}
            {filters.map((filter, index) => (
              <button
                key={index}
                className={`${styles.filterButton} ${filter.active ? styles.active : ''}`}
                onClick={() => onFilterClick && onFilterClick(filter.label)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Children content (shown when expanded) */}
      {isExpanded && children && (
        <div className={styles.content}>
          {children}
        </div>
      )}
    </div>
  );
}

export default CategorySection;
