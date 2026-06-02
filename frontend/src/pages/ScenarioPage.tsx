import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { triggerScenarioGeneration, getScenario, ScenarioState } from '../api/client';
import styles from './ScenarioPage.module.css';

const OUTCOME_LABELS: Record<string, string> = {
  clean_success: 'scenarioPage.cleanSuccess',
  partial_success: 'scenarioPage.partialSuccess',
  failure: 'scenarioPage.failure',
};

export default function ScenarioPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState<ScenarioState | null>(null);
  const [triggered, setTriggered] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Try to generate. If already generating, that's fine.
    if (!triggered) {
      setTriggered(true);
      triggerScenarioGeneration().catch(console.error);
    }

    function poll() {
      getScenario().then((s) => {
        setScenario(s);
        if (s.status !== 'generating') {
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      }).catch(console.error);
    }

    poll();
    pollingRef.current = setInterval(poll, 4000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const outcomeType = scenario?.outcomeType;
  const aggregate = scenario?.weightedAggregate;
  const complete = scenario?.status === 'complete' || scenario?.status === 'error';

  return (
    <div className={styles.page}>
      <div className={styles.scanline} aria-hidden />
      <div className={styles.frame}>
        <span className={styles.cornerTl} aria-hidden />
        <span className={styles.cornerTr} aria-hidden />
        <span className={styles.cornerBl} aria-hidden />
        <span className={styles.cornerBr} aria-hidden />

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.phaseTag}>{t('scenarioPage.outcomeTag')}</span>
            <span className={styles.phaseTitle}>{t('scenarioPage.outcomeTitlePart1')} <span className={styles.accent}>{t('scenarioPage.outcomeTitlePart2')}</span></span>
          </div>
          <div className={`${styles.livePill} ${complete ? styles.done : ''}`}>
            <span className={styles.dot} />
            {complete ? t('scenarioPage.transmissionComplete') : t('scenarioPage.transmitting')}
          </div>
        </div>

        <div className={styles.acts}>
          {!scenario || scenario.acts.length === 0 ? (
            <div className={styles.waiting}>
              <div className={styles.waitingWave} aria-hidden>
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={styles.wBar} style={{ animationDelay: `${-i * 0.15}s`, height: `${16 + Math.abs((i - 4) * 3)}px` }} />
                ))}
              </div>
              <p className={styles.waitingLabel}>{t('scenarioPage.cipherGeneratingScenario')}</p>
            </div>
          ) : (
            scenario.acts.map((act) => (
              <div key={act.act_number} className={styles.act}>
                <div className={styles.actHeader}>
                  <span className={styles.actNum}>Act {act.act_number.toString().padStart(2, '0')}</span>
                  <span className={styles.actTitle}>{act.act_title}</span>
                </div>
                <p className={styles.actProse}>{act.prose}</p>
              </div>
            ))
          )}

          {scenario && scenario.status === 'generating' && scenario.acts.length > 0 && (
            <div className={styles.actPending}>
              <span className={styles.dot} />
              <span>{t('scenarioPage.incoming')}</span>
            </div>
          )}
        </div>

        <div className={styles.outcomeBar}>
          <div className={styles.outcomeLeft}>
            <span className={styles.outcomeLabel}>{t('scenarioPage.outcomeLabel')}</span>
            {complete && outcomeType ? (
              <span className={`${styles.outcomeStatus} ${styles[outcomeType.replace('_', '')]}`}>
                {t(OUTCOME_LABELS[outcomeType])}
                {aggregate != null && ` · ${(aggregate * 100).toFixed(0)}%`}
              </span>
            ) : (
              <span className={styles.outcomeStatus}>
                {t('scenarioPage.pending')} · {scenario ? `${scenario.acts.length}/5 ${t('scenarioPage.acts')}` : t('scenarioPage.generating')}
              </span>
            )}
          </div>
          <div className={styles.outcomeActions}>
            {complete && (
              <button className={styles.hubBtn} onClick={() => navigate('/hub')}>{t('scenarioPage.missionHub')}</button>
            )}
          </div>
          <div className={styles.classified}>
            <span><span className={styles.red}>●</span> {t('scenarioPage.classified')}</span>
            <span>{t('scenarioPage.outcomeReveal')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
