import React, { useCallback } from 'react';
import styles from './AnimatedProkoIcon.module.css';

// 4 ring paths extracted from proko-icon.svg compound path
const rings = [
  { d: "M6.43881 3.78435C7.13077 1.13452 18.507 1.77441 31.8602 5.21181C45.2134 8.64922 55.4775 13.5879 54.7855 16.246C54.0936 18.8958 42.7174 18.2559 29.3642 14.8185C16.011 11.3811 5.74685 6.44239 6.43881 3.78435Z", cx: 30.6, cy: 10.0 },
  { d: "M6.25758 16.8694C6.94954 14.2196 18.3257 14.8595 31.6789 18.2969C45.0322 21.7343 55.2963 26.673 54.6043 29.3311C53.9123 31.9809 42.5362 31.341 29.1829 27.9036C15.8297 24.4662 5.56562 19.5275 6.25758 16.8694Z", cx: 30.4, cy: 23.1 },
  { d: "M6.08459 29.9545C6.77655 27.3047 18.1527 27.9446 31.506 31.382C44.8592 34.8194 55.1233 39.7581 54.4313 42.4162C53.7393 45.066 42.3632 44.4261 29.0099 40.9887C15.6567 37.5513 5.39263 32.6126 6.08459 29.9545Z", cx: 30.3, cy: 36.2 },
  { d: "M28.8287 54.0738C15.4755 50.6282 5.2114 45.6895 5.90336 43.0396C6.59532 40.3898 17.9715 41.0297 31.3247 44.4671C44.6779 47.9045 54.942 52.8432 54.2501 55.5013C53.5581 58.1511 42.1819 57.5112 28.8287 54.0738Z", cx: 30.1, cy: 49.3 },
];

// Stagger delay between each ring starting (ms)
const STAGGER_MS = 167;

function AnimatedProkoIcon({ className = '', spinning = false, onSpinComplete }) {
  // Reset after the last ring finishes its animation
  const handleAnimationEnd = useCallback((e) => {
    if (e.target.dataset.ring === '3' && onSpinComplete) {
      onSpinComplete();
    }
  }, [onSpinComplete]);

  return (
    <div className={`${styles.wrapper} ${className}`}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 61 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {rings.map((ring, i) => (
          <g
            key={i}
            data-ring={i}
            className={`${styles.ring} ${spinning ? styles.spinning : ''}`}
            style={{
              transformOrigin: `${ring.cx}px ${ring.cy}px`,
              animationDelay: spinning ? `${i * STAGGER_MS}ms` : '0ms',
            }}
            onAnimationEnd={handleAnimationEnd}
          >
            <path
              d={ring.d}
              fill="none"
              stroke="#A0F26E"
              strokeWidth={2.5}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default AnimatedProkoIcon;
