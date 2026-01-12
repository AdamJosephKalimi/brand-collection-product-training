import React from 'react';
import { Loader } from 'lucide-react';
import styles from './Spinner.module.css';

/**
 * Spinner Component
 * 
 * A simple spinning loader icon for loading states.
 * 
 * @param {number} size - Size in pixels (default: 24)
 * @param {string} className - Additional CSS classes
 */
function Spinner({ size = 24, className = '' }) {
  return (
    <Loader
      role="status"
      aria-label="Loading"
      size={size}
      className={`${styles.spinner} ${className}`}
    />
  );
}

export default Spinner;
