import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import GoogleSignIn from './components/auth/GoogleSignIn';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

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
    <div className="App">
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h1 className="text-center mb-0">Product Training AI v1.0</h1>
              </div>
              <div className="card-body">
                {!user ? (
                  <div className="text-center">
                    <h3 className="mb-4">Welcome to Product Training AI</h3>
                    <p className="mb-4">
                      Create AI-powered product training presentations for your fashion brand.
                    </p>
                    <GoogleSignIn onAuthStateChange={handleAuthStateChange} />
                  </div>
                ) : (
                  <div>
                    <div className="text-center mb-4">
                      <h3>Dashboard</h3>
                      <GoogleSignIn onAuthStateChange={handleAuthStateChange} />
                    </div>
                    
                    <div className="row">
                      <div className="col-md-4">
                        <div className="card">
                          <div className="card-body text-center">
                            <h5 className="card-title">Brands</h5>
                            <p className="card-text">Manage your fashion brands</p>
                            <button className="btn btn-primary" disabled>
                              Coming Soon
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="card">
                          <div className="card-body text-center">
                            <h5 className="card-title">Collections</h5>
                            <p className="card-text">Upload and manage product collections</p>
                            <button className="btn btn-primary" disabled>
                              Coming Soon
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="card">
                          <div className="card-body text-center">
                            <h5 className="card-title">Presentations</h5>
                            <p className="card-text">Generate AI-powered training decks</p>
                            <button className="btn btn-primary" disabled>
                              Coming Soon
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h5>Debug Info:</h5>
                      <small className="text-muted">
                        User ID: {user.uid}<br/>
                        Email: {user.email}<br/>
                        Token: {idToken ? 'Available' : 'Not available'}
                      </small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
