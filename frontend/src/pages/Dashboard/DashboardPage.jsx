import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../../components/features/TopNav/TopNav';
import Sidebar from '../../components/features/Sidebar/Sidebar';
import Footer from '../../components/features/Footer/Footer';
import Button from '../../components/ui/Button/Button';
import BrandCard from '../../components/features/BrandCard/BrandCard';
import { getAuthToken } from '../../utils/auth';

function DashboardPage() {
  const navigate = useNavigate();

  // Top nav links
  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/generated-decks', label: 'Generated Decks' },
    { path: '/settings', label: 'Settings' }
  ];

  // State for brands data
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeBrand, setActiveBrand] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);

  // Fetch brands with collections
  const fetchBrandsWithCollections = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const response = await fetch('http://localhost:8000/api/brands/with-collections', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }
      
      const data = await response.json();
      
      // Transform data to match Sidebar format
      const transformedBrands = data.map(brand => ({
        id: brand.brand_id,
        name: brand.name,
        logo: brand.logo_url,
        collections: brand.collections.map(col => ({
          id: col.collection_id,
          name: col.name
        }))
      }));
      
      setBrands(transformedBrands);
      
      // Set first brand and collection as active if available
      if (transformedBrands.length > 0) {
        setActiveBrand(transformedBrands[0].id);
        if (transformedBrands[0].collections.length > 0) {
          setActiveCollection(transformedBrands[0].collections[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchBrandsWithCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {/* Loading State */}
          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <p style={{
                fontFamily: 'var(--font-family-body)',
                fontSize: 'var(--font-size-md)',
                color: 'var(--text-secondary)'
              }}>
                Loading brands...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div style={{
              backgroundColor: 'var(--background-white)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--border-radius-md)',
              padding: 'var(--spacing-4)',
              textAlign: 'center'
            }}>
              <p style={{
                fontFamily: 'var(--font-family-body)',
                fontSize: 'var(--font-size-md)',
                color: 'var(--text-error)',
                marginBottom: 'var(--spacing-2)'
              }}>
                Error: {error}
              </p>
              <Button
                variant="primary"
                onClick={fetchBrandsWithCollections}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty State - No Brands */}
          {!loading && !error && brands.length === 0 && (
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
                    onAddCollection={() => {
                      console.log('Add collection to:', brand.name);
                      // TODO: Open add collection modal/page
                    }}
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
    </div>
  );
}

export default DashboardPage;
