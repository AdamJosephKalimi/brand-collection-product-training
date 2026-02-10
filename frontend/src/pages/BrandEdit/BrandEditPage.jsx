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
import FileUpload from '../../components/ui/FileUpload/FileUpload';
import ProcessingProgress from '../../components/ui/ProcessingProgress/ProcessingProgress';
import { useBrands, useBrand } from '../../hooks/useBrands';
import { useUpdateBrand, useUploadLogo } from '../../hooks/useBrandMutations';
import { useDeleteBrand } from '../../hooks/useDeleteBrand';
import { useDeleteCollection } from '../../hooks/useDeleteCollection';
import { useBrandDocuments, useUploadBrandDocument, useDeleteBrandDocument, useProcessBrandDocument } from '../../hooks/useBrandDocuments';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import TypographyModal from '../../components/ui/TypographyModal';
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
  const deleteBrandMutation = useDeleteBrand();
  const deleteCollectionMutation = useDeleteCollection();
  
  // Brand document hooks
  const { data: brandDocuments = [], isLoading: docsLoading } = useBrandDocuments(brandId);
  const uploadBrandDoc = useUploadBrandDocument();
  const deleteBrandDoc = useDeleteBrandDocument();
  const processBrandDoc = useProcessBrandDocument();
  const [isUploading, setIsUploading] = useState(false);
  const [docProcessing, setDocProcessing] = useState({
    status: 'idle',
    currentPhase: '',
    progress: { percentage: 0, step: 0, total_steps: 0 },
    error: null
  });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ isVisible: false, type: null, id: null, name: '' });

  // Typography modal state
  const [typographyModal, setTypographyModal] = useState({ isVisible: false, group: null });
  const [deckTypography, setDeckTypography] = useState({ heading: {}, body: {} });

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
      setLogoError(false);
      if (brandData.deck_typography) {
        setDeckTypography({
          heading: brandData.deck_typography.heading || {},
          body: brandData.deck_typography.body || {},
        });
      }
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

  // Handle brand document upload
  const handleBrandDocUpload = async (files) => {
    setIsUploading(true);
    for (const file of files) {
      try {
        await uploadBrandDoc.mutateAsync({ brandId, file, type: 'other' });
      } catch (err) {
        console.error('Error uploading brand document:', err);
        setDocProcessing(prev => ({ ...prev, status: 'failed', error: err.message || 'Failed to upload document' }));
      }
    }
    setIsUploading(false);
  };

  // Handle brand document removal
  const handleBrandDocRemove = async (documentId) => {
    try {
      await deleteBrandDoc.mutateAsync({ brandId, documentId });
    } catch (err) {
      console.error('Error deleting brand document:', err);
      setDocProcessing(prev => ({ ...prev, status: 'failed', error: err.message || 'Failed to delete document' }));
    }
  };

  // Simulated easing progress — advances quickly then decelerates toward a ceiling
  const startSimulatedProgress = (bandStart, bandCeiling, step, totalSteps) => {
    let current = bandStart;
    const interval = setInterval(() => {
      // Decelerate: each tick covers 8% of remaining distance to ceiling
      const remaining = bandCeiling - current;
      const increment = Math.max(0.3, remaining * 0.08);
      current = Math.min(current + increment, bandCeiling);
      setDocProcessing(prev => ({
        ...prev,
        progress: { ...prev.progress, percentage: Math.round(current) }
      }));
    }, 200);
    return interval;
  };

  // Process all unprocessed brand documents
  const handleProcessBrandDocs = async () => {
    const unprocessed = brandDocuments.filter(doc => doc.status !== 'processed' && doc.status !== 'processing');
    const total = unprocessed.length;
    if (total === 0) return;

    setDocProcessing({
      status: 'processing',
      currentPhase: `Processing ${unprocessed[0].name}...`,
      progress: { percentage: 0, step: 1, total_steps: total },
      error: null
    });

    for (let i = 0; i < unprocessed.length; i++) {
      const doc = unprocessed[i];
      const bandStart = Math.round((i / total) * 100);
      const bandEnd = Math.round(((i + 1) / total) * 100);
      // Simulated progress eases toward 90% of the band, leaving room for the jump
      const bandCeiling = bandStart + (bandEnd - bandStart) * 0.9;

      setDocProcessing(prev => ({
        ...prev,
        currentPhase: `Processing ${doc.name}...`,
        progress: { percentage: bandStart, step: i + 1, total_steps: total }
      }));

      const timer = startSimulatedProgress(bandStart, bandCeiling, i + 1, total);

      try {
        await processBrandDoc.mutateAsync({ brandId, documentId: doc.document_id });
        clearInterval(timer);
        // Jump to band end on success
        setDocProcessing(prev => ({
          ...prev,
          progress: { ...prev.progress, percentage: bandEnd }
        }));
      } catch (err) {
        clearInterval(timer);
        console.error(`Error processing document ${doc.name}:`, err);
        setDocProcessing({
          status: 'failed',
          currentPhase: '',
          progress: { percentage: Math.round(bandStart), step: i + 1, total_steps: total },
          error: err.message || `Failed to process ${doc.name}`
        });
        return;
      }
    }

    setDocProcessing({
      status: 'completed',
      currentPhase: '',
      progress: { percentage: 100, step: total, total_steps: total },
      error: null
    });
  };

  const isProcessing = docProcessing.status === 'processing';
  const hasUnprocessedDocs = brandDocuments.some(doc => doc.status !== 'processed' && doc.status !== 'processing');

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

  // Save typography for a text group
  const handleTypographySave = async (values) => {
    const group = typographyModal.group;
    const updated = { ...deckTypography, [group]: values };
    setDeckTypography(updated);
    setTypographyModal({ isVisible: false, group: null });

    try {
      await updateBrand.mutateAsync({
        brandId,
        data: { deck_typography: updated }
      });
    } catch (err) {
      console.error('Failed to save typography:', err);
    }
  };

  const typographyGroups = [
    { key: 'heading', label: 'Headings', description: 'Cover title, category dividers, slide labels' },
    { key: 'body', label: 'Body Text', description: 'Product details, descriptions' },
  ];

  const [activeBrand] = useState(brandId);
  const [activeCollection] = useState(null);

  const handleCollectionClick = (collection) => {
    navigate(`/collection-settings/${collection.id}`);
  };

  const handleDeleteConfirm = async () => {
    const { type, id } = deleteModal;
    
    try {
      if (type === 'brand') {
        await deleteBrandMutation.mutateAsync(id);
        // If deleting current brand, go back to dashboard
        if (id === brandId) {
          navigate('/');
          return;
        }
      } else if (type === 'collection') {
        await deleteCollectionMutation.mutateAsync(id);
      }
      setDeleteModal({ isVisible: false, type: null, id: null, name: '' });
    } catch (err) {
      console.error(`Failed to delete ${type}:`, err);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <TopNav links={navLinks} />
        <div className={styles.contentWrapper}>
          <Sidebar
            brands={brands}
            activeBrand={activeBrand}
            activeCollection={activeCollection}
            onCollectionClick={handleCollectionClick}
            onDeleteBrand={(bId, bName) => setDeleteModal({ isVisible: true, type: 'brand', id: bId, name: bName })}
            onEditBrand={(brandId) => navigate('/brands/' + brandId + '/edit')}
            onDeleteCollection={(cId, cName) => setDeleteModal({ isVisible: true, type: 'collection', id: cId, name: cName })}
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
      <TopNav links={navLinks} />
      
      <div className={styles.contentWrapper}>
        <Sidebar
          brands={brands}
          activeBrand={activeBrand}
          activeCollection={activeCollection}
          onCollectionClick={handleCollectionClick}
          onDeleteBrand={(bId, bName) => setDeleteModal({ isVisible: true, type: 'brand', id: bId, name: bName })}
          onEditBrand={(brandId) => navigate('/brands/' + brandId + '/edit')}
          onDeleteCollection={(cId, cName) => setDeleteModal({ isVisible: true, type: 'collection', id: cId, name: cName })}
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

          {/* Deck Typography Section */}
          <div className={styles.typographySection}>
            <h2 className={styles.typographyHeader}>Deck Typography</h2>
            <p className={styles.typographySubtitle}>
              Customize font family, size, and color for your generated presentation slides.
            </p>
            <div className={styles.typographyGroups}>
              {typographyGroups.map(({ key, label, description }) => {
                const settings = deckTypography[key] || {};
                const hasSettings = settings.font_family || settings.font_color;
                return (
                  <div key={key} className={styles.typographyGroupCard}>
                    <div className={styles.typographyGroupInfo}>
                      <span className={styles.typographyGroupLabel}>{label}</span>
                      <span className={styles.typographyGroupDesc}>{description}</span>
                      {hasSettings && (
                        <span className={styles.typographyGroupValues}>
                          {[
                            settings.font_family,
                            settings.font_color,
                          ].filter(Boolean).join(' / ')}
                        </span>
                      )}
                    </div>
                    <button
                      className={styles.typographyEditButton}
                      onClick={() => setTypographyModal({ isVisible: true, group: key })}
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M14.166 2.5009C14.3849 2.28203 14.6447 2.10842 14.9307 1.98996C15.2167 1.87151 15.5232 1.81055 15.8327 1.81055C16.1422 1.81055 16.4487 1.87151 16.7347 1.98996C17.0206 2.10842 17.2805 2.28203 17.4993 2.5009C17.7182 2.71977 17.8918 2.97961 18.0103 3.26558C18.1287 3.55154 18.1897 3.85804 18.1897 4.16757C18.1897 4.4771 18.1287 4.7836 18.0103 5.06956C17.8918 5.35553 17.7182 5.61537 17.4993 5.83424L6.24935 17.0842L1.66602 18.3342L2.91602 13.7509L14.166 2.5009Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Brand Context Documents Section */}
          <div className={styles.brandDocsSection}>
            <h2 className={styles.brandDocsHeader}>Brand Context Documents</h2>
            <p className={styles.brandDocsSubtitle}>
              Upload documents about your brand (press materials, brand overviews, about pages).
              These are used to generate accurate intro slides for your presentations.
            </p>

            <FileUpload
              onFilesSelected={handleBrandDocUpload}
              onFileRemove={handleBrandDocRemove}
              initialFiles={brandDocuments}
              title="Upload brand context documents"
              subtitle="PDF, DOCX, TXT (max 25MB)"
              buttonText="Select Documents"
              addMoreButtonText="Add More Documents"
              accept=".pdf,.docx,.txt"
              multiple={true}
            />

            {/* Upload spinner */}
            {isUploading && (
              <div className={styles.uploadingIndicator}>
                <svg className={styles.uploadSpinner} width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="var(--border-light)" strokeWidth="2" />
                  <path d="M9 2a7 7 0 0 1 7 7" stroke="var(--color-brand-wine)" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className={styles.uploadingText}>Uploading documents...</span>
              </div>
            )}

            {/* Processing Progress — shown during processing or on failure */}
            <ProcessingProgress
              title="Brand Document Processing"
              status={docProcessing.status}
              currentPhase={docProcessing.currentPhase}
              progress={docProcessing.progress}
              error={docProcessing.error}
            />

            {/* Per-document status indicators */}
            {brandDocuments.length > 0 && (
              <div className={styles.brandDocsStatus}>
                {brandDocuments.map(doc => (
                  <div key={doc.document_id} className={styles.brandDocStatusItem}>
                    <span className={styles.brandDocStatusName}>{doc.name}</span>
                    <span className={`${styles.brandDocStatusBadge} ${styles[`status_${doc.status || 'uploaded'}`]}`}>
                      {doc.status === 'processed' && '\u2713 '}
                      {doc.status === 'processing' && '\u27F3 '}
                      {doc.status === 'failed' && '\u2717 '}
                      {(doc.status || 'uploaded').charAt(0).toUpperCase() + (doc.status || 'uploaded').slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {hasUnprocessedDocs && !isProcessing && (
              <div className={styles.processPrompt}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleProcessBrandDocs}
                  disabled={isProcessing}
                  className={styles.processButton}
                >
                  Process Documents
                </Button>
                <span className={styles.processHint}>
                  Click once you've uploaded all documents to process them for your presentations.
                </span>
              </div>
            )}
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

      {/* Typography Modal */}
      <TypographyModal
        title={`Edit ${typographyGroups.find(g => g.key === typographyModal.group)?.label || ''}`}
        subtitle={typographyGroups.find(g => g.key === typographyModal.group)?.description || ''}
        isVisible={typographyModal.isVisible}
        initialValues={typographyModal.group ? (deckTypography[typographyModal.group] || {}) : {}}
        onSave={handleTypographySave}
        onClose={() => setTypographyModal({ isVisible: false, group: null })}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isVisible={deleteModal.isVisible}
        onClose={() => setDeleteModal({ isVisible: false, type: null, id: null, name: '' })}
        onConfirm={handleDeleteConfirm}
        title={deleteModal.type === 'brand' ? 'Delete Brand' : 'Delete Collection'}
        message={
          deleteModal.type === 'brand'
            ? `Are you sure you want to delete "${deleteModal.name}"? This will also delete all collections under this brand. This action cannot be undone.`
            : `Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`
        }
        confirmText="Delete"
        isLoading={deleteBrandMutation.isPending || deleteCollectionMutation.isPending}
        isDangerous={true}
      />
    </div>
  );
}

export default BrandEditPage;
