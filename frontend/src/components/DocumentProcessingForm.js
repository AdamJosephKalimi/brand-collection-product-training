import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function DocumentProcessingForm() {
  const [formData, setFormData] = useState({
    // Brand Section
    brandName: '',
    brandLogo: null,
    
    // Collection Section
    collectionName: '',
    collectionType: '',
    collectionYear: '',
    
    // Documents
    lineSheets: [],
    purchaseOrder: null,
    
    // Presentation Settings
    productsPerSlide: 2,
    
    // Intro Slides
    introSlides: {
      coverPage: true,
      brandHistory: false,
      brandValues: true,
      flagshipStores: true,
      brandIntroduction: true,
      brandPersonality: true,
      coreCollections: true,
      productCategories: true
    },
    
    // Categories
    categories: [{ name: '', subcategories: [''] }],
    
    // Item Details
    itemDetails: {
      productName: true,
      sku: true,
      description: true,
      color: true,
      material: true,
      sizes: true,
      origin: true,
      wholesalePrice: true,
      rrp: true
    }
  });

  const collectionTypes = [
    'Spring/Summer',
    'Fall/Winter',
    'Resort',
    'Pre-Fall',
    'Cruise',
    'Year-Round'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + 5 - i);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIntroSlideChange = (slide) => {
    setFormData(prev => ({
      ...prev,
      introSlides: {
        ...prev.introSlides,
        [slide]: !prev.introSlides[slide]
      }
    }));
  };

  const handleItemDetailChange = (detail) => {
    setFormData(prev => ({
      ...prev,
      itemDetails: {
        ...prev.itemDetails,
        [detail]: !prev.itemDetails[detail]
      }
    }));
  };

  const handleFileChange = (field, files) => {
    if (field === 'lineSheets') {
      setFormData(prev => ({ ...prev, [field]: Array.from(files) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: files[0] }));
    }
  };

  const addCategory = () => {
    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, { name: '', subcategories: [''] }]
    }));
  };

  const updateCategory = (index, name) => {
    const newCategories = [...formData.categories];
    newCategories[index].name = name;
    setFormData(prev => ({ ...prev, categories: newCategories }));
  };

  const addSubcategory = (categoryIndex) => {
    const newCategories = [...formData.categories];
    newCategories[categoryIndex].subcategories.push('');
    setFormData(prev => ({ ...prev, categories: newCategories }));
  };

  const updateSubcategory = (categoryIndex, subcategoryIndex, value) => {
    const newCategories = [...formData.categories];
    newCategories[categoryIndex].subcategories[subcategoryIndex] = value;
    setFormData(prev => ({ ...prev, categories: newCategories }));
  };

  const removeCategory = (index) => {
    const newCategories = formData.categories.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, categories: newCategories }));
  };

  const removeSubcategory = (categoryIndex, subcategoryIndex) => {
    const newCategories = [...formData.categories];
    newCategories[categoryIndex].subcategories = newCategories[categoryIndex].subcategories.filter((_, i) => i !== subcategoryIndex);
    setFormData(prev => ({ ...prev, categories: newCategories }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form Data:', formData);
    // TODO: Implement API submission
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Document Processing</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Brand Section */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Brand Information</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Brand Name *</label>
              <input
                type="text"
                className="form-control"
                value={formData.brandName}
                onChange={(e) => handleInputChange('brandName', e.target.value)}
                required
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label">Brand Logo</label>
              <input
                type="file"
                className="form-control"
                accept="image/*"
                onChange={(e) => handleFileChange('brandLogo', e.target.files)}
              />
              <small className="text-muted">PNG, JPG, SVG (Max 5MB)</small>
            </div>
          </div>
        </div>

        {/* Collection Section */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Collection Information</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Collection Name *</label>
              <input
                type="text"
                className="form-control"
                value={formData.collectionName}
                onChange={(e) => handleInputChange('collectionName', e.target.value)}
                required
              />
            </div>
            
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Collection Type *</label>
                <select
                  className="form-select"
                  value={formData.collectionType}
                  onChange={(e) => handleInputChange('collectionType', e.target.value)}
                  required
                >
                  <option value="">Select type...</option>
                  {collectionTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-6 mb-3">
                <label className="form-label">Year *</label>
                <select
                  className="form-select"
                  value={formData.collectionYear}
                  onChange={(e) => handleInputChange('collectionYear', e.target.value)}
                  required
                >
                  <option value="">Select year...</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Documents</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Line Sheets *</label>
              <input
                type="file"
                className="form-control"
                multiple
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={(e) => handleFileChange('lineSheets', e.target.files)}
                required
              />
              <small className="text-muted">PDF, Excel, CSV (Multiple files allowed)</small>
              {formData.lineSheets.length > 0 && (
                <div className="mt-2">
                  <small className="text-success">{formData.lineSheets.length} file(s) selected</small>
                </div>
              )}
            </div>
            
            <div className="mb-3">
              <label className="form-label">Purchase Order</label>
              <input
                type="file"
                className="form-control"
                accept=".pdf,.xlsx,.xls"
                onChange={(e) => handleFileChange('purchaseOrder', e.target.files)}
              />
              <small className="text-muted">PDF or Excel</small>
            </div>
          </div>
        </div>

        {/* Presentation Settings Section */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Presentation Settings</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Products Per Slide *</label>
              <select
                className="form-select"
                value={formData.productsPerSlide}
                onChange={(e) => handleInputChange('productsPerSlide', parseInt(e.target.value))}
                required
              >
                <option value={1}>1 Product per Slide</option>
                <option value={2}>2 Products per Slide</option>
                <option value={4}>4 Products per Slide</option>
              </select>
              <small className="text-muted">Choose how many products to display on each slide</small>
            </div>
          </div>
        </div>

        {/* Intro Slides Section */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Intro Slides</h5>
          </div>
          <div className="card-body">
            <p className="text-muted mb-3">These are the slides that appear at the beginning of the deck. Select which ones to generate and include.</p>
            
            <div className="row">
              <div className="col-md-6">
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.introSlides.coverPage}
                    onChange={() => handleIntroSlideChange('coverPage')}
                    id="coverPage"
                  />
                  <label className="form-check-label" htmlFor="coverPage">
                    Cover Page
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.introSlides.brandHistory}
                    onChange={() => handleIntroSlideChange('brandHistory')}
                    id="brandHistory"
                  />
                  <label className="form-check-label" htmlFor="brandHistory">
                    Brand History
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.introSlides.brandValues}
                    onChange={() => handleIntroSlideChange('brandValues')}
                    id="brandValues"
                  />
                  <label className="form-check-label" htmlFor="brandValues">
                    Brand Values
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.introSlides.flagshipStores}
                    onChange={() => handleIntroSlideChange('flagshipStores')}
                    id="flagshipStores"
                  />
                  <label className="form-check-label" htmlFor="flagshipStores">
                    Flagship Stores & Experiences
                  </label>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.introSlides.brandIntroduction}
                    onChange={() => handleIntroSlideChange('brandIntroduction')}
                    id="brandIntroduction"
                  />
                  <label className="form-check-label" htmlFor="brandIntroduction">
                    Brand Introduction
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.introSlides.brandPersonality}
                    onChange={() => handleIntroSlideChange('brandPersonality')}
                    id="brandPersonality"
                  />
                  <label className="form-check-label" htmlFor="brandPersonality">
                    Brand Personality
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.introSlides.coreCollections}
                    onChange={() => handleIntroSlideChange('coreCollections')}
                    id="coreCollections"
                  />
                  <label className="form-check-label" htmlFor="coreCollections">
                    Core Collections & Signature Categories
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.introSlides.productCategories}
                    onChange={() => handleIntroSlideChange('productCategories')}
                    id="productCategories"
                  />
                  <label className="form-check-label" htmlFor="productCategories">
                    Product Categories
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Collection Categories</h5>
            <button type="button" className="btn btn-sm btn-light" onClick={addCategory}>
              + Add Category
            </button>
          </div>
          <div className="card-body">
            {formData.categories.map((category, catIndex) => (
              <div key={catIndex} className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="flex-grow-1 me-2">
                    <label className="form-label">Category Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={category.name}
                      onChange={(e) => updateCategory(catIndex, e.target.value)}
                      placeholder="e.g., Dresses, Tops, Bottoms"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger mt-4"
                    onClick={() => removeCategory(catIndex)}
                  >
                    Remove
                  </button>
                </div>
                
                <div className="ms-3">
                  <label className="form-label">Subcategories</label>
                  {category.subcategories.map((subcategory, subIndex) => (
                    <div key={subIndex} className="d-flex mb-2">
                      <input
                        type="text"
                        className="form-control form-control-sm me-2"
                        value={subcategory}
                        onChange={(e) => updateSubcategory(catIndex, subIndex, e.target.value)}
                        placeholder="e.g., Maxi Dresses, Mini Dresses"
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeSubcategory(catIndex, subIndex)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => addSubcategory(catIndex)}
                  >
                    + Add Subcategory
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Item Details Section */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Collection Item Details</h5>
          </div>
          <div className="card-body">
            <p className="text-muted mb-3">Select which of the collection item details to have showing in the deck.</p>
            
            <div className="row">
              <div className="col-md-6">
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.itemDetails.productName}
                    onChange={() => handleItemDetailChange('productName')}
                    id="productName"
                  />
                  <label className="form-check-label" htmlFor="productName">
                    Product Name
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.itemDetails.sku}
                    onChange={() => handleItemDetailChange('sku')}
                    id="sku"
                  />
                  <label className="form-check-label" htmlFor="sku">
                    SKU
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.itemDetails.description}
                    onChange={() => handleItemDetailChange('description')}
                    id="description"
                  />
                  <label className="form-check-label" htmlFor="description">
                    Description
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.itemDetails.color}
                    onChange={() => handleItemDetailChange('color')}
                    id="color"
                  />
                  <label className="form-check-label" htmlFor="color">
                    Color
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.itemDetails.material}
                    onChange={() => handleItemDetailChange('material')}
                    id="material"
                  />
                  <label className="form-check-label" htmlFor="material">
                    Material
                  </label>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.itemDetails.sizes}
                    onChange={() => handleItemDetailChange('sizes')}
                    id="sizes"
                  />
                  <label className="form-check-label" htmlFor="sizes">
                    Sizes
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.itemDetails.origin}
                    onChange={() => handleItemDetailChange('origin')}
                    id="origin"
                  />
                  <label className="form-check-label" htmlFor="origin">
                    Origin
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.itemDetails.wholesalePrice}
                    onChange={() => handleItemDetailChange('wholesalePrice')}
                    id="wholesalePrice"
                  />
                  <label className="form-check-label" htmlFor="wholesalePrice">
                    Wholesale Price
                  </label>
                </div>
                
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.itemDetails.rrp}
                    onChange={() => handleItemDetailChange('rrp')}
                    id="rrp"
                  />
                  <label className="form-check-label" htmlFor="rrp">
                    RRP
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="d-grid gap-2 mb-4">
          <button type="submit" className="btn btn-primary btn-lg">
            Process Documents
          </button>
        </div>
      </form>
    </div>
  );
}

export default DocumentProcessingForm;
