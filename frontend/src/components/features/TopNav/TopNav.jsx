import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../../../firebase/config';
import styles from './TopNav.module.css';

/**
 * TopNav Component
 *
 * Top navigation bar with logo, links, and user avatar.
 * Reads the signed-in user's photo and name from Firebase Auth automatically.
 *
 * @param {Array} links - Array of {path, label} objects
 * @param {string} logoText - Logo text
 */
function TopNav({
  links = [],
  logoText = 'Proko',
  className = ''
}) {
  const location = useLocation();
  const [avatarError, setAvatarError] = useState(false);

  const user = auth.currentUser;
  const photoURL = user?.photoURL;
  const displayName = user?.displayName || user?.email || 'User';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <nav className={`${styles.topNav} ${className}`}>
      {/* Left side: Logo + Links */}
      <div className={styles.navLeft}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 3H21V21H3V3Z"
              fill="var(--color-brand-lime)"
              stroke="var(--text-brand)"
              strokeWidth="2"
            />
            <path
              d="M8 8H16M8 12H16M8 16H12"
              stroke="var(--text-brand)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className={styles.logoText}>{logoText}</span>
        </Link>

        {/* Navigation Links */}
        <div className={styles.navLinks}>
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right side: User Avatar */}
      <div className={styles.navRight}>
        {photoURL && !avatarError ? (
          <img
            src={photoURL}
            alt={displayName}
            className={styles.userAvatar}
            referrerPolicy="no-referrer"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className={styles.userAvatarPlaceholder}>
            {initials}
          </div>
        )}
      </div>
    </nav>
  );
}

export default TopNav;
