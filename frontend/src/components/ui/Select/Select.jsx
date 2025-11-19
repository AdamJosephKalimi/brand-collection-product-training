import React from 'react';
import styles from './Select.module.css';

/**
 * Select Component
 * 
 * Compact dropdown selector without label
 * 
 * @param {string} value - Currently selected value
 * @param {Array} options - Array of {value, label} objects
 * @param {function} onChange - Callback when selection changes
 * @param {boolean} disabled - Whether the select is disabled
 * @param {string} variant - Style variant: 'default' | 'secondary' | 'primary'
 * @param {string} placeholder - Placeholder text when no value selected
 */
function Select({ 
  value,
  options = [],
  onChange,
  disabled = false,
  variant = 'default',
  placeholder = 'Select...',
  className = ''
}) {
  return (
    <div className={`${styles.selectWrapper} ${styles[variant]} ${disabled ? styles.disabled : ''} ${className}`}>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {!value && placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
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
  );
}

export default Select;
