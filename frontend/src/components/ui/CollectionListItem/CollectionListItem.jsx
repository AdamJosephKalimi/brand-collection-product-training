import React, { useState, useRef, useEffect } from 'react';
import styles from './CollectionListItem.module.css';
import SimpleCheckbox from '../SimpleCheckbox/SimpleCheckbox';
import Toggle from '../Toggle/Toggle';
import Select from '../Select/Select';

const SALES_TALK_MAX_LENGTH = 80;

function CollectionListItem({
  variant = 'default',
  item = {},
  checked = false,
  onCheckChange,
  category = '',
  onCategoryChange,
  categoryOptions = [],
  mainCategory = '',
  onMainCategoryChange,
  mainCategoryOptions = [],
  highlighted = false,
  onHighlightChange,
  included = false,
  onIncludeChange,
  salesTalk = '',
  onSalesTalkChange,
  onAddDetails,
  onIgnore,
  className = ''
}) {
  const {
    name = 'Product Name',
    sku = 'SKU001',
    color = 'Black',
    material = 'Material',
    price = '$0',
    origin = 'Country',
    description = 'Product description',
    image = null
  } = item;

  const [salesTalkOpen, setSalesTalkOpen] = useState(false);
  const [salesTalkDraft, setSalesTalkDraft] = useState(salesTalk || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setSalesTalkDraft(salesTalk || '');
  }, [salesTalk]);

  useEffect(() => {
    if (salesTalkOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [salesTalkOpen]);

  const handleSalesTalkToggle = () => {
    if (salesTalkOpen) {
      // Closing — save if changed
      const trimmed = salesTalkDraft.trim();
      if (trimmed !== (salesTalk || '')) {
        onSalesTalkChange?.(trimmed || null);
      }
      setSalesTalkOpen(false);
    } else {
      setSalesTalkDraft(salesTalk || '');
      setSalesTalkOpen(true);
    }
  };

  const handleSalesTalkKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = salesTalkDraft.trim();
      if (trimmed !== (salesTalk || '')) {
        onSalesTalkChange?.(trimmed || null);
      }
      setSalesTalkOpen(false);
    } else if (e.key === 'Escape') {
      setSalesTalkDraft(salesTalk || '');
      setSalesTalkOpen(false);
    }
  };

  const hasSalesTalk = !!(salesTalk && salesTalk.trim());
  const metadata = `${sku} • ${color} • ${material} • ${price} • ${origin}`;

  return (
    <div className={styles.listItemWrapper}>
      <div className={`${styles.listItem} ${styles[variant]} ${className}`}>
        {/* Left Content */}
        <div className={styles.leftContent}>
          {/* Drag Handle */}
          <div className={styles.dragHandle}>
            <div className={styles.dragLine} />
            <div className={styles.dragLine} />
            <div className={styles.dragLine} />
          </div>

          {/* Checkbox */}
          <SimpleCheckbox
            checked={checked}
            onChange={onCheckChange}
          />

          {/* Image */}
          {variant === 'unmatched' ? (
            <div className={styles.imagePlaceholder}>
              <svg width="24" height="21" viewBox="0 0 24 21" fill="none">
                <path d="M3 18L8 13L11 16L16 11L21 16M21 18H3C2.44772 18 2 17.5523 2 17V4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4V17C22 17.5523 21.5523 18 21 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ) : (
            <div className={styles.imageWrapper}>
              {image ? (
                <img src={image} alt={name} className={styles.image} />
              ) : (
                <div className={styles.imagePlaceholderSmall} />
              )}
            </div>
          )}

          {/* Details */}
          <div className={styles.details}>
            <p className={styles.name} title={name}>{name}</p>
            <p
              className={variant === 'unmatched' ? styles.metadataWarning : styles.metadata}
              title={variant === 'unmatched' ? 'Missing linesheet details' : metadata}
            >
              {variant === 'unmatched' ? 'Missing linesheet details' : metadata}
            </p>
            <p className={styles.description} title={description}>{description}</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className={styles.rightActions}>
          {variant === 'unmatched' ? (
            /* Unmatched: Show buttons */
            <div className={styles.unmatchedButtons}>
              <button className={styles.addDetailsButton} onClick={onAddDetails}>
                Add Details
              </button>
              <button className={styles.ignoreButton} onClick={onIgnore}>
                Ignore
              </button>
            </div>
          ) : variant === 'uncategorized' ? (
            /* Uncategorized: Show "Move to Category" dropdown */
            <Select
              value={category}
              options={categoryOptions}
              onChange={onCategoryChange}
              variant="primary"
              placeholder="Move to Category"
            />
          ) : (
            /* Default/Inactive: Show category selectors and toggles */
            <>
              {/* Main Category Dropdown */}
              {mainCategoryOptions.length > 0 && (
                <Select
                  value={mainCategory}
                  options={mainCategoryOptions}
                  onChange={onMainCategoryChange}
                  variant="secondary"
                  placeholder="Move to Category"
                />
              )}

              {/* Sub-Category Dropdown */}
              <Select
                value={category}
                options={categoryOptions}
                onChange={onCategoryChange}
                variant="secondary"
                placeholder="Select Sub-Category"
              />

              {/* Highlight Toggle */}
              <div className={styles.toggleGroup}>
                <Toggle
                  checked={highlighted}
                  onChange={(e) => onHighlightChange(e.target.checked)}
                />
                <div className={styles.toggleLabel}>
                  <span>Highlight</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1L7.545 4.13L11 4.635L8.5 7.07L9.09 10.51L6 8.885L2.91 10.51L3.5 7.07L1 4.635L4.455 4.13L6 1Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>

              {/* Include Toggle */}
              <div className={styles.toggleGroup}>
                <Toggle
                  checked={included}
                  onChange={(e) => onIncludeChange(e.target.checked)}
                />
                <div className={styles.toggleLabel}>
                  <span>Include</span>
                  <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                    <path d="M8 6.5C9.38071 6.5 10.5 5.38071 10.5 4C10.5 2.61929 9.38071 1.5 8 1.5C6.61929 1.5 5.5 2.61929 5.5 4C5.5 5.38071 6.61929 6.5 8 6.5Z" fill="currentColor"/>
                    <path d="M15.5 4C15.5 4 12.5 9.5 8 9.5C3.5 9.5 0.5 4 0.5 4C0.5 4 3.5 -1.5 8 -1.5C12.5 -1.5 15.5 4 15.5 4Z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
              </div>

              {/* Sales Talk Button */}
              <button
                className={`${styles.salesTalkButton} ${hasSalesTalk ? styles.salesTalkActive : ''}`}
                onClick={handleSalesTalkToggle}
                title={hasSalesTalk ? salesTalk : 'Add sales talk'}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  {hasSalesTalk ? (
                    <path d="M2 2C1.44772 2 1 2.44772 1 3V10C1 10.5523 1.44772 11 2 11H4V14L7.5 11H14C14.5523 11 15 10.5523 15 10V3C15 2.44772 14.5523 2 14 2H2Z" fill="currentColor"/>
                  ) : (
                    <path d="M2 2C1.44772 2 1 2.44772 1 3V10C1 10.5523 1.44772 11 2 11H4V14L7.5 11H14C14.5523 11 15 10.5523 15 10V3C15 2.44772 14.5523 2 14 2H2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  )}
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sales Talk Expandable Input */}
      {salesTalkOpen && (
        <div className={styles.salesTalkRow}>
          <input
            ref={inputRef}
            className={styles.salesTalkInput}
            type="text"
            value={salesTalkDraft}
            onChange={(e) => setSalesTalkDraft(e.target.value.slice(0, SALES_TALK_MAX_LENGTH))}
            onKeyDown={handleSalesTalkKeyDown}
            onBlur={handleSalesTalkToggle}
            placeholder="e.g. Italian leather, hand-stitched, best seller"
            maxLength={SALES_TALK_MAX_LENGTH}
          />
          <span className={styles.salesTalkCount}>
            {salesTalkDraft.length}/{SALES_TALK_MAX_LENGTH}
          </span>
        </div>
      )}
    </div>
  );
}

export default CollectionListItem;
