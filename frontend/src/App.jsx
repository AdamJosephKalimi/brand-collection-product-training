import React, { useState } from 'react';
import BrandInputs from './components/BrandInputs';
import LinesheetInput from './components/LinesheetInput';
import SectionSelector from './components/SectionSelector';
import GenerationControls from './components/GenerationControls';
import PreviewPanel from './components/PreviewPanel';
import { decksAPI } from './api/client';

function App() {
  const [brandData, setBrandData] = useState({
    name: '',
    season: '',
    logo: null
  });

  const [linesheetData, setLinesheetData] = useState({
    jsonText: '',
    fileName: null
  });

  const [validationResult, setValidationResult] = useState(null);

  const [selectedSections, setSelectedSections] = useState([
    'brand_overview',
    'themes', 
    'faqs',
    'product_overview',
    'explainers'
  ]);

  const [generationState, setGenerationState] = useState({
    isGenerating: false,
    progress: null,
    error: null
  });

  const [deckData, setDeckData] = useState(null);

  const canGenerate = brandData.name && validationResult?.valid;

  const handleGenerate = async () => {
    setGenerationState({
      isGenerating: true,
      progress: { status: 'Starting generation...', progress: 10 },
      error: null
    });

    try {
      // Parse linesheet data
      const parsedLinesheet = JSON.parse(linesheetData.jsonText);
      
      // Call generation API
      const generateResponse = await decksAPI.generate({
        brand: brandData.name,
        season: brandData.season,
        sections: selectedSections,
        linesheet: parsedLinesheet
      });

      const deckId = generateResponse.deckId;

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await decksAPI.getStatus(deckId);
          
          if (statusResponse.status === 'ready') {
            clearInterval(pollInterval);
            setGenerationState({
              isGenerating: false,
              progress: null,
              error: null
            });
            
            setDeckData(statusResponse);
            
          } else if (statusResponse.status === 'error') {
            clearInterval(pollInterval);
            setGenerationState({
              isGenerating: false,
              progress: null,
              error: statusResponse.error || 'Generation failed'
            });
          } else {
            // Still generating - update progress
            setGenerationState(prev => ({
              ...prev,
              progress: { 
                status: 'Generating AI content...', 
                progress: Math.min(prev.progress?.progress + 10, 90) 
              }
            }));
          }
        } catch (pollError) {
          clearInterval(pollInterval);
          setGenerationState({
            isGenerating: false,
            progress: null,
            error: `Status check failed: ${pollError.message}`
          });
        }
      }, 2000); // Poll every 2 seconds

    } catch (error) {
      setGenerationState({
        isGenerating: false,
        progress: null,
        error: error.message
      });
    }
  };

  const handleExport = async (format) => {
    // TODO: Implement export functionality
    console.log(`Exporting as ${format}`);
    alert(`Export as ${format.toUpperCase()} - Coming soon!`);
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 mb-1">Product Training AI</h1>
              <p className="text-muted mb-0">AI-powered product training slide builder</p>
            </div>
            <div className="badge bg-success">POC v0.1</div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <BrandInputs 
            brandData={brandData}
            onBrandChange={setBrandData}
          />
          
          <LinesheetInput
            linesheetData={linesheetData}
            onLinesheetChange={setLinesheetData}
            validationResult={validationResult}
            onValidationChange={setValidationResult}
          />
          
          <SectionSelector
            selectedSections={selectedSections}
            onSectionChange={setSelectedSections}
          />
          
          <GenerationControls
            onGenerate={handleGenerate}
            isGenerating={generationState.isGenerating}
            canGenerate={canGenerate}
            generationProgress={generationState.progress}
            generationError={generationState.error}
          />
        </div>
        
        <div className="col-lg-4">
          <div className="sticky-top" style={{ top: '20px' }}>
            <PreviewPanel
              deckData={deckData}
              isVisible={true}
              onExport={handleExport}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
