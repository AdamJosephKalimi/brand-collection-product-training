import React, { useState, useRef } from 'react';
import styles from './ItemDetailsModal.module.css';

function ItemDetailsModal({
  isVisible = false,
  item = null,
  onClose,
  onSave,
  onUploadImage,
  categoryOptions = [],
  subcategoryOptions = [],
  onCategoryChange,
  isLoading = false,
  error = null
}) {
  const [productName, setProductName] = useState('');
  const [rrp, setRrp] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [origin, setOrigin] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [sizes, setSizes] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const prevItemIdRef = useRef(null);

  // Reset form when item changes
  if (item && item.item_id !== prevItemIdRef.current) {
    prevItemIdRef.current = item.item_id;
    setProductName(item.product_name && item.product_name !== item.sku ? item.product_name : '');
    setRrp(item.rrp || '');
    setWholesalePrice(item.wholesale_price || '');
    setColor(item.color || '');
    setMaterial(item.materials?.join(', ') || '');
    setOrigin(item.origin || '');
    setDescription(item.description || '');
    setCategory(item.category || '');
    setSubcategory(item.subcategory || '');
    // Format sizes as "S:10, M:20, L:15"
    const sizeEntries = Object.entries(item.sizes || {});
    setSizes(sizeEntries.length > 0 ? sizeEntries.map(([k, v]) => `${k}:${v}`).join(', ') : '');
    setImageFiles([]);
    setImagePreviews([]);
  }

  if (!isVisible || !item) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose?.();
    }
  };

  const handleCategorySelect = (value) => {
    setCategory(value);
    setSubcategory('');
    onCategoryChange?.(value);
  };

  const handleImageSelect = (files) => {
    const fileArray = Array.from(files);
    const newPreviews = fileArray.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setImageFiles(prev => [...prev, ...fileArray]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index].url);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
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
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      handleImageSelect(files);
    }
  };

  // Parse sizes string like "S:10, M:20, L:15" into { S: 10, M: 20, L: 15 }
  const parseSizes = (sizesStr) => {
    if (!sizesStr.trim()) return null;
    const result = {};
    sizesStr.split(',').forEach(pair => {
      const [key, val] = pair.split(':').map(s => s.trim());
      if (key && val) {
        const qty = parseInt(val, 10);
        if (!isNaN(qty)) result[key] = qty;
      }
    });
    return Object.keys(result).length > 0 ? result : null;
  };

  const handleSave = async () => {
    if (!productName.trim()) return;

    const updateData = {
      product_name: productName.trim(),
    };

    if (rrp !== '') updateData.rrp = parseFloat(rrp);
    if (wholesalePrice !== '') updateData.wholesale_price = parseFloat(wholesalePrice);
    if (color.trim()) updateData.color = color.trim();
    if (material.trim()) updateData.materials = material.split(',').map(m => m.trim()).filter(Boolean);
    if (origin.trim()) updateData.origin = origin.trim();
    if (description.trim()) updateData.description = description.trim();
    if (category) updateData.category = category;
    if (subcategory) updateData.subcategory = subcategory;

    const parsedSizes = parseSizes(sizes);
    if (parsedSizes) updateData.sizes = parsedSizes;

    // Upload images first if any
    let uploadedImages = [];
    if (imageFiles.length > 0 && onUploadImage) {
      for (const file of imageFiles) {
        try {
          const result = await onUploadImage(item.item_id, file);
          if (result) {
            uploadedImages.push(result);
          }
        } catch (err) {
          console.error('Failed to upload image:', err);
        }
      }
    }

    // Merge uploaded images with existing images
    if (uploadedImages.length > 0) {
      const existingImages = item.images || [];
      updateData.images = [...existingImages, ...uploadedImages];
    }

    onSave?.(item.item_id, updateData);
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Add Item Details</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <p className={styles.skuDisplay}>
            <strong>SKU:</strong> {item.sku}
          </p>

          <div className={styles.formGrid}>
            {/* Product Name */}
            <div className={styles.formGroupFull}>
              <label className={styles.label}>
                Product Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                className={styles.input}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter product name"
                disabled={isLoading}
              />
            </div>

            {/* Category */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Category</label>
              <select
                className={styles.select}
                value={category}
                onChange={(e) => handleCategorySelect(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Select category</option>
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Subcategory</label>
              <select
                className={styles.select}
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                disabled={isLoading || !category}
              >
                <option value="">Select subcategory</option>
                {subcategoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Wholesale Price */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Wholesale Price</label>
              <input
                type="number"
                className={styles.input}
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={isLoading}
              />
            </div>

            {/* Price / RRP */}
            <div className={styles.formGroup}>
              <label className={styles.label}>RRP</label>
              <input
                type="number"
                className={styles.input}
                value={rrp}
                onChange={(e) => setRrp(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={isLoading}
              />
            </div>

            {/* Color */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Color</label>
              <input
                type="text"
                className={styles.input}
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Navy Blue"
                disabled={isLoading}
              />
            </div>

            {/* Material */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Material</label>
              <input
                type="text"
                className={styles.input}
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g. Cotton, Polyester"
                disabled={isLoading}
              />
            </div>

            {/* Origin / Country */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Origin / Country</label>
              <input
                type="text"
                className={styles.input}
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Italy"
                disabled={isLoading}
              />
            </div>

            {/* Sizes */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Sizes</label>
              <input
                type="text"
                className={styles.input}
                value={sizes}
                onChange={(e) => setSizes(e.target.value)}
                placeholder="S:10, M:20, L:15"
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div className={styles.formGroupFull}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter product description"
                disabled={isLoading}
              />
            </div>

            {/* Image Upload */}
            <div className={styles.imageSection}>
              <label className={styles.label}>Product Images</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageSelect(e.target.files)}
                style={{ display: 'none' }}
              />
              <div
                className={`${styles.imageDropzone} ${isDragging ? styles.dragging : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <p className={styles.imageDropzoneText}>
                  Drag & drop images here or <span className={styles.imageDropzoneLink}>browse</span>
                </p>
              </div>

              {imagePreviews.length > 0 && (
                <div className={styles.imagePreviews}>
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className={styles.imagePreview}>
                      <img src={preview.url} alt={preview.name} />
                      <button
                        className={styles.removeImageButton}
                        onClick={() => handleRemoveImage(index)}
                        type="button"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className={styles.errorMessage}>{error}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={isLoading || !productName.trim()}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                Saving...
              </>
            ) : (
              'Save Details'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ItemDetailsModal;
