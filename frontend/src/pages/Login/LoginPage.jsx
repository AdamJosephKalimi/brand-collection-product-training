import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase/config';
import { API_HOST } from '../../config/api';
import heroImage from '../../assets/login-hero.png';
import { ReactComponent as ProkoLogo } from '../../assets/proko-logo.svg';
import styles from './LoginPage.module.css';

function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAgreedToTerms(false);
    setError('');
    setResetSent(false);
  };

  const switchMode = (newMode) => {
    clearForm();
    setMode(newMode);
  };

  const verifyToken = async (user) => {
    const idToken = await user.getIdToken();
    const response = await fetch(`${API_HOST}/auth/verify-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (!data.valid) {
      throw new Error(data.message || 'Token verification failed');
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await verifyToken(result.user);
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : err.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please try again later.'
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service.');
      return;
    }

    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: fullName });
      await verifyToken(result.user);
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists.'
        : err.code === 'auth/weak-password'
        ? 'Password is too weak. Use at least 8 characters.'
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await verifyToken(result.user);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    if (!email) {
      setError('Enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      const msg = err.code === 'auth/user-not-found'
        ? 'No account found with this email.'
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ visible }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {visible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 01-7.18-2.53H1.83v2.07A8 8 0 008.98 17z" />
      <path fill="#FBBC05" d="M4.5 10.49a4.8 4.8 0 010-3.07V5.35H1.83a8 8 0 000 7.28l2.67-2.14z" />
      <path fill="#EA4335" d="M8.98 4.72c1.16 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.35L4.5 7.42a4.77 4.77 0 014.48-2.7z" />
    </svg>
  );

  return (
    <div className={styles.container}>
      {/* Left hero panel */}
      <div className={styles.heroPanel}>
        <img src={heroImage} alt="" className={styles.heroImage} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <ProkoLogo className={styles.heroLogo} />
          <h2 className={styles.heroHeadline}>
            Generate Professional Training Decks with AI
          </h2>
          <div className={styles.heroTagline}>
            Upload your brand assets, customize your content, and create stunning retail training materials in minutes.
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.formPanel}>
        <div className={styles.formWrapper}>
          {mode === 'signin' ? (
            <>
              <h1 className={styles.formTitle}>Welcome back</h1>
              <p className={styles.formSubtitle}>
                Sign in to your Proko account
              </p>

              {error && <div className={styles.error}>{error}</div>}
              {resetSent && (
                <div className={styles.success}>
                  Password reset email sent. Check your inbox.
                </div>
              )}

              <form onSubmit={handleEmailSignIn}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={styles.input}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className={styles.eyeToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon visible={showPassword} />
                    </button>
                  </div>
                  <div className={styles.forgotRow}>
                    <button
                      type="button"
                      className={styles.forgotLink}
                      onClick={handleForgotPassword}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <div className={styles.divider}>
                <div className={styles.dividerLine} />
                <span className={styles.dividerText}>or</span>
                <div className={styles.dividerLine} />
              </div>

              <button
                className={styles.googleButton}
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <GoogleIcon />
                Sign in with Google
              </button>

              <div className={styles.toggleRow}>
                Don't have an account?{' '}
                <button
                  className={styles.toggleLink}
                  onClick={() => switchMode('signup')}
                >
                  Create one
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className={styles.formTitle}>Create account</h1>
              <p className={styles.formSubtitle}>
                Get started with Proko
              </p>

              {error && <div className={styles.error}>{error}</div>}

              <form onSubmit={handleEmailSignUp}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Full name</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={styles.input}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.eyeToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon visible={showPassword} />
                    </button>
                  </div>
                  <div className={styles.passwordHint}>Must be at least 8 characters</div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Confirm password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={styles.input}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.eyeToggle}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon visible={showConfirmPassword} />
                    </button>
                  </div>
                </div>

                <div className={styles.termsRow}>
                  <input
                    type="checkbox"
                    className={styles.termsCheckbox}
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    id="terms"
                  />
                  <label htmlFor="terms" className={styles.termsText}>
                    I agree to the{' '}
                    <span className={styles.termsLink}>Terms of Service</span>{' '}
                    and{' '}
                    <span className={styles.termsLink}>Privacy Policy</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </form>

              <div className={styles.divider}>
                <div className={styles.dividerLine} />
                <span className={styles.dividerText}>or</span>
                <div className={styles.dividerLine} />
              </div>

              <button
                className={styles.googleButton}
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <GoogleIcon />
                Sign up with Google
              </button>

              <div className={styles.toggleRow}>
                Already have an account?{' '}
                <button
                  className={styles.toggleLink}
                  onClick={() => switchMode('signin')}
                >
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
