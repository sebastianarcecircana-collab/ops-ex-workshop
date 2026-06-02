import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getGateSpec, getGate3AssetUrl, getStoredTeamId, submitGate, GateSpec } from '../api/client';
import { useGateAutosave, loadGateDraft } from '../hooks/useGateAutosave';
import styles from './GatePage.module.css';

type Gate3Draft = {
  finding: string; badgeId: string; timestamp: string; location: string;
  anomalyDesc: string; reasoning: string; methodology: string;
};

export default function Gate3Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [spec, setSpec] = useState<GateSpec | null>(null);
  const [csvUrl, setCsvUrl] = useState<string | null>(null);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [finding, setFinding] = useState(() => loadGateDraft<Gate3Draft>(3, getStoredTeamId())?.finding ?? '');
  const [badgeId, setBadgeId] = useState(() => loadGateDraft<Gate3Draft>(3, getStoredTeamId())?.badgeId ?? '');
  const [timestamp, setTimestamp] = useState(() => loadGateDraft<Gate3Draft>(3, getStoredTeamId())?.timestamp ?? '');
  const [location, setLocation] = useState(() => loadGateDraft<Gate3Draft>(3, getStoredTeamId())?.location ?? '');
  const [anomalyDesc, setAnomalyDesc] = useState(() => loadGateDraft<Gate3Draft>(3, getStoredTeamId())?.anomalyDesc ?? '');
  const [reasoning, setReasoning] = useState(() => loadGateDraft<Gate3Draft>(3, getStoredTeamId())?.reasoning ?? '');
  const [methodology, setMethodology] = useState(() => loadGateDraft<Gate3Draft>(3, getStoredTeamId())?.methodology ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { savedLabel } = useGateAutosave(3, { finding, badgeId, timestamp, location, anomalyDesc, reasoning, methodology });

  useEffect(() => {
    getGateSpec(3).then(setSpec).catch(console.error);
  }, []);

  async function fetchCsv() {
    setLoadingCsv(true);
    try {
      const blobUrl = await getGate3AssetUrl();
      setCsvUrl(blobUrl);
    } catch (e) {
      setError('Could not fetch intercept data.');
    } finally {
      setLoadingCsv(false);
    }
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await submitGate(3, {
        finding,
        badge_id: badgeId,
        timestamp,
        location,
        anomaly_description: anomalyDesc,
        reasoning,
        methodology,
      });
      navigate('/feedback/3');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!spec) return <div className={styles.loading}>{t('gate3Page.loading')}</div>;

  const canSubmit = finding && badgeId && anomalyDesc;

  return (
    <div className={styles.page}>
      <div className={styles.scanline} aria-hidden />
      <div className={styles.frame}>
        <span className={styles.cornerTl} aria-hidden />
        <span className={styles.cornerTr} aria-hidden />
        <span className={styles.cornerBl} aria-hidden />
        <span className={styles.cornerBr} aria-hidden />

        <div className={styles.topBar}>
          <div className={styles.gateLabel}>{t('gate3Page.gateLabel', { name: spec.name })}</div>
          <button className={styles.backBtn} onClick={() => navigate('/hub')}>{t('gate3Page.backToHub')}</button>
        </div>

        <div className={styles.cipherBlock}>
          <div className={styles.cipherLabel}>Cipher</div>
          <p className={styles.cipherText}>{spec.briefing}</p>
        </div>

        <div className={styles.content}>
          <div className={styles.sectionLabel}>{t('gate3Page.missionInstructions')}</div>
          <ul className={styles.instructions}>
            {spec.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
          </ul>

          {spec.hasMaterials && (
            <>
              <div className={styles.sectionLabel}>{t('gate3Page.interceptData')}</div>
              {!csvUrl ? (
                <div style={{ marginBottom: 16 }}>
                  <button
                    className={styles.backBtn}
                    style={{ padding: '10px 20px', fontSize: 11, letterSpacing: '0.15em' }}
                    onClick={fetchCsv}
                    disabled={loadingCsv}
                  >
                    {loadingCsv ? t('gate3Page.retrieving') : t('gate3Page.downloadInterceptCsv')}
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <a
                    href={csvUrl}
                    download="gate3_intercept.csv"
                    style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}
                  >
                    ✓ gate3_intercept.csv — {t('gate3Page.clickToDownload')}
                  </a>
                </div>
              )}
            </>
          )}

          <div className={styles.sectionLabel}>{t('gate3Page.analysisReport')}</div>
          <div className={styles.dossierGrid}>
            <div className={styles.dossierField} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.fieldLabel}>{t('gate3Page.field.summaryFinding')}</label>
              <textarea className={styles.textarea} rows={2} value={finding} onChange={(e) => setFinding(e.target.value)} placeholder={t('gate3Page.placeholder.summaryFinding')} />
            </div>
            <div className={styles.dossierField}>
              <label className={styles.fieldLabel}>{t('gate3Page.field.suspiciousBadgeId')}</label>
              <input className={styles.input} type="text" value={badgeId} onChange={(e) => setBadgeId(e.target.value)} placeholder={t('gate3Page.placeholder.badgeId')} />
            </div>
            <div className={styles.dossierField}>
              <label className={styles.fieldLabel}>{t('gate3Page.field.timestampOfAnomaly')}</label>
              <input className={styles.input} type="text" value={timestamp} onChange={(e) => setTimestamp(e.target.value)} placeholder={t('gate3Page.placeholder.timestamp')} />
            </div>
            <div className={styles.dossierField}>
              <label className={styles.fieldLabel}>{t('gate3Page.field.location')}</label>
              <input className={styles.input} type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('gate3Page.placeholder.location')} />
            </div>
            <div className={styles.dossierField}>
              <label className={styles.fieldLabel}>{t('gate3Page.field.anomalyDescription')}</label>
              <textarea className={styles.textarea} rows={2} value={anomalyDesc} onChange={(e) => setAnomalyDesc(e.target.value)} placeholder={t('gate3Page.placeholder.anomalyDescription')} />
            </div>
            <div className={styles.dossierField} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.fieldLabel}>{t('gate3Page.field.reasoning')}</label>
              <textarea className={styles.textarea} rows={3} value={reasoning} onChange={(e) => setReasoning(e.target.value)} placeholder={t('gate3Page.placeholder.reasoning')} />
            </div>
            <div className={styles.dossierField} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.fieldLabel}>{t('gate3Page.field.methodology')}</label>
              <textarea className={styles.textarea} rows={3} value={methodology} onChange={(e) => setMethodology(e.target.value)} placeholder={t('gate3Page.placeholder.methodology')} />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.submitRow}>
            {savedLabel && <span className={styles.autosaveLabel}>{savedLabel}</span>}
            <button className={styles.submitBtn} disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? t('gate3Page.transmitting') : t('gate3Page.submitGate')}
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <span><span className={styles.red}>●</span> Gate 03 // Find the Crack</span>
          <span>Skill: Data Analysis</span>
        </div>
      </div>
    </div>
  );
}
