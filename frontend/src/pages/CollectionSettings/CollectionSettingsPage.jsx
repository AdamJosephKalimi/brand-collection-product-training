import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
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
import LayoutOptions from '../../components/features/LayoutOptions/LayoutOptions';
import Footer from '../../components/features/Footer/Footer';

function CollectionSettingsPage() {
  const { collectionId } = useParams();

  // Top nav links
  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/generated-decks', label: 'Generated Decks' },
    { path: '/settings', label: 'Settings' }
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

  // Tabs configuration
  const [activeTab, setActiveTab] = useState(2); // Default to Deck Settings
  
  const tabs = [
    { id: 1, number: 1, label: 'Collection Info' },
    { id: 2, number: 2, label: 'Deck Settings' },
    { id: 3, number: 3, label: 'Collection Items' },
    { id: 4, number: 4, label: 'Generate Deck' }
  ];

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
          onCollectionClick={(collectionId) => setActiveCollection(collectionId)}
          onNewBrand={() => alert('New Brand clicked')}
          onNewCollection={(brandId) => alert(`New Collection for ${brandId}`)}
        />
        
        {/* Main Content Wrapper */}
        <div style={{ 
          flex: 1, 
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Scrollable Content */}
          <div style={{ 
            flex: 1, 
            backgroundColor: 'var(--background-light)',
            padding: 'var(--spacing-4) var(--spacing-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-3)',
            overflowY: 'auto'
          }}>
          {/* Tabs */}
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          
          {/* Tab 1: Collection Info */}
          {activeTab === 1 && (
            <div style={{
              backgroundColor: 'var(--background-white)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--border-radius-md)',
              padding: 'var(--spacing-4)',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <h2 style={{ color: 'var(--text-brand)', marginBottom: 'var(--spacing-2)' }}>
                Collection Info
              </h2>
              <p>Content coming soon...</p>
            </div>
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
              padding: 'var(--spacing-4)',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <h2 style={{ color: 'var(--text-brand)', marginBottom: 'var(--spacing-2)' }}>
                Collection Items
              </h2>
              <p>Content coming soon...</p>
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
          
          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default CollectionSettingsPage;
