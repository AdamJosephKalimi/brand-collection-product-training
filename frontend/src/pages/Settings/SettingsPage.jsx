import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import TopNav from '../../components/features/TopNav/TopNav';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import NewBrandModal from '../../components/ui/NewBrandModal/NewBrandModal';
import NewCollectionModal from '../../components/ui/NewCollectionModal/NewCollectionModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { useBrands } from '../../hooks/useBrands';
import { useCreateBrand } from '../../hooks/useCreateBrand';
import { useCreateCollection } from '../../hooks/useCreateCollection';
import { useDeleteBrand } from '../../hooks/useDeleteBrand';
import { useDeleteCollection } from '../../hooks/useDeleteCollection';
import styles from './SettingsPage.module.css';

function SettingsPage() {
  const navigate = useNavigate();
  const [activeBrand, setActiveBrand] = useState(null);
  const [isNewBrandModalVisible, setIsNewBrandModalVisible] = useState(false);
  const createBrandMutation = useCreateBrand();
  const [newCollectionBrandId, setNewCollectionBrandId] = useState(null);
  const [collectionLoadingMessage, setCollectionLoadingMessage] = useState('Creating...');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const createCollectionMutation = useCreateCollection();
  const queryClient = useQueryClient();
  
  // Delete Modal state
  const [deleteModal, setDeleteModal] = useState({ isVisible: false, type: null, id: null, name: '' });
  const deleteBrandMutation = useDeleteBrand();
  const deleteCollectionMutation = useDeleteCollection();

  // Top nav links
  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/generated-decks', label: 'Generated Decks' },
    { path: '/settings', label: 'Settings' }
  ];

  // Fetch brands for sidebar
  const { data: brands = [] } = useBrands();

  // Set first brand as active when data loads
  React.useEffect(() => {
    if (brands.length > 0 && !activeBrand) {
      setActiveBrand(brands[0].id);
    }
  }, [brands, activeBrand]);

  const handleBrandChange = (brandId) => {
    setActiveBrand(brandId);
  };

  const handleNewBrandSubmit = async (brandData) => {
    try {
      await createBrandMutation.mutateAsync(brandData);
      setIsNewBrandModalVisible(false);
    } catch (err) {
      console.error('Failed to create brand:', err);
    }
  };

  const handleNewCollectionSubmit = async (collectionData) => {
    if (!newCollectionBrandId) return;
    
    setIsCreatingCollection(true);
    setCollectionLoadingMessage('Creating collection...');
    
    try {
      const result = await createCollectionMutation.mutateAsync({
        brandId: newCollectionBrandId,
        collectionData: collectionData
      });
      
      await queryClient.invalidateQueries(['brands']);
      setNewCollectionBrandId(null);
      
      if (result?.id) {
        navigate(`/collection-settings/${result.id}`);
      }
    } catch (err) {
      console.error('Failed to create collection:', err);
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const { type, id } = deleteModal;
    
    try {
      if (type === 'brand') {
        await deleteBrandMutation.mutateAsync(id);
        if (activeBrand === id) {
          setActiveBrand(null);
        }
      } else if (type === 'collection') {
        await deleteCollectionMutation.mutateAsync(id);
      }
      setDeleteModal({ isVisible: false, type: null, id: null, name: '' });
    } catch (err) {
      console.error(`Failed to delete ${type}:`, err);
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
          onDeleteBrand={(brandId, brandName) => setDeleteModal({ isVisible: true, type: 'brand', id: brandId, name: brandName })}
          onDeleteCollection={(collectionId, collectionName) => setDeleteModal({ isVisible: true, type: 'collection', id: collectionId, name: collectionName })}
        />
        
        {/* Main Content */}
        <main className={styles.mainContent}>
          <div className={styles.header}>
            <h1 className={styles.title}>Settings</h1>
            <p className={styles.subtitle}>Configure your application preferences</p>
          </div>
          
          <div className={styles.content}>
            {/* Settings content placeholder - components will be added here */}
            <div className={styles.placeholder}>
              <h3>Settings Panel</h3>
              <p>Settings components will be added here.</p>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <NewBrandModal
        isVisible={isNewBrandModalVisible}
        onClose={() => setIsNewBrandModalVisible(false)}
        onSubmit={handleNewBrandSubmit}
        isLoading={createBrandMutation.isLoading}
      />

      <NewCollectionModal
        isVisible={!!newCollectionBrandId}
        onClose={() => setNewCollectionBrandId(null)}
        onSubmit={handleNewCollectionSubmit}
        isLoading={isCreatingCollection}
        loadingMessage={collectionLoadingMessage}
      />

      <ConfirmModal
        isVisible={deleteModal.isVisible}
        onClose={() => setDeleteModal({ isVisible: false, type: null, id: null, name: '' })}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${deleteModal.type === 'brand' ? 'Brand' : 'Collection'}`}
        message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={deleteBrandMutation.isLoading || deleteCollectionMutation.isLoading}
      />
    </div>
  );
}

export default SettingsPage;
