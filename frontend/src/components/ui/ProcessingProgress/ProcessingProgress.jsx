import React from 'react';
import styles from './ProcessingProgress.module.css';
import Button from '../Button/Button';

/**
 * ProcessingProgress Component
 * 
 * Displays processing progress with phase/step information, progress bar, and cancel button
 * 
 * @param {string} type - Type of processing ('document' or 'item')
 * @param {string} status - Processing status ('processing', 'completed', 'failed', 'cancelled', 'idle')
 * @param {string} currentPhase - Current phase/step name
 * @param {object} progress - Progress object with { phase/step, total_phases/total_steps, percentage }
 * @param {string} error - Error message if status is 'failed'
 * @param {function} onCancel - Callback when cancel button is clicked
 */
function ProcessingProgress({ 
  type = 'document',
  status = 'idle',
  currentPhase = '',
  progress = null,
  error = null,
  onCancel
}) {
  // Don't render if idle
  if (status === 'idle') {
    return null;
  }

  const isProcessing = status === 'processing';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';

  const getStatusColor = () => {
    if (isCompleted) return 'var(--color-success)';
    if (isFailed) return 'var(--color-error)';
    if (isCancelled) return 'var(--color-grey-40)';
    return 'var(--color-brand-forest)';
  };

  const getStatusIcon = () => {
    if (isCompleted) {
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="10" fill="var(--color-success)"/>
          <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    if (isFailed) {
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="10" fill="var(--color-error)"/>
          <path d="M7 7L13 13M7 13L13 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    if (isCancelled) {
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="10" fill="var(--color-grey-40)"/>
          <rect x="6" y="9" width="8" height="2" fill="white"/>
        </svg>
      );
    }
    // Processing - spinning loader
    return (
      <div className={styles.spinner}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="var(--color-brand-forest)" strokeWidth="2" strokeLinecap="round" strokeDasharray="12 38"/>
        </svg>
      </div>
    );
  };

  const getStatusText = () => {
    if (isCompleted) return 'Completed';
    if (isFailed) return 'Failed';
    if (isCancelled) return 'Cancelled';
    // Ensure currentPhase is a string, not an object
    if (currentPhase && typeof currentPhase === 'string') {
      return currentPhase;
    }
    return 'Processing...';
  };

  // Safely extract percentage - handle both number and nested object cases
  const percentage = typeof progress?.percentage === 'number' ? progress.percentage : 0;
  
  // Safely extract phase/step counts - ensure they're numbers
  const currentStep = typeof progress?.phase === 'number' ? progress.phase : 
                      typeof progress?.step === 'number' ? progress.step : 0;
  const totalSteps = typeof progress?.total_phases === 'number' ? progress.total_phases :
                     typeof progress?.total_steps === 'number' ? progress.total_steps : 0;

  return (
    <div className={styles.container}>
      {/* Status Header */}
      <div className={styles.header}>
        <div className={styles.statusInfo}>
          {getStatusIcon()}
          <span className={styles.statusText} style={{ color: getStatusColor() }}>
            {getStatusText()}
          </span>
          {progress && isProcessing && totalSteps > 0 && (
            <span className={styles.progressText}>
              ({currentStep}/{totalSteps})
            </span>
          )}
        </div>
        
        {isProcessing && onCancel && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Progress Bar - show during processing OR show full bar when completed */}
      {(isProcessing || isCompleted) && (
        <div className={styles.progressBarContainer}>
          <div 
            className={styles.progressBar} 
            style={{ 
              width: isCompleted ? '100%' : `${percentage}%`,
              backgroundColor: isCompleted ? 'var(--color-success)' : undefined
            }}
          />
        </div>
      )}

      {/* Error Message */}
      {isFailed && error && (
        <div className={styles.errorMessage}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="var(--color-error)" strokeWidth="1.5"/>
            <path d="M8 4V9" stroke="var(--color-error)" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11.5" r="0.75" fill="var(--color-error)"/>
          </svg>
          <span>{typeof error === 'string' ? error : error?.message || 'An error occurred'}</span>
        </div>
      )}
    </div>
  );
}

export default ProcessingProgress;
