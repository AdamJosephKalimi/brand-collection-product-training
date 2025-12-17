import React from 'react';
import styles from './Dropdown.module.css';

/**
 * Dropdown Component
 * 
 * Select dropdown with label
 * 
 * @param {string} label - Label text above dropdown
 * @param {string} value - Selected value
 * @param {Array} options - Array of {value, label} objects
 * @param {function} onChange - Change handler
 * @param {boolean} disabled - Whether dropdown is disabled
 */
function Dropdown({ 
  label,
  value,
  options = [],
  onChange,
  disabled = false,
  className = ''
}) {
  return (
    <div className={`${styles.dropdownWrapper} ${className}`}>
      {label && (
        <label className={styles.label}>{label}</label>
      )}
      
      <div className={styles.selectWrapper}>
        <select
          className={styles.select}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Chevron Icon */}
        <svg 
          className={styles.chevron}
          width="14" 
          height="14" 
          viewBox="0 0 14 14" 
          fill="none"
        >
          <path 
            d="M3.5 5.25L7 8.75L10.5 5.25" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export default Dropdown;
