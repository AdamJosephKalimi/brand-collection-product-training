import React from 'react';
import styles from './Toggle.module.css';

/**
 * Toggle Component
 * 
 * A toggle switch for on/off states
 * 
 * @param {boolean} checked - Whether toggle is on
 * @param {function} onChange - Change handler
 * @param {boolean} disabled - Whether toggle is disabled
 */
function Toggle({ 
  checked = false,
  onChange,
  disabled = false,
  className = '',
  ...props 
}) {
  return (
    <label className={`${styles.toggleWrapper} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={styles.toggleInput}
        {...props}
      />
      <div className={`${styles.toggleTrack} ${checked ? styles.checked : ''} ${disabled ? styles.disabled : ''}`}>
        <div className={styles.toggleCircle} />
      </div>
    </label>
  );
}

export default Toggle;
