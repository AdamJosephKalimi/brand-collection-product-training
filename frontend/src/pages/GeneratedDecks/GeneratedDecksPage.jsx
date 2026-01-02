import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import TopNav from '../../components/features/TopNav/TopNav';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import Footer from '../../components/features/Footer/Footer';
import BrandSection from '../../components/ui/BrandSection/BrandSection';
import NewBrandModal from '../../components/ui/NewBrandModal/NewBrandModal';
import NewCollectionModal from '../../components/ui/NewCollectionModal/NewCollectionModal';
import { useBrands } from '../../hooks/useBrands';
import { useGeneratedDecks, useDownloadPresentation } from '../../hooks/useGeneratedDecks';
import { useCreateBrand } from '../../hooks/useCreateBrand';
import { useCreateCollection } from '../../hooks/useCreateCollection';
import styles from './GeneratedDecksPage.module.css';

function GeneratedDecksPage() {
  const navigate = useNavigate();
  const [activeBrand, setActiveBrand] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isNewBrandModalVisible, setIsNewBrandModalVisible] = useState(false);
  const createBrandMutation = useCreateBrand();
  const [newCollectionBrandId, setNewCollectionBrandId] = useState(null);
  const [collectionLoadingMessage, setCollectionLoadingMessage] = useState('Creating...');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const createCollectionMutation = useCreateCollection();
  const queryClient = useQueryClient();

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
          onNewBrand={() => setIsNewBrandModalVisible(true)}
          onNewCollection={(brandId) => setNewCollectionBrandId(brandId)}
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

      {/* New Brand Modal */}
      <NewBrandModal
        isVisible={isNewBrandModalVisible}
        onClose={() => setIsNewBrandModalVisible(false)}
        isLoading={createBrandMutation.isPending}
        onSubmit={async (data) => {
          try {
            await createBrandMutation.mutateAsync(data);
            setIsNewBrandModalVisible(false);
          } catch (error) {
            console.error('Failed to create brand:', error);
          }
        }}
      />

      {/* New Collection Modal */}
      <NewCollectionModal
        isVisible={!!newCollectionBrandId}
        onClose={() => {
          if (!isCreatingCollection) {
            setNewCollectionBrandId(null);
            setCollectionLoadingMessage('Creating...');
          }
        }}
        isLoading={isCreatingCollection}
        loadingMessage={collectionLoadingMessage}
        brandName={brands.find(b => b.id === newCollectionBrandId)?.name || ''}
        onSubmit={async (data) => {
          try {
            setIsCreatingCollection(true);
            setCollectionLoadingMessage('Creating...');
            
            const newCollection = await createCollectionMutation.mutateAsync({
              brandId: newCollectionBrandId,
              ...data
            });
            
            setCollectionLoadingMessage('Loading...');
            await queryClient.refetchQueries({ queryKey: ['brands'] });
            await queryClient.prefetchQuery({
              queryKey: ['collection', newCollection.collection_id]
            });
            
            setNewCollectionBrandId(null);
            setCollectionLoadingMessage('Creating...');
            setIsCreatingCollection(false);
            navigate(`/collection-settings/${newCollection.collection_id}`);
          } catch (error) {
            console.error('Failed to create collection:', error);
            setIsCreatingCollection(false);
            setCollectionLoadingMessage('Creating...');
          }
        }}
      />
    </div>
  );
}

export default GeneratedDecksPage;
