import React, { useRef, useState, useEffect } from 'react';
import styles from './POFileUpload.module.css';

/**
 * POFileUpload Component
 * 
 * Purchase Order file upload zone with drag-and-drop functionality
 * Shows empty state when no files, filled state with file list when files uploaded
 * 
 * @param {function} onFilesSelected - Callback when files are selected (receives File array)
 * @param {function} onFileRemove - Callback when file is removed (receives file id)
 * @param {Array} initialFiles - Initial files to display (from DB)
 * @param {string} title - Main title text (empty state)
 * @param {string} subtitle - Subtitle/description text (empty state)
 * @param {string} buttonText - Button text (empty state)
 * @param {string} addMoreButtonText - Button text (filled state)
 * @param {string} accept - Accepted file types (e.g., ".xlsx,.xls,.csv")
 * @param {boolean} multiple - Allow multiple file selection
 */
function POFileUpload({ 
  onFilesSelected,
  onFileRemove,
  initialFiles = [],
  title = 'Upload Purchase Order Files',
  subtitle = 'Required for deck generation',
  buttonText = 'Choose PO Files',
  addMoreButtonText = 'Add More PO Files',
  accept = '*',
  multiple = true,
  className = ''
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // Initialize with existing files from DB
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const formattedFiles = initialFiles.map(doc => ({
        id: doc.document_id,
        name: doc.name,
        size: doc.file_size_bytes,
        type: doc.file_type,
        url: doc.url,
        isExisting: true // Flag to identify DB files vs newly selected files
      }));
      setUploadedFiles(formattedFiles);
    }
  }, [initialFiles]);

  const handleFileSelect = (files) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const filesWithMetadata = fileArray.map(file => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        id: `${file.name}-${file.size}-${Date.now()}`
      }));
      
      setUploadedFiles(prev => [...prev, ...filesWithMetadata]);
      onFilesSelected(fileArray);
    }
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    // Notify parent if this is an existing file from DB
    const fileToRemove = uploadedFiles.find(f => f.id === fileId);
    if (fileToRemove?.isExisting && onFileRemove) {
      onFileRemove(fileId);
    }
  };

  const getFileTypeLabel = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') return 'Excel File';
    if (ext === 'csv') return 'CSV File';
    if (ext === 'pdf') return 'PDF File';
    return 'File';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Empty state - no files uploaded
  if (uploadedFiles.length === 0) {
    return (
      <div
        className={`${styles.uploadZone} ${styles.empty} ${isDragging ? styles.dragging : ''} ${className}`}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          aria-label="File upload"
        />

        {/* Upload Icon */}
        <svg 
          className={styles.icon}
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <path 
            d="M12 16V4M12 4L8 8M12 4L16 8" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M3 15V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V15" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </svg>

        {/* Text Block */}
        <div className={styles.textBlock}>
          <p className={styles.title}>{title}</p>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        {/* Button */}
        <button 
          className={styles.button}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  }

  // Filled state - files uploaded
  return (
    <div
      className={`${styles.uploadZone} ${styles.filled} ${isDragging ? styles.dragging : ''} ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        aria-label="File upload"
      />

      {/* Files List */}
      <div className={styles.filesList}>
        {uploadedFiles.map((fileData) => (
          <div key={fileData.id} className={styles.fileItem}>
            <div className={styles.fileDetails}>
              {/* File Icon */}
              <div className={styles.fileIconWrapper}>
                <svg className={styles.fileIcon} width="11" height="14" viewBox="0 0 11 14" fill="none">
                  <path 
                    d="M6.5 0H1.5C1.10218 0 0.720644 0.158035 0.43934 0.43934C0.158035 0.720644 0 1.10218 0 1.5V12.5C0 12.8978 0.158035 13.2794 0.43934 13.5607C0.720644 13.842 1.10218 14 1.5 14H9.5C9.89782 14 10.2794 13.842 10.5607 13.5607C10.842 13.2794 11 12.8978 11 12.5V4L6.5 0Z" 
                    fill="currentColor"
                  />
                  <path 
                    d="M6.5 0V4H11" 
                    fill="currentColor"
                  />
                </svg>
              </div>

              {/* File Info */}
              <div className={styles.fileInfo}>
                <p className={styles.fileName}>{fileData.name}</p>
                <p className={styles.fileMetadata}>
                  {getFileTypeLabel(fileData.name)} • {formatFileSize(fileData.size)}
                </p>
              </div>
            </div>

            {/* Delete Button */}
            <button
              className={styles.deleteButton}
              onClick={() => handleRemoveFile(fileData.id)}
              aria-label="Remove file"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path 
                  d="M2 4H14" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
                <path 
                  d="M12.5 4V13C12.5 13.5523 12.0523 14 11.5 14H4.5C3.94772 14 3.5 13.5523 3.5 13V4M5.5 4V2.5C5.5 2.22386 5.72386 2 6 2H10C10.2761 2 10.5 2.22386 10.5 2.5V4" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add More Button */}
      <button 
        className={styles.addMoreButton}
        type="button"
        onClick={handleClick}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path 
            d="M6 1V11M1 6H11" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </svg>
        {addMoreButtonText}
      </button>
    </div>
  );
}

export default POFileUpload;
