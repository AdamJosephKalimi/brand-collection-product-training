import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './TopNav.module.css';

/**
 * TopNav Component
 * 
 * Top navigation bar with logo, links, and user avatar
 * 
 * @param {Array} links - Array of {path, label} objects
 * @param {string} logoText - Logo text
 * @param {string} userAvatarUrl - URL for user avatar image
 * @param {string} userName - User name for alt text
 */
function TopNav({ 
  links = [],
  logoText = 'Proko',
  userAvatarUrl,
  userName = 'User',
  className = ''
}) {
  const location = useLocation();

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
        {userAvatarUrl ? (
          <img 
            src={userAvatarUrl} 
            alt={userName}
            className={styles.userAvatar}
          />
        ) : (
          <div className={styles.userAvatarPlaceholder}>
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </nav>
  );
}

export default TopNav;
