import React from 'react';
import styles from './PillCounter.module.css';

/**
 * PillCounter Component
 * 
 * Pill-shaped counter badge for displaying item counts
 * 
 * @param {number} count - Number to display
 * @param {string} label - Label text (e.g., "items", "products")
 * @param {string} variant - Color variant: 'default' | 'primary' | 'secondary'
 */
function PillCounter({ 
  count,
  label = 'items',
  variant = 'default',
  className = ''
}) {
  const displayText = `${count} ${label}`;
  
  return (
    <div className={`${styles.pill} ${styles[variant]} ${className}`}>
      <span className={styles.text}>{displayText}</span>
    </div>
  );
}

export default PillCounter;
