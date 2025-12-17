import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import TopNav from '../../components/features/TopNav/TopNav';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import Footer from '../../components/features/Footer/Footer';
import SectionHeader from '../../components/ui/SectionHeader/SectionHeader';
import Button from '../../components/ui/Button/Button';
import LoadingOverlay from '../../components/ui/LoadingOverlay/LoadingOverlay';
import POFileUpload from '../../components/ui/POFileUpload/POFileUpload';
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
  const queryClient = useQueryClient();
  const { data: brands = [], isLoading: brandsLoading } = useBrands();
  const { data: brandData, isLoading: brandLoading, isError, error: fetchError } = useBrand(brandId);
  
  // Mutations
  const updateBrand = useUpdateBrand();
  const uploadLogo = useUploadLogo();
  
  // Local state
  const [error, setError] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const loading = brandsLoading || brandLoading;
  const saving = updateBrand.isLoading || uploadLogo.isLoading || isSaving;

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
      setLogoError(false); // Reset logo error when new brand data loads
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

  // Handle logo file selection
  const handleLogoChange = (files) => {
    const file = files[0];
    if (file) {
      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setError('Logo file must be less than 5MB');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        logo: file,
        logoPreview: URL.createObjectURL(file)
      }));
      setLogoError(false);
    }
  };

  // Handle save with React Query mutations
  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    
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

      // Wait for fresh data before navigating
      await queryClient.refetchQueries({ queryKey: ['brands'] });
      await queryClient.refetchQueries({ queryKey: ['brand', brandId] });

      // Success - navigate back to dashboard with fresh data
      navigate('/');
    } catch (err) {
      console.error('Error saving brand:', err);
      setError(err.message || 'Failed to save brand');
    } finally {
      setIsSaving(false);
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
      <LoadingOverlay isVisible={isSaving} message="Saving changes..." />
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
          <div className={styles.contentContainer}>
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
          <div className={styles.brandNameSection}>
            <h2 className={styles.brandNameHeader}>Brand Name</h2>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter brand name"
              className={styles.brandNameInput}
            />
          </div>

          {/* Website URL Section */}
          <div className={styles.websiteSection}>
            <h2 className={styles.websiteHeader}>Website URL</h2>
            <div className={styles.websiteInputWrapper}>
              <span className={styles.websiteIconPrefix}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 7H13" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 1C8.5 2.5 9.5 4.5 9.5 7C9.5 9.5 8.5 11.5 7 13C5.5 11.5 4.5 9.5 4.5 7C4.5 4.5 5.5 2.5 7 1Z" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <input
                type="url"
                name="website_url"
                value={formData.website_url}
                onChange={handleInputChange}
                placeholder="https://www.brand.com"
                className={styles.websiteInput}
              />
            </div>
          </div>

          {/* Brand Logo Section */}
          <div className={styles.logoSection}>
            {/* Header */}
            <h2 className={styles.logoHeader}>Brand Logo</h2>
            
            {/* Content */}
            <div className={styles.logoContent}>
              {/* Upload Area */}
              <div className={styles.logoUploadArea}>
                <POFileUpload
                  onFilesSelected={handleLogoChange}
                  title="Upload logo file"
                  subtitle="PNG, JPG, SVG (max 5MB)"
                  buttonText="Upload Logo"
                  accept=".png,.jpg,.jpeg,.svg"
                  multiple={false}
                  className={styles.logoFileUpload}
                />
              </div>
              
              {/* Logo Preview */}
              <div className={styles.logoPreviewBox}>
                {formData.logoPreview && !logoError ? (
                  <img 
                    src={formData.logoPreview} 
                    alt="Brand logo"
                    onError={() => setLogoError(true)}
                    className={styles.logoPreviewImage}
                  />
                ) : formData.name && (logoError || !formData.logoPreview) ? (
                  <div className={styles.logoPlaceholderPreview}>
                    {formData.name.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <span className={styles.previewLabel}>Logo Preview</span>
                )}
              </div>
            </div>
          </div>

            {/* Action buttons */}
            <div className={styles.actions}>
              <Button
                variant="highlight"
                size="lg"
                onClick={handleSave}
                disabled={saving || !formData.name}
              >
                {saving ? 'Saving...' : 'Save Brand Settings'}
              </Button>
            </div>
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}

export default BrandEditPage;
