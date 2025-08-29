import React from 'react';

const BrandInputs = ({ brandData, onBrandChange }) => {
  const handleInputChange = (field, value) => {
    onBrandChange({ ...brandData, [field]: value });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleInputChange('logo', {
          file: file,
          preview: event.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">Brand Information</h5>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="brandName" className="form-label">
                Brand Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="brandName"
                value={brandData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter brand name"
                required
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="season" className="form-label">Season</label>
              <input
                type="text"
                className="form-control"
                id="season"
                value={brandData.season || ''}
                onChange={(e) => handleInputChange('season', e.target.value)}
                placeholder="e.g., FW2025, SS2024"
              />
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="logo" className="form-label">Brand Logo (Optional)</label>
              <input
                type="file"
                className="form-control"
                id="logo"
                accept="image/*"
                onChange={handleLogoChange}
              />
              <div className="form-text">Upload PNG, JPG, or SVG format</div>
            </div>
          </div>
          <div className="col-md-6">
            {brandData.logo && (
              <div className="mt-2">
                <label className="form-label">Logo Preview</label>
                <div>
                  <img
                    src={brandData.logo.preview}
                    alt="Logo preview"
                    className="img-thumbnail"
                    style={{ maxHeight: '80px', maxWidth: '200px' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandInputs;
