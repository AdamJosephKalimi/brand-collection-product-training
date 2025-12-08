import React from 'react';
import styles from './LayoutOptions.module.css';

/**
 * LayoutOptionCard Component
 * Individual selectable layout card
 */
function LayoutOptionCard({ value, label, icon, selected, onClick }) {
  return (
    <button
      className={`${styles.layoutCard} ${selected ? styles.selected : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {/* Icon */}
      <div className={styles.iconWrapper}>
        {icon}
      </div>
      
      {/* Label */}
      <p className={styles.cardLabel}>{label}</p>
      
      {/* Checkmark (top-right) */}
      {selected && (
        <div className={styles.checkmark}>
          <svg 
            viewBox="0 0 16 16" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="8" cy="8" r="8" fill="currentColor"/>
            <path 
              d="M5 8L7 10L11 6" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

/**
 * LayoutOptions Component
 * 
 * Section for selecting deck layout (1, 2, 3, or 4 products per slide)
 * Auto-saves on selection change.
 * 
 * @param {number} selectedLayout - Currently selected layout (1, 2, 3, or 4)
 * @param {function} onLayoutChange - Handler for layout change (should handle saving)
 */
function LayoutOptions({ 
  selectedLayout = 2, 
  onLayoutChange,
  className = ''
}) {
  const layoutOptions = [
    {
      value: 1,
      label: '1 product per slide',
      icon: <div className={styles.icon1} />
    },
    {
      value: 2,
      label: '2 products per slide',
      icon: (
        <div className={styles.icon2}>
          <div className={styles.square} />
          <div className={styles.square} />
        </div>
      )
    },
    {
      value: 3,
      label: '3 products per slide',
      icon: (
        <div className={styles.icon3}>
          <div className={styles.square} />
          <div className={styles.square} />
          <div className={styles.square} />
        </div>
      )
    },
    {
      value: 4,
      label: '4 products per slide',
      icon: (
        <div className={styles.icon4}>
          <div className={styles.square} />
          <div className={styles.square} />
          <div className={styles.square} />
          <div className={styles.square} />
        </div>
      )
    }
  ];

  return (
    <div className={`${styles.section} ${className}`}>
      {/* Section Header */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Deck Layout Options</h2>
      </div>
      
      {/* Layout Options */}
      <div className={styles.layoutGrid}>
        {layoutOptions.map((option) => (
          <LayoutOptionCard
            key={option.value}
            value={option.value}
            label={option.label}
            icon={option.icon}
            selected={selectedLayout === option.value}
            onClick={() => onLayoutChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

export default LayoutOptions;
