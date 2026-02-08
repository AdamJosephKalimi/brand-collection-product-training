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
import AspectRatioOptions from '../../components/features/AspectRatioOptions/AspectRatioOptions';
import Footer from '../../components/features/Footer/Footer';
import { useBrands } from '../../hooks/useBrands';
import { useCollection } from '../../hooks/useCollection';
import { useUpdateCollection } from '../../hooks/useCollectionMutations';
import { useCollectionDocuments, useUploadDocument, useDeleteDocument } from '../../hooks/useCollectionDocuments';
import { useProcessingStatus } from '../../hooks/useProcessingStatus';
import { useProcessDocuments, useCancelDocumentProcessing, useMarkDocumentsStale } from '../../hooks/useDocumentProcessing';
import { useGenerateItems, useCancelItemGeneration } from '../../hooks/useItemGeneration';
import { useCollectionItems, useUpdateItem, useReorderItems } from '../../hooks/useItems';
import { API_BASE_URL, API_HOST } from '../../config/api';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import ProcessingProgress from '../../components/ui/ProcessingProgress/ProcessingProgress';
import CategorySection from '../../components/ui/CategorySection/CategorySection';
import ReorderCategoriesModal from '../../components/ui/ReorderCategoriesModal';
import CollectionListItem from '../../components/ui/CollectionListItem/CollectionListItem';
import InfoModal from '../../components/ui/InfoModal/InfoModal';
import InputModal from '../../components/ui/InputModal/InputModal';
import NewBrandModal from '../../components/ui/NewBrandModal/NewBrandModal';
import NewCollectionModal from '../../components/ui/NewCollectionModal/NewCollectionModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { introSlideInfo } from '../../data/introSlideInfo';
import { useCreateBrand } from '../../hooks/useCreateBrand';
import { useCreateCollection } from '../../hooks/useCreateCollection';
import { useDeleteBrand } from '../../hooks/useDeleteBrand';
import { useDeleteCollection } from '../../hooks/useDeleteCollection';

// Stable empty array to prevent infinite re-renders from default value
const EMPTY_ARRAY = [];

// Sortable wrapper for CollectionListItem
function SortableItem({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    zIndex: isDragging ? 1000 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

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
  
  // Store refetch in a ref to avoid dependency issues in useEffect
  const refetchRef = useRef(refetchProcessingStatus);
  useEffect(() => {
    refetchRef.current = refetchProcessingStatus;
  }, [refetchProcessingStatus]);
  
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
  
  // Fetch collection items - use stable EMPTY_ARRAY to prevent infinite re-renders
  const { data: fetchedItems = EMPTY_ARRAY } = useCollectionItems(collectionId);
  const updateItemMutation = useUpdateItem();
  const reorderItemsMutation = useReorderItems();
  
  // Local state for items - allows instant reorder without waiting for cache
  const [localItems, setLocalItems] = useState([]);
  
  // Reset local items when collection changes
  useEffect(() => {
    setLocalItems([]);
  }, [collectionId]);
  
  // Sync local items with fetched items
  // Only update if fetchedItems actually has items to prevent loops with empty arrays
  useEffect(() => {
    if (fetchedItems.length > 0 || localItems.length > 0) {
      setLocalItems(fetchedItems);
    }
  }, [fetchedItems]);
  
  // Clear items immediately when regeneration starts
  useEffect(() => {
    if (processingStatus?.item_generation?.status === 'processing') {
      setLocalItems([]);
    }
  }, [processingStatus?.item_generation?.status]);
  
  // Use local items for rendering (instant updates)
  const items = localItems;
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
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
  
  // New Brand Modal state
  const [isNewBrandModalVisible, setIsNewBrandModalVisible] = useState(false);
  const createBrandMutation = useCreateBrand();
  
  // New Collection Modal state
  const [newCollectionBrandId, setNewCollectionBrandId] = useState(null);
  const [collectionLoadingMessage, setCollectionLoadingMessage] = useState('Creating...');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const createCollectionMutation = useCreateCollection();
  
  // Delete Modal state
  const [deleteModal, setDeleteModal] = useState({ isVisible: false, type: null, id: null, name: '' });
  const deleteBrandMutation = useDeleteBrand();
  const deleteCollectionMutation = useDeleteCollection();
  
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
  
  // Use actual items from subcollection (via useCollectionItems hook)
  const hasItems = 
    processingStatus?.item_generation?.status === 'completed' &&
    items.length > 0;
  
  const tabs = [
    { id: 1, number: 1, label: 'Collection Info', enabled: true },
    { id: 2, number: 2, label: 'Deck Settings', enabled: hasCategories },
    { id: 3, number: 3, label: 'Collection Items', enabled: hasCategories },
    { id: 4, number: 4, label: 'Generate Deck', enabled: hasItems }
  ];

  // Track previous collectionId to detect collection switches
  const prevCollectionIdRef = useRef(collectionId);
  
  // Reset to Tab 1 when switching to a collection where current tab is locked
  useEffect(() => {
    // Only act when collectionId actually changes
    if (prevCollectionIdRef.current !== collectionId) {
      // Wait for processingStatus to be defined for the new collection
      // If undefined, we're still loading - don't update ref yet, let effect re-run when data arrives
      if (processingStatus !== undefined) {
        // Now we have data for the new collection - update ref
        prevCollectionIdRef.current = collectionId;
        
        // Check if current tab is accessible
        const isTab2Or3Accessible = hasCategories;
        const isTab4Accessible = hasItems;
        
        const shouldReset = 
          (activeTab === 2 && !isTab2Or3Accessible) ||
          (activeTab === 3 && !isTab2Or3Accessible) ||
          (activeTab === 4 && !isTab4Accessible);
        
        if (shouldReset) {
          console.log(`[CollectionSettingsPage] Tab ${activeTab} not accessible for new collection, resetting to Tab 1`);
          setActiveTab(1);
        }
      }
    }
  }, [collectionId, processingStatus, hasCategories, hasItems, activeTab]);

  // Collection Info - Collection Name, Type and Year
  const [collectionName, setCollectionName] = useState('');
  const [collectionType, setCollectionType] = useState('');
  const [collectionYear, setCollectionYear] = useState('');
  const [collectionInformation, setCollectionInformation] = useState('');
  
  // Track original values for change detection
  const [originalValues, setOriginalValues] = useState(null);
  
  // Reset Collection Label state when collectionId changes (before new data loads)
  useEffect(() => {
    setCollectionName('');
    setCollectionType('');
    setCollectionYear('');
    setCollectionInformation('');
    setOriginalValues(null);
  }, [collectionId]);
  
  // Populate form fields when collection data loads
  useEffect(() => {
    if (collectionData) {
      const name = collectionData.name || '';
      const season = collectionData.season || '';
      const year = collectionData.year ? String(collectionData.year) : '';
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
  
  // Invalidate queries when processing completes
  useEffect(() => {
    if (!processingStatus) return;
    
    const docCompleted = processingStatus.document_processing?.status === 'completed';
    const itemCompleted = processingStatus.item_generation?.status === 'completed';
    
    if (docCompleted) {
      // Refetch collection data to get updated categories
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
    }
    
    if (itemCompleted) {
      // Refetch collection data and items list
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collectionItems', collectionId] });
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
        refetchRef.current?.();
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
  }, [processingStatus?.document_processing?.status, processingStatus?.item_generation?.status]);

  // Collection Items - View toggle and filters
  const [collectionItemsView, setCollectionItemsView] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bulkAction, setBulkAction] = useState('none');
  
  // Collection Items - Active subcategory filter per category
  const [activeSubcategoryFilters, setActiveSubcategoryFilters] = useState({});
  // Collection Items - Selected items for bulk actions
  const [selectedItems, setSelectedItems] = useState(new Set());
  // Reorder Categories modal
  const [isReorderCategoriesOpen, setIsReorderCategoriesOpen] = useState(false);
  
  // Deck Generation state
  const [deckGenerationStatus, setDeckGenerationStatus] = useState('idle'); // 'idle', 'processing', 'completed', 'failed'
  const [deckGenerationError, setDeckGenerationError] = useState(null);
  const [deckDownloadUrl, setDeckDownloadUrl] = useState(null);
  
  // Group items by category for display
  // Uses Deck Settings categories as the structure, matching items by category name
  const groupedItems = React.useMemo(() => {
    const deckCategories = collectionData?.categories || [];
    
    // Pre-populate structure with Deck Settings categories
    const groups = {
      categorized: {},  // { categoryName: { items: [], subcategories: {} } }
      uncategorized: [],
      unmatched: []
    };
    
    // Initialize categories from Deck Settings (preserving display_order)
    const categoryNameMap = {};  // lowercase -> actual name (for case-insensitive matching)
    deckCategories.forEach(cat => {
      groups.categorized[cat.name] = { 
        items: [], 
        subcategories: {},
        display_order: cat.display_order || 0
      };
      categoryNameMap[cat.name.toLowerCase()] = cat.name;
      
      // Pre-populate subcategories from Deck Settings
      (cat.subcategories || []).forEach(sub => {
        groups.categorized[cat.name].subcategories[sub.name] = [];
      });
    });
    
    // Apply filters first
    let filteredItems = items;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        (item.sku || '').toLowerCase().includes(query) ||
        (item.product_name || '').toLowerCase().includes(query) ||
        (item.color || '').toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (categoryFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === categoryFilter);
    }
    
    // Filter by status (included/excluded)
    if (statusFilter !== 'all') {
      if (statusFilter === 'included') {
        filteredItems = filteredItems.filter(item => item.included !== false);
      } else if (statusFilter === 'excluded') {
        filteredItems = filteredItems.filter(item => item.included === false);
      }
    }
    
    filteredItems.forEach(item => {
      // Unmatched: items without product_name or rrp (missing linesheet data)
      if (!item.product_name || item.product_name === item.sku) {
        groups.unmatched.push(item);
      }
      // Check if item's category matches a Deck Settings category (case-insensitive)
      else if (item.category && categoryNameMap[item.category.toLowerCase()]) {
        const matchedCategoryName = categoryNameMap[item.category.toLowerCase()];
        groups.categorized[matchedCategoryName].items.push(item);
        
        // Track subcategories
        const subcat = item.subcategory || 'Other';
        if (!groups.categorized[matchedCategoryName].subcategories[subcat]) {
          groups.categorized[matchedCategoryName].subcategories[subcat] = [];
        }
        groups.categorized[matchedCategoryName].subcategories[subcat].push(item);
      }
      // Uncategorized: items with no category OR category not in Deck Settings
      else {
        groups.uncategorized.push(item);
      }
    });
    
    return groups;
  }, [items, searchQuery, categoryFilter, statusFilter, collectionData?.categories]);
  
  // Get category options for dropdowns (from collection categories)
  const categoryOptions = React.useMemo(() => {
    return (collectionData?.categories || []).map(cat => ({
      value: cat.name,
      label: cat.name
    }));
  }, [collectionData?.categories]);
  
  // Handle item update (highlight, include, category, subcategory)
  const handleItemUpdate = (itemId, updateData) => {
    updateItemMutation.mutate({
      collectionId,
      itemId,
      updateData
    });
  };
  
  // Handle subcategory filter click
  const handleSubcategoryFilterClick = (categoryName, subcategoryName) => {
    setActiveSubcategoryFilters(prev => {
      // If null (View All) or already active, clear the filter
      if (subcategoryName === null || prev[categoryName] === subcategoryName) {
        const { [categoryName]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [categoryName]: subcategoryName };
    });
  };
  
  // Get filtered items for a category based on active subcategory filter
  const getFilteredCategoryItems = (categoryName, categoryData) => {
    const activeFilter = activeSubcategoryFilters[categoryName];
    if (!activeFilter) {
      return categoryData.items;
    }
    return categoryData.subcategories[activeFilter] || [];
  };
  
  // Handle drag end for reordering items within a category
  const handleDragEnd = (event, categoryName, categoryItems) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }
    
    // Find the indices within the category items
    const oldIndex = categoryItems.findIndex(item => item.item_id === active.id);
    const newIndex = categoryItems.findIndex(item => item.item_id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    
    // Reorder the category items
    const reorderedCategoryItems = arrayMove(categoryItems, oldIndex, newIndex);
    
    // Update display_order for reordered items
    const updatedCategoryItems = reorderedCategoryItems.map((item, index) => ({
      ...item,
      display_order: index
    }));
    
    // Update local state immediately (instant, no delay)
    setLocalItems(prevItems => {
      // Replace items in this category with reordered ones
      const categoryItemIds = new Set(categoryItems.map(i => i.item_id));
      const otherItems = prevItems.filter(item => !categoryItemIds.has(item.item_id));
      const newItems = [...otherItems, ...updatedCategoryItems];
      // Sort by category, then display_order
      return newItems.sort((a, b) => {
        const catCompare = (a.category || 'zzz').localeCompare(b.category || 'zzz');
        if (catCompare !== 0) return catCompare;
        return (a.display_order || 0) - (b.display_order || 0);
      });
    });
    
    // Create the order mapping for API
    const itemOrders = updatedCategoryItems.map(item => ({
      item_id: item.item_id,
      display_order: item.display_order
    }));
    
    // Fire API call (no optimistic update needed, local state already updated)
    reorderItemsMutation.mutate({
      collectionId,
      itemOrders
    });
  };

  // Group items by subcategory within a category
  const handleGroupBySubcategory = (categoryName, categoryItems) => {
    // Stable sort: group by subcategory, preserve relative order within each group
    const grouped = [...categoryItems].sort((a, b) => {
      const subA = (a.subcategory || '').toLowerCase();
      const subB = (b.subcategory || '').toLowerCase();
      return subA.localeCompare(subB);
    });

    // Assign sequential display_order values
    const itemOrders = grouped.map((item, index) => ({
      item_id: item.item_id,
      display_order: index
    }));

    // Update local state immediately
    setLocalItems(prevItems => {
      const categoryItemIds = new Set(categoryItems.map(i => i.item_id));
      const otherItems = prevItems.filter(item => !categoryItemIds.has(item.item_id));
      const updatedItems = grouped.map((item, index) => ({
        ...item,
        display_order: index
      }));
      const newItems = [...otherItems, ...updatedItems];
      return newItems.sort((a, b) => {
        const catCompare = (a.category || 'zzz').localeCompare(b.category || 'zzz');
        if (catCompare !== 0) return catCompare;
        return (a.display_order || 0) - (b.display_order || 0);
      });
    });

    // Persist to backend
    reorderItemsMutation.mutate({ collectionId, itemOrders });
  };

  // Save reordered categories
  const handleSaveCategoryOrder = async (updatedCategories) => {
    try {
      await updateCollectionMutation.mutateAsync({
        collectionId,
        updateData: {
          categories: updatedCategories.map(cat => ({
            name: cat.name,
            product_count: cat.product_count || 0,
            display_order: cat.display_order,
            subcategories: cat.subcategories || []
          }))
        }
      });
      setIsReorderCategoriesOpen(false);
    } catch (error) {
      console.error('Failed to save category order:', error);
    }
  };

  // Deck generation phase tracking
  const [deckGenerationPhase, setDeckGenerationPhase] = useState('');
  
  // Generate Training Deck handler
  const handleGenerateDeck = async () => {
    setDeckGenerationStatus('processing');
    setDeckGenerationError(null);
    setDeckDownloadUrl(null);
    setDeckGenerationPhase('Generating intro slides...');
    
    try {
      const token = await import('../../utils/auth').then(m => m.getAuthToken());
      const productsPerSlide = collectionData?.settings?.products_per_slide || 1;
      const aspectRatio = collectionData?.settings?.slide_aspect_ratio || '16:9';

      // Step 1: Generate intro slides first
      const introResponse = await fetch(
        `${API_HOST}/collections/${collectionId}/intro-slides/generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!introResponse.ok) {
        const error = await introResponse.json();
        throw new Error(error.detail || 'Failed to generate intro slides');
      }
      
      console.log('Intro slides generated successfully');
      setDeckGenerationPhase('Generating presentation...');
      
      // Step 2: Generate presentation
      const response = await fetch(
        `${API_BASE_URL}/collections/${collectionId}/presentation/generate?products_per_slide=${productsPerSlide}&slide_aspect_ratio=${encodeURIComponent(aspectRatio)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate deck');
      }
      
      const data = await response.json();
      
      if (data.download_url) {
        setDeckDownloadUrl(data.download_url);
        setDeckGenerationStatus('completed');
        setDeckGenerationPhase('');
        
        // Auto-trigger download
        const link = document.createElement('a');
        link.href = data.download_url;
        link.download = `${collectionData?.name || 'collection'}_training_deck.pptx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('No download URL returned');
      }
    } catch (error) {
      console.error('Error generating deck:', error);
      setDeckGenerationError(error.message);
      setDeckGenerationStatus('failed');
      setDeckGenerationPhase('');
    }
  };

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

  // Intro slides checkbox states - synced with collection.settings in DB
  const [introSlides, setIntroSlides] = useState({
    coverPage: true,
    brandIntro: true,
    brandHistory: true,
    brandPersonality: true,
    brandValues: true,
    coreCollections: true,
    flagshipStores: true
  });

  // Track which intro slide info modal is open (null = none open)
  const [activeInfoModal, setActiveInfoModal] = useState(null);

  // Mapping between local state keys and Firestore field names
  const introSlideFieldMap = {
    coverPage: 'include_cover_page_slide',
    brandIntro: 'include_brand_introduction_slide',
    brandHistory: 'include_brand_history_slide',
    brandPersonality: 'include_brand_personality_slide',
    brandValues: 'include_brand_values_slide',
    coreCollections: 'include_core_collection_and_signature_categories_slide',
    flagshipStores: 'include_flagship_store_and_experiences_slide'
  };

  // Track pending saves to prevent sync overwrites during rapid changes
  const pendingIntroSlideSavesRef = useRef(0);

  // Initialize intro slides from collection settings when data loads
  // Skip sync if saves are in progress to prevent flicker
  useEffect(() => {
    if (collectionData?.settings && pendingIntroSlideSavesRef.current === 0) {
      const settings = collectionData.settings;
      setIntroSlides({
        coverPage: settings.include_cover_page_slide !== false,
        brandIntro: settings.include_brand_introduction_slide !== false,
        brandHistory: settings.include_brand_history_slide !== false,
        brandPersonality: settings.include_brand_personality_slide !== false,
        brandValues: settings.include_brand_values_slide !== false,
        coreCollections: settings.include_core_collection_and_signature_categories_slide !== false,
        flagshipStores: settings.include_flagship_store_and_experiences_slide !== false
      });
    }
  }, [collectionData?.settings]);

  // Handle intro slide checkbox change with optimistic update and DB save
  const handleIntroSlideChange = async (key) => {
    const newValue = !introSlides[key];
    const firestoreField = introSlideFieldMap[key];
    
    // Optimistic update
    setIntroSlides(prev => ({
      ...prev,
      [key]: newValue
    }));

    pendingIntroSlideSavesRef.current += 1;
    try {
      await updateCollectionMutation.mutateAsync({
        collectionId,
        updateData: {
          settings: {
            [firestoreField]: newValue
          }
        }
      });
    } catch (error) {
      console.error('Failed to save intro slide setting:', error);
      // Revert on error
      setIntroSlides(prev => ({
        ...prev,
        [key]: !newValue
      }));
    } finally {
      pendingIntroSlideSavesRef.current -= 1;
    }
  };

  // Category management - synced with collection.categories in DB
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Track which category is being edited for subcategory modal (null = closed)
  const [subcategoryModalCategoryIndex, setSubcategoryModalCategoryIndex] = useState(null);
  
  // Track pending saves to prevent sync overwrites during rapid changes
  const pendingSavesRef = useRef(0);

  // Initialize categories from collection data when it loads
  // Skip sync if saves are in progress to prevent flicker
  useEffect(() => {
    if (collectionData?.categories && pendingSavesRef.current === 0) {
      setCategories(collectionData.categories);
    }
  }, [collectionData?.categories]);

  // Helper to save categories to DB
  const saveCategories = async (newCategories) => {
    pendingSavesRef.current += 1;
    try {
      await updateCollectionMutation.mutateAsync({
        collectionId,
        updateData: { categories: newCategories }
      });
    } catch (error) {
      console.error('Failed to save categories:', error);
      // Revert to previous state from DB
      if (collectionData?.categories) {
        setCategories(collectionData.categories);
      }
    } finally {
      pendingSavesRef.current -= 1;
    }
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      const newCategory = {
        name: newCategoryName.trim(),
        display_order: categories.length,
        product_count: 0,
        subcategories: []
      };
      const newCategories = [...categories, newCategory];
      
      // Optimistic update
      setCategories(newCategories);
      setNewCategoryName('');
      
      // Save to DB
      await saveCategories(newCategories);
    }
  };

  const handleAddSubcategory = (categoryIndex) => {
    setSubcategoryModalCategoryIndex(categoryIndex);
  };

  const handleSubcategoryModalSubmit = async (subcategoryName) => {
    if (subcategoryName && subcategoryName.trim() && subcategoryModalCategoryIndex !== null) {
      const categoryIndex = subcategoryModalCategoryIndex;
      const newCategories = categories.map((cat, i) => {
        if (i === categoryIndex) {
          const newSubcategory = {
            name: subcategoryName.trim(),
            display_order: cat.subcategories?.length || 0,
            product_count: 0
          };
          return {
            ...cat,
            subcategories: [...(cat.subcategories || []), newSubcategory]
          };
        }
        return cat;
      });
      
      // Optimistic update
      setCategories(newCategories);
      
      // Close modal
      setSubcategoryModalCategoryIndex(null);
      
      // Save to DB
      await saveCategories(newCategories);
    }
  };

  const handleDeleteSubcategory = async (categoryIndex, subcategoryIndex) => {
    const newCategories = categories.map((cat, i) => {
      if (i === categoryIndex) {
        return {
          ...cat,
          subcategories: cat.subcategories.filter((_, j) => j !== subcategoryIndex)
        };
      }
      return cat;
    });
    
    // Optimistic update
    setCategories(newCategories);
    
    // Save to DB
    await saveCategories(newCategories);
  };

  const handleDeleteCategory = async (categoryIndex) => {
    if (window.confirm(`Delete ${categories[categoryIndex].name} category?`)) {
      const newCategories = categories.filter((_, i) => i !== categoryIndex);
      
      // Optimistic update
      setCategories(newCategories);
      
      // Save to DB
      await saveCategories(newCategories);
    }
  };

  // Product details selection - synced with collection.settings in DB
  const [productDetails, setProductDetails] = useState([
    { id: 'productName', label: 'Product Name', checked: true },
    { id: 'sku', label: 'SKU', checked: true },
    { id: 'description', label: 'Description', checked: true },
    { id: 'colour', label: 'Colour', checked: true },
    { id: 'material', label: 'Material', checked: true },
    { id: 'sizes', label: 'Sizes', checked: true },
    { id: 'origin', label: 'Origin', checked: true },
    { id: 'wholesalePrice', label: 'Wholesale Price', checked: false },
    { id: 'rrp', label: 'RRP', checked: true }
  ]);

  // Mapping between local IDs and Firestore field names
  const productDetailFieldMap = {
    productName: 'show_product_name',
    sku: 'show_sku',
    description: 'show_descriptions',
    colour: 'show_color',
    material: 'show_material',
    sizes: 'show_sizes',
    origin: 'show_origin',
    wholesalePrice: 'show_wholesale_price',
    rrp: 'show_rrp'
  };

  // Track pending saves to prevent sync overwrites during rapid changes
  const pendingDetailSavesRef = useRef(0);

  // Initialize product details from collection settings when data loads
  // Skip sync if saves are in progress to prevent flicker
  useEffect(() => {
    if (collectionData?.settings && pendingDetailSavesRef.current === 0) {
      const settings = collectionData.settings;
      setProductDetails(prev => prev.map(item => ({
        ...item,
        checked: settings[productDetailFieldMap[item.id]] !== false
      })));
    }
  }, [collectionData?.settings]);

  // Handle product detail checkbox change with optimistic update and DB save
  const handleDetailChange = async (id, checked) => {
    const firestoreField = productDetailFieldMap[id];
    
    // Optimistic update
    setProductDetails(prev => 
      prev.map(item => 
        item.id === id ? { ...item, checked } : item
      )
    );

    pendingDetailSavesRef.current += 1;
    try {
      await updateCollectionMutation.mutateAsync({
        collectionId,
        updateData: {
          settings: {
            [firestoreField]: checked
          }
        }
      });
    } catch (error) {
      console.error('Failed to save product detail setting:', error);
      // Revert on error
      setProductDetails(prev => 
        prev.map(item => 
          item.id === id ? { ...item, checked: !checked } : item
        )
      );
    } finally {
      pendingDetailSavesRef.current -= 1;
    }
  };

  // Language selection - synced with collection.settings.selected_language in DB
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: 'Chinese' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' }
  ];

  // Initialize language from collection settings when data loads
  useEffect(() => {
    if (collectionData?.settings?.selected_language) {
      setSelectedLanguage(collectionData.settings.selected_language);
    }
  }, [collectionData?.settings?.selected_language]);

  // Handle language change with optimistic update and DB save
  const handleLanguageChange = async (newLanguage) => {
    const previousLanguage = selectedLanguage;
    
    // Optimistic update
    setSelectedLanguage(newLanguage);

    try {
      await updateCollectionMutation.mutateAsync({
        collectionId,
        updateData: {
          settings: {
            selected_language: newLanguage
          }
        }
      });
    } catch (error) {
      console.error('Failed to save language setting:', error);
      // Revert on error
      setSelectedLanguage(previousLanguage);
    }
  };

  // Layout selection - synced with collection.settings.products_per_slide in DB
  const [selectedLayout, setSelectedLayout] = useState(2);

  // Initialize layout from collection settings when data loads
  useEffect(() => {
    if (collectionData?.settings?.products_per_slide) {
      setSelectedLayout(collectionData.settings.products_per_slide);
    }
  }, [collectionData?.settings?.products_per_slide]);

  // Handle layout change with optimistic update and DB save
  const handleLayoutChange = async (layout) => {
    const previousLayout = selectedLayout;
    
    // Optimistic update
    setSelectedLayout(layout);

    try {
      await updateCollectionMutation.mutateAsync({
        collectionId,
        updateData: {
          settings: {
            products_per_slide: layout
          }
        }
      });
    } catch (error) {
      console.error('Failed to save layout setting:', error);
      // Revert on error
      setSelectedLayout(previousLayout);
    }
  };

  // Aspect ratio selection - synced with collection.settings.slide_aspect_ratio in DB
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9');

  // Initialize aspect ratio from collection settings when data loads
  useEffect(() => {
    if (collectionData?.settings?.slide_aspect_ratio) {
      setSelectedAspectRatio(collectionData.settings.slide_aspect_ratio);
    }
  }, [collectionData?.settings?.slide_aspect_ratio]);

  // Handle aspect ratio change with optimistic update and DB save
  const handleAspectRatioChange = async (ratio) => {
    const previousRatio = selectedAspectRatio;

    // Optimistic update
    setSelectedAspectRatio(ratio);

    try {
      await updateCollectionMutation.mutateAsync({
        collectionId,
        updateData: {
          settings: {
            slide_aspect_ratio: ratio
          }
        }
      });
    } catch (error) {
      console.error('Failed to save aspect ratio setting:', error);
      // Revert on error
      setSelectedAspectRatio(previousRatio);
    }
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
          onNewBrand={() => setIsNewBrandModalVisible(true)}
          onNewCollection={(brandId) => setNewCollectionBrandId(brandId)}
          onDeleteBrand={(brandId, brandName) => setDeleteModal({ isVisible: true, type: 'brand', id: brandId, name: brandName })}
          onEditBrand={(brandId) => navigate('/brands/' + brandId + '/edit')}
          onDeleteCollection={(collectionId, collectionName) => setDeleteModal({ isVisible: true, type: 'collection', id: collectionId, name: collectionName })}
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
                borderRadius: 'var(--border-radius-md)'
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
                    maxWidth: '540px'
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
                borderRadius: 'var(--border-radius-md)'
              }}>
                <SectionHeader
                  title="Upload Collection Assets"
                />
                
                {/* Processing Progress - shown during processing, failed, or cancelled */}
                <ProcessingProgress
                  title="Document Processing Progress"
                  status={processingStatus?.document_processing?.status || 'idle'}
                  currentPhase={processingStatus?.document_processing?.current_phase}
                  progress={processingStatus?.document_processing?.progress}
                  error={processingStatus?.document_processing?.error}
                  isStale={isStale}
                  onCancel={() => cancelDocProcessingMutation.mutate({ collectionId })}
                />
                
                {/* Success Message - shown when completed and not stale */}
                {isCompleted && !isStale && (
                  <div style={{
                    textAlign: 'center',
                    paddingTop: 'var(--spacing-3)',
                    paddingBottom: 0,
                    paddingLeft: 'var(--spacing-3)',
                    paddingRight: 'var(--spacing-3)'
                  }}>
                    <h3 style={{
                      fontFamily: 'var(--font-family-body)',
                      fontSize: '14px',
                      fontWeight: 600,
                      lineHeight: '20px',
                      color: 'var(--color-brand-wine)',
                      margin: 0
                    }}>
                      Documents Successfully Processed
                    </h3>
                  </div>
                )}
                
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
                      key={`linesheet-${collectionId}`}
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
                      key={`po-${collectionId}`}
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

                  {/* Process Documents - at bottom so users can see it after scrolling */}
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--spacing-2)' }}>
                    <Button
                      variant="primary"
                      onClick={() => {
                        console.log('[CollectionSettingsPage] Process Documents clicked');
                        processDocumentsMutation.mutate({ collectionId, documentIds: stagedDocIds });
                      }}
                      disabled={!shouldEnableProcessButton}
                    >
                      Process Documents
                    </Button>
                  </div>
                </div>
              </div>

              {/* Collection Information Section - HIDDEN FOR NOW
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
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-3)',
                  padding: 'var(--spacing-3)'
                }}>
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
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}>
                    <Button
                      variant="primary"
                      onClick={() => {
                        console.log('Save Collection Information:', collectionInformation);
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
              */}

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
                gap: '10px'
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
                onInfoClick={() => setActiveInfoModal('coverPage')}
              />
              
              <Checkbox
                checked={introSlides.brandIntro}
                onChange={() => handleIntroSlideChange('brandIntro')}
                label="Brand Introduction"
                showInfo={true}
                onInfoClick={() => setActiveInfoModal('brandIntro')}
              />
              
              <Checkbox
                checked={introSlides.brandHistory}
                onChange={() => handleIntroSlideChange('brandHistory')}
                label="Brand History"
                showInfo={true}
                onInfoClick={() => setActiveInfoModal('brandHistory')}
              />
              
              <Checkbox
                checked={introSlides.brandPersonality}
                onChange={() => handleIntroSlideChange('brandPersonality')}
                label="Brand Personality"
                showInfo={true}
                onInfoClick={() => setActiveInfoModal('brandPersonality')}
              />
              
              <Checkbox
                checked={introSlides.brandValues}
                onChange={() => handleIntroSlideChange('brandValues')}
                label="Brand Values"
                showInfo={true}
                onInfoClick={() => setActiveInfoModal('brandValues')}
              />
              
              <Checkbox
                checked={introSlides.coreCollections}
                onChange={() => handleIntroSlideChange('coreCollections')}
                label="Core Collections & Signature Categories"
                showInfo={true}
                onInfoClick={() => setActiveInfoModal('coreCollections')}
              />
              
              <Checkbox
                checked={introSlides.flagshipStores}
                onChange={() => handleIntroSlideChange('flagshipStores')}
                label="Flagship Stores & Experiences"
                showInfo={true}
                onInfoClick={() => setActiveInfoModal('flagshipStores')}
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
                  subcategories={(category.subcategories || []).map(sub => sub.name)}
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
                  productName="Essential Crew Tee"
                  sku="TEE-WHT-001"
                  description="Classic relaxed fit crewneck t-shirt"
                  color="White"
                  material="100% Organic Cotton"
                  sizes="XS - XXL"
                  origin="Portugal"
                  wholesale={28.00}
                  rrp={65.00}
                  currency="$"
                  imageUrl="/images/essential_white_tee.png"
                  visibility={{
                    showProductName: productDetails.find(d => d.id === 'productName')?.checked ?? true,
                    showSku: productDetails.find(d => d.id === 'sku')?.checked ?? true,
                    showDescription: productDetails.find(d => d.id === 'description')?.checked ?? true,
                    showColor: productDetails.find(d => d.id === 'colour')?.checked ?? true,
                    showMaterial: productDetails.find(d => d.id === 'material')?.checked ?? true,
                    showSizes: productDetails.find(d => d.id === 'sizes')?.checked ?? true,
                    showOrigin: productDetails.find(d => d.id === 'origin')?.checked ?? true,
                    showWholesale: productDetails.find(d => d.id === 'wholesalePrice')?.checked ?? false,
                    showRrp: productDetails.find(d => d.id === 'rrp')?.checked ?? true
                  }}
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
            />
            
            {/* Language Dropdown */}
            <div style={{ padding: 'var(--spacing-3)' }}>
              <Dropdown
                label="Select Language"
                value={selectedLanguage}
                options={languageOptions}
                onChange={handleLanguageChange}
              />
            </div>
          </div>

          {/* Slide Aspect Ratio Section */}
          <AspectRatioOptions
            selectedRatio={selectedAspectRatio}
            onRatioChange={handleAspectRatioChange}
          />

          {/* Deck Layout Options Section */}
          <LayoutOptions
            selectedLayout={selectedLayout}
            onLayoutChange={handleLayoutChange}
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
            <>
            {/* Top Continue to Generate Deck Button - only shown when items exist and not processing */}
            {items.length > 0 && processingStatus?.item_generation?.status !== 'processing' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                paddingLeft: '433px',
                paddingRight: '433px',
                paddingTop: 0,
                paddingBottom: 0,
                gap: '10px'
              }}>
                <Button
                  variant="highlight"
                  size="lg"
                  onClick={() => {
                    console.log('Continue to Generate Deck clicked (top)');
                    setActiveTab(4);
                  }}
                >
                  Continue to Generate Deck
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
              </div>
            )}

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
                    {(collectionData?.categories || [])
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
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

                {/* Reorder Categories Button */}
                <button
                  onClick={() => setIsReorderCategoriesOpen(true)}
                  style={{
                    height: '42px',
                    padding: '4px 14px',
                    fontFamily: 'var(--font-family-body)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    lineHeight: 'var(--line-height-sm)',
                    color: 'var(--text-brand)',
                    backgroundColor: 'var(--background-white)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--border-radius-md)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 4H12M2 7H9M2 10H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Reorder
                </button>
              </div>

              {/* Collection Items Content */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0
              }}>
                {/* Unmatched PO Items Section */}
                {groupedItems.unmatched.length > 0 && (
                  <CategorySection
                    type="unmatched"
                    title="Unmatched Purchase Order Items"
                    itemCount={groupedItems.unmatched.length}
                    defaultExpanded={true}
                  >
                    {groupedItems.unmatched.map(item => (
                      <CollectionListItem
                        key={item.item_id}
                        variant="unmatched"
                        item={{
                          name: item.sku,
                          sku: item.sku,
                          color: item.color || '',
                          material: item.materials?.join(', ') || '',
                          price: item.rrp ? `$${item.rrp}` : '',
                          origin: item.origin || '',
                          description: item.description || '',
                          image: item.images?.[0]?.url || null
                        }}
                        checked={selectedItems.has(item.item_id)}
                        onCheckChange={() => {
                          setSelectedItems(prev => {
                            const next = new Set(prev);
                            if (next.has(item.item_id)) {
                              next.delete(item.item_id);
                            } else {
                              next.add(item.item_id);
                            }
                            return next;
                          });
                        }}
                        onAddDetails={() => console.log('Add details for', item.item_id)}
                        onIgnore={() => handleItemUpdate(item.item_id, { included: false })}
                      />
                    ))}
                  </CategorySection>
                )}

                {/* Uncategorized Items Section */}
                {groupedItems.uncategorized.length > 0 && (
                  <CategorySection
                    type="uncategorized"
                    title="Uncategorized"
                    itemCount={groupedItems.uncategorized.length}
                    defaultExpanded={true}
                  >
                    {groupedItems.uncategorized.map(item => (
                      <CollectionListItem
                        key={item.item_id}
                        variant="uncategorized"
                        item={{
                          name: item.product_name || item.sku,
                          sku: item.sku,
                          color: item.color || '',
                          material: item.materials?.join(', ') || '',
                          price: item.rrp ? `$${item.rrp}` : '',
                          origin: item.origin || '',
                          description: item.description || '',
                          image: item.images?.[0]?.url || null
                        }}
                        checked={selectedItems.has(item.item_id)}
                        onCheckChange={() => {
                          setSelectedItems(prev => {
                            const next = new Set(prev);
                            if (next.has(item.item_id)) {
                              next.delete(item.item_id);
                            } else {
                              next.add(item.item_id);
                            }
                            return next;
                          });
                        }}
                        category=""
                        categoryOptions={categoryOptions}
                        onCategoryChange={(newCategory) => handleItemUpdate(item.item_id, { category: newCategory })}
                      />
                    ))}
                  </CategorySection>
                )}

                {/* Categorized Items Sections - sorted by display_order from Deck Settings */}
                {Object.entries(groupedItems.categorized)
                  .filter(([, categoryData]) => categoryData.items.length > 0)  // Hide empty categories
                  .sort(([, a], [, b]) => (a.display_order || 0) - (b.display_order || 0))
                  .map(([categoryName, categoryData]) => {
                  const subcategoryNames = Object.keys(categoryData.subcategories).filter(
                    subName => categoryData.subcategories[subName].length > 0  // Hide empty subcategories
                  );
                  const filters = subcategoryNames.map(subName => ({
                    label: subName,
                    active: activeSubcategoryFilters[categoryName] === subName
                  }));
                  const displayItems = getFilteredCategoryItems(categoryName, categoryData);
                  
                  // Get subcategory options for this category
                  const subcategoryOptions = ((collectionData?.categories || []).find(c => c.name === categoryName)?.subcategories || [])
                    .map(sub => ({ value: sub.name, label: sub.name }));

                  return (
                    <DndContext
                      key={categoryName}
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                      onDragEnd={(event) => handleDragEnd(event, categoryName, displayItems)}
                    >
                      <CategorySection
                        type="categorized"
                        title={categoryName}
                        itemCount={categoryData.items.length}
                        filters={filters}
                        onFilterClick={(subName) => handleSubcategoryFilterClick(categoryName, subName)}
                        onGroupBySubcategory={() => handleGroupBySubcategory(categoryName, categoryData.items)}
                        defaultExpanded={true}
                      >
                        <SortableContext
                          items={displayItems.map(item => item.item_id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {displayItems.map(item => (
                            <SortableItem key={item.item_id} id={item.item_id}>
                              <CollectionListItem
                                variant={item.included === false ? 'inactive' : 'default'}
                                item={{
                                  name: item.product_name || item.sku,
                                  sku: item.sku,
                                  color: item.color || '',
                                  material: item.materials?.join(', ') || '',
                                  price: item.rrp ? `$${item.rrp}` : '',
                                  origin: item.origin || '',
                                  description: item.description || '',
                                  image: item.images?.[0]?.url || null
                                }}
                                checked={selectedItems.has(item.item_id)}
                                onCheckChange={() => {
                                  setSelectedItems(prev => {
                                    const next = new Set(prev);
                                    if (next.has(item.item_id)) {
                                      next.delete(item.item_id);
                                    } else {
                                      next.add(item.item_id);
                                    }
                                    return next;
                                  });
                                }}
                                category={item.subcategory || ''}
                                categoryOptions={subcategoryOptions}
                                onCategoryChange={(newSubcategory) => handleItemUpdate(item.item_id, { subcategory: newSubcategory })}
                                mainCategory={categoryName}
                                mainCategoryOptions={categoryOptions}
                                onMainCategoryChange={(newCategory) => handleItemUpdate(item.item_id, { category: newCategory })}
                                highlighted={item.highlighted_item || false}
                                onHighlightChange={(checked) => handleItemUpdate(item.item_id, { highlighted_item: checked })}
                                included={item.included !== false}
                                onIncludeChange={(checked) => handleItemUpdate(item.item_id, { included: checked })}
                              />
                            </SortableItem>
                          ))}
                        </SortableContext>
                      </CategorySection>
                    </DndContext>
                  );
                })}

                {/* Empty state */}
                {items.length === 0 && (
                  <div style={{
                    padding: 'var(--spacing-4)',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    <p>No items yet. Generate items from your uploaded documents.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Continue to Generate Deck Button */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '433px',
              paddingRight: '433px',
              paddingTop: 0,
              paddingBottom: 0,
              gap: '10px'
            }}>
              <Button
                variant="highlight"
                size="lg"
                disabled={items.length === 0 || processingStatus?.item_generation?.status === 'processing'}
                onClick={() => {
                  if (items.length > 0) {
                    console.log('Continue to Generate Deck clicked');
                    setActiveTab(4);
                  }
                }}
              >
                Continue to Generate Deck
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Button>
            </div>
            </>
          )}
          
          {/* Tab 4: Generate Deck */}
          {activeTab === 4 && (
            <>
            <div style={{
              backgroundColor: 'var(--background-white)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--border-radius-md)'
            }}>
              <SectionHeader
                title="Generate Deck"
                description="The deck will be generated and downloaded in .PPT format."
              />
              
              {/* Deck Generation Progress */}
              <ProcessingProgress
                title="Deck Generation Progress"
                status={deckGenerationStatus}
                currentPhase={deckGenerationPhase}
                progress={{ percentage: deckGenerationPhase.includes('presentation') ? 60 : 30 }}
                error={deckGenerationError}
                successMessage="Deck Successfully Generated"
              />
              
              {/* Success Message - shown when completed */}
              {deckGenerationStatus === 'completed' && (
                <div style={{
                  textAlign: 'center',
                  paddingTop: 'var(--spacing-3)',
                  paddingBottom: 'var(--spacing-3)',
                  paddingLeft: 'var(--spacing-3)',
                  paddingRight: 'var(--spacing-3)'
                }}>
                  <h3 style={{
                    fontFamily: 'var(--font-family-body)',
                    fontSize: '14px',
                    fontWeight: 600,
                    lineHeight: '20px',
                    color: 'var(--color-brand-wine)',
                    margin: 0,
                    marginBottom: 'var(--spacing-2)'
                  }}>
                    Deck Successfully Generated
                  </h3>
                  {deckDownloadUrl && (
                    <a 
                      href={deckDownloadUrl}
                      download
                      style={{
                        color: 'var(--color-brand-wine)',
                        textDecoration: 'underline',
                        fontSize: '14px'
                      }}
                    >
                      Click here if download didn't start automatically
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Generate Training Deck Button */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '433px',
              paddingRight: '433px',
              paddingTop: 0,
              paddingBottom: 0,
              gap: '10px'
            }}>
              <Button
                variant="highlight"
                size="lg"
                disabled={deckGenerationStatus === 'processing'}
                onClick={handleGenerateDeck}
              >
                {deckGenerationStatus === 'processing' ? 'Generating...' : 
                 deckGenerationStatus === 'completed' ? 'Regenerate Deck' : 'Generate Training Deck'}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.333 2.00004C11.5081 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6663 1.44775C12.914 1.44775 13.1592 1.49653 13.3879 1.59129C13.6167 1.68605 13.8246 1.82494 13.9997 2.00004C14.1748 2.17513 14.3137 2.383 14.4084 2.61178C14.5032 2.84055 14.552 3.08575 14.552 3.33337C14.552 3.58099 14.5032 3.82619 14.4084 4.05497C14.3137 4.28374 14.1748 4.49161 13.9997 4.66671L4.99967 13.6667L1.33301 14.6667L2.33301 11L11.333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Button>
            </div>
            </>
          )}
          </div>
          </div>
          
          {/* Footer */}
          <Footer />
        </div>
      </div>

      {/* Reorder Categories Modal */}
      <ReorderCategoriesModal
        categories={(collectionData?.categories || []).filter(cat => items.some(item => item.category === cat.name))}
        isVisible={isReorderCategoriesOpen}
        onSave={handleSaveCategoryOrder}
        onClose={() => setIsReorderCategoriesOpen(false)}
      />

      {/* Intro Slide Info Modal */}
      {activeInfoModal && introSlideInfo[activeInfoModal] && (
        <InfoModal
          title={introSlideInfo[activeInfoModal].title}
          description={introSlideInfo[activeInfoModal].description}
          isVisible={true}
          onClose={() => setActiveInfoModal(null)}
        />
      )}

      {/* Add Subcategory Modal */}
      {subcategoryModalCategoryIndex !== null && (
        <InputModal
          title="Add New Sub-Category"
          label="Enter Sub-Category Name"
          placeholder="e.g. Jackets"
          buttonText="Add Sub-Category"
          isVisible={true}
          onClose={() => setSubcategoryModalCategoryIndex(null)}
          onSubmit={handleSubcategoryModalSubmit}
        />
      )}

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
            
            // Step 1: Create the collection
            const newCollection = await createCollectionMutation.mutateAsync({
              brandId: newCollectionBrandId,
              ...data
            });
            
            // Step 2: Wait for sidebar data to be ready
            setCollectionLoadingMessage('Loading...');
            await queryClient.refetchQueries({ queryKey: ['brands'] });
            
            // Step 3: Prefetch new collection data
            await queryClient.prefetchQuery({
              queryKey: ['collection', newCollection.collection_id]
            });
            
            // Step 4: Now close and navigate - everything is ready
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
              // If we're currently viewing a collection from this brand, navigate away
              const deletedBrand = brands.find(b => b.id === deleteModal.id);
              if (deletedBrand?.collections.some(c => c.id === activeCollection)) {
                navigate('/dashboard');
              }
            } else if (deleteModal.type === 'collection') {
              await deleteCollectionMutation.mutateAsync(deleteModal.id);
              // If we're currently viewing this collection, navigate away
              if (deleteModal.id === activeCollection) {
                navigate('/dashboard');
              }
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

export default CollectionSettingsPage;
