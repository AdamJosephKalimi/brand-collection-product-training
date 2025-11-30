import React from 'react';
import styles from './Tabs.module.css';

/**
 * Tab Item Component
 * Individual tab with number badge and label
 */
function TabItem({ number, label, active, disabled, onClick }) {
  return (
    <button
      className={`${styles.tab} ${active ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
      onClick={disabled ? undefined : onClick}
      aria-selected={active}
      aria-disabled={disabled}
      role="tab"
      disabled={disabled}
    >
      <div className={styles.badge}>
        <span className={styles.badgeNumber}>{number}</span>
      </div>
      <span className={styles.label}>{label}</span>
    </button>
  );
}

/**
 * Tabs Component
 * Numbered tab navigation with active state
 * 
 * @param {Array} tabs - Array of {number, label, id, enabled} objects
 * @param {string} activeTab - ID of the active tab
 * @param {function} onTabChange - Callback when tab is clicked
 */
function Tabs({ tabs, activeTab, onTabChange, className = '' }) {
  return (
    <div className={`${styles.tabsWrapper} ${className}`} role="tablist">
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          number={tab.number}
          label={tab.label}
          active={activeTab === tab.id}
          disabled={tab.enabled === false}
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </div>
  );
}

export default Tabs;
