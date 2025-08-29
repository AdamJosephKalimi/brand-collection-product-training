import React from 'react';

const SectionSelector = ({ selectedSections, onSectionChange }) => {
  const sections = [
    {
      id: 'brand_overview',
      label: 'Brand Intro, History & Personality',
      description: 'Overview of brand story and personality'
    },
    {
      id: 'themes',
      label: 'Key Themes & Seasonal Highlights',
      description: 'Seasonal themes, materials, and highlights'
    },
    {
      id: 'faqs',
      label: 'FAQs',
      description: 'Care instructions, fabrics, washing tips'
    },
    {
      id: 'product_overview',
      label: 'Selected Items Overview',
      description: 'Product cards from line sheet (3 per slide)'
    },
    {
      id: 'explainers',
      label: 'Product Details',
      description: 'Materials, care methods, production processes'
    }
  ];

  const handleSectionToggle = (sectionId) => {
    const newSections = selectedSections.includes(sectionId)
      ? selectedSections.filter(id => id !== sectionId)
      : [...selectedSections, sectionId];
    onSectionChange(newSections);
  };

  const selectAll = () => {
    onSectionChange(sections.map(s => s.id));
  };

  const selectNone = () => {
    onSectionChange([]);
  };

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Training Sections</h5>
        <div>
          <button 
            type="button" 
            className="btn btn-outline-secondary btn-sm me-2"
            onClick={selectAll}
          >
            Select All
          </button>
          <button 
            type="button" 
            className="btn btn-outline-secondary btn-sm"
            onClick={selectNone}
          >
            Clear All
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="row">
          {sections.map((section) => (
            <div key={section.id} className="col-md-6 mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={section.id}
                  checked={selectedSections.includes(section.id)}
                  onChange={() => handleSectionToggle(section.id)}
                />
                <label className="form-check-label" htmlFor={section.id}>
                  <strong>{section.label}</strong>
                  <br />
                  <small className="text-muted">{section.description}</small>
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <small className="text-muted">
            Selected: {selectedSections.length} of {sections.length} sections
          </small>
        </div>
      </div>
    </div>
  );
};

export default SectionSelector;
