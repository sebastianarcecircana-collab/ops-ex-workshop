import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTeamState, TeamState } from '../api/client';
import styles from './HubPage.module.css';

const GATE_DEFS = [
  { n: 1, key: '1' },
  { n: 2, key: '2' },
  { n: 3, key: '3' },
  { n: 4, key: '4' },
];

function gateStatus(gateN: number, currentGate: number, submissions: TeamState['submissions']): 'complete' | 'active' | 'locked' {
  const sub = submissions.find((s) => s.gateNumber === gateN);
  if (sub && sub.status === 'complete') return 'complete';
  if (gateN === currentGate + 1) return 'active';
  if (gateN <= currentGate) return 'active';
  return 'locked';
}

export default function HubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const fadeIn = !!(location.state as { fadeIn?: boolean } | null)?.fadeIn;
  const [state, setState] = useState<TeamState | null>(null);

  useEffect(() => {
    getTeamState().then(setState).catch(console.error);
  }, []);

  if (!state) {
    return (
      <div className={styles.loading}>
        <span>Establishing secure channel…</span>
      </div>
    );
  }

  const allComplete = state.submissions.filter((s) => s.status === 'complete').length >= 4;

  return (
    <div className={`${styles.page}${fadeIn ? ` ${styles.fadeIn}` : ''}`}>
      <div className={styles.scanline} aria-hidden />
      <div className={styles.frame}>
        <span className={styles.cornerTl} aria-hidden />
        <span className={styles.cornerTr} aria-hidden />
        <span className={styles.cornerBl} aria-hidden />
        <span className={styles.cornerBr} aria-hidden />

        <div className={styles.topBar}>
          <div className={styles.left}>
            <span className={styles.opLabel}>{t('hubPage.operation')}</span>
            <span className={styles.sep}>·</span>
            <span className={styles.callsign}>{state.callsign}</span>
          </div>
          <div className={styles.secPill}>
            <span className={styles.secDot} />
            {t('hubPage.channelSecure')}
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.missionLabel}>{t('hubPage.gateHub')}</div>
            <h1 className={styles.title}>{t('hubPage.briefingLine1')}<br /><span className={styles.accent}>{t('hubPage.briefingLine2')}</span></h1>
          </div>

          <div className={styles.gates}>
            {GATE_DEFS.map((gate) => {
              const status = gateStatus(gate.n, state.currentGate, state.submissions);
              const isActive = status !== 'locked';
              return (
                <div
                  key={gate.n}
                  className={`${styles.phase} ${styles[status]}`}
                >
                  <div className={styles.phaseNumber}>0{gate.n}</div>
                  <div className={styles.phaseInfo}>
                    <div className={styles.phaseName}>{t(`hubPage.gate.${gate.key}`)}</div>
                    <div className={styles.phaseSkill}>{t(`hubPage.skills.${gate.key}`)}</div>
                  </div>
                  <div className={styles.phaseRight}>
                    <div className={`${styles.phaseStatus} ${styles[`status_${status}`]}`}>
                      {status === 'complete' && <><span>●</span> Complete</>}
                      {status === 'active' && <><span>◐</span> In Progress</>}
                      {status === 'locked' && <><span>○</span> Sealed</>}
                    </div>
                    {isActive && (
                      <button
                        className={styles.enterBtn}
                        onClick={() => navigate(`/gate/${gate.n}`)}
                      >
                        {status === 'complete' ? t('hubPage.review') : t('hubPage.enterGate')} →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {allComplete && (
            <div className={styles.scenarioBanner}>
              <p className={styles.scenarioText}>{t('hubPage.allCompleteText')}</p>
              <button className={styles.scenarioBtn} onClick={() => navigate('/scenario')}>
                {t('hubPage.runScenario')}
              </button>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span><span className={styles.red}>●</span> {t('hubPage.footerClassified')}</span>
          <span>{t('hubPage.footerSession', { id: state.teamId.slice(0, 8) })}</span>
        </div>
      </div>
    </div>
  );
}
