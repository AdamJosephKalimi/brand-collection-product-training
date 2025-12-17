import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { auth } from '../firebase/config';
import { getAuthToken } from '../utils/auth';

function DocumentProcessingForm() {
  const [saving, setSaving] = useState({
    brand: false,
    collection: false,
    documents: false,
    settings: false,
    introSlides: false,
    categories: false,
    itemDetails: false
  });
  
  const [generating, setGenerating] = useState(false);
  const [generatingItems, setGeneratingItems] = useState(false);
  const [generatingSlides, setGeneratingSlides] = useState(false);
  const [collectionItems, setCollectionItems] = useState([]);
  const [introSlides, setIntroSlides] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [savedIds, setSavedIds] = useState({
    brandId: null,
    collectionId: null,
    documentIds: []
  });
  
  const [existingBrands, setExistingBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [brandCollections, setBrandCollections] = useState([]);
  const [loading, setLoading] = useState({
    brands: false,
    collections: false
  });
  
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
      coreCollections: true
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
    { label: 'Spring/Summer', value: 'spring_summer' },
    { label: 'Fall/Winter', value: 'fall_winter' },
    { label: 'Resort', value: 'resort' },
    { label: 'Pre-Fall', value: 'pre_fall' },
    { label: 'Year-Round', value: 'year_round' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + 5 - i);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIntroSlideChange = async (slide) => {
    const newValue = !formData.introSlides[slide];
    
    // Update local state
    setFormData(prev => ({
      ...prev,
      introSlides: {
        ...prev.introSlides,
        [slide]: newValue
      }
    }));

    // Auto-save to Firestore
    if (savedIds.collectionId) {
      try {
        const token = await auth.currentUser.getIdToken();
        
        // Map local state names to Firestore field names
        const fieldMapping = {
          coverPage: 'include_cover_page_slide',
          brandIntroduction: 'include_brand_introduction_slide',
          brandHistory: 'include_brand_history_slide',
          brandValues: 'include_brand_values_slide',
          brandPersonality: 'include_brand_personality_slide',
          flagshipStores: 'include_flagship_store_and_experiences_slide',
          coreCollections: 'include_core_collection_and_signature_categories_slide'
        };

        const firestoreField = fieldMapping[slide];
        
        const response = await fetch(`http://localhost:8000/api/collections/${savedIds.collectionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            settings: {
              [firestoreField]: newValue
            }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save intro slide setting');
        }

        console.log(`Saved ${slide}: ${newValue}`);
      } catch (error) {
        console.error('Error saving intro slide setting:', error);
        alert('Failed to save setting. Please try again.');
        // Revert local state on error
        setFormData(prev => ({
          ...prev,
          introSlides: {
            ...prev.introSlides,
            [slide]: !newValue
          }
        }));
      }
    }
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
    setHasUnsavedChanges(true);
  };

  const updateCategory = (index, field, value) => {
    const newCategories = [...formData.categories];
    newCategories[index][field] = value;
    setFormData(prev => ({ ...prev, categories: newCategories }));
    setHasUnsavedChanges(true);
  };

  const addSubcategory = (categoryIndex) => {
    const newCategories = [...formData.categories];
    newCategories[categoryIndex].subcategories.push('');
    setFormData(prev => ({ ...prev, categories: newCategories }));
    setHasUnsavedChanges(true);
  };

  const updateSubcategory = (categoryIndex, subcategoryIndex, value) => {
    const newCategories = [...formData.categories];
    newCategories[categoryIndex].subcategories[subcategoryIndex] = value;
    setFormData(prev => ({ ...prev, categories: newCategories }));
    setHasUnsavedChanges(true);
  };

  const removeCategory = (index) => {
    const newCategories = formData.categories.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, categories: newCategories }));
    setHasUnsavedChanges(true);
  };

  const removeSubcategory = (categoryIndex, subcategoryIndex) => {
    const newCategories = [...formData.categories];
    newCategories[categoryIndex].subcategories = newCategories[categoryIndex].subcategories.filter((_, i) => i !== subcategoryIndex);
    setFormData(prev => ({ ...prev, categories: newCategories }));
    setHasUnsavedChanges(true);
  };


  const saveBrand = async () => {
    setSaving(prev => ({ ...prev, brand: true }));
    try {
      const token = await getAuthToken();
      const formDataObj = new FormData();
      formDataObj.append('name', formData.brandName);
      
      // Create brand first
      const brandResponse = await fetch('http://localhost:8000/api/brands', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: formData.brandName })
      });
      
      if (!brandResponse.ok) throw new Error('Failed to create brand');
      const brandData = await brandResponse.json();
      setSavedIds(prev => ({ ...prev, brandId: brandData.brand_id }));
      
      // Upload logo if provided
      if (formData.brandLogo) {
        const logoFormData = new FormData();
        logoFormData.append('file', formData.brandLogo);
        
        const logoResponse = await fetch(`http://localhost:8000/api/brands/${brandData.brand_id}/logo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: logoFormData
        });
        
        if (!logoResponse.ok) throw new Error('Failed to upload logo');
      }
      
      alert('Brand saved successfully!');
    } catch (error) {
      console.error('Error saving brand:', error);
      alert(`Failed to save brand: ${error.message}`);
    } finally {
      setSaving(prev => ({ ...prev, brand: false }));
    }
  };

  const saveCollection = async () => {
    if (!savedIds.brandId) {
      alert('Please save the brand first');
      return;
    }
    
    setSaving(prev => ({ ...prev, collection: true }));
    try {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/brands/${savedIds.brandId}/collections`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brand_id: savedIds.brandId,
          name: formData.collectionName,
          season: formData.collectionType,
          year: parseInt(formData.collectionYear)
        })
      });
      
      if (!response.ok) throw new Error('Failed to create collection');
      const data = await response.json();
      setSavedIds(prev => ({ ...prev, collectionId: data.collection_id }));
      
      alert('Collection saved successfully!');
    } catch (error) {
      console.error('Error saving collection:', error);
      alert(`Failed to save collection: ${error.message}`);
    } finally {
      setSaving(prev => ({ ...prev, collection: false }));
    }
  };

  const fetchBrands = async () => {
    setLoading(prev => ({ ...prev, brands: true }));
    try {
      const token = await getAuthToken();
      const response = await fetch('http://localhost:8000/api/brands/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch brands');
      const data = await response.json();
      setExistingBrands(data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(prev => ({ ...prev, brands: false }));
    }
  };

  const fetchBrandCollections = async (brandId) => {
    setLoading(prev => ({ ...prev, collections: true }));
    try {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/brands/${brandId}/collections`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch collections');
      const data = await response.json();
      setBrandCollections(data);
    } catch (error) {
      console.error('Error fetching collections:', error);
      setBrandCollections([]);
    } finally {
      setLoading(prev => ({ ...prev, collections: false }));
    }
  };

  const selectExistingBrand = (brand) => {
    setSelectedBrand(brand);
    setSavedIds(prev => ({ ...prev, brandId: brand.brand_id }));
    setFormData(prev => ({ ...prev, brandName: brand.name }));
  };

  const selectExistingCollection = (collection) => {
    console.log('=== SELECTING COLLECTION ===');
    console.log('Collection ID:', collection.collection_id);
    
    // Clear previous intro slides
    setIntroSlides(null);
    
    setSavedIds(prev => ({ ...prev, collectionId: collection.collection_id }));
    
    // Load categories if they exist
    const formattedCategories = collection.categories && collection.categories.length > 0
      ? collection.categories.map(cat => ({
          name: cat.name,
          subcategories: (cat.subcategories || []).map(sub => 
            typeof sub === 'string' ? sub : sub.name
          )
        }))
      : [{ name: '', subcategories: [''] }];
    
    setFormData(prev => ({
      ...prev,
      collectionName: collection.name,
      collectionType: collection.season || '',
      collectionYear: collection.year || '',
      categories: formattedCategories
    }));
    
    setHasUnsavedChanges(false);
    
    // Note: intro slides will be loaded by the useEffect that calls loadIntroSlideSettings()
    // when savedIds.collectionId changes
  };

  const fetchDocuments = async () => {
    if (!savedIds.collectionId) return;
    
    try {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/collections/${savedIds.collectionId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setUploadedDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const deleteDocument = async (documentId, documentName) => {
    if (!window.confirm(`Are you sure you want to delete "${documentName}"?`)) {
      return;
    }
    
    try {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/collections/${savedIds.collectionId}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete document');
      
      // Refresh document list
      await fetchDocuments();
      alert('Document deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting document:', error);
      alert(`Failed to delete document: ${error.message}`);
    }
  };

  const saveDocuments = async () => {
    if (!savedIds.collectionId) {
      alert('Please save the collection first');
      return;
    }
    
    if (formData.lineSheets.length === 0) {
      alert('Please select at least one line sheet');
      return;
    }
    
    setSaving(prev => ({ ...prev, documents: true }));
    const uploadedDocIds = [];
    
    try {
      const token = await getAuthToken();
      
      // Upload line sheets
      for (const lineSheet of formData.lineSheets) {
        const formDataObj = new FormData();
        formDataObj.append('file', lineSheet);
        formDataObj.append('type', 'line_sheet');
        formDataObj.append('description', `Line sheet: ${lineSheet.name}`);
        
        const response = await fetch(`http://localhost:8000/api/collections/${savedIds.collectionId}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataObj
        });
        
        if (!response.ok) throw new Error(`Failed to upload line sheet: ${lineSheet.name}`);
        const data = await response.json();
        uploadedDocIds.push(data.document_id);
      }
      
      // Upload purchase order if provided
      if (formData.purchaseOrder) {
        const formDataObj = new FormData();
        formDataObj.append('file', formData.purchaseOrder);
        formDataObj.append('type', 'purchase_order');
        formDataObj.append('description', `Purchase order: ${formData.purchaseOrder.name}`);
        
        const response = await fetch(`http://localhost:8000/api/collections/${savedIds.collectionId}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataObj
        });
        
        if (!response.ok) throw new Error('Failed to upload purchase order');
        const data = await response.json();
        uploadedDocIds.push(data.document_id);
      }
      
      setSavedIds(prev => ({ ...prev, documentIds: uploadedDocIds }));
      
      // Refresh document list
      await fetchDocuments();
      
      // Clear file inputs
      setFormData(prev => ({ ...prev, lineSheets: [], purchaseOrder: null }));
      
      alert(`Successfully uploaded ${uploadedDocIds.length} document(s)!`);
      
    } catch (error) {
      console.error('Error saving documents:', error);
      alert(`Failed to save documents: ${error.message}`);
    } finally {
      setSaving(prev => ({ ...prev, documents: false }));
    }
  };

  const loadIntroSlideSettings = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`http://localhost:8000/api/collections/${savedIds.collectionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }

      const collection = await response.json();
      const settings = collection.settings || {};

      // Map Firestore field names to local state names
      setFormData(prev => ({
        ...prev,
        introSlides: {
          coverPage: settings.include_cover_page_slide !== false,
          brandIntroduction: settings.include_brand_introduction_slide !== false,
          brandHistory: settings.include_brand_history_slide !== false,
          brandValues: settings.include_brand_values_slide !== false,
          brandPersonality: settings.include_brand_personality_slide !== false,
          flagshipStores: settings.include_flagship_store_and_experiences_slide !== false,
          coreCollections: settings.include_core_collection_and_signature_categories_slide !== false
        }
      }));

      // Load existing intro slides if they exist
      if (collection.intro_slides) {
        setIntroSlides(collection.intro_slides);
        console.log('Loaded existing intro slides:', collection.intro_slides);
      }

      console.log('Loaded intro slide settings:', settings);
    } catch (error) {
      console.error('Error loading intro slide settings:', error);
    }
  };

  const fetchCollectionItems = async () => {
    if (!savedIds.collectionId) return;
    
    try {
      const token = await getAuthToken();
      console.log(`Fetching items for collection: ${savedIds.collectionId}`);
      
      const response = await fetch(`http://localhost:8000/api/collections/${savedIds.collectionId}/items`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`Fetch response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Failed to fetch items: ${response.status} - ${errorText}`);
        setCollectionItems([]);
        return;
      }
      
      const data = await response.json();
      console.log(`Fetched ${data?.length || 0} items:`, data);
      setCollectionItems(data || []);
    } catch (error) {
      console.error('Error fetching collection items:', error);
      setCollectionItems([]);
    }
  };

  const generateItems = async () => {
    if (!savedIds.collectionId) {
      alert('Please save the collection first');
      return;
    }
    
    setGeneratingItems(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/collections/${savedIds.collectionId}/items/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate items');
      }
      
      const data = await response.json();
      console.log('Generation response:', data);
      
      if (data.success && data.items) {
        console.log(`Setting ${data.items.length} items in state`);
        setCollectionItems(data.items);
        alert(`Successfully generated ${data.stats.items_created} items! (${data.stats.items_skipped} duplicates skipped)`);
      } else {
        throw new Error(data.error || 'Failed to generate items');
      }
      
    } catch (error) {
      console.error('Error generating items:', error);
      alert(`Failed to generate items: ${error.message}`);
    } finally {
      setGeneratingItems(false);
    }
  };

  const toggleItemHighlight = async (itemId, currentValue) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/collections/${savedIds.collectionId}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          highlighted_item: !currentValue
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update item');
      }
      
      // Update local state
      setCollectionItems(prev => 
        prev.map(item => 
          item.item_id === itemId 
            ? { ...item, highlighted_item: !currentValue }
            : item
        )
      );
      
    } catch (error) {
      console.error('Error toggling highlight:', error);
      alert(`Failed to update highlight: ${error.message}`);
    }
  };

  const generateCategories = async () => {
    if (!savedIds.collectionId) {
      alert('Please save the collection first');
      return;
    }
    
    if (savedIds.documentIds.length === 0) {
      alert('Please save documents first');
      return;
    }
    
    setGenerating(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/collections/${savedIds.collectionId}/categories/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate categories');
      }
      
      const data = await response.json();
      
      if (data.success && data.categories) {
        // Convert generated categories to form format
        const formattedCategories = data.categories.map(cat => ({
          name: cat.name,
          subcategories: (cat.subcategories || []).map(sub => 
            typeof sub === 'string' ? sub : sub.name
          )
        }));
        
        setFormData(prev => ({ ...prev, categories: formattedCategories }));
        alert(`Successfully generated ${data.categories.length} categories from ${data.product_count} products!`);
      } else {
        throw new Error(data.error || 'Failed to generate categories');
      }
      
    } catch (error) {
      console.error('Error generating categories:', error);
      alert(`Failed to generate categories: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Helper function to render slide content as readable text
  const renderSlideContent = (content, slideType) => {
    if (!content) return null;

    switch (slideType) {
      case 'cover_page':
        return (
          <div>
            <p><strong>Title:</strong> {content.title}</p>
            <p><strong>Subtitle:</strong> {content.subtitle}</p>
            <p><strong>Tagline:</strong> {content.tagline}</p>
          </div>
        );
      
      case 'brand_introduction':
        return (
          <div>
            <p className="mb-3">{content.overview}</p>
            {content.key_points && content.key_points.length > 0 && (
              <>
                <p><strong>Key Points:</strong></p>
                <ul>
                  {content.key_points.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
              </>
            )}
          </div>
        );
      
      case 'brand_history':
        return (
          <div>
            <p><strong>Founded:</strong> {content.founding_year} by {content.founder}</p>
            <p><strong>Origin:</strong> {content.origin}</p>
            {content.milestones && content.milestones.length > 0 && (
              <>
                <p className="mt-3"><strong>Milestones:</strong></p>
                <ul>
                  {content.milestones.map((milestone, i) => <li key={i}>{milestone}</li>)}
                </ul>
              </>
            )}
          </div>
        );
      
      case 'brand_values':
        return (
          <div>
            {content.values && content.values.length > 0 && (
              content.values.map((value, i) => (
                <div key={i} className="mb-3">
                  <p className="mb-1"><strong>{value.name}</strong></p>
                  <p className="text-muted">{value.description}</p>
                </div>
              ))
            )}
          </div>
        );
      
      case 'brand_personality':
        return (
          <div>
            {content.personality_traits && content.personality_traits.length > 0 && (
              <div className="mb-3">
                <p><strong>Personality Traits:</strong></p>
                <p>{content.personality_traits.join(', ')}</p>
              </div>
            )}
            {content.style_descriptors && content.style_descriptors.length > 0 && (
              <div className="mb-3">
                <p><strong>Style Descriptors:</strong></p>
                <p>{content.style_descriptors.join(', ')}</p>
              </div>
            )}
            {content.brand_voice && (
              <div>
                <p><strong>Brand Voice:</strong></p>
                <p>{content.brand_voice}</p>
              </div>
            )}
          </div>
        );
      
      case 'flagship_stores':
        return (
          <div>
            {content.store_locations && content.store_locations.length > 0 && (
              <>
                <p><strong>Store Locations:</strong></p>
                {content.store_locations.map((store, i) => (
                  <div key={i} className="mb-2">
                    <p className="mb-1"><strong>{store.city}</strong></p>
                    <p className="text-muted small">{store.description}</p>
                  </div>
                ))}
              </>
            )}
            {content.retail_experience && (
              <div className="mt-3">
                <p><strong>Retail Experience:</strong></p>
                <p>{content.retail_experience}</p>
              </div>
            )}
          </div>
        );
      
      case 'core_collection':
        return (
          <div>
            <p className="mb-3">{content.overview}</p>
            {content.signature_categories && content.signature_categories.length > 0 && (
              <>
                <p><strong>Signature Categories:</strong></p>
                {content.signature_categories.map((cat, i) => (
                  <div key={i} className="mb-3">
                    <p className="mb-1"><strong>{cat.category}</strong></p>
                    <p className="text-muted small mb-1">{cat.description}</p>
                    {cat.key_pieces && cat.key_pieces.length > 0 && (
                      <p className="small"><em>Key pieces: {cat.key_pieces.join(', ')}</em></p>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        );
      
      default:
        return <pre className="bg-light p-3 rounded" style={{ fontSize: '0.85rem' }}>{JSON.stringify(content, null, 2)}</pre>;
    }
  };

  const generateIntroSlides = async () => {
    if (!savedIds.collectionId) {
      alert('Please save the collection first');
      return;
    }
    
    setGeneratingSlides(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/collections/${savedIds.collectionId}/intro-slides/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate intro slides');
      }
      
      const data = await response.json();
      setIntroSlides(data);
      alert(`Successfully generated ${data.slides?.length || 0} intro slides!`);
      
    } catch (error) {
      console.error('Error generating intro slides:', error);
      alert(`Failed to generate intro slides: ${error.message}`);
    } finally {
      setGeneratingSlides(false);
    }
  };

  const saveCategories = async () => {
    if (!savedIds.collectionId) {
      alert('Please save the collection first');
      return;
    }
    
    if (formData.categories.length === 0 || !formData.categories[0].name) {
      alert('Please add at least one category');
      return;
    }
    
    setSaving(prev => ({ ...prev, categories: true }));
    try {
      const token = await getAuthToken();
      
      // Format categories for API
      const formattedCategories = formData.categories.map((cat, index) => ({
        name: cat.name,
        product_count: 0,
        display_order: index + 1,
        subcategories: cat.subcategories.map((sub, subIndex) => ({
          name: sub,
          product_count: 0,
          display_order: subIndex + 1
        }))
      }));
      
      const response = await fetch(`http://localhost:8000/api/collections/${savedIds.collectionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          categories: formattedCategories
        })
      });
      
      if (!response.ok) throw new Error('Failed to save categories');
      
      setHasUnsavedChanges(false);
      alert('Categories saved successfully!');
      
    } catch (error) {
      console.error('Error saving categories:', error);
      alert(`Failed to save categories: ${error.message}`);
    } finally {
      setSaving(prev => ({ ...prev, categories: false }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form Data:', formData);
    console.log('Saved IDs:', savedIds);
    // TODO: Implement full presentation generation
  };

  useEffect(() => {
    fetchBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchBrandCollections(selectedBrand.brand_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand]);

  useEffect(() => {
    if (savedIds.collectionId) {
      fetchDocuments();
      fetchCollectionItems();
      loadIntroSlideSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedIds.collectionId]);

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Document Processing</h2>
      
      {/* Existing Brands & Collections Section */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">Existing Brands</h5>
            </div>
            <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {loading.brands ? (
                <div className="text-center">
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : existingBrands.length === 0 ? (
                <p className="text-muted mb-0">No brands yet. Create one below.</p>
              ) : (
                <div className="list-group">
                  {existingBrands.map(brand => (
                    <button
                      key={brand.brand_id}
                      type="button"
                      className={`list-group-item list-group-item-action ${selectedBrand?.brand_id === brand.brand_id ? 'active' : ''}`}
                      onClick={() => selectExistingBrand(brand)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{brand.name}</span>
                        {savedIds.brandId === brand.brand_id && (
                          <span className="badge bg-success">Selected</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">Collections for Selected Brand</h5>
            </div>
            <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {!selectedBrand ? (
                <p className="text-muted mb-0">Select a brand to view collections</p>
              ) : loading.collections ? (
                <div className="text-center">
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : brandCollections.length === 0 ? (
                <p className="text-muted mb-0">No collections yet. Create one below.</p>
              ) : (
                <div className="list-group">
                  {brandCollections.map(collection => (
                    <button
                      key={collection.collection_id}
                      type="button"
                      className={`list-group-item list-group-item-action ${savedIds.collectionId === collection.collection_id ? 'active' : ''}`}
                      onClick={() => selectExistingCollection(collection)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div>{collection.name}</div>
                          <small className="text-muted">
                            {collection.season && `${collection.season.replace('_', ' ')} `}
                            {collection.year}
                          </small>
                        </div>
                        {savedIds.collectionId === collection.collection_id && (
                          <span className="badge bg-success">Selected</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Brand Section */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Brand Information</h5>
            <button 
              type="button" 
              className="btn btn-light btn-sm"
              onClick={saveBrand}
              disabled={saving.brand || !formData.brandName}
            >
              {saving.brand ? 'Saving...' : savedIds.brandId ? '✓ Saved' : 'Save Brand'}
            </button>
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
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Collection Information</h5>
            <button 
              type="button" 
              className="btn btn-light btn-sm"
              onClick={saveCollection}
              disabled={saving.collection || !savedIds.brandId || !formData.collectionName || !formData.collectionType || !formData.collectionYear}
            >
              {saving.collection ? 'Saving...' : savedIds.collectionId ? '✓ Saved' : 'Save Collection'}
            </button>
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
                    <option key={type.value} value={type.value}>{type.label}</option>
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
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Documents</h5>
            <button 
              type="button" 
              className="btn btn-light btn-sm"
              onClick={saveDocuments}
              disabled={saving.documents || !savedIds.collectionId || formData.lineSheets.length === 0}
            >
              {saving.documents ? 'Saving...' : savedIds.documentIds.length > 0 ? '✓ Saved' : 'Save Documents'}
            </button>
          </div>
          <div className="card-body">
            {/* Uploaded Documents List */}
            {uploadedDocuments.length > 0 && (
              <div className="mb-4">
                <h6 className="mb-3">Uploaded Documents</h6>
                <div className="list-group">
                  {uploadedDocuments.map((doc) => (
                    <div key={doc.document_id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{doc.name}</strong>
                        <br />
                        <small className="text-muted">
                          {doc.type} • {(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                        </small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteDocument(doc.document_id, doc.name)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Documents */}
            <h6 className="mb-3">Upload New Documents</h6>
            <div className="mb-3">
              <label className="form-label">Line Sheets *</label>
              <input
                type="file"
                className="form-control"
                multiple
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={(e) => handleFileChange('lineSheets', e.target.files)}
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
              </div>
            </div>
            
            {/* Generate Intro Slides Button - Only show if slides don't exist */}
            {!introSlides && (
              <div className="mt-3">
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={generateIntroSlides}
                  disabled={generatingSlides || !savedIds.collectionId}
                >
                  {generatingSlides ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Generating Slides...
                    </>
                  ) : (
                    'Generate Intro Slides'
                  )}
                </button>
                {!savedIds.collectionId && (
                  <small className="text-muted ms-2">Save collection first</small>
                )}
              </div>
            )}
            
            {/* Display Generated Slides */}
            {console.log('=== RENDER CHECK ===', 'introSlides:', introSlides, 'has slides?', introSlides?.slides)}
            {introSlides && introSlides.slides && (
              <div className="mt-4">
                <h6 className="mb-3">Generated Slides ({introSlides.slides.length})</h6>
                <p className="text-muted small mb-3">
                  Generated at: {new Date(introSlides.generated_at).toLocaleString()}
                </p>
                
                <div className="accordion" id="introSlidesAccordion">
                  {introSlides.slides.map((slide, index) => {
                    if (!slide) return null; // Skip null slides
                    
                    return (
                      <div className="accordion-item" key={index}>
                        <h2 className="accordion-header" id={`heading${index}`}>
                          <button 
                            className="accordion-button collapsed" 
                            type="button" 
                            data-bs-toggle="collapse" 
                            data-bs-target={`#collapse${index}`}
                            aria-expanded="false" 
                            aria-controls={`collapse${index}`}
                          >
                            <strong>{slide.slide_type}:</strong>&nbsp;{slide.title || 'Untitled'}
                          </button>
                        </h2>
                        <div 
                          id={`collapse${index}`} 
                          className="accordion-collapse collapse" 
                          aria-labelledby={`heading${index}`}
                          data-bs-parent="#introSlidesAccordion"
                        >
                          <div className="accordion-body">
                            {slide.subtitle && (
                              <p className="text-muted mb-3"><em>{slide.subtitle}</em></p>
                            )}
                            {renderSlideContent(slide.content, slide.slide_type)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Categories Section */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Collection Categories</h5>
            <div className="d-flex gap-2">
              <button 
                type="button" 
                className="btn btn-sm btn-warning"
                onClick={generateCategories}
                disabled={generating || savedIds.documentIds.length === 0}
              >
                {generating ? 'Generating...' : '🤖 Generate Categories'}
              </button>
              <button 
                type="button" 
                className={`btn btn-sm ${hasUnsavedChanges ? 'btn-warning' : 'btn-light'}`}
                onClick={saveCategories}
                disabled={saving.categories || formData.categories.length === 0 || !formData.categories[0].name}
              >
                {saving.categories ? 'Saving...' : hasUnsavedChanges ? '⚠️ Save Categories (Unsaved Changes)' : '💾 Save Categories'}
              </button>
              <button type="button" className="btn btn-sm btn-outline-light" onClick={addCategory}>
                + Add Category
              </button>
            </div>
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

        {/* Collection Items Section */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Collection Items</h5>
            <button 
              type="button" 
              className="btn btn-sm btn-warning"
              onClick={generateItems}
              disabled={generatingItems || !savedIds.collectionId}
            >
              {generatingItems ? 'Generating...' : '🚀 Generate Items'}
            </button>
          </div>
          <div className="card-body">
            {collectionItems.length === 0 ? (
              <div className="text-center text-muted py-4">
                <p className="mb-0">No items generated yet.</p>
                <small>Upload a Purchase Order and Line Sheet, then click "Generate Items"</small>
              </div>
            ) : (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0">{collectionItems.length} Items Generated</h6>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={fetchCollectionItems}
                  >
                    🔄 Refresh
                  </button>
                </div>
                <div 
                  style={{
                    maxHeight: '600px',
                    overflowY: 'auto'
                  }}
                >
                  <div className="row g-3">
                    {collectionItems.map((item) => (
                      <div key={item.item_id} className="col-md-6 col-lg-4">
                        <div className="card h-100 shadow-sm">
                          {/* Product Image */}
                          {item.images && item.images.length > 0 && (
                            <img 
                              src={item.images[0].url || item.images[0]} 
                              className="card-img-top" 
                              alt={item.images[0].alt || item.product_name || 'Product'}
                              style={{ 
                                height: '200px', 
                                objectFit: 'contain', 
                                backgroundColor: '#f8f9fa',
                                padding: '10px'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="card-title mb-0" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                {item.product_name || 'Unnamed Product'}
                              </h6>
                              <div className="form-check form-switch">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`highlight-${item.item_id}`}
                                  checked={item.highlighted_item || false}
                                  onChange={() => toggleItemHighlight(item.item_id, item.highlighted_item)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <label 
                                  className="form-check-label" 
                                  htmlFor={`highlight-${item.item_id}`}
                                  style={{ fontSize: '11px', cursor: 'pointer' }}
                                >
                                  Highlight
                                </label>
                              </div>
                            </div>
                            
                            <div style={{ fontSize: '12px' }}>
                              <div className="mb-2">
                                <strong>SKU:</strong> <span className="text-muted">{item.sku}</span>
                              </div>
                              
                              {item.color && (
                                <div className="mb-2">
                                  <strong>Color:</strong> <span className="text-muted">{item.color}</span>
                                  {item.color_code && <span className="text-muted"> ({item.color_code})</span>}
                                </div>
                              )}
                              
                              {item.materials && item.materials.length > 0 && (
                                <div className="mb-2">
                                  <strong>Material:</strong> <span className="text-muted">{item.materials.join(', ')}</span>
                                </div>
                              )}
                              
                              {item.rrp && (
                                <div className="mb-2">
                                  <strong>Retail Price:</strong> <span className="text-muted">${item.rrp}</span>
                                </div>
                              )}
                              
                              {item.origin && (
                                <div className="mb-2">
                                  <strong>Origin:</strong> <span className="text-muted">{item.origin}</span>
                                </div>
                              )}
                              
                              {item.category && (
                                <div className="mb-2">
                                  <strong>Category:</strong> 
                                  <span className="text-muted"> {item.category}</span>
                                </div>
                              )}
                              
                              {item.subcategory && (
                                <div className="mb-2">
                                  <strong>Subcategory:</strong> <span className="text-muted">{item.subcategory}</span>
                                </div>
                              )}
                              
                              {item.sizes && Object.keys(item.sizes).length > 0 && (
                                <div className="mt-2 pt-2" style={{ borderTop: '1px solid #dee2e6' }}>
                                  <strong>Sizes:</strong>
                                  <div className="d-flex flex-wrap gap-1 mt-1">
                                    {Object.entries(item.sizes).map(([size, qty]) => (
                                      <span 
                                        key={size} 
                                        className="badge bg-secondary"
                                        style={{ fontSize: '10px' }}
                                      >
                                        {size}: {qty}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
