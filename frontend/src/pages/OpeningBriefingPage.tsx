import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './OpeningBriefingPage.module.css';

type Phase = 'trigger' | 'briefing' | 'destruct' | 'erased';

export default function OpeningBriefingPage() {
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
        <div className={styles.erasedText}>Connection Lost // Transmission Erased</div>
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
          DECRYPT TRANSMISSION
        </button>
      )}

      {(phase === 'briefing' || phase === 'destruct') && (
        <div
          className={`${styles.modal} ${phase === 'destruct' ? styles.selfDestructActive : ''}`}
          style={modalStyle}
        >
          <div className={styles.headerRow}>
            <div className={styles.identity}>
              Protocol: Shadow-Net // 992-X<br />
              Encryption: 8192-bit AES
            </div>
            <div className={styles.statusBadge}>AUTO-DELETE ENABLED</div>
          </div>

          <div className={styles.missionTitle}>
            Project<br />QUICKSILVER
          </div>

          <div className={styles.briefingBody}>
            <div className={styles.column}>
              <div className={styles.dataPoint}>
                <span className={styles.label}>Target Coordinates</span>
                48.8584° N, 2.2945° E
              </div>
              <div className={styles.dataPoint}>
                <span className={styles.label}>Primary Objective</span>
                The Syndicate has acquired Helios — an experimental model we have tracked for
                eighteen months. They are auctioning it at the Hôtel Hermitage, Monaco, to a buyer
                we cannot yet identify. Your team is the only one in position. Work with Cipher to
                build a cover, gather intel, find a way into the auction and plan the extraction.
                Helios must be secured at all costs.
              </div>
            </div>
            <div className={styles.column}>
              <div className={styles.dataPoint}>
                <span className={styles.label}>SOP</span>
                As always, should you or any of your team be caught or killed, the Secretary will
                disavow all knowledge of your actions.
              </div>
              <div className={styles.dataPoint}>
                <span className={styles.label}>Agent Clearance</span>
                LEVEL 7 ONLY
              </div>
            </div>
          </div>

          <div className={styles.countdownContainer}>
            <span className={styles.timerLabel}>TERMINATING IN</span>
            <div className={styles.timer}>{timerText}</div>
          </div>
        </div>
      )}
    </div>
  );
}
