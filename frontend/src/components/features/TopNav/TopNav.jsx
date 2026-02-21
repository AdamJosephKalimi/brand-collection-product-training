import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../../firebase/config';
import AnimatedProkoIcon from '../AnimatedProkoIcon/AnimatedProkoIcon';
import styles from './TopNav.module.css';

/**
 * TopNav Component
 *
 * Top navigation bar with logo, links, and user avatar.
 * Reads the signed-in user's photo and name from Firebase Auth automatically.
 * Clicking the avatar opens a dropdown with account info and sign out.
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoSpinning, setLogoSpinning] = useState(false);
  const menuRef = useRef(null);

  const user = auth.currentUser;
  const photoURL = user?.photoURL;
  const displayName = user?.displayName || 'User';
  const email = user?.email || '';
  const initials = (displayName || email || 'U').charAt(0).toUpperCase();

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  return (
    <nav className={`${styles.topNav} ${className}`}>
      {/* Left side: Logo + Links */}
      <div className={styles.navLeft}>
        {/* Logo */}
        <Link
          to="/"
          className={styles.logo}
          onMouseEnter={() => { if (!logoSpinning) setLogoSpinning(true); }}
        >
          <AnimatedProkoIcon
            className={styles.logoIcon}
            spinning={logoSpinning}
            onSpinComplete={() => setLogoSpinning(false)}
          />
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

      {/* Right side: User Avatar + Dropdown */}
      <div className={styles.navRight} ref={menuRef}>
        <button
          className={styles.avatarButton}
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="User menu"
        >
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
        </button>

        {menuOpen && (
          <div className={styles.userMenu}>
            <div className={styles.userMenuInfo}>
              <span className={styles.userMenuName}>{displayName}</span>
              {email && <span className={styles.userMenuEmail}>{email}</span>}
            </div>
            <div className={styles.userMenuDivider} />
            <button className={styles.userMenuItem} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default TopNav;
