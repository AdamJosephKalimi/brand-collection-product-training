import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Tabs from '../../components/ui/Tabs/Tabs';
import Checkbox from '../../components/ui/Checkbox/Checkbox';
import CategoryGroup from '../../components/ui/CategoryGroup/CategoryGroup';
import ProductPreview from '../../components/ui/ProductPreview/ProductPreview';
import CheckboxList from '../../components/ui/CheckboxList/CheckboxList';
import LayoutOptions from '../../components/features/LayoutOptions/LayoutOptions';
import Button from '../../components/ui/Button/Button';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import TopNav from '../../components/features/TopNav/TopNav';
import SectionHeader from '../../components/ui/SectionHeader/SectionHeader';
import Dropdown from '../../components/ui/Dropdown/Dropdown';
import Footer from '../../components/features/Footer/Footer';
import PillCounter from '../../components/ui/PillCounter/PillCounter';
import ViewToggle from '../../components/ui/ViewToggle/ViewToggle';
import SearchBar from '../../components/ui/SearchBar/SearchBar';
import Select from '../../components/ui/Select/Select';
import FileUpload from '../../components/ui/FileUpload/FileUpload';
import POFileUpload from '../../components/ui/POFileUpload/POFileUpload';
import SimpleCheckbox from '../../components/ui/SimpleCheckbox/SimpleCheckbox';
import Toggle from '../../components/ui/Toggle/Toggle';
import CollectionListItem from '../../components/ui/CollectionListItem/CollectionListItem';
import CategorySection from '../../components/ui/CategorySection/CategorySection';

function DeckSettingsPage() {
  const { collectionId } = useParams();
  const [activeTab, setActiveTab] = useState('deck-settings');
  
  // Checkbox states
  const [checkboxStates, setCheckboxStates] = useState({
    coverPage: true,
    brandIntro: true,
    brandHistory: false,
    brandPersonality: true,
    brandValues: true,
    coreCollections: true,
    flagshipStores: true,
    productCategories: true
  });
  
  const handleCheckboxChange = (key) => {
    setCheckboxStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Category states
  const [categories, setCategories] = useState([
    { name: 'Outerwear', subcategories: ['Coats', 'Jackets'] },
    { name: 'Knitwear', subcategories: ['Sweaters'] },
    { name: 'Accessories', subcategories: [] }
  ]);
  
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
  
  // Layout selection
  const [selectedLayout, setSelectedLayout] = useState(1);
  
  const handleLayoutChange = (layout) => {
    setSelectedLayout(layout);
    console.log(`Layout changed to: ${layout} products per slide`);
  };
  
  const handleSaveLayout = () => {
    alert(`Saved! Layout: ${selectedLayout} products per slide`);
  };
  
  // Dropdown test
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  
  const languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'french', label: 'French' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'german', label: 'German' }
  ];
  
  // View toggle test
  const [activeView, setActiveView] = useState('list');
  
  // Search bar test
  const [searchQuery, setSearchQuery] = useState('');
  
  // Simple checkbox test
  const [simpleCheckbox1, setSimpleCheckbox1] = useState(true);
  const [simpleCheckbox2, setSimpleCheckbox2] = useState(false);
  
  // Toggle test
  const [toggle1, setToggle1] = useState(true);
  const [toggle2, setToggle2] = useState(false);
  
  // Collection list item test
  const [listItem1, setListItem1] = useState({
    checked: false,
    category: '',
    highlighted: true,
    included: true
  });
  const [listItem2, setListItem2] = useState({
    checked: false,
    category: '',
    highlighted: true,
    included: true
  });
  const [listItem3, setListItem3] = useState({
    checked: false,
    category: ''
  });
  const [listItem4, setListItem4] = useState({
    checked: false
  });
  
  const sampleItem = {
    name: 'Mackage Wool Coat',
    sku: 'MAC001',
    color: 'Black',
    material: 'Wool',
    price: '$450',
    origin: 'Canada',
    description: 'Luxurious wool coat with modern silhouette',
    image: null
  };
  
  // Select test
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [moveToCategory, setMoveToCategory] = useState('');
  
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'tops', label: 'Tops' },
    { value: 'bottoms', label: 'Bottoms' },
    { value: 'outerwear', label: 'Outerwear' },
    { value: 'accessories', label: 'Accessories' }
  ];
  
  const subCategoryOptions = [
    { value: 'shirts', label: 'Shirts' },
    { value: 'sweaters', label: 'Sweaters' },
    { value: 'jackets', label: 'Jackets' },
    { value: 'coats', label: 'Coats' }
  ];
  
  const moveToCategoryOptions = [
    { value: 'tops', label: 'Tops' },
    { value: 'bottoms', label: 'Bottoms' },
    { value: 'outerwear', label: 'Outerwear' },
    { value: 'accessories', label: 'Accessories' }
  ];
  
  // Sidebar data
  const [brands] = useState([
    {
      id: 'mackage',
      name: 'Mackage',
      collections: [
        { id: 'fw2024', name: 'FW2024' },
        { id: 'ss2024', name: 'SS2024' }
      ]
    },
    {
      id: 'theory',
      name: 'Theory',
      collections: []
    },
    {
      id: 'r13',
      name: 'R13',
      collections: []
    }
  ]);
  
  const [activeBrand, setActiveBrand] = useState('mackage');
  const [activeCollection, setActiveCollection] = useState('fw2024');
  
  // Top nav links
  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/generated-decks', label: 'Generated Decks' },
    { path: '/settings', label: 'Settings' }
  ];
  
  const handleAddSubcategory = (categoryIndex) => {
    const subcategoryName = prompt('Enter subcategory name:');
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
  
  const tabs = [
    { id: 'collection-info', number: 1, label: 'Collection Info' },
    { id: 'deck-settings', number: 2, label: 'Deck Settings' },
    { id: 'collection-items', number: 3, label: 'Collection Items' },
    { id: 'generate-deck', number: 4, label: 'Generate Deck' }
  ];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Navigation */}
      <TopNav
        links={navLinks}
        logoText="Proko"
        userAvatarUrl="https://via.placeholder.com/32"
        userName="Adam"
      />
      
      {/* Main Layout: Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <Sidebar
          brands={brands}
          activeBrand={activeBrand}
          activeCollection={activeCollection}
          onBrandClick={(brandId) => setActiveBrand(brandId)}
          onCollectionClick={(collectionId) => setActiveCollection(collectionId)}
          onNewBrand={() => alert('New Brand clicked')}
          onNewCollection={(brandId) => alert(`New Collection for ${brandId}`)}
        />
        
        {/* Main Content */}
        <div style={{ flex: 1, padding: '40px', backgroundColor: 'var(--background-white)' }}>
        <h1 style={{ 
          fontFamily: 'var(--font-family-heading)', 
          fontSize: 'var(--font-size-xl)',
          color: 'var(--text-brand)',
          marginBottom: 'var(--spacing-3)'
        }}>
          Deck Settings
        </h1>
      
      <p style={{ 
        color: 'var(--text-secondary)', 
        marginBottom: 'var(--spacing-4)' 
      }}>
        Collection ID: {collectionId}
      </p>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: 'var(--spacing-5)' }}>
        <Tabs 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
        />
      </div>
      
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          Button Component Test
        </h2>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary" onClick={() => alert('Primary clicked!')}>
            Save Changes
          </Button>
          
          <Button variant="secondary" onClick={() => alert('Secondary clicked!')}>
            Cancel
          </Button>
          
          <Button variant="highlight" onClick={() => alert('Continue clicked!')}>
            Continue to Collection Items →
          </Button>
          
          <Button variant="primary" size="sm">
            Small Button
          </Button>
          
          <Button variant="primary" size="lg">
            Large Button
          </Button>
          
          <Button variant="primary" disabled>
            Disabled Button
          </Button>
          
          <Button variant="dark" size="md">
            Dark Button (New)
          </Button>
        </div>
      </div>
      
      {/* Checkbox Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          Checkbox Component Test
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--spacing-2)',
          maxWidth: '1100px'
        }}>
          <Checkbox
            checked={checkboxStates.coverPage}
            onChange={() => handleCheckboxChange('coverPage')}
            label="Cover Page"
            showInfo={true}
            onInfoClick={() => alert('Info about Cover Page')}
          />
          
          <Checkbox
            checked={checkboxStates.brandIntro}
            onChange={() => handleCheckboxChange('brandIntro')}
            label="Brand Introduction"
            showInfo={true}
            onInfoClick={() => alert('Info about Brand Introduction')}
          />
          
          <Checkbox
            checked={checkboxStates.brandHistory}
            onChange={() => handleCheckboxChange('brandHistory')}
            label="Brand History"
            showInfo={true}
            onInfoClick={() => alert('Info about Brand History')}
          />
          
          <Checkbox
            checked={checkboxStates.brandPersonality}
            onChange={() => handleCheckboxChange('brandPersonality')}
            label="Brand Personality"
            showInfo={true}
            onInfoClick={() => alert('Info about Brand Personality')}
          />
          
          <Checkbox
            checked={checkboxStates.brandValues}
            onChange={() => handleCheckboxChange('brandValues')}
            label="Brand Values"
            showInfo={true}
            onInfoClick={() => alert('Info about Brand Values')}
          />
          
          <Checkbox
            checked={checkboxStates.coreCollections}
            onChange={() => handleCheckboxChange('coreCollections')}
            label="Core Collections & Signature Categories"
            showInfo={true}
            onInfoClick={() => alert('Info about Core Collections')}
          />
          
          <Checkbox
            checked={checkboxStates.flagshipStores}
            onChange={() => handleCheckboxChange('flagshipStores')}
            label="Flagship Stores & Experiences"
            showInfo={true}
            onInfoClick={() => alert('Info about Flagship Stores')}
          />
          
          <Checkbox
            checked={checkboxStates.productCategories}
            onChange={() => handleCheckboxChange('productCategories')}
            label="Product Categories"
            showInfo={true}
            onInfoClick={() => alert('Info about Product Categories')}
          />
        </div>
      </div>
      
      {/* Category Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          Category Component Test
        </h2>
        
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)',
          maxWidth: '600px'
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
      
      {/* Product Details Selection & Preview */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          Product Details Selection & Preview
        </h2>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-4)', maxWidth: '800px' }}>
          {/* Details Selection */}
          <div style={{ flex: '0 0 200px' }}>
            <h3 style={{ 
              fontSize: 'var(--font-size-xs)', 
              marginBottom: 'var(--spacing-2)',
              color: 'var(--text-brand)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              Select Details to Include
            </h3>
            <CheckboxList 
              items={productDetails}
              onChange={handleDetailChange}
            />
          </div>
          
          {/* Product Preview */}
          <div style={{ flex: '1' }}>
            <h3 style={{ 
              fontSize: 'var(--font-size-xs)', 
              marginBottom: 'var(--spacing-2)',
              color: 'var(--text-brand)',
              fontWeight: 'var(--font-weight-medium)'
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
      
      {/* Section Header Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          Section Header Component Test
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)'
        }}>
          <SectionHeader
            title="Intro Slides"
            description="These are the slides that appear at the beginning of the deck. Select which ones to generate and include."
            buttonText="Save Changes"
            onButtonClick={() => alert('Save clicked!')}
          />
        </div>
      </div>
      
      {/* FileUpload Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          FileUpload Component Test (Linesheet)
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)'
        }}>
          <FileUpload
            onFilesSelected={(files) => {
              console.log('Linesheet files selected:', files);
              alert(`Selected ${files.length} linesheet file(s): ${files.map(f => f.name).join(', ')}`);
            }}
            title="Upload Linesheet Files"
            subtitle="Required for deck generation"
            buttonText="Select Linesheet Files"
            accept=".pdf,.xlsx,.xls,.csv"
            multiple={true}
          />
        </div>
      </div>
      
      {/* SimpleCheckbox Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          SimpleCheckbox Component Test
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)'
        }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
            <SimpleCheckbox
              checked={simpleCheckbox1}
              onChange={(e) => setSimpleCheckbox1(e.target.checked)}
            />
            <span>Checked checkbox</span>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
            <SimpleCheckbox
              checked={simpleCheckbox2}
              onChange={(e) => setSimpleCheckbox2(e.target.checked)}
            />
            <span>Unchecked checkbox</span>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
            <SimpleCheckbox
              checked={true}
              onChange={() => {}}
              disabled={true}
            />
            <span style={{ color: 'var(--text-secondary)' }}>Disabled checkbox</span>
          </div>
        </div>
      </div>
      
      {/* CategorySection Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          CategorySection Component Test
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)',
          overflow: 'hidden'
        }}>
          <CategorySection
            type="categorized"
            title="Outerwear"
            itemCount={2}
            filters={[
              { label: 'View all', active: true },
              { label: 'Coats', active: false },
              { label: 'Jackets', active: false }
            ]}
            onFilterClick={(label) => console.log('Filter clicked:', label)}
            defaultExpanded={true}
          />
          
          <CategorySection
            type="uncategorized"
            title="Uncategorized"
            itemCount={2}
            defaultExpanded={true}
          />
          
          <CategorySection
            type="unmatched"
            title="Unmatched Purchase Order Items"
            itemCount={2}
            defaultExpanded={true}
          />
        </div>
      </div>
      
      {/* CollectionListItem Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          CollectionListItem Component Test
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>State 1: Categorized & Enabled</h3>
          <CollectionListItem
            variant="default"
            item={sampleItem}
            checked={listItem1.checked}
            onCheckChange={(e) => setListItem1({...listItem1, checked: e.target.checked})}
            category={listItem1.category}
            onCategoryChange={(value) => setListItem1({...listItem1, category: value})}
            categoryOptions={subCategoryOptions}
            highlighted={listItem1.highlighted}
            onHighlightChange={(value) => setListItem1({...listItem1, highlighted: value})}
            included={listItem1.included}
            onIncludeChange={(value) => setListItem1({...listItem1, included: value})}
          />
          
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, marginTop: '16px' }}>State 2: Categorized & Disabled</h3>
          <CollectionListItem
            variant="inactive"
            item={sampleItem}
            checked={listItem2.checked}
            onCheckChange={(e) => setListItem2({...listItem2, checked: e.target.checked})}
            category={listItem2.category}
            onCategoryChange={(value) => setListItem2({...listItem2, category: value})}
            categoryOptions={subCategoryOptions}
            highlighted={listItem2.highlighted}
            onHighlightChange={(value) => setListItem2({...listItem2, highlighted: value})}
            included={listItem2.included}
            onIncludeChange={(value) => setListItem2({...listItem2, included: value})}
          />
          
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, marginTop: '16px' }}>State 3: Uncategorized & Enabled</h3>
          <CollectionListItem
            variant="uncategorized"
            item={sampleItem}
            checked={listItem3.checked}
            onCheckChange={(e) => setListItem3({...listItem3, checked: e.target.checked})}
            category={listItem3.category}
            onCategoryChange={(value) => setListItem3({...listItem3, category: value})}
            categoryOptions={moveToCategoryOptions}
          />
          
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, marginTop: '16px' }}>State 4: Unmatched (PO but not in linesheet)</h3>
          <CollectionListItem
            variant="unmatched"
            item={sampleItem}
            checked={listItem4.checked}
            onCheckChange={(e) => setListItem4({...listItem4, checked: e.target.checked})}
            onAddDetails={() => alert('Add Details clicked')}
            onIgnore={() => alert('Ignore clicked')}
          />
        </div>
      </div>
      
      {/* Toggle Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          Toggle Component Test
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)'
        }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
            <Toggle
              checked={toggle1}
              onChange={(e) => setToggle1(e.target.checked)}
            />
            <span>Toggle ON (wine background)</span>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
            <Toggle
              checked={toggle2}
              onChange={(e) => setToggle2(e.target.checked)}
            />
            <span>Toggle OFF (gray background)</span>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
            <Toggle
              checked={true}
              onChange={() => {}}
              disabled={true}
            />
            <span style={{ color: 'var(--text-secondary)' }}>Disabled toggle</span>
          </div>
        </div>
      </div>
      
      {/* POFileUpload Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          POFileUpload Component Test (Purchase Order)
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)'
        }}>
          <POFileUpload
            onFilesSelected={(files) => {
              console.log('PO files selected:', files);
              alert(`Selected ${files.length} PO file(s): ${files.map(f => f.name).join(', ')}`);
            }}
            title="Upload Purchase Order Files"
            subtitle="Required for deck generation"
            buttonText="Choose PO Files"
            accept=".xlsx,.xls,.csv"
            multiple={true}
          />
        </div>
      </div>
      
      {/* Select Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          Select Component Test
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)'
        }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Select
              value={selectedCategory}
              options={categoryOptions}
              onChange={setSelectedCategory}
              variant="default"
            />
            
            <Select
              value={selectedSubCategory}
              options={subCategoryOptions}
              onChange={setSelectedSubCategory}
              variant="secondary"
              placeholder="Select Sub-Category"
            />
            
            <Select
              value=""
              options={subCategoryOptions}
              onChange={() => {}}
              variant="secondary"
              placeholder="Select Sub-Category"
              disabled={true}
            />
            
            <Select
              value={moveToCategory}
              options={moveToCategoryOptions}
              onChange={setMoveToCategory}
              variant="primary"
              placeholder="Move to Category"
            />
          </div>
          
          <p style={{ color: 'var(--text-secondary)' }}>
            Category: <strong>{selectedCategory}</strong>
            {selectedSubCategory && <>, Sub-Category: <strong>{selectedSubCategory}</strong></>}
            {moveToCategory && <>, Move to: <strong>{moveToCategory}</strong></>}
          </p>
        </div>
      </div>
      
      {/* SearchBar Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          SearchBar Component Test
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)'
        }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by SKU, name, color..."
          />
          
          {searchQuery && (
            <p style={{ color: 'var(--text-secondary)' }}>
              Searching for: <strong>{searchQuery}</strong>
            </p>
          )}
        </div>
      </div>
      
      {/* ViewToggle Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          ViewToggle Component Test
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)'
        }}>
          <ViewToggle
            activeView={activeView}
            onViewChange={setActiveView}
          />
          
          <p style={{ color: 'var(--text-secondary)' }}>
            Active view: <strong>{activeView}</strong>
          </p>
        </div>
      </div>
      
      {/* PillCounter Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          PillCounter Component Test
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          display: 'flex',
          gap: 'var(--spacing-2)',
          flexWrap: 'wrap'
        }}>
          <PillCounter count={80} label="items" variant="default" />
          <PillCounter count={25} label="products" variant="default" />
          <PillCounter count={5} label="selected" variant="primary" />
          <PillCounter count={12} label="new" variant="secondary" />
        </div>
      </div>
      
      {/* Dropdown Component Test */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-md)', 
          marginBottom: 'var(--spacing-2)',
          color: 'var(--text-brand)'
        }}>
          Dropdown Component Test
        </h2>
        
        <div style={{ 
          backgroundColor: 'var(--background-white)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)'
        }}>
          <Dropdown
            label="Select Language"
            value={selectedLanguage}
            options={languageOptions}
            onChange={setSelectedLanguage}
          />
          
          <p style={{ marginTop: 'var(--spacing-2)', color: 'var(--text-secondary)' }}>
            Selected: {selectedLanguage}
          </p>
        </div>
      </div>
      
      {/* Layout Options Section */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <LayoutOptions
          selectedLayout={selectedLayout}
          onLayoutChange={handleLayoutChange}
          onSave={handleSaveLayout}
        />
      </div>
      
          <p style={{ 
            color: 'var(--color-brand-wine)', 
            fontWeight: 'var(--font-weight-semi-bold)',
            marginTop: 'var(--spacing-5)'
          }}>
            ✨ Clean slate - No Bootstrap here! ✨
          </p>
        </div>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

export default DeckSettingsPage;
