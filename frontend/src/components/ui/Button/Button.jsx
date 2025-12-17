import React from 'react';
import styles from './Button.module.css';

/**
 * Button Component
 * 
 * A reusable button component matching Figma design system
 * 
 * @param {string} variant - 'primary' or 'secondary'
 * @param {string} size - 'sm', 'md', or 'lg'
 * @param {boolean} disabled - Whether button is disabled
 * @param {function} onClick - Click handler
 * @param {ReactNode} children - Button content
 */
function Button({ 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  onClick,
  children,
  className = '',
  ...props 
}) {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
