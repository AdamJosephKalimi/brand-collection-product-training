import React from 'react';
import styles from './ConfirmModal.module.css';

/**
 * ConfirmModal Component
 * 
 * A reusable confirmation modal for destructive actions.
 * 
 * @param {boolean} isVisible - Whether the modal is visible
 * @param {function} onClose - Close button handler
 * @param {function} onConfirm - Confirm button handler
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {React.ReactNode} children - Optional custom content below message
 * @param {string} confirmText - Text for confirm button (default: "Delete")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {boolean} isLoading - Whether the action is in progress
 * @param {boolean} isDangerous - Whether to style as dangerous action (default: true)
 * @param {boolean} confirmDisabled - Whether confirm button is disabled (default: false)
 */
function ConfirmModal({
  isVisible = false,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  children,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false,
  isDangerous = true,
  confirmDisabled = false
}) {
  if (!isVisible) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose?.();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div className={styles.content}>
          <p className={styles.message}>{message}</p>
          {children}
        </div>
        
        {/* Actions */}
        <div className={styles.actions}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`${styles.confirmButton} ${isDangerous ? styles.dangerous : ''}`}
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                Deleting...
              </>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
