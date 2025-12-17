import React from 'react';
import styles from './Checkbox.module.css';

/**
 * Checkbox Component
 * 
 * A checkbox with label and optional info icon
 * 
 * @param {boolean} checked - Whether checkbox is checked
 * @param {function} onChange - Change handler
 * @param {string} label - Checkbox label text
 * @param {boolean} showInfo - Whether to show info icon
 * @param {function} onInfoClick - Info icon click handler
 * @param {boolean} disabled - Whether checkbox is disabled
 */
function Checkbox({ 
  checked = false,
  onChange,
  label,
  showInfo = false,
  onInfoClick,
  disabled = false,
  className = '',
  ...props 
}) {
  return (
    <div className={`${styles.checkboxItem} ${className}`}>
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={styles.checkboxInput}
          {...props}
        />
        <div className={styles.checkboxBox}>
          {checked && (
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
        <span className={styles.labelText}>{label}</span>
      </label>
      
      {showInfo && (
        <button 
          type="button"
          className={styles.infoButton}
          onClick={onInfoClick}
          aria-label="More information"
        >
          <svg 
            className={styles.infoIcon}
            viewBox="0 0 16 16" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="5" r="0.5" fill="currentColor"/>
          </svg>
        </button>
      )}
    </div>
  );
}

export default Checkbox;
