import React, { useState, useEffect } from 'react';
import styles from './TypographyModal.module.css';

const PRESET_FONTS = [
  'Arial',
  'Calibri',
  'Futura',
  'Garamond',
  'Georgia',
  'Helvetica',
  'Palatino',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
];

const PRESET_COLORS = [
  '#000000', '#333333', '#555555', '#9CA3AF',
  '#1E3A5F', '#2C5F8A', '#7D3B51', '#A65572',
  '#2D5016', '#4A7A2E', '#8B4513', '#FFFFFF',
];

function TypographyModal({
  title = 'Typography Settings',
  subtitle = '',
  isVisible = false,
  initialValues = {},
  onSave,
  onClose,
}) {
  const [fontFamily, setFontFamily] = useState('');
  const [fontSize, setFontSize] = useState('');
  const [fontColor, setFontColor] = useState('');
  const [hexInput, setHexInput] = useState('');

  useEffect(() => {
    if (isVisible) {
      setFontFamily(initialValues.font_family || '');
      setFontSize(initialValues.font_size ? String(initialValues.font_size) : '');
      setFontColor(initialValues.font_color || '');
      setHexInput(initialValues.font_color || '');
    }
  }, [isVisible, initialValues]);

  const handleColorSelect = (color) => {
    setFontColor(color);
    setHexInput(color);
  };

  const handleHexChange = (e) => {
    const val = e.target.value;
    setHexInput(val);
    // Validate hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setFontColor(val);
    }
  };

  const handleSave = () => {
    const values = {};
    if (fontFamily) values.font_family = fontFamily;
    if (fontSize) values.font_size = parseInt(fontSize, 10);
    if (fontColor) values.font_color = fontColor;
    onSave(values);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h3 className={styles.title}>{title}</h3>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {onClose && (
            <button className={styles.closeButton} onClick={onClose} aria-label="Close">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="14" fill="#EBF7E6"/>
                <path d="M18 10L10 18M10 10L18 18" stroke="#2C3528" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Font Family */}
          <div className={styles.field}>
            <label className={styles.label}>Font Family</label>
            <select
              className={styles.select}
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={fontFamily ? { fontFamily } : undefined}
            >
              <option value="">Default</option>
              {PRESET_FONTS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className={styles.field}>
            <label className={styles.label}>Font Size (pt)</label>
            <input
              type="number"
              className={styles.input}
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              placeholder="Default"
              min="6"
              max="72"
            />
          </div>

          {/* Font Color */}
          <div className={styles.field}>
            <label className={styles.label}>Font Color</label>
            <div className={styles.colorSection}>
              <div className={styles.colorPalette}>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`${styles.colorSwatch} ${fontColor.toLowerCase() === color.toLowerCase() ? styles.colorSwatchActive : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color)}
                    title={color}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
              <div className={styles.hexRow}>
                <span className={styles.hexLabel}>Hex</span>
                <input
                  type="text"
                  className={styles.hexInput}
                  value={hexInput}
                  onChange={handleHexChange}
                  placeholder="#000000"
                  maxLength={7}
                />
                {fontColor && (
                  <div
                    className={styles.colorPreview}
                    style={{ backgroundColor: fontColor }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          {(fontFamily || fontSize || fontColor) && (
            <div className={styles.field}>
              <label className={styles.label}>Preview</label>
              <div className={styles.preview}>
                <p
                  className={styles.previewText}
                  style={{
                    fontFamily: fontFamily || 'inherit',
                    fontSize: fontSize ? `${fontSize}pt` : 'inherit',
                    color: fontColor || '#333333',
                  }}
                >
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button className={styles.actionButton} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default TypographyModal;
