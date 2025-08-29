import React from 'react';

const PreviewPanel = ({ 
  deckData, 
  isVisible, 
  onExport 
}) => {
  if (!isVisible || !deckData) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Preview & Export</h5>
        </div>
        <div className="card-body text-center text-muted">
          <i className="bi bi-file-earmark-slides display-4 mb-3"></i>
          <p>Generate a deck to see preview and export options</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Preview & Export</h5>
        <div className="btn-group" role="group">
          <button
            type="button"
            className="btn btn-success"
            onClick={() => onExport('pdf')}
          >
            <i className="bi bi-file-earmark-pdf me-1"></i>
            Export PDF
          </button>
          <button
            type="button"
            className="btn btn-outline-success"
            onClick={() => onExport('pptx')}
          >
            <i className="bi bi-file-earmark-ppt me-1"></i>
            Export PPTX
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="row mb-3">
          <div className="col-md-6">
            <small className="text-muted">
              <strong>Deck Info:</strong><br />
              Brand: {deckData.meta?.brand}<br />
              Season: {deckData.meta?.season}<br />
              Slides: {deckData.meta?.slides}
            </small>
          </div>
          <div className="col-md-6">
            <small className="text-muted">
              <strong>Status:</strong> <span className="text-success">Ready</span><br />
              <strong>Generated:</strong> {new Date().toLocaleString()}
            </small>
          </div>
        </div>
        
        <div className="preview-container">
          {deckData.previewUrl ? (
            <div className="ratio ratio-16x9">
              <iframe
                src={deckData.previewUrl}
                className="border rounded"
                title="Deck Preview"
              ></iframe>
            </div>
          ) : (
            <div className="bg-light border rounded d-flex align-items-center justify-content-center" style={{ height: '300px' }}>
              <div className="text-center text-muted">
                <i className="bi bi-file-earmark-slides display-4 mb-2"></i>
                <p>Preview will appear here</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => window.open(deckData.previewUrl, '_blank')}
            disabled={!deckData.previewUrl}
          >
            <i className="bi bi-arrows-fullscreen me-1"></i>
            Open Full Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
