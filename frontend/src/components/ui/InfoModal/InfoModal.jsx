import React from 'react';
import styles from './InfoModal.module.css';

/**
 * InfoModal Component
 * 
 * A modal/tooltip for displaying informational content with a header and description.
 * Used to provide context about features like intro slide types.
 * 
 * @param {string} title - Header title text
 * @param {string} description - Body content text
 * @param {boolean} isVisible - Whether the modal is visible
 * @param {function} onClose - Callback when close button is clicked
 * @param {string} className - Additional CSS classes
 */
function InfoModal({ 
  title = '',
  description = '',
  isVisible = false,
  onClose,
  className = ''
}) {
  if (!isVisible) return null;

  const modalClasses = [
    styles.modal,
    className
  ].filter(Boolean).join(' ');

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={modalClasses}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h3 className={styles.title}>{title}</h3>
          </div>
          {onClose && (
            <button 
              className={styles.closeButton} 
              onClick={onClose}
              aria-label="Close"
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="14" fill="#EBF7E6"/>
                <path d="M18 10L10 18M10 10L18 18" stroke="#2C3528" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      
        {/* Content */}
        <div className={styles.content}>
          <p className={styles.description}>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default InfoModal;
