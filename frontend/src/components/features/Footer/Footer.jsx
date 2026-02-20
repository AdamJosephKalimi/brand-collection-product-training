import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

/**
 * Footer Component
 *
 * Page footer with links and copyright.
 * Uses React Router Link for internal navigation.
 *
 * @param {Array} links - Array of {label, path} objects for footer links
 * @param {string} copyrightText - Copyright text
 */
function Footer({
  links = [
    { label: 'Documentation', path: '/documentation' },
    { label: 'Support', path: '/support' }
  ],
  copyrightText = '© 2026 Proko Product Knowledge',
  className = ''
}) {
  return (
    <footer className={`${styles.footer} ${className}`}>
      <div className={styles.footerInner}>
        {/* Left: Links */}
        <div className={styles.footerLinks}>
          {links.map((link, index) => (
            <Link
              key={index}
              to={link.path}
              className={styles.footerLink}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Copyright */}
        <p className={styles.copyright}>{copyrightText}</p>
      </div>
    </footer>
  );
}

export default Footer;
