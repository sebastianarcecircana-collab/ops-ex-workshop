import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { joinCohort, setSession, ApiError, type JoinResponse } from '../api/client';
import styles from './JoinPage.module.css';

type SequencePhase = 'idle' | 'glitch' | 'terminal' | 'bsod';

type TerminalLine = {
  text: string;
  warn?: boolean;
  delay: number;
};

const SECRET_PASSWORD = 'QUICKSILVER';

const TERMINAL_SCRIPT: TerminalLine[] = [
  { text: '> relay@imf-core:~# access --grant ALL', delay: 320 },
  { text: '[ OK ] bypassing authentication layer ...', delay: 360 },
  { text: '[ OK ] elevating privileges -> SUPERUSER', delay: 340 },
  { text: '[ OK ] dumping session tokens .............. 14,882 keys', delay: 420 },
  { text: '[ OK ] disabling intrusion detection', delay: 300 },
  { text: 'WARN  firewall heartbeat lost', delay: 280, warn: true },
  { text: 'WARN  unauthorized kernel module injected', delay: 280, warn: true },
  { text: '> deploying payload: quicksilver.bin', delay: 380 },
  { text: 'downloading [##########################] 100%', delay: 480 },
  { text: 'WARN  CORE INTEGRITY FAILURE', delay: 260, warn: true },
  { text: 'WARN  CASCADE FAULT - memory corruption 0xDEADBEEF', delay: 240, warn: true },
];

export default function JoinPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [callsign, setCallsign] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<SequencePhase>('idle');
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [showCompromisedBanner, setShowCompromisedBanner] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [crashProgress, setCrashProgress] = useState(0);
  const pendingSessionRef = useRef<JoinResponse | null>(null);
  const timeoutIdsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const intervalIdsRef = useRef<Array<ReturnType<typeof setInterval>>>([]);

  function trackTimeout(callback: () => void, delay: number) {
    const timeoutId = setTimeout(callback, delay);
    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  }

  function trackInterval(callback: () => void, delay: number) {
    const intervalId = setInterval(callback, delay);
    intervalIdsRef.current.push(intervalId);
    return intervalId;
  }

  function clearTimers() {
    timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    intervalIdsRef.current.forEach((intervalId) => clearInterval(intervalId));
    timeoutIdsRef.current = [];
    intervalIdsRef.current = [];
  }

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (phase !== 'terminal') return;

    setTerminalLines([]);
    setShowCompromisedBanner(false);
    let lineIndex = 0;

    const queueNextLine = () => {
      if (lineIndex < TERMINAL_SCRIPT.length) {
        const line = TERMINAL_SCRIPT[lineIndex++];
        setTerminalLines((currentLines) => [...currentLines, line]);
        trackTimeout(queueNextLine, line.delay);
        return;
      }

      setShowCompromisedBanner(true);
      trackTimeout(() => {
        setFlashActive(true);
        trackTimeout(() => {
          setFlashActive(false);
          setPhase('bsod');
        }, 220);
      }, 1500);
    };

    queueNextLine();
  }, [phase]);

  useEffect(() => {
    if (phase !== 'bsod') return;

    setCrashProgress(0);
    const intervalId = trackInterval(() => {
      setCrashProgress((currentProgress) => {
        const nextProgress = Math.min(
          100,
          currentProgress + Math.floor(Math.random() * 11) + 4,
        );

        if (nextProgress === 100) {
          clearInterval(intervalId);
          intervalIdsRef.current = intervalIdsRef.current.filter(
            (activeIntervalId) => activeIntervalId !== intervalId,
          );

          const session = pendingSessionRef.current;
          if (session) {
            trackTimeout(() => {
              setSession(session.teamId, session.sessionToken);
              navigate('/opening');
            }, 320);
          }
        }

        return nextProgress;
      });
    }, 240);

    return () => {
      clearInterval(intervalId);
      intervalIdsRef.current = intervalIdsRef.current.filter(
        (activeIntervalId) => activeIntervalId !== intervalId,
      );
    };
  }, [phase, navigate]);

  function launchCrashSequence(session: JoinResponse) {
    clearTimers();
    pendingSessionRef.current = session;
    setPhase('glitch');
    setTerminalLines([]);
    setShowCompromisedBanner(false);
    setFlashActive(false);
    setCrashProgress(0);
    trackTimeout(() => setPhase('terminal'), 1300);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || phase !== 'idle') return;

    setError('');
    const normalizedJoinCode = joinCode.trim().toUpperCase();
    const normalizedCallsign = callsign.trim().toUpperCase();

    if (!normalizedJoinCode || !normalizedCallsign) return;

    setLoading(true);
    try {
      const res = await joinCohort(normalizedJoinCode, normalizedCallsign);

      if (normalizedJoinCode === SECRET_PASSWORD) {
        launchCrashSequence(res);
        return;
      }

      setSession(res.teamId, res.sessionToken);
      navigate('/opening');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('joinPage.connectionFailed'));
      }
    } finally {
      setLoading(false);
    }
  }

  const sequenceActive = phase !== 'idle';
  const formDisabled = loading || sequenceActive;

  function renderStage(ghost = false) {
    const callsignId = ghost ? 'callsign-ghost' : 'callsign';
    const joinCodeId = ghost ? 'joinCode-ghost' : 'joinCode';

    return (
      <div className={styles.stage} aria-hidden={ghost}>
        <aside className={styles.promo}>
          <div className={styles.logo}>
            <span className={styles.mark}>Q</span>
            Quicksilver Relay
          </div>

          <div className={styles.pitch}>
            <h1>{t('joinPage.title')}</h1>
            <p>{t('joinPage.subtitle')}</p>
          </div>

          <div className={styles.stats}>
            <div>
              <div className={styles.statValue}>8192</div>
              <div className={styles.statLabel}>Bit Encryption</div>
            </div>
            <div>
              <div className={styles.statValue}>4 Gates</div>
              <div className={styles.statLabel}>Mission Stages</div>
            </div>
            <div>
              <div className={styles.statValue}>T-00:20</div>
              <div className={styles.statLabel}>Self-Delete Window</div>
            </div>
          </div>
        </aside>

        <main className={styles.panel}>
          <form className={styles.card} onSubmit={ghost ? undefined : handleSubmit} autoComplete="off">
            <h2>{t('joinPage.signInTitle')}</h2>
            <p className={styles.sub}>{t('joinPage.signInSubtitle')}</p>

            <div className={styles.field}>
              <label htmlFor={callsignId}>{t('joinPage.callsignLabel')}</label>
              <input
                id={callsignId}
                name={callsignId}
                type="text"
                placeholder={t('joinPage.callsignPlaceholder')}
                value={callsign}
                onChange={(event) => setCallsign(event.target.value)}
                disabled={ghost || formDisabled}
                required
                autoComplete="off"
                spellCheck={false}
                tabIndex={ghost ? -1 : undefined}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor={joinCodeId}>{t('joinPage.passwordLabel')}</label>
              <input
                id={joinCodeId}
                name={joinCodeId}
                type="password"
                placeholder={t('joinPage.passwordPlaceholder')}
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                disabled={ghost || formDisabled}
                required
                autoComplete="off"
                spellCheck={false}
                tabIndex={ghost ? -1 : undefined}
              />
            </div>

            {!ghost && (
              <div className={styles.msg} aria-live="polite">
                {error}
              </div>
            )}

            <div className={styles.row}>
              <label className={styles.checkboxRow}>
                <input type="checkbox" disabled={ghost || formDisabled} tabIndex={ghost ? -1 : undefined} />
                {t('joinPage.rememberDevice')}
              </label>
              <span className={styles.inlineMeta}>{t('joinPage.clearanceMeta')}</span>
            </div>

            <button
              className={styles.btn}
              type={ghost ? 'button' : 'submit'}
              disabled={ghost || formDisabled}
              tabIndex={ghost ? -1 : undefined}
            >
              {loading ? t('joinPage.authorizing') : t('joinPage.logIn')}
            </button>

            <div className={styles.divider}>mission relay</div>

            <button className={styles.sso} type="button" disabled tabIndex={ghost ? -1 : undefined}>
              <span className={styles.ssoMark}>//</span>
              {t('joinPage.ssoLocked')}
            </button>

            <div className={styles.signup}>{t('joinPage.credentialReset')}</div>
            <div className={styles.hint}>{t('joinPage.hint')}</div>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${sequenceActive ? styles.glitching : ''}`}>
      <div className={styles.backdrop} aria-hidden />

      <div className={styles.liveStage}>{renderStage()}</div>

      {(phase === 'glitch' || phase === 'terminal') && (
        <>
          <div className={`${styles.ghost} ${styles.ghostRed}`} aria-hidden>
            {renderStage(true)}
          </div>
          <div className={`${styles.ghost} ${styles.ghostBlue}`} aria-hidden>
            {renderStage(true)}
          </div>
          <div className={styles.scan} aria-hidden />
        </>
      )}

      {phase === 'terminal' && (
        <div className={`${styles.terminal} ${showCompromisedBanner ? styles.terminalGlitch : ''}`}>
          <div className={styles.termOut}>
            {terminalLines.map((line, index) => (
              <div
                key={`${index}-${line.text}`}
                className={`${styles.line} ${line.warn ? styles.warn : ''}`}
              >
                {line.text}
              </div>
            ))}

            {showCompromisedBanner && (
              <>
                <div className={styles.big}>SYSTEM COMPROMISED</div>
                <div className={styles.signature}>
                  signed, <strong>// QUICKSILVER //</strong>
                  <span className={styles.cursor} aria-hidden />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'bsod' && (
        <div className={styles.crash}>
          <div className={styles.sad}>:(</div>
          <h3>
            Your workspace ran into a problem and needs to restart. We are just collecting some
            error info, and then you can try again.
          </h3>
          <div className={styles.pct}>{crashProgress}% complete</div>
          <div className={styles.meta}>
            For more information about this issue and possible fixes, visit https://quicksilver.imf/stop
            <br />
            If you call a support person, give them this info:
            <br />
            Stop code: <strong>QUICKSILVER_BREACH</strong>
          </div>
          <div className={styles.qr} aria-hidden />
        </div>
      )}

      <div className={`${styles.flash} ${flashActive ? styles.flashActive : ''}`} aria-hidden />
    </div>
  );
}
