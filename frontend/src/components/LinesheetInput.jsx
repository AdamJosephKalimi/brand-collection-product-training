import React, { useState } from 'react';
import { linesheetAPI } from '../api/client';

const LinesheetInput = ({ linesheetData, onLinesheetChange, validationResult, onValidationChange }) => {
  const [isValidating, setIsValidating] = useState(false);

  const handleTextareaChange = async (value) => {
    onLinesheetChange({ ...linesheetData, jsonText: value });
    
    // Clear previous validation
    onValidationChange(null);
    
    // Validate if there's content
    if (value.trim()) {
      await validateJSON(value);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target.result;
        onLinesheetChange({ 
          ...linesheetData, 
          jsonText: content,
          fileName: file.name 
        });
        await validateJSON(content);
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid JSON file');
    }
  };

  const validateJSON = async (jsonText) => {
    setIsValidating(true);
    try {
      const data = JSON.parse(jsonText);
      const result = await linesheetAPI.validate(data);
      onValidationChange(result);
    } catch (error) {
      if (error.name === 'SyntaxError') {
        onValidationChange({
          valid: false,
          errors: [`Invalid JSON syntax: ${error.message}`],
          normalized: null,
          item_count: null
        });
      } else {
        onValidationChange({
          valid: false,
          errors: [`Validation error: ${error.message}`],
          normalized: null,
          item_count: null
        });
      }
    } finally {
      setIsValidating(false);
    }
  };

  const loadSampleData = async () => {
    const sampleData = {
      "brand": "Acme Denim",
      "season": "FW2025",
      "currency": "USD",
      "items": [
        {
          "id": "AC-001",
          "name": "Selvedge Slim Jean",
          "sku": "SLV-SLIM-RAW",
          "category": "Bottoms",
          "subcategory": "Jeans",
          "gender": "Unisex",
          "description": "13oz raw selvedge denim, mid-rise, tapered leg.",
          "materials": ["100% Cotton (Selvedge)"],
          "care": ["Cold wash inside-out", "Line dry"],
          "process": ["Selvedge loom", "Indigo rope-dye"],
          "price": 198,
          "images": [
            {"url": "https://example.com/img/AC-001-front.jpg", "alt": "Front view"},
            {"url": "https://example.com/img/AC-001-detail.jpg", "alt": "Detail view"}
          ],
          "variants": [
            {"color": "Raw Indigo", "sizes": ["28", "30", "32", "34"]}
          ],
          "tags": ["selvedge", "raw", "indigo"]
        }
      ]
    };
    
    const jsonText = JSON.stringify(sampleData, null, 2);
    onLinesheetChange({ ...linesheetData, jsonText });
    await validateJSON(jsonText);
  };

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Line Sheet Data</h5>
        <button 
          type="button" 
          className="btn btn-outline-secondary btn-sm"
          onClick={loadSampleData}
        >
          Load Sample
        </button>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <label htmlFor="jsonFile" className="form-label">Upload JSON File</label>
          <input
            type="file"
            className="form-control"
            id="jsonFile"
            accept=".json"
            onChange={handleFileUpload}
          />
          <div className="form-text">Select a JSON file containing your line sheet data</div>
        </div>
        
        <div className="mb-3">
          <label htmlFor="jsonTextarea" className="form-label">
            Or Paste JSON Data
            {linesheetData.fileName && (
              <span className="text-muted ms-2">({linesheetData.fileName})</span>
            )}
          </label>
          <textarea
            className={`form-control ${validationResult ? (validationResult.valid ? 'is-valid' : 'is-invalid') : ''}`}
            id="jsonTextarea"
            rows="12"
            value={linesheetData.jsonText || ''}
            onChange={(e) => handleTextareaChange(e.target.value)}
            placeholder="Paste your line sheet JSON here..."
          />
          
          {isValidating && (
            <div className="mt-2">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Validating...</span>
              </div>
              <span className="text-muted">Validating...</span>
            </div>
          )}
          
          {validationResult && (
            <div className={`mt-2 ${validationResult.valid ? 'text-success' : 'text-danger'}`}>
              {validationResult.valid ? (
                <div>
                  <i className="bi bi-check-circle me-1"></i>
                  Valid JSON! Found {validationResult.item_count} items.
                </div>
              ) : (
                <div>
                  <i className="bi bi-exclamation-circle me-1"></i>
                  <strong>Validation Errors:</strong>
                  <ul className="mt-1 mb-0">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinesheetInput;
