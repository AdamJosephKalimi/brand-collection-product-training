import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../../components/features/TopNav/TopNav';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import Footer from '../../components/features/Footer/Footer';
import Button from '../../components/ui/Button/Button';

function DashboardPage() {
  const navigate = useNavigate();

  // Top nav links
  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/generated-decks', label: 'Generated Decks' },
    { path: '/settings', label: 'Settings' }
  ];

  // Sidebar data (placeholder - will be replaced with real data)
  // Set to empty array to show empty state
  const [brands] = useState([]);
  
  const [activeBrand, setActiveBrand] = useState('mackage');
  const [activeCollection, setActiveCollection] = useState('fw2024');

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
          activeCollection={activeCollection}
          onBrandChange={handleBrandChange}
          onCollectionChange={handleCollectionChange}
        />
        
        {/* Main Content */}
        <main style={{
          flex: 1,
          padding: 'var(--spacing-4)',
          overflowY: 'auto',
          backgroundColor: 'var(--background-page)'
        }}>
          {/* Empty State - No Brands */}
          {brands.length === 0 && (
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
                  onClick={() => {
                    console.log('Get Started clicked');
                    // TODO: Add create brand logic
                  }}
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
          {brands.length > 0 && (
            <div style={{
              backgroundColor: 'var(--background-white)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--border-radius-md)',
              padding: 'var(--spacing-4)',
              marginTop: 'var(--spacing-4)'
            }}>
              <p style={{
                fontFamily: 'var(--font-family-body)',
                fontSize: 'var(--font-size-md)',
                color: 'var(--text-secondary)'
              }}>
                Brands list coming soon...
              </p>
            </div>
          )}
        </main>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}

export default DashboardPage;
