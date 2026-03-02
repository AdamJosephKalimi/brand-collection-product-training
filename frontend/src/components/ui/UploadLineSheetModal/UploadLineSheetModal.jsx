import React, { useState, useRef } from 'react';
import styles from './UploadLineSheetModal.module.css';
import FileUpload from '../FileUpload/FileUpload';

function UploadLineSheetModal({
  isVisible = false,
  onClose,
  onUploadAndProcess,
  isLoading = false,
  error = null,
  successMessage = null
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileUploadKey = useRef(0);

  if (!isVisible) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedFiles([]);
      fileUploadKey.current += 1;
      onClose?.();
    }
  };

  const handleFilesSelected = (files) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0 && onUploadAndProcess) {
      onUploadAndProcess(selectedFiles);
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Upload Additional Line Sheet</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <p className={styles.subtitle}>
            Upload line sheet file(s) to match remaining unmatched items. Items with matching SKUs will be automatically enriched.
          </p>

          <FileUpload
            key={fileUploadKey.current}
            onFilesSelected={handleFilesSelected}
            title="Upload Line Sheet Files"
            subtitle="Supported formats: PDF, Excel, CSV"
            buttonText="Select Line Sheet Files"
            addMoreButtonText="Add More Files"
            accept=".pdf,.xlsx,.xls,.csv"
            multiple={true}
          />

          {successMessage && (
            <p className={styles.successMessage}>{successMessage}</p>
          )}

          {error && (
            <p className={styles.errorMessage}>{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={styles.uploadButton}
            onClick={handleUpload}
            disabled={isLoading || selectedFiles.length === 0}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                Processing...
              </>
            ) : (
              'Upload & Process'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadLineSheetModal;
