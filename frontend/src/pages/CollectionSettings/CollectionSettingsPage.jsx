import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import TopNav from '../../components/features/TopNav/TopNav';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import Tabs from '../../components/ui/Tabs/Tabs';
import SectionHeader from '../../components/ui/SectionHeader/SectionHeader';
import Checkbox from '../../components/ui/Checkbox/Checkbox';
import CategoryGroup from '../../components/ui/CategoryGroup/CategoryGroup';
import Button from '../../components/ui/Button/Button';
import CheckboxList from '../../components/ui/CheckboxList/CheckboxList';
import ProductPreview from '../../components/ui/ProductPreview/ProductPreview';
import Dropdown from '../../components/ui/Dropdown/Dropdown';
import FileUpload from '../../components/ui/FileUpload/FileUpload';
import POFileUpload from '../../components/ui/POFileUpload/POFileUpload';
import PillCounter from '../../components/ui/PillCounter/PillCounter';
import ViewToggle from '../../components/ui/ViewToggle/ViewToggle';
import SearchBar from '../../components/ui/SearchBar/SearchBar';
import LayoutOptions from '../../components/features/LayoutOptions/LayoutOptions';
import Footer from '../../components/features/Footer/Footer';
import { useBrands } from '../../hooks/useBrands';
import { useCollection } from '../../hooks/useCollection';
import { useUpdateCollection } from '../../hooks/useCollectionMutations';
import { useCollectionDocuments, useUploadDocument, useDeleteDocument } from '../../hooks/useCollectionDocuments';
import { useProcessingStatus } from '../../hooks/useProcessingStatus';
import { useProcessDocuments, useCancelDocumentProcessing, useMarkDocumentsStale } from '../../hooks/useDocumentProcessing';
import { useGenerateItems, useCancelItemGeneration } from '../../hooks/useItemGeneration';
import ProcessingProgress from '../../components/ui/ProcessingProgress/ProcessingProgress';

function CollectionSettingsPage() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Fetch brands with React Query
  const { data: brands = [] } = useBrands();
  
  // Fetch collection details
  const { data: collectionData } = useCollection(collectionId);
  
  // Fetch collection documents
  const { data: documents = [] } = useCollectionDocuments(collectionId);
  
  // Fetch processing status (with refetch for manual polling)
  const { data: processingStatus, refetch: refetchProcessingStatus } = useProcessingStatus(collectionId);
  
  // Collection update mutation
  const updateCollectionMutation = useUpdateCollection();
  
  // Document mutations
  const uploadDocumentMutation = useUploadDocument();
  const deleteDocumentMutation = useDeleteDocument();
  
  // Processing mutations
  const processDocumentsMutation = useProcessDocuments();
  const cancelDocProcessingMutation = useCancelDocumentProcessing();
  const markDocumentsStaleMutation = useMarkDocumentsStale();
  const generateItemsMutation = useGenerateItems();
  const cancelItemGenMutation = useCancelItemGeneration();
  
  // Filter documents by type
  const linesheetDocuments = documents.filter(doc => doc.type === 'line_sheet');
  const purchaseOrderDocuments = documents.filter(doc => doc.type === 'purchase_order');
  
  // Compute Process Documents button state
  // Button should be ENABLED when:
  // - At least 1 Line Sheet AND at least 1 PO exist AND (never processed OR failed OR cancelled OR stale)
  // Button should be DISABLED when:
  // - Missing Line Sheet OR missing PO OR processing in progress OR (completed AND not stale)
  const docProcessingStatus = processingStatus?.document_processing;
  const stagedDocIds = [...linesheetDocuments, ...purchaseOrderDocuments].map(d => d.document_id);
  const hasLineSheet = linesheetDocuments.length > 0;
  const hasPurchaseOrder = purchaseOrderDocuments.length > 0;
  const hasRequiredDocuments = hasLineSheet && hasPurchaseOrder;
  const isProcessing = docProcessingStatus?.status === 'processing';
  const isCompleted = docProcessingStatus?.status === 'completed';
  const isFailed = docProcessingStatus?.status === 'failed';
  const isCancelled = docProcessingStatus?.status === 'cancelled';
  const isStale = docProcessingStatus?.is_stale === true;
  
  const shouldEnableProcessButton = hasRequiredDocuments && !isProcessing && (
    !isCompleted ||  // Never completed (idle, failed, cancelled)
    isFailed ||
    isCancelled ||
    isStale  // Completed but stale (docs changed)
  );

  // Top nav links
  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/generated-decks', label: 'Generated Decks' },
    { path: '/settings', label: 'Settings' }
  ];

  // Sidebar state
  const [activeBrand, setActiveBrand] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);
  
  // Set activeCollection from URL and find parent brand
  useEffect(() => {
    if (collectionId && brands.length > 0) {
      setActiveCollection(collectionId);
      
      // Find which brand contains this collection
      const parentBrand = brands.find(brand => 
        brand.collections.some(col => col.id === collectionId)
      );
      
      if (parentBrand) {
        setActiveBrand(parentBrand.id);
      }
    }
  }, [collectionId, brands]);

  // Tabs configuration
  const [activeTab, setActiveTab] = useState(1); // Default to Collection Info
  
  // Compute tab enablement based on processing completion
  const hasCategories = 
    processingStatus?.document_processing?.status === 'completed' &&
    collectionData?.categories?.length > 0;
  
  const hasItems = 
    processingStatus?.item_generation?.status === 'completed' &&
    collectionData?.items?.length > 0;
  
  const tabs = [
    { id: 1, number: 1, label: 'Collection Info', enabled: true },
    { id: 2, number: 2, label: 'Deck Settings', enabled: hasCategories },
    { id: 3, number: 3, label: 'Collection Items', enabled: hasCategories },
    { id: 4, number: 4, label: 'Generate Deck', enabled: hasItems }
  ];

  // Collection Info - Collection Name, Type and Year
  const [collectionName, setCollectionName] = useState('');
  const [collectionType, setCollectionType] = useState('spring_summer');
  const [collectionYear, setCollectionYear] = useState('2025');
  const [collectionInformation, setCollectionInformation] = useState('');
  
  // Track original values for change detection
  const [originalValues, setOriginalValues] = useState(null);
  
  // Populate form fields when collection data loads
  useEffect(() => {
    if (collectionData) {
      const name = collectionData.name || '';
      const season = collectionData.season || 'spring_summer';
      const year = String(collectionData.year || new Date().getFullYear());
      const description = collectionData.description || '';
      
      setCollectionName(name);
      setCollectionType(season);
      setCollectionYear(year);
      setCollectionInformation(description);
      
      // Store original values for change detection
      setOriginalValues({ name, season, year, description });
    }
  }, [collectionData]);
  
  // Check if form has been modified
  const hasChanges = originalValues && (
    collectionName !== originalValues.name ||
    collectionType !== originalValues.season ||
    collectionYear !== originalValues.year ||
    collectionInformation !== originalValues.description
  );
  
  // Handle save collection label
  const handleSaveCollectionLabel = async () => {
    try {
      await updateCollectionMutation.mutateAsync({
        collectionId,
        updateData: {
          name: collectionName,
          season: collectionType,
          year: Number(collectionYear),
          description: collectionInformation
        }
      });
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  };
  
  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (updateCollectionMutation.isSuccess) {
      const timer = setTimeout(() => {
        updateCollectionMutation.reset();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateCollectionMutation.isSuccess]);
  
  // State detection on page load - handle processing resumption
  useEffect(() => {
    if (!processingStatus || !collectionData) return;
    
    // If processing is active, polling will automatically resume via useProcessingStatus
    const isProcessing = 
      processingStatus.document_processing?.status === 'processing' ||
      processingStatus.item_generation?.status === 'processing';
    
    if (isProcessing) {
      console.log('Processing in progress, polling active');
    }
    
    // If processing completed, tabs will automatically enable via hasCategories/hasItems
    if (hasCategories) {
      console.log('Categories available, Deck Settings and Collection Items tabs enabled');
    }
    
    if (hasItems) {
      console.log('Items available, Generate Deck tab enabled');
    }
  }, [processingStatus, collectionData, hasCategories, hasItems]);
  
  // Invalidate collection query when processing completes
  useEffect(() => {
    if (!processingStatus) return;
    
    const docCompleted = processingStatus.document_processing?.status === 'completed';
    const itemCompleted = processingStatus.item_generation?.status === 'completed';
    
    if (docCompleted || itemCompleted) {
      // Refetch collection data to get updated categories/items
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
    }
  }, [processingStatus?.document_processing?.status, processingStatus?.item_generation?.status, collectionId, queryClient]);

  // Debug: Log processing status changes
  useEffect(() => {
    console.log('[CollectionSettingsPage] processingStatus changed:', processingStatus);
  }, [processingStatus]);

  // Manual polling for processing status
  // React Query's refetchInterval doesn't work reliably with optimistic updates,
  // so we handle polling manually with setInterval
  // Use a ref to ensure only ONE interval exists at a time
  const pollingIntervalRef = useRef(null);
  
  useEffect(() => {
    const isDocProcessing = processingStatus?.document_processing?.status === 'processing';
    const isItemProcessing = processingStatus?.item_generation?.status === 'processing';
    const shouldPoll = isDocProcessing || isItemProcessing;
    
    // Always clear existing interval first to prevent duplicates
    if (pollingIntervalRef.current) {
      console.log('[CollectionSettingsPage] Clearing existing polling interval');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (shouldPoll) {
      console.log('[CollectionSettingsPage] Starting manual polling (every 2 seconds)');
      
      pollingIntervalRef.current = setInterval(() => {
        console.log('[CollectionSettingsPage] Polling - calling refetch');
        refetchProcessingStatus();
      }, 2000);
    } else {
      console.log('[CollectionSettingsPage] Not polling - status:', {
        docStatus: processingStatus?.document_processing?.status,
        itemStatus: processingStatus?.item_generation?.status
      });
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (pollingIntervalRef.current) {
        console.log('[CollectionSettingsPage] Cleanup - stopping polling');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [processingStatus?.document_processing?.status, processingStatus?.item_generation?.status, refetchProcessingStatus]);

  // Collection Items - View toggle and filters
  const [collectionItemsView, setCollectionItemsView] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bulkAction, setBulkAction] = useState('none');

  const collectionTypeOptions = [
    { value: 'spring_summer', label: 'Spring/Summer' },
    { value: 'fall_winter', label: 'Fall/Winter' },
    { value: 'resort', label: 'Resort' },
    { value: 'pre_fall', label: 'Pre-Fall' }
  ];

  // Generate dynamic year range (5 years future, 5 years past from current year)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => {
    const year = String(currentYear + 5 - i);
    return { value: year, label: year };
  });

  // Intro slides checkbox states
  const [introSlides, setIntroSlides] = useState({
    coverPage: true,
    brandIntro: false,
    brandHistory: false,
    brandPersonality: false,
    brandValues: true,
    coreCollections: true,
    flagshipStores: true,
    productCategories: false
  });

  const handleIntroSlideChange = (key) => {
    setIntroSlides(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Category management
  const [categories, setCategories] = useState([
    { name: 'Outerwear', subcategories: ['Coats', 'Jackets'] },
    { name: 'Knitwear', subcategories: ['Sweaters'] },
    { name: 'Accessories', subcategories: [] }
  ]);

  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setCategories(prev => [...prev, { name: newCategoryName, subcategories: [] }]);
      setNewCategoryName('');
    }
  };

  const handleAddSubcategory = (categoryIndex) => {
    const subcategoryName = window.prompt('Enter subcategory name:');
    if (subcategoryName) {
      setCategories(prev => {
        const updated = [...prev];
        updated[categoryIndex].subcategories.push(subcategoryName);
        return updated;
      });
    }
  };

  const handleDeleteSubcategory = (categoryIndex, subcategoryIndex) => {
    setCategories(prev => {
      const updated = [...prev];
      updated[categoryIndex].subcategories.splice(subcategoryIndex, 1);
      return updated;
    });
  };

  const handleDeleteCategory = (categoryIndex) => {
    if (window.confirm(`Delete ${categories[categoryIndex].name} category?`)) {
      setCategories(prev => prev.filter((_, i) => i !== categoryIndex));
    }
  };

  // Product details selection
  const [productDetails, setProductDetails] = useState([
    { id: 'productName', label: 'Product Name', checked: true },
    { id: 'sku', label: 'SKU', checked: true },
    { id: 'description', label: 'Description', checked: true },
    { id: 'colour', label: 'Colour', checked: true },
    { id: 'material', label: 'Material', checked: true },
    { id: 'sizes', label: 'Sizes', checked: true },
    { id: 'origin', label: 'Origin', checked: true },
    { id: 'wholesalePrice', label: 'Wholesale Price', checked: true },
    { id: 'rrp', label: 'RRP', checked: true }
  ]);

  const handleDetailChange = (id, checked) => {
    setProductDetails(prev => 
      prev.map(item => 
        item.id === id ? { ...item, checked } : item
      )
    );
  };

  // Language selection
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  
  const languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'french', label: 'French' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'german', label: 'German' },
    { value: 'italian', label: 'Italian' },
    { value: 'portuguese', label: 'Portuguese' }
  ];

  // Layout selection
  const [selectedLayout, setSelectedLayout] = useState(1);

  const handleLayoutChange = (layout) => {
    setSelectedLayout(layout);
    console.log(`Layout changed to: ${layout} products per slide`);
  };

  const handleSaveLayout = () => {
    alert(`Saved! Layout: ${selectedLayout} products per slide`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Navigation */}
      <TopNav
        links={navLinks}
        logoText="Proko"
        userAvatarUrl="https://via.placeholder.com/32"
        userName="User"
      />
      
      {/* Main Layout: Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <Sidebar
          brands={brands}
          activeBrand={activeBrand}
          activeCollection={activeCollection}
          onBrandClick={(brandId) => setActiveBrand(brandId)}
          onCollectionClick={(collection) => {
            navigate(`/collection-settings/${collection.id}`);
          }}
          onNewBrand={() => {
            console.log('New Brand clicked');
            // TODO: Add create brand logic
          }}
          onNewCollection={(brandId) => {
            console.log('New Collection for brand:', brandId);
            // TODO: Add create collection logic
          }}
        />
        
        {/* Main Content Wrapper */}
        <div style={{ 
          flex: 1, 
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Scrollable Content - Full width grey background */}
          <div style={{ 
            flex: 1, 
            backgroundColor: 'var(--background-light)',
            padding: 'var(--spacing-4) 0',
            overflowY: 'auto'
          }}>
          {/* Content Container - Constrained width */}
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%',
            padding: '0 var(--spacing-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-3)'
          }}>
          {/* Tabs */}
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          
          {/* Tab 1: Collection Info */}
          {activeTab === 1 && (
            <>
              {/* Collection Label Section */}
              <div style={{ 
                backgroundColor: 'var(--background-white)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: 'var(--spacing-4)'
              }}>
                <SectionHeader
                  title="Collection Label"
                  buttonText={updateCollectionMutation.isPending ? "Saving..." : "Save Changes"}
                  onButtonClick={handleSaveCollectionLabel}
                  buttonDisabled={!hasChanges || updateCollectionMutation.isPending}
                />
                
                {/* Success Message */}
                {updateCollectionMutation.isSuccess && (
                  <div style={{
                    padding: 'var(--spacing-2) var(--spacing-3)',
                    backgroundColor: '#d4edda',
                    borderBottom: '1px solid #c3e6cb',
                    color: '#155724',
                    fontFamily: 'var(--font-family-body)',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    ✓ Collection updated successfully
                  </div>
                )}
                
                {/* Error Message */}
                {updateCollectionMutation.isError && (
                  <div style={{
                    padding: 'var(--spacing-2) var(--spacing-3)',
                    backgroundColor: '#f8d7da',
                    borderBottom: '1px solid #f5c6cb',
                    color: '#721c24',
                    fontFamily: 'var(--font-family-body)',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    ✗ {updateCollectionMutation.error?.message || 'Failed to update collection'}
                  </div>
                )}
                
                {/* Section Content - Form Fields */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-3)',
                  padding: 'var(--spacing-3)'
                }}>
                  {/* Collection Name Input Field */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-1)',
                    maxWidth: '535px'
                  }}>
                    <label style={{
                      fontFamily: 'var(--font-family-body)',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                      lineHeight: 'var(--line-height-xs)',
                      color: 'var(--text-secondary)',
                      textAlign: 'left'
                    }}>
                      Collection Name
                    </label>
                    <input
                      type="text"
                      value={collectionName}
                      onChange={(e) => setCollectionName(e.target.value)}
                      placeholder=""
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '12px 16px',
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-regular)',
                        lineHeight: 'var(--line-height-sm)',
                        color: 'var(--text-brand)',
                        backgroundColor: 'var(--background-white)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--border-radius-md)',
                        outline: 'none',
                        transition: 'border-color 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--border-primary)';
                        e.target.style.boxShadow = '0 0 0 2px rgba(44, 53, 40, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-medium)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Input Fields Grid - Collection Type & Year */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    alignItems: 'flex-start'
                  }}>
                    {/* Collection Type Field Wrapper */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-1)',
                      flex: '1 1 0',
                      minWidth: '0'
                    }}>
                      <Dropdown
                        label="Collection Type"
                        value={collectionType}
                        options={collectionTypeOptions}
                        onChange={setCollectionType}
                      />
                    </div>
                    
                    {/* Year Field Wrapper */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-1)',
                      flex: '1 1 0',
                      minWidth: '0'
                    }}>
                      <Dropdown
                        label="Year"
                        value={collectionYear}
                        options={yearOptions}
                        onChange={setCollectionYear}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Collection Assets Section */}
              <div style={{ 
                backgroundColor: 'var(--background-white)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: 'var(--spacing-4)'
              }}>
                <SectionHeader
                  title="Upload Collection Assets"
                  buttonText="Process Documents"
                  onButtonClick={() => {
                    console.log('[CollectionSettingsPage] Process Documents clicked');
                    processDocumentsMutation.mutate({ collectionId, documentIds: stagedDocIds });
                  }}
                  buttonDisabled={!shouldEnableProcessButton}
                />
                
                {/* Processing Progress */}
                <ProcessingProgress
                  title="Document Processing Progress"
                  status={processingStatus?.document_processing?.status || 'idle'}
                  currentPhase={processingStatus?.document_processing?.current_phase}
                  progress={processingStatus?.document_processing?.progress}
                  error={processingStatus?.document_processing?.error}
                  isStale={isStale}
                  onCancel={() => cancelDocProcessingMutation.mutate({ collectionId })}
                />
                
                {/* Section Content */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  padding: 'var(--spacing-3)'
                }}>
                  {/* Linesheet Files Upload */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {/* Title with Required Tag */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <h3 style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-semi-bold)',
                        lineHeight: 'var(--line-height-xs)',
                        color: 'var(--text-brand)',
                        margin: 0
                      }}>
                        Linesheet Files
                      </h3>
                      <span style={{
                        backgroundColor: 'rgba(125, 59, 81, 0.1)',
                        color: 'var(--color-brand-wine)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'var(--font-weight-regular)',
                        lineHeight: '16px'
                      }}>
                        Required
                      </span>
                    </div>
                    
                    {/* FileUpload Component */}
                    <FileUpload
                      initialFiles={linesheetDocuments}
                      onFilesSelected={async (files) => {
                        // Upload each file (staged, not processed)
                        for (const file of files) {
                          try {
                            await uploadDocumentMutation.mutateAsync({
                              collectionId,
                              file,
                              type: 'line_sheet',
                              process: false
                            });
                          } catch (error) {
                            console.error('Failed to upload linesheet:', error);
                          }
                        }
                        // Mark processing as stale if previously completed
                        if (isCompleted) {
                          markDocumentsStaleMutation.mutate({ collectionId });
                        }
                      }}
                      onFileRemove={async (documentId) => {
                        // Delete file immediately
                        try {
                          await deleteDocumentMutation.mutateAsync({
                            collectionId,
                            documentId
                          });
                          // Mark processing as stale if previously completed
                          if (isCompleted) {
                            markDocumentsStaleMutation.mutate({ collectionId });
                          }
                        } catch (error) {
                          console.error('Failed to delete linesheet:', error);
                        }
                      }}
                    />
                  </div>

                  {/* Purchase Order Files Upload */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {/* Title with Required Tag */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <h3 style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-semi-bold)',
                        lineHeight: 'var(--line-height-xs)',
                        color: 'var(--text-brand)',
                        margin: 0
                      }}>
                        Purchase Order Files
                      </h3>
                      <span style={{
                        backgroundColor: 'rgba(125, 59, 81, 0.1)',
                        color: 'var(--color-brand-wine)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'var(--font-weight-regular)',
                        lineHeight: '16px'
                      }}>
                        Required
                      </span>
                    </div>
                    
                    {/* Description Text */}
                    <p style={{
                      fontFamily: 'var(--font-family-body)',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-regular)',
                      lineHeight: 'var(--line-height-xs)',
                      color: 'var(--text-secondary)',
                      margin: 0,
                      textAlign: 'left'
                    }}>
                      Uploading a purchase order will match it against your linesheet and automatically include only the items you've ordered in your training deck. Items not ordered will be hidden by default, but you can still view and manage all items anytime in the Collection Items tab.
                    </p>
                    
                    {/* POFileUpload Component */}
                    <POFileUpload
                      initialFiles={purchaseOrderDocuments}
                      onFilesSelected={async (files) => {
                        // Upload each file (staged, not processed)
                        for (const file of files) {
                          try {
                            await uploadDocumentMutation.mutateAsync({
                              collectionId,
                              file,
                              type: 'purchase_order',
                              process: false
                            });
                          } catch (error) {
                            console.error('Failed to upload purchase order:', error);
                          }
                        }
                        // Mark processing as stale if previously completed
                        if (isCompleted) {
                          markDocumentsStaleMutation.mutate({ collectionId });
                        }
                      }}
                      onFileRemove={async (documentId) => {
                        // Delete file immediately
                        try {
                          await deleteDocumentMutation.mutateAsync({
                            collectionId,
                            documentId
                          });
                          // Mark processing as stale if previously completed
                          if (isCompleted) {
                            markDocumentsStaleMutation.mutate({ collectionId });
                          }
                        } catch (error) {
                          console.error('Failed to delete purchase order:', error);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Collection Information Section */}
              <div style={{ 
                backgroundColor: 'var(--background-white)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: 'var(--spacing-4)'
              }}>
                <SectionHeader
                  title="Collection Information"
                  description="Auto-generated content from uploaded documents. Edit for additional context. This information will be used to create better content in the deck you create. The more relevant information, the better the output will be."
                />
                
                {/* Section Content - Textarea and Save Button */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-3)',
                  padding: 'var(--spacing-3)'
                }}>
                  {/* Large Textarea */}
                  <textarea
                    value={collectionInformation}
                    onChange={(e) => setCollectionInformation(e.target.value)}
                    placeholder="Modern minimalism meets urban sophistication. This collection draws inspiration from architectural forms and contemporary city life, featuring clean lines and structured silhouettes. Premium materials including Italian wool and Japanese technical fabrics. Emphasis on versatile pieces that transition from day to evening wear. Professional women aged 25-45 who value quality, craftsmanship, and timeless design. Urban lifestyle with appreciation for luxury and sustainability."
                    style={{
                      width: '100%',
                      minHeight: '150px',
                      padding: 'var(--spacing-2) var(--spacing-3)',
                      fontFamily: 'var(--font-family-body)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-regular)',
                      lineHeight: 'var(--line-height-sm)',
                      color: 'var(--text-brand)',
                      backgroundColor: 'var(--background-white)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--border-radius-md)',
                      outline: 'none',
                      resize: 'vertical',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--border-primary)';
                      e.target.style.boxShadow = '0 0 0 2px rgba(44, 53, 40, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-medium)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  
                  {/* Save Button - Right Aligned */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}>
                    <Button
                      variant="primary"
                      onClick={() => {
                        console.log('Save Collection Information:', collectionInformation);
                        // TODO: Add save logic
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>

              {/* Continue to Deck Settings Button */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                paddingLeft: '433px',
                paddingRight: '433px',
                paddingTop: 0,
                paddingBottom: 0,
                gap: '10px',
                marginBottom: 'var(--spacing-4)'
              }}>
                <Button
                  variant="highlight"
                  size="lg"
                  disabled={!hasCategories}
                  onClick={() => {
                    if (hasCategories) {
                      console.log('Continue to Deck Settings clicked');
                      setActiveTab(2); // Navigate to Deck Settings tab
                    }
                  }}
                >
                  Continue to Deck Settings
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
              </div>
            </>
          )}
          
          {/* Tab 2: Deck Settings */}
          {activeTab === 2 && (
            <>
          {/* Intro Slides Section */}
          <div style={{ 
            backgroundColor: 'var(--background-white)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--border-radius-md)'
          }}>
            <SectionHeader
              title="Intro Slides"
              description="These are the slides that appear at the beginning of the deck. Select which ones to generate and include."
              buttonText="Save Changes"
              onButtonClick={() => alert('Save Changes clicked')}
            />
            
            {/* Checkboxes */}
            <div style={{ 
              padding: 'var(--spacing-3)',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'var(--spacing-2)'
            }}>
              <Checkbox
                checked={introSlides.coverPage}
                onChange={() => handleIntroSlideChange('coverPage')}
                label="Cover Page"
                showInfo={true}
                onInfoClick={() => alert('Info about Cover Page')}
              />
              
              <Checkbox
                checked={introSlides.brandIntro}
                onChange={() => handleIntroSlideChange('brandIntro')}
                label="Brand Introduction"
                showInfo={true}
                onInfoClick={() => alert('Info about Brand Introduction')}
              />
              
              <Checkbox
                checked={introSlides.brandHistory}
                onChange={() => handleIntroSlideChange('brandHistory')}
                label="Brand History"
                showInfo={true}
                onInfoClick={() => alert('Info about Brand History')}
              />
              
              <Checkbox
                checked={introSlides.brandPersonality}
                onChange={() => handleIntroSlideChange('brandPersonality')}
                label="Brand Personality"
                showInfo={true}
                onInfoClick={() => alert('Info about Brand Personality')}
              />
              
              <Checkbox
                checked={introSlides.brandValues}
                onChange={() => handleIntroSlideChange('brandValues')}
                label="Brand Values"
                showInfo={true}
                onInfoClick={() => alert('Info about Brand Values')}
              />
              
              <Checkbox
                checked={introSlides.coreCollections}
                onChange={() => handleIntroSlideChange('coreCollections')}
                label="Core Collections & Signature Categories"
                showInfo={true}
                onInfoClick={() => alert('Info about Core Collections')}
              />
              
              <Checkbox
                checked={introSlides.flagshipStores}
                onChange={() => handleIntroSlideChange('flagshipStores')}
                label="Flagship Stores & Experiences"
                showInfo={true}
                onInfoClick={() => alert('Info about Flagship Stores')}
              />
              
              <Checkbox
                checked={introSlides.productCategories}
                onChange={() => handleIntroSlideChange('productCategories')}
                label="Product Categories"
                showInfo={true}
                onInfoClick={() => alert('Info about Product Categories')}
              />
            </div>
          </div>

          {/* Collection Categories Section */}
          <div style={{ 
            backgroundColor: 'var(--background-white)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--border-radius-md)'
          }}>
            <SectionHeader
              title="Collection Categories"
              description="Edit the categories in this collection. You can organize collection items into these categories in the collection items tab."
              buttonText="Save Changes"
              onButtonClick={() => alert('Save Categories clicked')}
            />
            
            {/* Add Category Input */}
            <div style={{ 
              padding: 'var(--spacing-3)',
              display: 'flex',
              gap: 'var(--spacing-2)',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="Add a category"
                style={{
                  flex: 1,
                  padding: 'var(--spacing-1)',
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-family-body)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--border-radius-md)',
                  outline: 'none'
                }}
              />
              <Button variant="primary" onClick={handleAddCategory}>
                Add
              </Button>
            </div>

            {/* Categories List */}
            <div style={{ 
              padding: '0 var(--spacing-3) var(--spacing-3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)'
            }}>
              {categories.map((category, index) => (
                <CategoryGroup
                  key={index}
                  categoryName={category.name}
                  subcategories={category.subcategories}
                  onAddSubcategory={() => handleAddSubcategory(index)}
                  onDeleteSubcategory={(subIndex) => handleDeleteSubcategory(index, subIndex)}
                  onDeleteCategory={() => handleDeleteCategory(index)}
                />
              ))}
            </div>
          </div>

          {/* Collection Item Details Section */}
          <div style={{ 
            backgroundColor: 'var(--background-white)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--border-radius-md)'
          }}>
            <SectionHeader
              title="Collection Item Details"
              description="Select which of the collection item details to have showing in the deck."
              buttonText="Save Changes"
              onButtonClick={() => alert('Save Item Details clicked')}
            />
            
            {/* CheckboxList and Product Preview side-by-side */}
            <div style={{ 
              padding: 'var(--spacing-3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              {/* Left: Details Selection */}
              <div style={{ width: '527px' }}>
                <h3 style={{ 
                  fontSize: 'var(--font-size-sm)', 
                  marginBottom: 'var(--spacing-2)',
                  color: 'var(--text-brand)',
                  fontWeight: 'var(--font-weight-medium)',
                  lineHeight: 'var(--line-height-sm)'
                }}>
                  Select Details to Include
                </h3>
                <CheckboxList 
                  items={productDetails}
                  onChange={handleDetailChange}
                />
              </div>
              
              {/* Right: Product Preview */}
              <div style={{ width: '527px' }}>
                <h3 style={{ 
                  fontSize: 'var(--font-size-sm)', 
                  marginBottom: 'var(--spacing-2)',
                  color: 'var(--text-brand)',
                  fontWeight: 'var(--font-weight-medium)',
                  lineHeight: 'var(--line-height-sm)'
                }}>
                  Preview Output
                </h3>
                <ProductPreview
                  productName="You're Weird Boy T"
                  sku="R13WK001-K128B"
                  material="Cotton Cashmere"
                  color="Ecru White"
                  composition="95% Cotton, 5% Cashmere"
                  sizes="XS - L"
                  origin="China"
                  wholesale={140.00}
                  rrp={325.00}
                  currency="$"
                  imageUrl="https://via.placeholder.com/128x160/7d3b51/ffffff?text=Product"
                />
              </div>
            </div>
          </div>

          {/* Deck Localization Section */}
          <div style={{ 
            backgroundColor: 'var(--background-white)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--border-radius-md)'
          }}>
            <SectionHeader
              title="Deck Localization"
              description="Generated deck content will be translated to the selected language"
              buttonText="Save Changes"
              onButtonClick={() => {}}
              buttonDisabled={true}
            />
            
            {/* Language Dropdown */}
            <div style={{ padding: 'var(--spacing-3)' }}>
              <Dropdown
                label="Select Language"
                value={selectedLanguage}
                options={languageOptions}
                onChange={setSelectedLanguage}
              />
            </div>
          </div>

          {/* Deck Layout Options Section */}
          <LayoutOptions
            selectedLayout={selectedLayout}
            onLayoutChange={handleLayoutChange}
            onSave={handleSaveLayout}
          />

          {/* Continue to Collection Items Button */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: '433px',
            paddingRight: '433px',
            paddingTop: '0',
            paddingBottom: '0',
            gap: '10px'
          }}>
            <Button 
              variant="highlight" 
              size="lg"
              onClick={() => setActiveTab(3)}
            >
              Continue to Collection Items
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path 
                  d="M6 12L10 8L6 4" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>
          </>
          )}
          
          {/* Tab 3: Collection Items */}
          {activeTab === 3 && (
            <div style={{
              backgroundColor: 'var(--background-white)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--border-radius-md)',
              marginBottom: 'var(--spacing-4)'
            }}>
              <SectionHeader
                title="Collection Items"
                buttonText={processingStatus?.item_generation?.status === 'completed' ? 'Regenerate Items' : 'Generate Items'}
                onButtonClick={() => {
                  console.log('[CollectionSettingsPage] Generate Items clicked');
                  generateItemsMutation.mutate({ collectionId });
                }}
                buttonDisabled={!hasCategories || processingStatus?.item_generation?.status === 'processing'}
              />
              
              {/* Processing Progress */}
              <ProcessingProgress
                title="Item Generation Progress"
                status={processingStatus?.item_generation?.status || 'idle'}
                currentPhase={processingStatus?.item_generation?.current_step}
                progress={processingStatus?.item_generation?.progress}
                error={processingStatus?.item_generation?.error}
                onCancel={() => cancelItemGenMutation.mutate({ collectionId })}
              />

              {/* Search and Filters Section */}
              <div style={{
                display: 'flex',
                gap: 'var(--spacing-2)',
                alignItems: 'center',
                padding: 'var(--spacing-3)'
              }}>
                {/* Search Bar - Grows to fill space */}
                <div style={{ flex: '1 1 0', minWidth: '0' }}>
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by SKU, name, color..."
                  />
                </div>

                {/* Category Filter Dropdown */}
                <div style={{ width: '154px' }}>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '4px 8px',
                      fontFamily: 'var(--font-family-body)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-regular)',
                      lineHeight: 'var(--line-height-sm)',
                      color: 'var(--text-brand)',
                      backgroundColor: 'var(--background-white)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--border-radius-md)',
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'14\' height=\'14\' viewBox=\'0 0 14 14\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3.5 5.25L7 8.75L10.5 5.25\' stroke=\'%239ca3af\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      paddingRight: '30px'
                    }}
                  >
                    <option value="all">All Categories</option>
                    <option value="outerwear">Outerwear</option>
                    <option value="knitwear">Knitwear</option>
                    <option value="accessories">Accessories</option>
                  </select>
                </div>

                {/* Status Filter Dropdown */}
                <div style={{ width: '121px' }}>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '4px 8px',
                      fontFamily: 'var(--font-family-body)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-regular)',
                      lineHeight: 'var(--line-height-sm)',
                      color: 'var(--text-brand)',
                      backgroundColor: 'var(--background-white)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--border-radius-md)',
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'14\' height=\'14\' viewBox=\'0 0 14 14\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3.5 5.25L7 8.75L10.5 5.25\' stroke=\'%239ca3af\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      paddingRight: '30px'
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="included">Included</option>
                    <option value="excluded">Excluded</option>
                  </select>
                </div>

                {/* Bulk Actions Dropdown */}
                <div style={{ width: '152px' }}>
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '4px 8px',
                      fontFamily: 'var(--font-family-body)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-regular)',
                      lineHeight: 'var(--line-height-sm)',
                      color: 'var(--text-brand)',
                      backgroundColor: 'var(--background-white)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--border-radius-md)',
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'14\' height=\'14\' viewBox=\'0 0 14 14\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3.5 5.25L7 8.75L10.5 5.25\' stroke=\'%239ca3af\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      paddingRight: '30px'
                    }}
                  >
                    <option value="none">Bulk Actions</option>
                    <option value="include">Include Selected</option>
                    <option value="exclude">Exclude Selected</option>
                    <option value="delete">Delete Selected</option>
                  </select>
                </div>
              </div>

              {/* Collection Items Content - Coming Soon */}
              <div style={{
                padding: 'var(--spacing-4)',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}>
                <p>Content coming soon...</p>
              </div>
            </div>
          )}
          
          {/* Tab 4: Generate Deck */}
          {activeTab === 4 && (
            <div style={{
              backgroundColor: 'var(--background-white)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--border-radius-md)',
              padding: 'var(--spacing-4)',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <h2 style={{ color: 'var(--text-brand)', marginBottom: 'var(--spacing-2)' }}>
                Generate Deck
              </h2>
              <p>Content coming soon...</p>
            </div>
          )}
          </div>
          </div>
          
          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default CollectionSettingsPage;
