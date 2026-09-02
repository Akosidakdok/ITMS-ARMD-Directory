import React, { useEffect, useRef, useState } from 'react';
import pnpLogo from '../../assets/pnp-logo-transparent.png';
import './AppLoadingScreen.css';

interface AppLoadingScreenProps {
  active: boolean;
  targetProgress: number;
  status: string;
  variant?: 'prelogin' | 'session';
}

const EDGE_LAYERS = Array.from({ length: 11 }, (_, index) => index - 5);

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  active,
  targetProgress,
  status,
  variant = 'session'
}) => {
  const [mounted, setMounted] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(2);
  const progressRef = useRef(2);
  const startedAtRef = useRef(Date.now());
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (active && !wasActiveRef.current) {
      progressRef.current = 2;
      startedAtRef.current = Date.now();
      setDisplayProgress(2);
      setExiting(false);
      setMounted(true);
    }
    wasActiveRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!mounted) return;

    const target = active ? Math.min(Math.max(targetProgress, 2), 94) : 100;
    let animationFrame = 0;
    let previousTime = performance.now();

    const updateProgress = (currentTime: number) => {
      const elapsed = Math.min(currentTime - previousTime, 64);
      previousTime = currentTime;
      const smoothing = 1 - Math.exp(-elapsed / 360);
      const next = progressRef.current + (target - progressRef.current) * smoothing;
      progressRef.current = Math.abs(target - next) < 0.08 ? target : next;
      setDisplayProgress(Math.round(progressRef.current));

      if (Math.abs(target - progressRef.current) >= 0.08) {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationFrame);
  }, [active, mounted, targetProgress]);

  useEffect(() => {
    if (!mounted || active || displayProgress < 100) return;
    const elapsed = Date.now() - startedAtRef.current;
    const minimumVisibleTime = variant === 'prelogin' ? 1400 : 420;
    const completionPause = Math.max(variant === 'prelogin' ? 480 : 120, minimumVisibleTime - elapsed);
    const exitTimer = window.setTimeout(() => setExiting(true), completionPause);
    return () => window.clearTimeout(exitTimer);
  }, [active, displayProgress, mounted, variant]);

  useEffect(() => {
    if (!exiting) return;
    const unmountTimer = window.setTimeout(() => setMounted(false), variant === 'prelogin' ? 600 : 180);
    return () => window.clearTimeout(unmountTimer);
  }, [exiting, variant]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className={`pais-splash${variant === 'session' ? ' pais-splash--session' : ''}${exiting ? ' pais-splash--exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={active}
    >
      {variant === 'prelogin' ? (
        <div className="pais-splash__composition">
          <div className="pais-splash__balance" aria-hidden="true" />

          <div className="pais-splash__identity">
            <div className="pais-splash__logo-stage">
              <div className="pais-splash__logo-rotator">
                {EDGE_LAYERS.map(depth => (
                  <span
                    key={depth}
                    aria-hidden="true"
                    className="pais-splash__logo-edge"
                    style={{
                      transform: `translateZ(${depth * 1.35}px)`,
                      WebkitMaskImage: `url("${pnpLogo}")`,
                      maskImage: `url("${pnpLogo}")`
                    }}
                  />
                ))}
                <img className="pais-splash__logo pais-splash__logo--front" src={pnpLogo} alt="Philippine National Police official logo" draggable={false} />
                <img className="pais-splash__logo pais-splash__logo--back" src={pnpLogo} alt="" aria-hidden="true" draggable={false} />
                <span
                  aria-hidden="true"
                  className="pais-splash__logo-highlight"
                  style={{ WebkitMaskImage: `url("${pnpLogo}")`, maskImage: `url("${pnpLogo}")` }}
                />
              </div>
              <div className="pais-splash__logo-shadow" aria-hidden="true" />
            </div>

            <div className="pais-splash__wordmark">
              <p className="pais-splash__eyebrow">Philippine National Police</p>
              <h1>PAIS <span>2.0</span></h1>
              <p className="pais-splash__subtitle">Personnel and Assignment Information System</p>
            </div>
          </div>

          <div className="pais-splash__progress" role="progressbar" aria-label="Application loading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={displayProgress}>
            <div className="pais-splash__progress-track" aria-hidden="true">
              <span className="pais-splash__progress-fill" style={{ transform: `scaleY(${displayProgress / 100})` }} />
            </div>
            <div className="pais-splash__progress-copy">
              <output>{displayProgress}%</output>
              <span>{status}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="pais-splash__composition">
          <div className="pais-splash__identity">
            <div className="pais-splash__logo-stage">
              <img className="pais-splash__logo" src={pnpLogo} alt="Philippine National Police official logo" draggable={false} />
            </div>

            <div className="pais-splash__wordmark">
              <p className="pais-splash__eyebrow">Philippine National Police</p>
              <h1>PAIS <span>2.0</span></h1>
              <p className="pais-splash__subtitle">Personnel and Assignment Information System</p>
            </div>
          </div>

          <div className="pais-splash__progress" role="progressbar" aria-label="Application loading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={displayProgress}>
            <div className="pais-splash__progress-track" aria-hidden="true">
              <span className="pais-splash__progress-fill" style={{ transform: `scaleX(${displayProgress / 100})` }} />
            </div>
            <div className="pais-splash__progress-copy">
              <output>{displayProgress}%</output>
              <span>{status}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
