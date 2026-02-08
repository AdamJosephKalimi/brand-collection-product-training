import React, { useState, useRef } from 'react';
import TypographyModal from '../TypographyModal';
import styles from './NewBrandModal.module.css';

/**
 * NewBrandModal Component
 * 
 * A modal for creating a new brand with name, website URL, and logo upload.
 * 
 * @param {boolean} isVisible - Whether the modal is visible
 * @param {function} onClose - Close button handler
 * @param {function} onSubmit - Submit handler, receives { brandName, websiteUrl, logoFile }
 * @param {boolean} isLoading - Whether the form is submitting
 * @param {string} className - Additional CSS classes
 */
function NewBrandModal({ 
  isVisible = false,
  onClose,
  onSubmit,
  isLoading = false,
  className = ''
}) {
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [deckTypography, setDeckTypography] = useState({ heading: {}, body: {}, slide_title: {} });
  const [typographyModal, setTypographyModal] = useState({ isVisible: false, group: null });
  const fileInputRef = useRef(null);

  const typographyGroups = [
    { key: 'heading', label: 'Headings', description: 'Cover title, category dividers' },
    { key: 'body', label: 'Body Text', description: 'Product details, descriptions' },
    { key: 'slide_title', label: 'Slide Titles', description: 'Category-subcategory labels on product slides' },
  ];

  const handleTypographySave = (values) => {
    const group = typographyModal.group;
    setDeckTypography(prev => ({ ...prev, [group]: values }));
    setTypographyModal({ isVisible: false, group: null });
  };

  const clearError = (field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleBrandNameChange = (e) => {
    setBrandName(e.target.value);
    if (e.target.value.trim()) {
      clearError('brandName');
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, logo: 'Please upload a PNG, JPG, or SVG file.' }));
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, logo: 'File size must be less than 5MB.' }));
        return;
      }
      
      clearError('logo');
      setLogoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = () => {
    // Validate required fields
    const newErrors = {};
    if (!brandName.trim()) {
      newErrors.brandName = 'Brand name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    if (onSubmit) {
      // Only include typography if any group has settings
      const hasTypography = Object.values(deckTypography).some(
        g => g.font_family || g.font_size || g.font_color
      );
      onSubmit({
        brandName: brandName.trim(),
        websiteUrl: websiteUrl.trim(),
        logoFile,
        ...(hasTypography ? { deckTypography } : {})
      });
    }
  };

  const handleClose = () => {
    // Don't allow closing while loading
    if (isLoading) return;
    
    // Reset form state
    setBrandName('');
    setWebsiteUrl('');
    setLogoFile(null);
    setLogoPreview(null);
    setErrors({});
    setDeckTypography({ heading: {}, body: {}, slide_title: {} });
    setTypographyModal({ isVisible: false, group: null });
    
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

  const modalClasses = [
    styles.modal,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={modalClasses}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h3 className={styles.title}>New Brand</h3>
            <p className={styles.subtitle}>Enter the details below to create a new brand.</p>
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
          {/* Brand Name Field */}
          <div className={styles.fieldWrapper}>
            <label className={styles.label}>
              Brand Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={`${styles.input} ${errors.brandName ? styles.inputError : ''}`}
              value={brandName}
              onChange={handleBrandNameChange}
              placeholder="Enter brand name"
              disabled={isLoading}
            />
            {errors.brandName && (
              <span className={styles.errorText}>{errors.brandName}</span>
            )}
          </div>
          
          {/* Website URL Field */}
          <div className={styles.fieldWrapper}>
            <label className={styles.label}>Website URL</label>
            <p className={styles.fieldDescription}>Add the brand's website for additional context.</p>
            <div className={styles.urlInputWrapper}>
              <div className={styles.urlPrefix}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.5"/>
                  <path d="M1 7H13M7 1C8.5 2.5 9.5 4.5 9.5 7C9.5 9.5 8.5 11.5 7 13M7 1C5.5 2.5 4.5 4.5 4.5 7C4.5 9.5 5.5 11.5 7 13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                type="url"
                className={styles.urlInput}
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.brand.com"
                disabled={isLoading}
              />
            </div>
          </div>
          
          {/* Brand Logo Field */}
          <div className={styles.fieldWrapper}>
            <label className={styles.label}>Brand Logo</label>
            {errors.logo && (
              <span className={styles.errorText}>{errors.logo}</span>
            )}
            <div className={styles.logoWrapper}>
              <div className={`${styles.uploadBox} ${isLoading ? styles.uploadBoxDisabled : ''}`} onClick={isLoading ? undefined : handleUploadClick}>
                <input
                  type="file"
                  ref={fileInputRef}
                  className={styles.fileInput}
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleLogoChange}
                />
                <svg width="38" height="26" viewBox="0 0 38 26" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.uploadIcon}>
                  <path d="M19 0L19 18M19 0L12 7M19 0L26 7" stroke="#AEC9A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 19V23C1 24.1046 1.89543 25 3 25H35C36.1046 25 37 24.1046 37 23V19" stroke="#AEC9A3" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div className={styles.uploadText}>
                  <span className={styles.uploadTitle}>Upload logo file</span>
                  <span className={styles.uploadSubtitle}>PNG, JPG, SVG (max 5MB)</span>
                </div>
                <button 
                  type="button" 
                  className={styles.uploadButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUploadClick();
                  }}
                >
                  Upload Logo
                </button>
              </div>
              
              <div className={styles.logoPreview}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className={styles.previewImage} />
                ) : (
                  <span className={styles.previewPlaceholder}>Logo Preview</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Deck Typography */}
          <div className={styles.fieldWrapper}>
            <label className={styles.label}>Deck Typography</label>
            <p className={styles.fieldDescription}>
              Customize font family, size, and color for generated presentation slides.
            </p>
            <div className={styles.typographyGroups}>
              {typographyGroups.map(({ key, label, description }) => {
                const settings = deckTypography[key] || {};
                const hasSettings = settings.font_family || settings.font_size || settings.font_color;
                return (
                  <div key={key} className={styles.typographyGroupCard}>
                    <div className={styles.typographyGroupInfo}>
                      <span className={styles.typographyGroupLabel}>{label}</span>
                      <span className={styles.typographyGroupDesc}>{description}</span>
                      {hasSettings && (
                        <span className={styles.typographyGroupValues}>
                          {[
                            settings.font_family,
                            settings.font_size && `${settings.font_size}pt`,
                            settings.font_color,
                          ].filter(Boolean).join(' / ')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.typographyEditButton}
                      onClick={() => setTypographyModal({ isVisible: true, group: key })}
                      disabled={isLoading}
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M14.166 2.5009C14.3849 2.28203 14.6447 2.10842 14.9307 1.98996C15.2167 1.87151 15.5232 1.81055 15.8327 1.81055C16.1422 1.81055 16.4487 1.87151 16.7347 1.98996C17.0206 2.10842 17.2805 2.28203 17.4993 2.5009C17.7182 2.71977 17.8918 2.97961 18.0103 3.26558C18.1287 3.55154 18.1897 3.85804 18.1897 4.16757C18.1897 4.4771 18.1287 4.7836 18.0103 5.06956C17.8918 5.35553 17.7182 5.61537 17.4993 5.83424L6.24935 17.0842L1.66602 18.3342L2.91602 13.7509L14.166 2.5009Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={isLoading || !brandName.trim()}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                Creating...
              </>
            ) : 'Create Brand'}
          </button>
        </div>

        {/* Typography Modal */}
        <TypographyModal
          title={`Edit ${typographyGroups.find(g => g.key === typographyModal.group)?.label || ''}`}
          subtitle={typographyGroups.find(g => g.key === typographyModal.group)?.description || ''}
          isVisible={typographyModal.isVisible}
          initialValues={typographyModal.group ? (deckTypography[typographyModal.group] || {}) : {}}
          onSave={handleTypographySave}
          onClose={() => setTypographyModal({ isVisible: false, group: null })}
        />
      </div>
    </div>
  );
}

export default NewBrandModal;
