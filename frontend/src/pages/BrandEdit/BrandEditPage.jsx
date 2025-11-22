import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNav from '../../components/features/TopNav/TopNav';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import Footer from '../../components/features/Footer/Footer';
import SectionHeader from '../../components/ui/SectionHeader/SectionHeader';
import Button from '../../components/ui/Button/Button';
import { getAuthToken } from '../../utils/auth';
import styles from './BrandEditPage.module.css';

function BrandEditPage() {
  const { brandId } = useParams();
  const navigate = useNavigate();

  // Top nav links
  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/generated-decks', label: 'Generated Decks' },
    { path: '/settings', label: 'Settings' }
  ];

  // State
  const [brands, setBrands] = useState([]);
  const [brandData, setBrandData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    logo: null,
    logoPreview: null
  });

  // Fetch brands for sidebar
  const fetchBrandsWithCollections = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('http://localhost:8000/api/brands/with-collections', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }
      
      const data = await response.json();
      
      // Transform data to match Sidebar format
      const transformedBrands = data.map(brand => ({
        id: brand.brand_id,
        name: brand.name,
        logo: brand.logo_url,
        collections: brand.collections.map(col => ({
          id: col.collection_id,
          name: col.name
        }))
      }));
      
      setBrands(transformedBrands);
    } catch (err) {
      console.error('Error fetching brands:', err);
    }
  };

  // Fetch specific brand data
  const fetchBrandData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/brands/${brandId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch brand');
      }
      
      const data = await response.json();
      setBrandData(data);
      
      // Set form data
      setFormData({
        name: data.name || '',
        website_url: data.website_url || '',
        logo: null,
        logoPreview: data.logo_url || null
      });
    } catch (err) {
      console.error('Error fetching brand:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandsWithCollections();
    fetchBrandData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  // Handle form changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle logo upload
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        logo: file,
        logoPreview: URL.createObjectURL(file)
      }));
    }
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getAuthToken();
      
      // Update brand basic info
      const updateResponse = await fetch(`http://localhost:8000/api/brands/${brandId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          website_url: formData.website_url || null
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update brand');
      }

      // Upload logo if changed
      if (formData.logo) {
        const logoFormData = new FormData();
        logoFormData.append('file', formData.logo);

        const logoResponse = await fetch(`http://localhost:8000/api/brands/${brandId}/logo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: logoFormData
        });

        if (!logoResponse.ok) {
          throw new Error('Failed to upload logo');
        }
      }

      // Success - navigate back to dashboard
      navigate('/');
    } catch (err) {
      console.error('Error saving brand:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const [activeBrand] = useState(brandId);
  const [activeCollection] = useState(null);

  const handleBrandChange = (newBrandId) => {
    navigate(`/brands/${newBrandId}/edit`);
  };

  const handleCollectionChange = (collectionId) => {
    navigate(`/collection-settings/${collectionId}`);
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <TopNav navLinks={navLinks} />
        <div className={styles.contentWrapper}>
          <Sidebar
            brands={brands}
            activeBrand={activeBrand}
            activeCollection={activeCollection}
            onBrandChange={handleBrandChange}
            onCollectionChange={handleCollectionChange}
          />
          <main className={styles.mainContent}>
            <p>Loading brand...</p>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <TopNav navLinks={navLinks} />
      
      <div className={styles.contentWrapper}>
        <Sidebar
          brands={brands}
          activeBrand={activeBrand}
          activeCollection={activeCollection}
          onBrandChange={handleBrandChange}
          onCollectionChange={handleCollectionChange}
        />
        
        <main className={styles.mainContent}>
          {/* Back button */}
          <button 
            className={styles.backButton}
            onClick={() => navigate('/')}
          >
            ← Back to Dashboard
          </button>

          {/* Page title */}
          <h1 className={styles.pageTitle}>Edit Brand: {brandData?.name}</h1>

          {error && (
            <div className={styles.errorMessage}>
              Error: {error}
            </div>
          )}

          {/* Brand Name Section */}
          <div className={styles.section}>
            <SectionHeader title="Brand Name" />
            <div className={styles.sectionContent}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter brand name"
                className={styles.input}
              />
            </div>
          </div>

          {/* Website URL Section */}
          <div className={styles.section}>
            <SectionHeader title="Website URL" />
            <div className={styles.sectionContent}>
              <input
                type="url"
                name="website_url"
                value={formData.website_url}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className={styles.input}
              />
            </div>
          </div>

          {/* Brand Logo Section */}
          <div className={styles.section}>
            <SectionHeader title="Brand Logo" />
            <div className={styles.sectionContent}>
              <div className={styles.logoUpload}>
                {formData.logoPreview && (
                  <div className={styles.logoPreview}>
                    <img src={formData.logoPreview} alt="Brand logo" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className={styles.fileInput}
                  id="logo-upload"
                />
                <label htmlFor="logo-upload" className={styles.uploadButton}>
                  {formData.logoPreview ? 'Change Logo' : 'Upload Logo'}
                </label>
              </div>
            </div>
          </div>

          {/* Brand Context Files Section */}
          <div className={styles.section}>
            <SectionHeader title="Brand Context Files" />
            <div className={styles.sectionContent}>
              <p className={styles.placeholder}>
                Document upload functionality coming soon...
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={() => navigate('/')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !formData.name}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}

export default BrandEditPage;
