import React from 'react';
import styles from './SimpleCheckbox.module.css';

/**
 * SimpleCheckbox Component
 * 
 * A minimal checkbox without label - just the checkbox input itself
 * 
 * @param {boolean} checked - Whether checkbox is checked
 * @param {function} onChange - Change handler
 * @param {boolean} disabled - Whether checkbox is disabled
 */
function SimpleCheckbox({ 
  checked = false,
  onChange,
  disabled = false,
  className = '',
  ...props 
}) {
  return (
    <label className={`${styles.checkboxWrapper} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={styles.checkboxInput}
        {...props}
      />
      <div className={`${styles.checkboxBox} ${checked ? styles.checked : ''} ${disabled ? styles.disabled : ''}`}>
        {checked && (
          <svg 
            className={styles.checkIcon}
            width="9" 
            height="8" 
            viewBox="0 0 9 8" 
            fill="none"
          >
            <path 
              d="M1 4L3.5 6.5L8 1" 
              stroke="white" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </label>
  );
}

export default SimpleCheckbox;
