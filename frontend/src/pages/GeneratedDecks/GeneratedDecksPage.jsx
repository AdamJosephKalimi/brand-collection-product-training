import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../../components/features/TopNav/TopNav';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import Footer from '../../components/features/Footer/Footer';
import BrandSection from '../../components/ui/BrandSection/BrandSection';
import { useBrands } from '../../hooks/useBrands';
import { useGeneratedDecks, useDownloadPresentation } from '../../hooks/useGeneratedDecks';
import styles from './GeneratedDecksPage.module.css';

function GeneratedDecksPage() {
  const navigate = useNavigate();
  const [activeBrand, setActiveBrand] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Top nav links
  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/generated-decks', label: 'Generated Decks' },
    { path: '/settings', label: 'Settings' }
  ];

  // Fetch brands for sidebar
  const { data: brands = [] } = useBrands();
  
  // Fetch generated decks
  const { 
    data: decksData, 
    isLoading, 
    isError, 
    error 
  } = useGeneratedDecks();

  // Download mutation
  const downloadMutation = useDownloadPresentation();

  // Set first brand as active when data loads
  React.useEffect(() => {
    if (brands.length > 0 && !activeBrand) {
      setActiveBrand(brands[0].id);
    }
  }, [brands, activeBrand]);

  const handleBrandChange = (brandId) => {
    setActiveBrand(brandId);
  };

  const handleEditDeck = (collectionId) => {
    navigate(`/collection-settings/${collectionId}`);
  };

  const handleDownloadDeck = async (collectionId) => {
    setDownloadingId(collectionId);
    try {
      await downloadMutation.mutateAsync(collectionId);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Top Navigation */}
      <TopNav links={navLinks} />
      
      {/* Main Content Area */}
      <div className={styles.mainArea}>
        {/* Sidebar */}
        <Sidebar
          brands={brands}
          activeBrand={activeBrand}
          activeCollection={null}
          onBrandClick={handleBrandChange}
          onCollectionClick={(collection) => {
            navigate(`/collection-settings/${collection.id}`);
          }}
          onNewBrand={() => {
            console.log('New Brand clicked');
          }}
          onNewCollection={(brandId) => {
            console.log('New Collection for brand:', brandId);
          }}
        />
        
        {/* Main Content */}
        <main className={styles.mainContent}>
          {/* Header */}
          <header className={styles.header}>
            <h1 className={styles.title}>Generated Decks</h1>
            <p className={styles.subtitle}>
              View and manage your training decks across all brands and collections
            </p>
          </header>

          {/* Content */}
          <div className={styles.content}>
            {isLoading && (
              <div className={styles.loadingState}>
                <p>Loading generated decks...</p>
              </div>
            )}

            {isError && (
              <div className={styles.errorState}>
                <p>Error loading decks: {error?.message || 'Unknown error'}</p>
              </div>
            )}

            {!isLoading && !isError && decksData?.brands?.length === 0 && (
              <div className={styles.emptyState}>
                <h3>No Generated Decks Yet</h3>
                <p>
                  Generate your first training deck by going to a collection and clicking "Generate Presentation".
                </p>
              </div>
            )}

            {!isLoading && !isError && decksData?.brands?.map((brand) => (
              <BrandSection
                key={brand.brand_id}
                brandId={brand.brand_id}
                brandName={brand.brand_name}
                brandLogoUrl={brand.brand_logo_url}
                decks={brand.decks}
                onEditDeck={handleEditDeck}
                onDownloadDeck={handleDownloadDeck}
                downloadingId={downloadingId}
              />
            ))}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default GeneratedDecksPage;
