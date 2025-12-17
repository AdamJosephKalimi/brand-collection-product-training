import React from 'react';
import styles from './SearchBar.module.css';

/**
 * SearchBar Component
 * 
 * Search input with icon
 * 
 * @param {string} value - Current search value
 * @param {function} onChange - Callback when value changes
 * @param {string} placeholder - Placeholder text
 */
function SearchBar({ 
  value = '',
  onChange,
  placeholder = 'Search by SKU, name, color...',
  className = ''
}) {
  return (
    <div className={`${styles.searchBar} ${className}`}>
      {/* Search Icon */}
      <svg 
        className={styles.icon}
        width="16" 
        height="16" 
        viewBox="0 0 16 16" 
        fill="none"
      >
        <path 
          d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M10.5 10.5L14 14" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      
      {/* Input */}
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
      />
    </div>
  );
}

export default SearchBar;
