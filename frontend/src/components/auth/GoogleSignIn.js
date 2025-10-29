import React, { useState, useEffect } from 'react';
import { signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase/config';

const GoogleSignIn = ({ onAuthStateChange }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for redirect result on component mount
  useEffect(() => {
    const checkRedirectResult = async () => {
      setLoading(true);
      try {
        const result = await getRedirectResult(auth);
        
        if (result) {
          // User just came back from Google OAuth
          const user = result.user;
          
          // Get the ID token for backend authentication
          const idToken = await user.getIdToken();
          
          // Verify token with backend
          const response = await fetch('http://localhost:8000/auth/verify-token', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          
          if (data.valid) {
            setUser(user);
            if (onAuthStateChange) {
              onAuthStateChange(user, idToken);
            }
            console.log('Sign-in successful:', data.user);
          } else {
            throw new Error(data.message || 'Token verification failed');
          }
        }
      } catch (error) {
        console.error('Redirect result error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    checkRedirectResult();
  }, [onAuthStateChange]);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // This will redirect the entire page to Google
      await signInWithRedirect(auth, googleProvider);
      // Code after this won't execute - page will redirect away
    } catch (error) {
      console.error('Sign-in error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    
    try {
      await signOut(auth);
      setUser(null);
      if (onAuthStateChange) {
        onAuthStateChange(null, null);
      }
      console.log('Sign-out successful');
    } catch (error) {
      console.error('Sign-out error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="google-signin">
      {!user ? (
        <div>
          <button 
            onClick={handleSignIn}
            disabled={loading}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              backgroundColor: '#4285f4',
              color: 'white',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              'Signing in...'
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#ffffff" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#ffffff" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.53H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                  <path fill="#ffffff" d="M4.5 10.49a4.8 4.8 0 0 1 0-3.07V5.35H1.83a8 8 0 0 0 0 7.28l2.67-2.14z"/>
                  <path fill="#ffffff" d="M8.98 4.72c1.16 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.35L4.5 7.42a4.77 4.77 0 0 1 4.48-2.7z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>
          
          {error && (
            <div className="alert alert-danger mt-2" role="alert">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="user-info mb-3">
            <img 
              src={user.photoURL} 
              alt="Profile" 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                marginRight: '10px'
              }}
            />
            <span>Welcome, {user.displayName}!</span>
          </div>
          
          <button 
            onClick={handleSignOut}
            disabled={loading}
            className="btn btn-outline-secondary"
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleSignIn;
