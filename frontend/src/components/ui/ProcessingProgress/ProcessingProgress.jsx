import React from 'react';
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

  // Hide component when:
  // - Idle (never processed)
  // - Stale (completed but docs changed - user needs to reprocess)
  if (status === 'idle' || (isCompleted && isStale)) {
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

  // COMPLETED STATE: Show only success message on right side (no title, no progress bar)
  if (isCompleted && !isStale) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection} />
          <div className={styles.actionsSection}>
            <span className={styles.statusText}>{successMessage}</span>
          </div>
        </div>
      </div>
    );
  }

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

  // CANCELLED STATE: Show cancelled message
  if (isCancelled) {
    return (
      <div className={styles.container}>
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
          {/* Status text with step count */}
          <span className={styles.statusText}>
            {getProcessingText()}
            {totalSteps > 0 && ` (${currentStep}/${totalSteps})`}
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
