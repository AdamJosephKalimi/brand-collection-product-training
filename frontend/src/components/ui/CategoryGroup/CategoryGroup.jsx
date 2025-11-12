import React from 'react';
import styles from './CategoryGroup.module.css';

/**
 * Tag Component
 * Individual subcategory tag with delete button
 */
function Tag({ label, onDelete }) {
  return (
    <div className={styles.tag}>
      <span className={styles.tagLabel}>{label}</span>
      <button
        type="button"
        className={styles.tagDeleteButton}
        onClick={onDelete}
        aria-label={`Remove ${label}`}
      >
        <svg 
          className={styles.tagDeleteIcon}
          viewBox="0 0 16 16" 
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="8" cy="8" r="7" fill="currentColor"/>
          <path 
            d="M5 5L11 11M11 5L5 11" 
            stroke="#2c3528" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

/**
 * CategoryGroup Component
 * 
 * A category with subcategory tags and management buttons
 * 
 * @param {string} categoryName - Name of the category
 * @param {Array} subcategories - Array of subcategory strings
 * @param {function} onAddSubcategory - Handler for adding subcategory
 * @param {function} onDeleteSubcategory - Handler for deleting subcategory (index)
 * @param {function} onDeleteCategory - Handler for deleting entire category
 */
function CategoryGroup({ 
  categoryName,
  subcategories = [],
  onAddSubcategory,
  onDeleteSubcategory,
  onDeleteCategory,
  className = ''
}) {
  return (
    <div className={`${styles.categoryGroup} ${className}`}>
      {/* Top row: Category name + Delete button */}
      <div className={styles.categoryHeader}>
        <h3 className={styles.categoryName}>{categoryName}</h3>
        <button
          type="button"
          className={styles.deleteCategoryButton}
          onClick={onDeleteCategory}
          aria-label={`Delete ${categoryName} category`}
        >
          <svg 
            className={styles.binIcon}
            viewBox="0 0 16 16" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Trash bin lid */}
            <path 
              d="M2 4H14" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
            {/* Trash bin body */}
            <path 
              d="M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M12.5 4V13C12.5 13.5523 12.0523 14 11.5 14H4.5C3.94772 14 3.5 13.5523 3.5 13V4" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      
      {/* Bottom row: Subcategory tags + Add button */}
      <div className={styles.subcategoryRow}>
        {subcategories.map((subcategory, index) => (
          <Tag
            key={index}
            label={subcategory}
            onDelete={() => onDeleteSubcategory(index)}
          />
        ))}
        
        <button
          type="button"
          className={styles.addButton}
          onClick={onAddSubcategory}
        >
          <svg 
            className={styles.addIcon}
            viewBox="0 0 12 12" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M6 1V11M1 6H11" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>
          <span>Add Sub-Category</span>
        </button>
      </div>
    </div>
  );
}

export default CategoryGroup;
