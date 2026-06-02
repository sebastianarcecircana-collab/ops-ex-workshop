import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvaluation, EvaluationResult } from '../api/client';
import styles from './FeedbackPage.module.css';

export default function FeedbackPage() {
  const { t } = useTranslation();
  const { gateNumber } = useParams<{ gateNumber: string }>();
  const navigate = useNavigate();
  const gateNum = parseInt(gateNumber ?? '1', 10);

  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Poll until complete or error
    function poll() {
      getEvaluation(gateNum).then((ev) => {
        setEvaluation(ev);
        if (ev.status !== 'evaluating') {
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      }).catch(console.error);
    }

    poll();
    pollingRef.current = setInterval(poll, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [gateNum]);

  function handleNext() {
    if (gateNum < 4) {
      navigate(`/gate/${gateNum + 1}`);
    } else {
      navigate('/scenario');
    }
  }

  const gateName = t(`feedbackPage.gates.${gateNum}`);

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
            <span className={styles.phaseTag}>{t('feedbackPage.gateResponse', { gate: gateNum })}</span>
            <span className={styles.phaseTitle}>{t('feedbackPage.assessmentPrefix')}<span className={styles.accent}>{t('feedbackPage.assessment')}</span></span>
          </div>
          <div className={styles.statusPill} data-status={evaluation?.status ?? 'evaluating'}>
            <span className={styles.dot} />
            {evaluation?.status === 'evaluating' || !evaluation ? t('feedbackPage.evaluating') :
             evaluation.status === 'complete' ? t('feedbackPage.transmissionReceived') : t('feedbackPage.error')}
          </div>
        </div>

        <div className={styles.meta}>
          <span>Gate 0{gateNum}</span>
          <span>//</span>
          <span>{gateName}</span>
          <span className={styles.sep}></span>
          {evaluation?.evaluatedAt && (
            <span>{new Date(evaluation.evaluatedAt).toUTCString()}</span>
          )}
        </div>

        <div className={styles.content}>
          {(!evaluation || evaluation.status === 'evaluating') && (
            <div className={styles.waiting}>
              <div className={styles.waitingWave} aria-hidden>
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={styles.wBar} style={{ animationDelay: `${-i * 0.15}s` }} />
                ))}
              </div>
              <p className={styles.waitingLabel}>{t('feedbackPage.reviewing')}</p>
            </div>
          )}

          {evaluation?.status === 'error' && (
            <div className={styles.errorBlock}>
              <p>{t('feedbackPage.errorBlock')}</p>
            </div>
          )}

          {evaluation?.status === 'complete' && (
            <>
              <div className={styles.cipherBlock}>
                <div className={styles.cipherLabel}>{t('feedbackPage.cipherLabel')}</div>
                <p className={styles.cipherText}>{evaluation.feedbackText}</p>
              </div>

              {evaluation.qualitySignals && Object.keys(evaluation.qualitySignals).length > 0 && (
                <div className={styles.signals}>
                  <div className={styles.signalsLabel}>{t('feedbackPage.qualitySignals')}</div>
                  <div className={styles.signalsGrid}>
                    {Object.entries(evaluation.qualitySignals).map(([key, val]) => (
                      <div key={key} className={styles.signalCard}>
                        <div className={styles.signalKey}>{key.replace(/_/g, ' ')}</div>
                        <div className={styles.signalVal}>
                          {typeof val === 'boolean'
                            ? (val ? <span className={styles.green}>✓ Yes</span> : <span className={styles.red}>✗ No</span>)
                            : typeof val === 'number'
                            ? <span className={val >= 0.7 ? styles.green : val >= 0.4 ? styles.amber : styles.red}>{(val * 100).toFixed(0)}%</span>
                            : String(val)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {(evaluation?.status === 'complete' || evaluation?.status === 'error') && (
          <div className={styles.actions}>
            <button className={styles.backBtn} onClick={() => navigate('/hub')}>{t('feedbackPage.returnToHub')}</button>
            <button className={styles.nextBtn} onClick={handleNext}>
              {gateNum < 4 ? t('feedbackPage.proceedToGate', { next: gateNum + 1 }) : t('feedbackPage.runScenario')}
            </button>
          </div>
        )}

        <div className={styles.footer}>
          <span><span className={styles.red}>●</span> Classified // IMF Internal</span>
          <span>{t('feedbackPage.footer', { gate: gateNum })}</span>
        </div>
      </div>
    </div>
  );
}
