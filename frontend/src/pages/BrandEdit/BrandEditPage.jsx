import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNav from '../../components/features/TopNav/TopNav';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import Footer from '../../components/features/Footer/Footer';
import SectionHeader from '../../components/ui/SectionHeader/SectionHeader';
import Button from '../../components/ui/Button/Button';
import { useBrands, useBrand } from '../../hooks/useBrands';
import { useUpdateBrand, useUploadLogo } from '../../hooks/useBrandMutations';
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

  // Fetch brands for sidebar and brand details with React Query
  const { data: brands = [], isLoading: brandsLoading } = useBrands();
  const { data: brandData, isLoading: brandLoading, isError, error: fetchError } = useBrand(brandId);
  
  // Mutations
  const updateBrand = useUpdateBrand();
  const uploadLogo = useUploadLogo();
  
  // Local state
  const [error, setError] = useState(null);
  const loading = brandsLoading || brandLoading;
  const saving = updateBrand.isLoading || uploadLogo.isLoading;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    logo: null,
    logoPreview: null
  });

  // Populate form when brand data loads
  useEffect(() => {
    if (brandData) {
      setFormData({
        name: brandData.name || '',
        website_url: brandData.website_url || '',
        logo: null,
        logoPreview: brandData.logo_url || null
      });
    }
  }, [brandData]);

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

  // Handle save with React Query mutations
  const handleSave = async () => {
    setError(null);
    try {
      // Update brand basic info
      await updateBrand.mutateAsync({
        brandId,
        data: {
          name: formData.name,
          website_url: formData.website_url || null
        }
      });

      // Upload logo if changed
      if (formData.logo) {
        await uploadLogo.mutateAsync({
          brandId,
          file: formData.logo
        });
      }

      // Success - navigate back to dashboard
      navigate('/');
    } catch (err) {
      console.error('Error saving brand:', err);
      setError(err.message || 'Failed to save brand');
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

          {(error || isError) && (
            <div className={styles.errorMessage}>
              Error: {error || fetchError?.message || 'Failed to load brand'}
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
