import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/ui/Button/Button';
import Tabs from '../../components/ui/Tabs/Tabs';
import Checkbox from '../../components/ui/Checkbox/Checkbox';
import CategoryGroup from '../../components/ui/CategoryGroup/CategoryGroup';
import ProductPreview from '../../components/ui/ProductPreview/ProductPreview';
import CheckboxList from '../../components/ui/CheckboxList/CheckboxList';
import LayoutOptions from '../../components/features/LayoutOptions/LayoutOptions';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import TopNav from '../../components/features/TopNav/TopNav';
import SectionHeader from '../../components/ui/SectionHeader/SectionHeader';
import Dropdown from '../../components/ui/Dropdown/Dropdown';
import Footer from '../../components/features/Footer/Footer';

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
