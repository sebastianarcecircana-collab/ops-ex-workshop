import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './OpeningBriefingPage.module.css';

type Phase = 'trigger' | 'briefing' | 'destruct' | 'erased';

export default function OpeningBriefingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('trigger');
  const [timeLeft, setTimeLeft] = useState(2000); // centiseconds (20 seconds)
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const animFrameRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Animate SVG distortion filter during briefing
  useEffect(() => {
    if (phase !== 'briefing') return;
    let seed = 0;
    function animateFilter() {
      seed += 0.5;
      const freqX = 0.01 + Math.sin(seed * 0.1) * 0.005;
      const freqY = 0.001 + Math.cos(seed * 0.1) * 0.5;
      turbRef.current?.setAttribute('baseFrequency', `${freqX} ${freqY}`);
      animFrameRef.current = requestAnimationFrame(animateFilter);
    }
    animFrameRef.current = requestAnimationFrame(animateFilter);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase]);

  // Countdown timer at 10ms intervals (centiseconds)
  useEffect(() => {
    if (phase !== 'briefing') return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          setPhase('destruct');
          return 0;
        }
        return t - 1;
      });
    }, 10);
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  // Wait for glitch-out animation (1.2s), then show erased message
  useEffect(() => {
    if (phase !== 'destruct') return;
    const t = setTimeout(() => setPhase('erased'), 1200);
    return () => clearTimeout(t);
  }, [phase]);

  // After 2s on erased screen, navigate to hub with fade-in flag
  useEffect(() => {
    if (phase !== 'erased') return;
    const t = setTimeout(() => navigate('/hub', { state: { fadeIn: true } }), 2000);
    return () => clearTimeout(t);
  }, [phase, navigate]);

  const seconds = Math.floor(timeLeft / 100);
  const centiseconds = timeLeft % 100;
  const timerText = `${String(seconds).padStart(2, '0')}:${String(centiseconds).padStart(2, '0')}`;

  // Escalating distortion when under 3 seconds remaining
  const modalStyle =
    timeLeft < 300 && phase === 'briefing'
      ? {
          filter: `url(#distort) contrast(${1 + (300 - timeLeft) / 100}) brightness(${
            1 + (300 - timeLeft) / 200
          })`,
        }
      : undefined;

  if (phase === 'erased') {
    return (
      <div className={styles.erasedScreen}>
        <div className={styles.erasedText}>{t('openingBriefingPage.connectionLost')}</div>
      </div>
    );
  }

  return (
    <div className={styles.outerPage}>
      <svg className={styles.filterCanvas}>
        <defs>
          <filter id="distort">
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.01 0.0001"
              numOctaves={3}
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={5} />
          </filter>
        </defs>
      </svg>

      {phase === 'trigger' && (
        <button className={styles.decryptTrigger} onClick={() => setPhase('briefing')}>
          {t('openingBriefingPage.decryptTransmission')}
        </button>
      )}

      {(phase === 'briefing' || phase === 'destruct') && (
        <div
          className={`${styles.modal} ${phase === 'destruct' ? styles.selfDestructActive : ''}`}
          style={modalStyle}
        >
          <div className={styles.headerRow}>
            <div className={styles.identity}>
              {t('openingBriefingPage.protocol')}<br />
              {t('openingBriefingPage.encryption')}
            </div>
            <div className={styles.statusBadge}>{t('openingBriefingPage.autoDelete')}</div>
          </div>

          <div className={styles.missionTitle}>{t('openingBriefingPage.missionTitle')}</div>

          <div className={styles.briefingBody}>
            <div className={styles.column}>
              <div className={styles.dataPoint}>
                <span className={styles.label}>{t('openingBriefingPage.targetCoordinates')}</span>
                48.8584° N, 2.2945° E
              </div>
              <div className={styles.dataPoint}>
                <span className={styles.label}>{t('openingBriefingPage.primaryObjective')}</span>
                {t('openingBriefingPage.primaryObjectiveText')}
              </div>
            </div>
            <div className={styles.column}>
              <div className={styles.dataPoint}>
                <span className={styles.label}>{t('openingBriefingPage.sopLabel')}</span>
                {t('openingBriefingPage.sopText')}
              </div>
              <div className={styles.dataPoint}>
                <span className={styles.label}>{t('openingBriefingPage.agentClearance')}</span>
                {t('openingBriefingPage.agentClearanceValue')}
              </div>
            </div>
          </div>

          <div className={styles.countdownContainer}>
            <span className={styles.timerLabel}>{t('openingBriefingPage.terminatingIn')}</span>
            <div className={styles.timer}>{timerText}</div>
          </div>
        </div>
      )}
    </div>
  );
}
