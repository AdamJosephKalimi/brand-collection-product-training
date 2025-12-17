import React from 'react';
import styles from './Footer.module.css';

/**
 * Footer Component
 * 
 * Page footer with links and copyright
 * 
 * @param {Array} links - Array of {label, href} objects for footer links
 * @param {string} copyrightText - Copyright text
 */
function Footer({ 
  links = [
    { label: 'Help', href: '#' },
    { label: 'Documentation', href: '#' },
    { label: 'Support', href: '#' }
  ],
  copyrightText = '© 2024 AI Brand Training Generator',
  className = ''
}) {
  return (
    <footer className={`${styles.footer} ${className}`}>
      <div className={styles.footerInner}>
        {/* Left: Links */}
        <div className={styles.footerLinks}>
          {links.map((link, index) => (
            <a 
              key={index}
              href={link.href}
              className={styles.footerLink}
            >
              {link.label}
            </a>
          ))}
        </div>
        
        {/* Right: Copyright */}
        <p className={styles.copyright}>{copyrightText}</p>
      </div>
    </footer>
  );
}

export default Footer;
