import React from 'react';
import styles from './AspectRatioOptions.module.css';

/**
 * AspectRatioOptionCard Component
 * Individual selectable aspect ratio card
 */
function AspectRatioOptionCard({ value, label, icon, selected, onClick }) {
  return (
    <button
      className={`${styles.ratioCard} ${selected ? styles.selected : ''}`}
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
 * AspectRatioOptions Component
 *
 * Section for selecting slide aspect ratio (4:3 or 16:9).
 * Auto-saves on selection change.
 *
 * @param {string} selectedRatio - Currently selected ratio ("4:3" or "16:9")
 * @param {function} onRatioChange - Handler for ratio change (should handle saving)
 */
function AspectRatioOptions({
  selectedRatio = '16:9',
  onRatioChange,
  className = ''
}) {
  const ratioOptions = [
    {
      value: '16:9',
      label: 'Widescreen (16:9)',
      icon: (
        <div className={styles.iconWide} />
      )
    },
    {
      value: '4:3',
      label: 'Standard (4:3)',
      icon: (
        <div className={styles.iconStandard} />
      )
    }
  ];

  return (
    <div className={`${styles.section} ${className}`}>
      {/* Section Header */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Slide Aspect Ratio</h2>
      </div>

      {/* Ratio Options */}
      <div className={styles.ratioGrid}>
        {ratioOptions.map((option) => (
          <AspectRatioOptionCard
            key={option.value}
            value={option.value}
            label={option.label}
            icon={option.icon}
            selected={selectedRatio === option.value}
            onClick={() => onRatioChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

export default AspectRatioOptions;
