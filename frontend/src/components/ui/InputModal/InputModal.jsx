import React, { useState } from 'react';
import styles from './InputModal.module.css';

/**
 * InputModal Component
 * 
 * A modal with a header, labeled input field, and action button.
 * Used for forms like adding sub-categories, renaming items, etc.
 * 
 * @param {string} title - Header title text
 * @param {string} label - Input field label
 * @param {string} placeholder - Input placeholder text
 * @param {string} buttonText - Action button text
 * @param {string} value - Controlled input value
 * @param {function} onChange - Input change handler
 * @param {function} onSubmit - Submit/action button handler
 * @param {function} onClose - Close button handler
 * @param {boolean} isVisible - Whether the modal is visible
 * @param {string} className - Additional CSS classes
 */
function InputModal({ 
  title = '',
  label = '',
  placeholder = '',
  buttonText = 'Submit',
  value = '',
  onChange,
  onSubmit,
  onClose,
  isVisible = false,
  className = ''
}) {
  // Internal state for uncontrolled usage
  const [internalValue, setInternalValue] = useState('');
  
  const isControlled = value !== undefined && onChange !== undefined;
  const inputValue = isControlled ? value : internalValue;
  
  const handleInputChange = (e) => {
    if (isControlled) {
      onChange(e.target.value);
    } else {
      setInternalValue(e.target.value);
    }
  };
  
  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(inputValue);
    }
  };

  if (!isVisible) return null;

  const modalClasses = [
    styles.modal,
    className
  ].filter(Boolean).join(' ');

  return (
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
        {/* Input Field */}
        <div className={styles.inputWrapper}>
          {label && <label className={styles.label}>{label}</label>}
          <input
            type="text"
            className={styles.input}
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
          />
        </div>
        
        {/* Action Button */}
        <button 
          className={styles.actionButton}
          onClick={handleSubmit}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}

export default InputModal;
