import React from 'react';

function Dashboard({ user, idToken }) {
  return (
    <div>
      <h3 className="text-center mb-4">Dashboard</h3>
      
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
        </small>
        
        {idToken && (
          <div className="mt-3">
            <h6>Authentication Token for API Testing:</h6>
            <div className="card bg-light">
              <div className="card-body p-2">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1 me-2">
                    <small className="font-monospace text-break" style={{fontSize: '0.75rem'}}>
                      {idToken}
                    </small>
                  </div>
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(idToken);
                      // Show temporary feedback
                      const btn = document.activeElement;
                      const originalText = btn.textContent;
                      btn.textContent = 'Copied!';
                      btn.classList.remove('btn-outline-primary');
                      btn.classList.add('btn-success');
                      setTimeout(() => {
                        btn.textContent = originalText;
                        btn.classList.remove('btn-success');
                        btn.classList.add('btn-outline-primary');
                      }, 2000);
                    }}
                    title="Copy token to clipboard"
                  >
                    Copy
                  </button>
                </div>
                <small className="text-muted d-block mt-2">
                  Use this token in SwaggerUI: Click "Authorize" → Enter "Bearer [your-token]" in the Authorization field
                </small>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
