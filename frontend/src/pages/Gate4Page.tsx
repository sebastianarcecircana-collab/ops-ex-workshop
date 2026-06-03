import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGateSpec, getStoredTeamId, getTeamState, submitGate, GateSpec, TeamState } from '../api/client';
import { useGateAutosave, loadGateDraft } from '../hooks/useGateAutosave';
import { useTranslation } from 'react-i18next';
import styles from './Gate4Page.module.css';

interface SeqRow { time: string; step: string; owner: string; }
interface RoleRow { agent: string; role: string; }
interface ContRow { failure: string; response: string; }

function buildAssetsFromState(state: TeamState) {
  const assets: Array<{ label: string; value: string; detail: string; priority: 'p1' | 'p2' | 'p3' }> = [];
  for (const sub of state.submissions) {
    const a = sub.artifact as unknown as Record<string, unknown> | undefined;
    if (!a) continue;
    if (sub.gateNumber === 1) {
      const cd = a['cover_dossier'] as Record<string, string> | undefined;
      if (cd?.cover_name) {
        assets.push({ label: 'Operative', value: cd.cover_name, detail: `${cd.employer ?? ''} · ${cd.nationality ?? ''}`, priority: 'p1' });
      }
    }
    if (sub.gateNumber === 2) {
      const venue = a['venue'] as Record<string, string> | undefined;
      if (venue?.key_detail) {
        assets.push({
          label: 'Venue',
          value: venue.key_detail,
          detail: venue.key_moment ?? venue.weakness ?? '',
          priority: 'p2',
        });
      }
      const host = a['host'] as Record<string, string> | undefined;
      if (host?.key_detail) {
        assets.push({ label: 'Host', value: host.key_detail, detail: '', priority: 'p2' });
      }
    }
    if (sub.gateNumber === 3) {
      const finding = a['finding'] as string | undefined;
      const timestamp = a['timestamp'] as string | undefined;
      const location = a['location'] as string | undefined;
      if (finding) {
        assets.push({ label: 'Window', value: `${timestamp ?? ''} · ${location ?? ''}`, detail: finding, priority: 'p3' });
      }
    }
  }
  return assets;
}

type Gate4Draft = {
  objective: string; approach: string; exfil: string;
  biggestRisk: string; aiPartnership: string;
  sequence: SeqRow[]; roles: RoleRow[]; contingencies: ContRow[];
};

export default function Gate4Page() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [spec, setSpec] = useState<GateSpec | null>(null);
  const [teamState, setTeamState] = useState<TeamState | null>(null);

  const [objective, setObjective] = useState(() => loadGateDraft<Gate4Draft>(4, getStoredTeamId())?.objective ?? '');
  const [approach, setApproach] = useState(() => loadGateDraft<Gate4Draft>(4, getStoredTeamId())?.approach ?? '');
  const [exfil, setExfil] = useState(() => loadGateDraft<Gate4Draft>(4, getStoredTeamId())?.exfil ?? '');
  const [biggestRisk, setBiggestRisk] = useState(() => loadGateDraft<Gate4Draft>(4, getStoredTeamId())?.biggestRisk ?? '');
  const [aiPartnership, setAiPartnership] = useState(() => loadGateDraft<Gate4Draft>(4, getStoredTeamId())?.aiPartnership ?? '');

  const [sequence, setSequence] = useState<SeqRow[]>(() => loadGateDraft<Gate4Draft>(4, getStoredTeamId())?.sequence ?? [
    { time: '', step: '', owner: '' },
    { time: '', step: '', owner: '' },
    { time: '', step: '', owner: '' },
  ]);
  const [roles, setRoles] = useState<RoleRow[]>(() => loadGateDraft<Gate4Draft>(4, getStoredTeamId())?.roles ?? [
    { agent: '', role: '' },
    { agent: '', role: '' },
  ]);
  const [contingencies, setContingencies] = useState<ContRow[]>(() => loadGateDraft<Gate4Draft>(4, getStoredTeamId())?.contingencies ?? [
    { failure: '', response: '' },
    { failure: '', response: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { savedLabel } = useGateAutosave(4, { objective, approach, exfil, biggestRisk, aiPartnership, sequence, roles, contingencies });

  useEffect(() => {
    getGateSpec(4).then(setSpec).catch(console.error);
    getTeamState().then(setTeamState).catch(console.error);
  }, []);

  function updateSeq(i: number, k: keyof SeqRow, v: string) {
    setSequence((prev) => prev.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }
  function updateRole(i: number, k: keyof RoleRow, v: string) {
    setRoles((prev) => prev.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }
  function updateCont(i: number, k: keyof ContRow, v: string) {
    setContingencies((prev) => prev.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await submitGate(4, {
        objective,
        approach,
        sequence: sequence.filter((s) => s.step),
        roles: roles.filter((r) => r.agent),
        contingencies: contingencies.filter((c) => c.failure),
        exfil,
        biggest_risk: biggestRisk,
        ai_partnership: aiPartnership,
      });
      navigate('/feedback/4');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!spec) return <div className={styles.loading}>Loading gate briefing…</div>;

  const assets = teamState ? buildAssetsFromState(teamState) : [];
  const canSubmit = objective && approach && sequence.some((s) => s.step) && aiPartnership;

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
            <button className={styles.breadcrumb} onClick={() => navigate('/hub')}>
              {t('gate4Page.missionHub')}
            </button>
            <div>
              <div className={styles.phaseTag}>{t('gate4Page.phaseTag')}</div>
              <div className={styles.phaseTitle}>
                {t('gate4Page.phaseTitleStart')} <span className={styles.accent}>{t('gate4Page.phaseTitleAccent')}</span>
              </div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.statusPill}>
              <span className={styles.dot} />
              <div className={styles.statusPill}>{t('gate4Page.finalPhase')}</div>
            </div>
          </div>
        </div>

        <div className={styles.transmission}>
          <div className={styles.txHeader}>
            <span>{t('gate4Page.transmission')}</span><span>//</span>
            <span className={styles.from}>{t('gate4Page.fromCipher')}</span>
          </div>
          <p className={styles.cipherMsg}>
            {spec.briefing}
          </p>
        </div>

        <div className={styles.briefcase}>
          {/* Assets rail */}
          <div className={styles.assetsRail}>
            <div className={styles.railHeading}>{t('gate4Page.railHeading')}</div>
            <div className={styles.railSub}>{t('gate4Page.railSub')}</div>

            {['p1', 'p2', 'p3'].map((priority) => {
              const group = assets.filter((a) => a.priority === priority);
              if (group.length === 0) return null;
              const groupLabel = priority === 'p1'
                ? t('gate4Page.assetGroup.coverIdentity')
                : priority === 'p2'
                  ? t('gate4Page.assetGroup.intel')
                  : t('gate4Page.assetGroup.finding');
              return (
                <div key={priority} className={styles.assetGroup}>
                  <div className={styles.agLabel}>
                    <span>{groupLabel}</span>
                    <span className={styles.agSrc}>{priority.toUpperCase()}</span>
                  </div>
                  {group.map((asset, i) => (
                    <div key={i} className={`${styles.assetCard} ${styles[priority]}`}>
                      <div className={styles.acardKey}>{asset.label}</div>
                      <div className={styles.acardVal}>{asset.value}</div>
                      {asset.detail && <div className={styles.acardDetail}>{asset.detail}</div>}
                    </div>
                  ))}
                </div>
              );
            })}

            {assets.length === 0 && (
              <p className={styles.noAssets}>{t('gate4Page.noAssets')}</p>
            )}
          </div>

          {/* Plan builder */}
          <div className={styles.planBuilder}>
            <div className={styles.sectionLabel}>{t('gate4Page.operationPlan')} <span className={styles.badge}>{t('gate4Page.submissionManifest')}</span></div>

            <div className={styles.planMeta}>
              <div>
                <div className={styles.fieldLabel}>{t('gate4Page.field.objective')} <span className={styles.req}>{t('gate4Page.required')}</span></div>
                <input className={styles.fieldInput} type="text" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What does success look like?" />
              </div>
              <div>
                <div className={styles.fieldLabel}>{t('gate4Page.field.approach')} <span className={styles.req}>{t('gate4Page.required')}</span></div>
                <input className={styles.fieldInput} type="text" value={approach} onChange={(e) => setApproach(e.target.value)} placeholder="One line — your core tactic" />
              </div>
            </div>

            {/* Sequence */}
            <div className={styles.planModule}>
              <div className={styles.pmHeader}>
                <span className={styles.pmTitle}><span className={styles.pmNum}>01</span>{t('gate4Page.sequence')}</span>
              </div>
              <div className={styles.pmBody}>
                {sequence.map((row, i) => (
                  <div key={i} className={styles.seqRow}>
                    <input className={styles.seqTime} value={row.time} onChange={(e) => updateSeq(i, 'time', e.target.value)} placeholder={t('gate4Page.placeholder.time')} />
                    <input className={styles.seqStep} value={row.step} onChange={(e) => updateSeq(i, 'step', e.target.value)} placeholder={t('gate4Page.placeholder.stepDescription')} />
                    <input className={styles.seqOwner} value={row.owner} onChange={(e) => updateSeq(i, 'owner', e.target.value)} placeholder={t('gate4Page.placeholder.agent')} />
                  </div>
                ))}
                <button className={styles.addRow} onClick={() => setSequence((prev) => [...prev, { time: '', step: '', owner: '' }])}>
                  {t('gate4Page.addStep')}
                </button>
              </div>
            </div>

            {/* Roles */}
            <div className={styles.planModule}>
              <div className={styles.pmHeader}>
                <span className={styles.pmTitle}><span className={styles.pmNum}>02</span>{t('gate4Page.roles')}</span>
              </div>
              <div className={styles.pmBody}>
                {roles.map((row, i) => (
                  <div key={i} className={styles.seqRow} style={{ gridTemplateColumns: '130px 1fr' }}>
                    <input className={styles.seqOwner} style={{ textAlign: 'left' }} value={row.agent} onChange={(e) => updateRole(i, 'agent', e.target.value)} placeholder={t('gate4Page.placeholder.callsign')} />
                    <input className={styles.seqStep} value={row.role} onChange={(e) => updateRole(i, 'role', e.target.value)} placeholder={t('gate4Page.placeholder.responsibilities')} />
                  </div>
                ))}
                <button className={styles.addRow} onClick={() => setRoles((prev) => [...prev, { agent: '', role: '' }])}>
                  {t('gate4Page.addAgent')}
                </button>
              </div>
            </div>

            {/* Contingencies */}
            <div className={styles.planModule}>
              <div className={styles.pmHeader}>
                <span className={styles.pmTitle}><span className={styles.pmNum}>03</span>{t('gate4Page.contingencies')}</span>
              </div>
              <div className={styles.pmBody}>
                {contingencies.map((row, i) => (
                  <div key={i} className={styles.contRow}>
                    <div>
                      <div className={`${styles.contLabel} ${styles.fail}`}>{t('gate4Page.contingency.ifFails')}</div>
                      <textarea className={styles.contTextarea} value={row.failure} onChange={(e) => updateCont(i, 'failure', e.target.value)} placeholder={t('gate4Page.contingency.placeholder.failure')} />
                    </div>
                    <div>
                      <div className={`${styles.contLabel} ${styles.resp}`}>{t('gate4Page.contingency.weRespond')}</div>
                      <textarea className={styles.contTextarea} value={row.response} onChange={(e) => updateCont(i, 'response', e.target.value)} placeholder={t('gate4Page.contingency.placeholder.response')} />
                    </div>
                  </div>
                ))}
                <button className={styles.addRow} onClick={() => setContingencies((prev) => [...prev, { failure: '', response: '' }])}>
                  {t('gate4Page.addContingency')}
                </button>

                {biggestRisk && (
                  <div className={styles.selfRiskNote}>
                    <span className={styles.selfRiskLabel}>⚑ Your Named Risk</span>
                    {t('gate4Page.selfRiskNote', { risk: biggestRisk })}
                  </div>
                )}
              </div>
            </div>

            {/* Exfil */}
            <div className={styles.planModule}>
              <div className={styles.pmHeader}>
                <span className={styles.pmTitle}><span className={styles.pmNum}>04</span>{t('gate4Page.exfil')}</span>
              </div>
              <div className={styles.pmBody}>
                <textarea className={styles.fieldTextarea} value={exfil} onChange={(e) => setExfil(e.target.value)} placeholder={t('gate4Page.placeholder.exfil')} />
              </div>
            </div>

            {/* Biggest risk */}
            <div className={styles.planModule}>
              <div className={styles.pmHeader}>
                <span className={styles.pmTitle}><span className={styles.pmNum}>05</span>{t('gate4Page.biggestRisk')}</span>
              </div>
              <div className={styles.pmBody}>
                <input className={styles.fieldInput} type="text" value={biggestRisk} onChange={(e) => setBiggestRisk(e.target.value)} placeholder={t('gate4Page.placeholder.biggestRisk')} />
              </div>
            </div>

            {/* AI Partnership */}
            <div className={styles.sectionLabel} style={{ marginTop: 26 }}>
              {t('gate4Page.strategicLog')} <span className={styles.badge}>{t('gate4Page.required')}</span>
            </div>
            <div className={styles.partnershipBlock}>
              <div className={styles.fieldLabel}>
                {t('gate4Page.field.aiPartnership')} <span className={styles.req}>{t('gate4Page.required')}</span>
              </div>
              <textarea
                className={styles.pbTextarea}
                value={aiPartnership}
                onChange={(e) => setAiPartnership(e.target.value)}
                placeholder={t('gate4Page.placeholder.aiPartnership')}
                rows={5}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </div>
        </div>

        <div className={styles.actionsBar}>
          <div className={styles.integrationStatus}>
            {t('gate4Page.assetIntegration')}
            <div className={styles.intPills}>
              {[
                t('gate4Page.assetPill.cover'),
                t('gate4Page.assetPill.intel'),
                t('gate4Page.assetPill.finding'),
              ].map((label) => (
                <span key={label} className={`${styles.intPill} ${assets.length > 0 ? styles.used : styles.unused}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className={styles.actions}>
            {savedLabel && <span className={styles.autosaveLabel}>{savedLabel}</span>}
            <button className={styles.submitBtn} disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? t('gate4Page.transmitting') : t('gate4Page.submitButton')}
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <span><span className={styles.red}>●</span> {t('gate4Page.footer.classified')}</span>
          <span>{t('gate4Page.footer.phase')}</span>
          <span>{t('gate4Page.footer.encrypted')}</span>
        </div>
      </div>
    </div>
  );
}
