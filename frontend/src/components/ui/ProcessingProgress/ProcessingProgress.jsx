import React, { useState, useEffect, useRef } from 'react';
import styles from './ProcessingProgress.module.css';
import Button from '../Button/Button';

/**
 * ProcessingProgress Component
 * 
 * Displays processing progress with phase/step information, progress bar, and cancel button.
 * Designed to sit at the top of a section, showing real-time processing status.
 * 
 * Visibility rules:
 * - Idle: Hidden
 * - Stale (completed but docs changed): Hidden
 * - Completed (not stale): Show only success message, no title/progress bar
 * - Processing: Show full UI with title, progress bar, cancel button
 * - Failed/Cancelled: Show status with error message
 * 
 * @param {string} title - Title text (e.g., "Document Processing Progress" or "Item Generation Progress")
 * @param {string} status - Processing status ('processing', 'completed', 'failed', 'cancelled', 'idle')
 * @param {string} currentPhase - Current phase/step name (e.g., "Extracting Structured Products")
 * @param {object} progress - Progress object with { phase/step, total_phases/total_steps, percentage }
 * @param {string|object} error - Error message if status is 'failed' (can be string or {message: string})
 * @param {boolean} isStale - Whether the processing results are outdated
 * @param {string} successMessage - Custom success message (default: "Documents Successfully Processed")
 * @param {function} onCancel - Callback when cancel button is clicked
 */
function ProcessingProgress({ 
  title = 'Processing Progress',
  status = 'idle',
  currentPhase = '',
  progress = null,
  error = null,
  isStale = false,
  successMessage = 'Documents Successfully Processed',
  onCancel
}) {
  const isProcessing = status === 'processing';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';

  // State for cancelled message fade-out
  const [showCancelled, setShowCancelled] = useState(false);
  const [isFading, setIsFading] = useState(false);

  // ETA countdown state
  const [localEta, setLocalEta] = useState(null);
  const localEtaRef = useRef(null);
  const etaInitializedRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => { localEtaRef.current = localEta; }, [localEta]);

  // Sync server ETA (only accept first value or downward corrections)
  const serverEta = progress?.eta_seconds;
  useEffect(() => {
    if (typeof serverEta === 'number' && serverEta > 0) {
      if (!etaInitializedRef.current) {
        setLocalEta(serverEta);
        etaInitializedRef.current = true;
      } else if (serverEta < (localEtaRef.current ?? Infinity)) {
        setLocalEta(serverEta);
      }
    }
  }, [serverEta]);

  // Clear ETA when processing stops
  useEffect(() => {
    if (!isProcessing) {
      setLocalEta(null);
      etaInitializedRef.current = false;
    }
  }, [isProcessing]);

  // 1-second countdown tick (stops at 0, doesn't go to null)
  const hasEta = localEta !== null && localEta > 0;
  useEffect(() => {
    if (!hasEta) return;
    const id = setInterval(() => {
      setLocalEta(prev => (prev === null || prev <= 1) ? 0 : prev - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [hasEta]);

  // Format ETA for display
  const formatEta = (seconds) => {
    if (seconds === null) return null;
    if (seconds <= 0) return 'Almost done...';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `~${mins}m ${secs}s remaining`;
    return `~${secs}s remaining`;
  };

  // Handle cancelled state - show for 5 seconds then fade out
  useEffect(() => {
    if (isCancelled) {
      setShowCancelled(true);
      setIsFading(false);
      
      // Start fade after 5 seconds
      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 5000);
      
      // Hide completely after fade animation (1 second)
      const hideTimer = setTimeout(() => {
        setShowCancelled(false);
      }, 6000);
      
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    } else {
      setShowCancelled(false);
      setIsFading(false);
    }
  }, [isCancelled]);

  // Hide component when:
  // - Idle (never processed)
  // - Completed (success message shown separately in parent)
  // - Cancelled and fade animation complete
  if (status === 'idle' || isCompleted || (isCancelled && !showCancelled)) {
    return null;
  }

  // Safely extract percentage - handle both number and nested object cases
  const percentage = typeof progress?.percentage === 'number' ? progress.percentage : 0;
  
  // Safely extract phase/step counts - ensure they're numbers
  const currentStep = typeof progress?.phase === 'number' ? progress.phase : 
                      typeof progress?.step === 'number' ? progress.step : 0;
  const totalSteps = typeof progress?.total_phases === 'number' ? progress.total_phases :
                     typeof progress?.total_steps === 'number' ? progress.total_steps : 0;

  // Get status text for display during processing
  const getProcessingText = () => {
    // Ensure currentPhase is a string, not an object
    if (currentPhase && typeof currentPhase === 'string') {
      return currentPhase;
    }
    return 'Processing...';
  };

  // FAILED STATE: Show error message
  if (isFailed) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="var(--color-error)"/>
            <path d="M5.5 5.5L10.5 10.5M5.5 10.5L10.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Processing Failed{error ? `: ${typeof error === 'string' ? error : error?.message || ''}` : ''}</span>
        </div>
      </div>
    );
  }

  // CANCELLED STATE: Show cancelled message with fade-out
  if (isCancelled && showCancelled) {
    return (
      <div className={`${styles.container} ${isFading ? styles.fadeOut : ''}`}>
        <div className={styles.cancelledMessage}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="var(--color-grey-40)"/>
            <rect x="5" y="7.25" width="6" height="1.5" fill="white"/>
          </svg>
          <span>Processing Cancelled</span>
        </div>
      </div>
    );
  }

  // PROCESSING STATE: Show full UI with title, progress bar, cancel button
  return (
    <div className={styles.container}>
      {/* Header Row: Title on left, Status + Cancel on right */}
      <div className={styles.header}>
        {/* Left side: Title with spinner */}
        <div className={styles.titleSection}>
          <span className={styles.title}>
            {title}
          </span>
          <div className={styles.spinner}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="var(--color-brand-wine)" strokeWidth="2" strokeLinecap="round" strokeDasharray="10 30"/>
            </svg>
          </div>
        </div>
        
        {/* Right side: Status text and Cancel button */}
        <div className={styles.actionsSection}>
          {/* Status text with ETA badge or step count */}
          <span className={styles.statusText}>
            {getProcessingText()}
            {localEta !== null ? (
              <span className={styles.etaBadge}>{formatEta(localEta)}</span>
            ) : (
              totalSteps > 0 && ` (${currentStep}/${totalSteps})`
            )}
          </span>
          
          {/* Cancel button */}
          {onCancel && (
            <Button 
              variant="primary"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBarContainer}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default ProcessingProgress;
