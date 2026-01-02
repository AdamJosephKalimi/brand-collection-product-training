import React, { useState, useEffect } from 'react';
import styles from './NewCollectionModal.module.css';

const SEASONS = [
  { value: '', label: 'Select season' },
  { value: 'spring_summer', label: 'Spring/Summer' },
  { value: 'fall_winter', label: 'Fall/Winter' },
  { value: 'resort', label: 'Resort' },
  { value: 'pre_fall', label: 'Pre-Fall' },
  { value: 'year_round', label: 'Year-Round' }
];

// Generate years from current year - 1 to current year + 2
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [{ value: '', label: 'Select year' }];
  for (let y = currentYear + 2; y >= currentYear - 1; y--) {
    years.push({ value: y, label: y.toString() });
  }
  return years;
};

const YEARS = generateYears();

/**
 * NewCollectionModal Component
 * 
 * A modal for creating a new collection with name, season, and year.
 * 
 * @param {boolean} isVisible - Whether the modal is visible
 * @param {function} onClose - Close button handler
 * @param {function} onSubmit - Submit handler, receives { collectionName, season, year }
 * @param {boolean} isLoading - Whether the form is submitting
 * @param {string} loadingMessage - Custom loading message (default: "Creating...")
 * @param {string} brandName - Name of the parent brand (for display)
 */
function NewCollectionModal({ 
  isVisible = false,
  onClose,
  onSubmit,
  isLoading = false,
  loadingMessage = 'Creating...',
  brandName = ''
}) {
  const [collectionName, setCollectionName] = useState('');
  const [season, setSeason] = useState('');
  const [year, setYear] = useState('');
  const [errors, setErrors] = useState({});

  // Reset form state when modal opens
  useEffect(() => {
    if (isVisible) {
      setCollectionName('');
      setSeason('');
      setYear('');
      setErrors({});
    }
  }, [isVisible]);

  const clearError = (field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleNameChange = (e) => {
    setCollectionName(e.target.value);
    if (e.target.value.trim()) {
      clearError('collectionName');
    }
  };

  const handleSeasonChange = (e) => {
    setSeason(e.target.value);
    if (e.target.value) {
      clearError('season');
    }
  };

  const handleYearChange = (e) => {
    setYear(e.target.value);
    if (e.target.value) {
      clearError('year');
    }
  };

  const handleSubmit = () => {
    const newErrors = {};
    if (!collectionName.trim()) {
      newErrors.collectionName = 'Collection name is required';
    }
    if (!season) {
      newErrors.season = 'Season is required';
    }
    if (!year) {
      newErrors.year = 'Year is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    if (onSubmit) {
      onSubmit({
        collectionName: collectionName.trim(),
        season: season,
        year: parseInt(year, 10)
      });
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    
    setCollectionName('');
    setSeason('');
    setYear('');
    setErrors({});
    
    if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h3 className={styles.title}>New Collection</h3>
            <p className={styles.subtitle}>
              {brandName ? `Add a new collection to ${brandName}` : 'Enter the details below to create a new collection.'}
            </p>
          </div>
          <button 
            className={styles.closeButton} 
            onClick={handleClose}
            aria-label="Close"
            disabled={isLoading}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="14" fill="#EBF7E6"/>
              <path d="M18 10L10 18M10 10L18 18" stroke="#2C3528" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className={styles.content}>
          {/* Collection Name Field */}
          <div className={styles.fieldWrapper}>
            <label className={styles.label}>
              Collection Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={`${styles.input} ${errors.collectionName ? styles.inputError : ''}`}
              value={collectionName}
              onChange={handleNameChange}
              placeholder="e.g. Spring 2025 Collection"
              disabled={isLoading}
            />
            {errors.collectionName && (
              <span className={styles.errorText}>{errors.collectionName}</span>
            )}
          </div>
          
          {/* Season Field */}
          <div className={styles.fieldWrapper}>
            <label className={styles.label}>
              Season <span className={styles.required}>*</span>
            </label>
            <select
              className={`${styles.select} ${errors.season ? styles.selectError : ''}`}
              value={season}
              onChange={handleSeasonChange}
              disabled={isLoading}
            >
              {SEASONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.season && (
              <span className={styles.errorText}>{errors.season}</span>
            )}
          </div>
          
          {/* Year Field */}
          <div className={styles.fieldWrapper}>
            <label className={styles.label}>
              Year <span className={styles.required}>*</span>
            </label>
            <select
              className={`${styles.select} ${errors.year ? styles.selectError : ''}`}
              value={year}
              onChange={handleYearChange}
              disabled={isLoading}
            >
              {YEARS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.year && (
              <span className={styles.errorText}>{errors.year}</span>
            )}
          </div>
          
          {/* Submit Button */}
          <button 
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={isLoading || !collectionName.trim() || !season || !year}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                {loadingMessage}
              </>
            ) : 'Create Collection'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewCollectionModal;
