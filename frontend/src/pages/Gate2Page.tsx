import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getGateSpec, getStoredTeamId, submitGate, GateSpec,
  getGate2RenouxProfileUrl, getGate2AuctionProgrammeUrl,
  getGate2HermitageSchematicUrl, getGate2InterceptFragmentUrl,
} from '../api/client';
import { useGateAutosave, loadGateDraft } from '../hooks/useGateAutosave';
import styles from './GatePage.module.css';

const ROLES = [
  { key: 'venue', color: 'var(--amber)' },
  { key: 'host', color: 'var(--accent)' },
  { key: 'bidders', color: 'var(--green)' },
  { key: 'security', color: '#6ba3e0' },
];

type RoleKey = 'venue' | 'host' | 'bidders' | 'security';

interface RoleData {
  assignee: string;
  key_detail: string;
  weakness: string;
  notes: string;
  sources: string;
}

const emptyRole = (): RoleData => ({ assignee: '', key_detail: '', weakness: '', notes: '', sources: '' });

type Gate2Draft = { roleData: Record<RoleKey, RoleData> };

export default function Gate2Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [spec, setSpec] = useState<GateSpec | null>(null);
  const [roleData, setRoleData] = useState<Record<RoleKey, RoleData>>(() => {
    const d = loadGateDraft<Gate2Draft>(2, getStoredTeamId());
    return d?.roleData ?? {
      venue: emptyRole(),
      host: emptyRole(),
      bidders: emptyRole(),
      security: emptyRole(),
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { savedLabel } = useGateAutosave(2, { roleData });

  type MaterialKey = 'renoux' | 'programme' | 'schematic' | 'intercept';
  const [materialUrls, setMaterialUrls] = useState<Partial<Record<MaterialKey, string>>>({});
  const [materialLoading, setMaterialLoading] = useState<Partial<Record<MaterialKey, boolean>>>({});

  const materialDefs: Array<{
    key: MaterialKey;
    filename: string;
    fetch: () => Promise<string>;
  }> = [
    { key: 'renoux',    filename: 'gate2_renoux_profile.txt',      fetch: getGate2RenouxProfileUrl },
    { key: 'programme', filename: 'gate2_auction_programme.txt',   fetch: getGate2AuctionProgrammeUrl },
    { key: 'schematic', filename: 'gate2_hermitage_schematic.svg', fetch: getGate2HermitageSchematicUrl },
    { key: 'intercept', filename: 'gate2_intercept_fragment.txt',  fetch: getGate2InterceptFragmentUrl },
  ];

  async function fetchMaterial(key: MaterialKey, fetchFn: () => Promise<string>) {
    setMaterialLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const blobUrl = await fetchFn();
      setMaterialUrls((prev) => ({ ...prev, [key]: blobUrl }));
    } catch {
      setError(`Could not retrieve material: ${key}`);
    } finally {
      setMaterialLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  useEffect(() => {
    getGateSpec(2).then(setSpec).catch(console.error);
  }, []);

  function updateRole(roleKey: RoleKey, field: keyof RoleData, value: string) {
    setRoleData((prev) => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], [field]: value },
    }));
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await submitGate(2, {
        venue: {
          ...roleData.venue,
          key_moment: roleData.venue.weakness,
          sources: roleData.venue.sources.split(',').map((s) => s.trim()),
        },
        host: { ...roleData.host, sources: roleData.host.sources.split(',').map((s) => s.trim()) },
        bidders: {
          assignee: roleData.bidders.assignee,
          profiles: roleData.bidders.key_detail,
          most_dangerous: roleData.bidders.weakness,
          notes: roleData.bidders.notes,
          sources: roleData.bidders.sources.split(',').map((s) => s.trim()),
        },
        security: {
          assignee: roleData.security.assignee,
          key_weakness: roleData.security.key_detail,
          protocols: roleData.security.weakness,
          notes: roleData.security.notes,
          sources: roleData.security.sources.split(',').map((s) => s.trim()),
        },
      });
      navigate('/feedback/2');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!spec) return <div className={styles.loading}>{t('gate2Page.loading')}</div>;

  const canSubmit = ROLES.every((r) => roleData[r.key as RoleKey].key_detail);

  return (
    <div className={styles.page}>
      <div className={styles.scanline} aria-hidden />
      <div className={styles.frame}>
        <span className={styles.cornerTl} aria-hidden />
        <span className={styles.cornerTr} aria-hidden />
        <span className={styles.cornerBl} aria-hidden />
        <span className={styles.cornerBr} aria-hidden />

        <div className={styles.topBar}>
            <div className={styles.gateLabel}>{t('gate2Page.gateLabel', { name: spec.name })}</div>
            <button className={styles.backBtn} onClick={() => navigate('/hub')}>{t('gate2Page.backToHub')}</button>
        </div>

        <div className={styles.cipherBlock}>
          <div className={styles.cipherLabel}>{t('gate2Page.cipherLabel')}</div>
          <p className={styles.cipherText}>{spec.briefing}</p>
        </div>

        <div className={styles.content}>
          <div className={styles.sectionLabel}>{t('gate2Page.missionInstructions')}</div>
          <ul className={styles.instructions}>
            {spec.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
          </ul>

          <div className={styles.sectionLabel}>{t('gate2Page.intelligenceMaterials')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {materialDefs.map(({ key, filename, fetch }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {!materialUrls[key] ? (
                  <button
                    className={styles.backBtn}
                    style={{ padding: '9px 18px', fontSize: 11, letterSpacing: '0.15em' }}
                    onClick={() => fetchMaterial(key, fetch)}
                    disabled={materialLoading[key]}
                  >
                    {materialLoading[key] ? t('gate2Page.retrieving') : `⬇ ${t(`gate2Page.material.${key}`)}`}
                  </button>
                ) : (
                  <a
                    href={materialUrls[key]}
                    download={filename}
                    style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}
                  >
                    ✓ {filename} — {t('gate2Page.clickToDownload')}
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className={styles.sectionLabel}>{t('gate2Page.teamIntelligenceRoles')}</div>
          <div className={styles.rolesGrid}>
            {ROLES.map((role) => {
              const data = roleData[role.key as RoleKey];
              const fields: { key: keyof RoleData; label: string; rows?: number }[] = [
                { key: 'assignee', label: t('gate2Page.field.assignee') },
                { key: 'key_detail', label: t('gate2Page.field.keyFinding'), rows: 2 },
                {
                  key: 'weakness',
                  label: role.key === 'venue' ? t('gate2Page.field.keyTimingWindow') : t('gate2Page.field.weaknessExploit'),
                  rows: 2,
                },
                { key: 'notes', label: t('gate2Page.field.notes'), rows: 2 },
                { key: 'sources', label: t('gate2Page.field.sources') },
              ];
              return (
                <div key={role.key} className={styles.roleCard} style={{ borderLeftColor: role.color }}>
                  <div className={styles.roleCardHeader}>
                    <span className={styles.roleTitle} style={{ color: role.color }}>{t(`gate2Page.role.${role.key}`)}</span>
                  </div>
                  <div className={styles.roleBody}>
                    {fields.map((f) => (
                      <div key={f.key} className={styles.dossierField}>
                        <label className={styles.fieldLabel}>{f.label}</label>
                        {f.rows ? (
                          <textarea
                            className={styles.textarea}
                            rows={f.rows}
                            value={data[f.key]}
                            onChange={(e) => updateRole(role.key as RoleKey, f.key, e.target.value)}
                          />
                        ) : (
                          <input
                            className={styles.input}
                            type="text"
                            value={data[f.key]}
                            onChange={(e) => updateRole(role.key as RoleKey, f.key, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.submitRow}>
            {savedLabel && <span className={styles.autosaveLabel}>{savedLabel}</span>}
            <button className={styles.submitBtn} disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? t('gate2Page.transmitting') : t('gate2Page.submitGate')}
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <span><span className={styles.red}>●</span> {t('gate2Page.footerLabel')}</span>
          <span>{t('gate2Page.footerSkill')}</span>
        </div>
      </div>
    </div>
  );
}
