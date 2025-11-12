import React from 'react';
import styles from './CheckboxList.module.css';

/**
 * CheckboxList Component
 * 
 * A compact vertical list of checkboxes (no borders, no info icons)
 * 
 * @param {Array} items - Array of {id, label, checked} objects
 * @param {function} onChange - Handler for checkbox change (id, checked)
 */
function CheckboxList({ items = [], onChange, className = '' }) {
  return (
    <div className={`${styles.checkboxList} ${className}`}>
      {items.map((item) => (
        <label key={item.id} className={styles.checkboxItem}>
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) => onChange(item.id, e.target.checked)}
            className={styles.checkboxInput}
          />
          <div className={styles.checkboxBox}>
            {item.checked && (
              <svg 
                className={styles.checkIcon}
                viewBox="0 0 12 10" 
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M1 5L4.5 8.5L11 1.5" 
                  stroke="white" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <span className={styles.labelText}>{item.label}</span>
        </label>
      ))}
    </div>
  );
}

export default CheckboxList;
