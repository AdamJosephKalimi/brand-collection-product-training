import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import TopNav from '../../components/features/TopNav/TopNav';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import Footer from '../../components/features/Footer/Footer';
import Button from '../../components/ui/Button/Button';
import BrandCard from '../../components/features/BrandCard/BrandCard';
import NewBrandModal from '../../components/ui/NewBrandModal/NewBrandModal';
import NewCollectionModal from '../../components/ui/NewCollectionModal/NewCollectionModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { useBrands } from '../../hooks/useBrands';
import { useCreateBrand } from '../../hooks/useCreateBrand';
import { useCreateCollection } from '../../hooks/useCreateCollection';
import { useDeleteBrand } from '../../hooks/useDeleteBrand';
import { useDeleteCollection } from '../../hooks/useDeleteCollection';
import Spinner from '../../components/ui/Spinner';

function DashboardPage() {
  const navigate = useNavigate();

  // Top nav links
  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/generated-decks', label: 'Generated Decks' },
    { path: '/settings', label: 'Settings' }
  ];

  // Fetch brands with React Query
  const { data: brands = [], isLoading: loading, isError, error, refetch } = useBrands();
  
  const [activeBrand, setActiveBrand] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);
  
  // New Brand Modal state
  const [isNewBrandModalVisible, setIsNewBrandModalVisible] = useState(false);
  const createBrandMutation = useCreateBrand();
  
  // New Collection Modal state
  const [newCollectionBrandId, setNewCollectionBrandId] = useState(null);
  const [collectionLoadingMessage, setCollectionLoadingMessage] = useState('Creating...');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const createCollectionMutation = useCreateCollection();
  const queryClient = useQueryClient();
  
  // Delete Modal state
  const [deleteModal, setDeleteModal] = useState({ isVisible: false, type: null, id: null, name: '' });
  const deleteBrandMutation = useDeleteBrand();
  const deleteCollectionMutation = useDeleteCollection();

  // Set first brand and collection as active when data loads
  React.useEffect(() => {
    if (brands.length > 0 && !activeBrand) {
      setActiveBrand(brands[0].id);
      if (brands[0].collections.length > 0) {
        setActiveCollection(brands[0].collections[0].id);
      }
    }
  }, [brands, activeBrand]);

  const handleBrandChange = (brandId) => {
    setActiveBrand(brandId);
    const brand = brands.find(b => b.id === brandId);
    if (brand && brand.collections.length > 0) {
      setActiveCollection(brand.collections[0].id);
    } else {
      setActiveCollection(null);
    }
  };

  const handleCollectionChange = (collectionId) => {
    setActiveCollection(collectionId);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--background-page)'
    }}>
      {/* Top Navigation */}
      <TopNav links={navLinks} />
      
      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
          onDeleteBrand={(brandId, brandName) => setDeleteModal({ isVisible: true, type: 'brand', id: brandId, name: brandName })}
          onDeleteCollection={(collectionId, collectionName) => setDeleteModal({ isVisible: true, type: 'collection', id: collectionId, name: collectionName })}
        />
        
        {/* Main Content */}
        <main style={{
          flex: 1,
          padding: 'var(--spacing-4)',
          overflowY: 'auto',
          backgroundColor: 'var(--background-page)'
        }}>
          {/* Loading State - Only show when no cached data exists */}
          {loading && brands.length === 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <Spinner size={32} />
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div style={{
              padding: 'var(--spacing-3)',
              marginBottom: 'var(--spacing-3)',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: 'var(--border-radius-md)',
              color: '#c00'
            }}>
              <p style={{ margin: 0, marginBottom: 'var(--spacing-2)' }}>Error: {error?.message || 'Failed to load brands'}</p>
              <Button 
                variant="secondary" 
                size="small"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty State - No Brands */}
          {!loading && !isError && brands.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-1)',
              alignItems: 'flex-start'
            }}>
              {/* Title */}
              <h1 style={{
                margin: 0,
                fontFamily: 'var(--font-family-heading)',
                fontSize: '40px',
                fontWeight: 'var(--font-weight-bold)',
                lineHeight: 'normal',
                color: '#2c2f29',
                textAlign: 'left'
              }}>
                Welcome to Proko
              </h1>
              
              {/* Description */}
              <p style={{
                margin: 0,
                fontFamily: 'var(--font-family-body)',
                fontSize: '18px',
                fontWeight: 'var(--font-weight-medium)',
                lineHeight: 'normal',
                color: 'var(--text-brand)',
                textAlign: 'left'
              }}>
                Manage your brands and collections to generate professional training decks.
              </p>
              
              {/* How it works section */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-1)',
                alignItems: 'flex-start',
                marginTop: 'var(--spacing-3)'
              }}>
                <h2 style={{
                  margin: 0,
                  fontFamily: 'var(--font-family-heading)',
                  fontSize: '24px',
                  fontWeight: 'var(--font-weight-bold)',
                  lineHeight: 'normal',
                  color: '#2c2f29',
                  textAlign: 'left'
                }}>
                  How it works
                </h2>
                
                <ol style={{
                  margin: 0,
                  padding: 0,
                  paddingLeft: '21px',
                  fontFamily: 'var(--font-family-body)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-regular)',
                  lineHeight: '1.8',
                  color: 'var(--text-secondary)',
                  textAlign: 'left',
                  listStyleType: 'decimal',
                  width: '751px'
                }}>
                  <li style={{ marginBottom: 0 }}>Create a brand profile.</li>
                  <li style={{ marginBottom: 0 }}>Add a collection to the brand.</li>
                  <li style={{ marginBottom: 0 }}>Upload the collection's linesheet with other relevant collection material.</li>
                  <li style={{ marginBottom: 0 }}>Select the types of training material and collection items to include in your deck.</li>
                  <li style={{ marginBottom: 0 }}>Generate your customized training deck!</li>
                </ol>
              </div>
              
              {/* Get Started Button Wrapper */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                marginTop: 'var(--spacing-3)'
              }}>
                <Button
                  variant="highlight"
                  onClick={() => setIsNewBrandModalVisible(true)}
                  style={{
                    width: '237px',
                    height: '52px',
                    fontSize: '18px',
                    fontWeight: 'var(--font-weight-semi-bold)'
                  }}
                >
                  Get started
                </Button>
              </div>
            </div>
          )}
          
          {/* Brands List - When data exists */}
          {!loading && !error && brands.length > 0 && (
            <div>
              {/* Welcome Header */}
              <h1 style={{
                margin: 0,
                marginBottom: 'var(--spacing-4)',
                fontFamily: 'var(--font-family-heading)',
                fontSize: '40px',
                fontWeight: 'var(--font-weight-bold)',
                lineHeight: 'normal',
                color: '#2c2f29',
                textAlign: 'left'
              }}>
                Welcome to Proko
              </h1>

              {/* Brand Cards Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 'var(--spacing-3)'
              }}>
                {brands.map((brand) => (
                  <BrandCard
                    key={brand.id}
                    brandName={brand.name}
                    brandLogo={brand.logo}
                    collections={brand.collections}
                    onEditBrand={() => {
                      navigate(`/brands/${brand.id}/edit`);
                    }}
                    onAddCollection={() => setNewCollectionBrandId(brand.id)}
                    onCollectionClick={(collection) => {
                      console.log('Navigate to collection:', collection.name);
                      // TODO: Navigate to collection page
                      navigate(`/collection-settings/${collection.id}`);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isVisible={deleteModal.isVisible}
        onClose={() => setDeleteModal({ isVisible: false, type: null, id: null, name: '' })}
        onConfirm={async () => {
          try {
            if (deleteModal.type === 'brand') {
              await deleteBrandMutation.mutateAsync(deleteModal.id);
            } else if (deleteModal.type === 'collection') {
              await deleteCollectionMutation.mutateAsync(deleteModal.id);
            }
            setDeleteModal({ isVisible: false, type: null, id: null, name: '' });
          } catch (error) {
            console.error('Failed to delete:', error);
          }
        }}
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

export default DashboardPage;
