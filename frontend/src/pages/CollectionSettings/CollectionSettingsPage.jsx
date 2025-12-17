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
import { useCollectionItems, useUpdateItem, useReorderItems } from '../../hooks/useItems';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import ProcessingProgress from '../../components/ui/ProcessingProgress/ProcessingProgress';
import CategorySection from '../../components/ui/CategorySection/CategorySection';
import CollectionListItem from '../../components/ui/CollectionListItem/CollectionListItem';

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
  
  // Fetch collection items
  const { data: fetchedItems = [] } = useCollectionItems(collectionId);
  const updateItemMutation = useUpdateItem();
  const reorderItemsMutation = useReorderItems();
  
  // Local state for items - allows instant reorder without waiting for cache
  const [localItems, setLocalItems] = useState([]);
  
  // Reset local items when collection changes
  useEffect(() => {
    setLocalItems([]);
  }, [collectionId]);
  
  // Sync local items with fetched items
  useEffect(() => {
    setLocalItems(fetchedItems);
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
  
  // Collection Items - Active subcategory filter per category
  const [activeSubcategoryFilters, setActiveSubcategoryFilters] = useState({});
  // Collection Items - Selected items for bulk actions
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  // Group items by category for display
  const groupedItems = React.useMemo(() => {
    const groups = {
      categorized: {},  // { categoryName: { items: [], subcategories: {} } }
      uncategorized: [],
      unmatched: []
    };
    
    items.forEach(item => {
      // Unmatched: items without product_name or rrp (missing linesheet data)
      if (!item.product_name || item.product_name === item.sku) {
        groups.unmatched.push(item);
      }
      // Uncategorized: items with no category
      else if (!item.category) {
        groups.uncategorized.push(item);
      }
      // Categorized: items with a category
      else {
        if (!groups.categorized[item.category]) {
          groups.categorized[item.category] = { items: [], subcategories: {} };
        }
        groups.categorized[item.category].items.push(item);
        
        // Track subcategories
        const subcat = item.subcategory || 'Uncategorized';
        if (!groups.categorized[item.category].subcategories[subcat]) {
          groups.categorized[item.category].subcategories[subcat] = [];
        }
        groups.categorized[item.category].subcategories[subcat].push(item);
      }
    });
    
    return groups;
  }, [items]);
  
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

  const handleAddSubcategory = async (categoryIndex) => {
    const subcategoryName = window.prompt('Enter subcategory name:');
    if (subcategoryName && subcategoryName.trim()) {
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
                  buttonText="Process Documents"
                  onButtonClick={() => {
                    console.log('[CollectionSettingsPage] Process Documents clicked');
                    processDocumentsMutation.mutate({ collectionId, documentIds: stagedDocIds });
                  }}
                  buttonDisabled={!shouldEnableProcessButton}
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
                        category={item.category || ''}
                        categoryOptions={categoryOptions}
                        onCategoryChange={(newCategory) => handleItemUpdate(item.item_id, { category: newCategory })}
                      />
                    ))}
                  </CategorySection>
                )}

                {/* Categorized Items Sections */}
                {Object.entries(groupedItems.categorized).map(([categoryName, categoryData]) => {
                  const subcategoryNames = Object.keys(categoryData.subcategories);
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
