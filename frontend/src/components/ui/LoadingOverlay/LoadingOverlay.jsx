import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import styles from './LoadingOverlay.module.css';

/**
 * LoadingOverlay Component
 * 
 * Full-screen loading overlay with spinner and message.
 * Renders at document root using portal for proper z-index layering.
 * Blocks all user interaction while visible.
 * 
 * @param {boolean} isVisible - Controls overlay visibility
 * @param {string} message - Loading message to display (default: "Loading...")
 * 
 * @example
 * const [isSaving, setIsSaving] = useState(false);
 * 
 * const handleSave = async () => {
 *   setIsSaving(true);
 *   try {
 *     await saveData();
 *   } finally {
 *     setIsSaving(false);
 *   }
 * };
 * 
 * return (
 *   <>
 *     <LoadingOverlay isVisible={isSaving} message="Saving changes..." />
 *     <button onClick={handleSave}>Save</button>
 *   </>
 * );
 */
function LoadingOverlay({ isVisible = false, message = 'Loading...' }) {
  if (!isVisible) return null;

  return createPortal(
    <div className={styles.overlay} role="alert" aria-live="assertive" aria-busy="true">
      <div className={styles.card}>
        <Loader2 className={styles.spinner} size={40} />
        <p className={styles.message}>{message}</p>
      </div>
    </div>,
    document.body
  );
}

export default LoadingOverlay;
