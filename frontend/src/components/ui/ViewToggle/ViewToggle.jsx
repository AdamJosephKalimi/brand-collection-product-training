import React from 'react';
import styles from './ViewToggle.module.css';

/**
 * ViewToggle Component
 * 
 * Toggle between List and Grid views
 * 
 * @param {string} activeView - Currently active view: 'list' | 'grid'
 * @param {function} onViewChange - Callback when view is changed
 */
function ViewToggle({ 
  activeView = 'list',
  onViewChange,
  className = ''
}) {
  return (
    <div className={`${styles.toggle} ${className}`}>
      {/* List View Button */}
      <button
        className={`${styles.toggleItem} ${activeView === 'list' ? styles.active : ''}`}
        onClick={() => onViewChange('list')}
        aria-label="List view"
        aria-pressed={activeView === 'list'}
      >
        <svg className={styles.icon} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="2.5" y="0.5" width="7.5" height="1.5" rx="0.5" fill="currentColor"/>
          <rect x="0" y="0.5" width="1.5" height="1.5" rx="0.5" fill="currentColor"/>
          <rect x="2.5" y="4" width="7.5" height="1.5" rx="0.5" fill="currentColor"/>
          <rect x="0" y="4" width="1.5" height="1.5" rx="0.5" fill="currentColor"/>
          <rect x="2.5" y="8" width="7.5" height="1.5" rx="0.5" fill="currentColor"/>
          <rect x="0" y="8" width="1.5" height="1.5" rx="0.5" fill="currentColor"/>
        </svg>
        <span className={styles.label}>List</span>
      </button>

      {/* Grid View Button */}
      <button
        className={`${styles.toggleItem} ${activeView === 'grid' ? styles.active : ''}`}
        onClick={() => onViewChange('grid')}
        aria-label="Grid view"
        aria-pressed={activeView === 'grid'}
      >
        <svg className={styles.icon} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="0" y="0" width="4" height="4" rx="0.5" fill="currentColor"/>
          <rect x="6" y="0" width="4" height="4" rx="0.5" fill="currentColor"/>
          <rect x="0" y="6" width="4" height="4" rx="0.5" fill="currentColor"/>
          <rect x="6" y="6" width="4" height="4" rx="0.5" fill="currentColor"/>
        </svg>
        <span className={styles.label}>Grid</span>
      </button>
    </div>
  );
}

export default ViewToggle;
