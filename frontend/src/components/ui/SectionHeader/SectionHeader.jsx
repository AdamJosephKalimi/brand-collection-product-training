import React from 'react';
import Button from '../Button/Button';
import styles from './SectionHeader.module.css';

/**
 * SectionHeader Component
 * 
 * Header for content sections with title, description, and optional action button
 * 
 * @param {string} title - Section title
 * @param {string} description - Section description text
 * @param {string} buttonText - Optional button text
 * @param {function} onButtonClick - Optional button click handler
 * @param {string} buttonVariant - Button variant (default: 'primary')
 * @param {boolean} buttonDisabled - Whether button is disabled
 */
function SectionHeader({ 
  title,
  description,
  buttonText,
  onButtonClick,
  buttonVariant = 'primary',
  buttonDisabled = false,
  className = ''
}) {
  return (
    <div className={`${styles.sectionHeader} ${className}`}>
      {/* Left: Title + Description */}
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        {description && (
          <p className={styles.description}>{description}</p>
        )}
      </div>
      
      {/* Right: Optional Button */}
      {buttonText && onButtonClick && (
        <Button 
          variant={buttonVariant}
          onClick={onButtonClick}
          disabled={buttonDisabled}
        >
          {buttonText}
        </Button>
      )}
    </div>
  );
}

export default SectionHeader;
