import React from 'react';

const GenerationControls = ({ 
  onGenerate, 
  isGenerating, 
  canGenerate, 
  generationProgress,
  generationError 
}) => {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">Generate Training Deck</h5>
      </div>
      <div className="card-body">
        {generationError && (
          <div className="alert alert-danger mb-3" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Generation Error:</strong> {generationError}
          </div>
        )}
        
        <div className="d-grid gap-2">
          <button
            type="button"
            className={`btn btn-primary btn-lg ${isGenerating ? 'disabled' : ''}`}
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Generating...</span>
                </span>
                Generating Deck...
              </>
            ) : (
              <>
                <i className="bi bi-play-circle me-2"></i>
                Generate Training Deck
              </>
            )}
          </button>
        </div>
        
        {isGenerating && generationProgress && (
          <div className="mt-3">
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted small">{generationProgress.status}</span>
              <span className="text-muted small">{generationProgress.progress}%</span>
            </div>
            <div className="progress">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                style={{ width: `${generationProgress.progress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {!canGenerate && (
          <div className="mt-2">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Please provide a valid brand name and line sheet data to generate a deck.
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerationControls;
