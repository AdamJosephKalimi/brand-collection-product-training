import React from 'react';
import styles from './DeckListItemButton.module.css';

/**
 * DeckListItemButton Component
 * 
 * A button for deck list items with Edit and Download variants
 * 
 * @param {string} variant - 'edit' or 'download'
 * @param {function} onClick - Click handler
 * @param {boolean} disabled - Whether button is disabled
 * @param {string} className - Additional CSS classes
 */
function DeckListItemButton({
  variant = 'edit',
  onClick,
  disabled = false,
  className = ''
}) {
  const isDownload = variant === 'download';
  
  const buttonClasses = [
    styles.button,
    styles[variant],
    disabled && styles.disabled,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
    >
      {variant === 'edit' && (
        <svg 
          className={styles.icon} 
          width="14" 
          height="14" 
          viewBox="0 0 14 14" 
          fill="none"
        >
          <path 
            d="M10.5 1.5L12.5 3.5M1 13H3L11.5 4.5C11.7652 4.23478 11.9134 3.87391 11.9134 3.5C11.9134 3.12609 11.7652 2.76522 11.5 2.5L11.5 2.5C11.2348 2.23478 10.8739 2.08658 10.5 2.08658C10.1261 2.08658 9.76522 2.23478 9.5 2.5L1 11V13Z" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className={styles.label}>
        {isDownload ? 'Download' : 'Edit Deck'}
      </span>
      {variant === 'download' && (
        <svg 
          className={styles.icon} 
          width="14" 
          height="14" 
          viewBox="0 0 14 14" 
          fill="none"
        >
          <path 
            d="M1 10V11.5C1 12.0523 1.44772 12.5 2 12.5H12C12.5523 12.5 13 12.0523 13 11.5V10M7 1V9M7 9L4 6M7 9L10 6" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export default DeckListItemButton;
