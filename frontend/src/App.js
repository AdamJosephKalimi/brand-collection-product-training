import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import GoogleSignIn from './components/auth/GoogleSignIn';
import Dashboard from './pages/Dashboard/Dashboard';
import DocumentProcessing from './pages/DocumentProcessing/DocumentProcessing';
import DeckSettingsPage from './pages/DeckSettings/DeckSettingsPage';
import CollectionSettingsPage from './pages/CollectionSettings/CollectionSettingsPage';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Navigation component to show tabs
function Navigation() {
  const location = useLocation();
  
  return (
    <ul className="nav nav-tabs mb-4">
      <li className="nav-item">
        <Link 
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          to="/"
        >
          Dashboard
        </Link>
      </li>
      <li className="nav-item">
        <Link 
          className={`nav-link ${location.pathname === '/processing' ? 'active' : ''}`}
          to="/processing"
        >
          Document Processing
        </Link>
      </li>
    </ul>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setUser(user);
        setIdToken(token);
      } else {
        setUser(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthStateChange = (user, token) => {
    setUser(user);
    setIdToken(token);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="App">
        {!user ? (
          <div className="container mt-5">
            <div className="row justify-content-center">
              <div className="col-md-8">
                <div className="card">
                  <div className="card-header">
                    <h1 className="text-center mb-0">Product Training AI v1.0</h1>
                  </div>
                  <div className="card-body">
                    <div className="text-center">
                      <h3 className="mb-4">Welcome to Product Training AI</h3>
                      <p className="mb-4">
                        Create AI-powered product training presentations for your fashion brand.
                      </p>
                      <GoogleSignIn onAuthStateChange={handleAuthStateChange} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Routes>
            {/* Routes with card layout (Dashboard, Processing) */}
            <Route path="/" element={
              <div className="container mt-5">
                <div className="row justify-content-center">
                  <div className="col-md-8">
                    <div className="card">
                      <div className="card-header">
                        <h1 className="text-center mb-0">Product Training AI v1.0</h1>
                      </div>
                      <div className="card-body">
                        <div className="text-center mb-4">
                          <GoogleSignIn onAuthStateChange={handleAuthStateChange} />
                        </div>
                        <Navigation />
                        <Dashboard user={user} idToken={idToken} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            } />
            
            <Route path="/processing" element={
              <div className="container mt-5">
                <div className="row justify-content-center">
                  <div className="col-md-8">
                    <div className="card">
                      <div className="card-header">
                        <h1 className="text-center mb-0">Product Training AI v1.0</h1>
                      </div>
                      <div className="card-body">
                        <div className="text-center mb-4">
                          <GoogleSignIn onAuthStateChange={handleAuthStateChange} />
                        </div>
                        <Navigation />
                        <DocumentProcessing />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            } />
            
            {/* Full-page routes (no card layout) */}
            <Route path="/deck-settings/:collectionId" element={<DeckSettingsPage />} />
            <Route path="/collection-settings/:collectionId" element={<CollectionSettingsPage />} />
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
