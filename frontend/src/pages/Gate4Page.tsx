import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGateSpec, getStoredTeamId, getTeamState, submitGate, GateSpec, TeamState } from '../api/client';
import { useGateAutosave, loadGateDraft } from '../hooks/useGateAutosave';
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

  const { savedLabel, clearSave } = useGateAutosave(4, { objective, approach, exfil, biggestRisk, aiPartnership, sequence, roles, contingencies });

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
      clearSave();
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
            <button className={styles.breadcrumb} onClick={() => navigate('/hub')}>Mission Hub</button>
            <div>
              <div className={styles.phaseTag}>Phase 04 · Final</div>
              <div className={styles.phaseTitle}>The <span className={styles.accent}>Plan</span></div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.statusPill}>
              <span className={styles.dot} />
              Final Phase
            </div>
          </div>
        </div>

        <div className={styles.transmission}>
          <div className={styles.txHeader}>
            <span>Transmission</span><span>//</span>
            <span className={styles.from}>From Cipher</span>
          </div>
          <p className={styles.cipherMsg}>
            {spec.briefing}
          </p>
        </div>

        <div className={styles.briefcase}>
          {/* Assets rail */}
          <div className={styles.assetsRail}>
            <div className={styles.railHeading}>Operational Assets</div>
            <div className={styles.railSub}>Everything your team recovered. A strong plan uses all of them.</div>

            {['p1', 'p2', 'p3'].map((priority) => {
              const group = assets.filter((a) => a.priority === priority);
              if (group.length === 0) return null;
              const groupLabel = priority === 'p1' ? 'Cover Identity' : priority === 'p2' ? 'Intel' : 'The Finding';
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
              <p className={styles.noAssets}>Complete Gates 1-3 first to populate assets.</p>
            )}
          </div>

          {/* Plan builder */}
          <div className={styles.planBuilder}>
            <div className={styles.sectionLabel}>Operation Plan <span className={styles.badge}>Submission Manifest</span></div>

            <div className={styles.planMeta}>
              <div>
                <div className={styles.fieldLabel}>Objective <span className={styles.req}>Required</span></div>
                <input className={styles.fieldInput} type="text" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What does success look like?" />
              </div>
              <div>
                <div className={styles.fieldLabel}>Approach <span className={styles.req}>Required</span></div>
                <input className={styles.fieldInput} type="text" value={approach} onChange={(e) => setApproach(e.target.value)} placeholder="One line — your core tactic" />
              </div>
            </div>

            {/* Sequence */}
            <div className={styles.planModule}>
              <div className={styles.pmHeader}>
                <span className={styles.pmTitle}><span className={styles.pmNum}>01</span>Sequence</span>
              </div>
              <div className={styles.pmBody}>
                {sequence.map((row, i) => (
                  <div key={i} className={styles.seqRow}>
                    <input className={styles.seqTime} value={row.time} onChange={(e) => updateSeq(i, 'time', e.target.value)} placeholder="HH:MM" />
                    <input className={styles.seqStep} value={row.step} onChange={(e) => updateSeq(i, 'step', e.target.value)} placeholder="Step description" />
                    <input className={styles.seqOwner} value={row.owner} onChange={(e) => updateSeq(i, 'owner', e.target.value)} placeholder="Agent" />
                  </div>
                ))}
                <button className={styles.addRow} onClick={() => setSequence((prev) => [...prev, { time: '', step: '', owner: '' }])}>
                  Add Step
                </button>
              </div>
            </div>

            {/* Roles */}
            <div className={styles.planModule}>
              <div className={styles.pmHeader}>
                <span className={styles.pmTitle}><span className={styles.pmNum}>02</span>Roles</span>
              </div>
              <div className={styles.pmBody}>
                {roles.map((row, i) => (
                  <div key={i} className={styles.seqRow} style={{ gridTemplateColumns: '130px 1fr' }}>
                    <input className={styles.seqOwner} style={{ textAlign: 'left' }} value={row.agent} onChange={(e) => updateRole(i, 'agent', e.target.value)} placeholder="Callsign" />
                    <input className={styles.seqStep} value={row.role} onChange={(e) => updateRole(i, 'role', e.target.value)} placeholder="Responsibilities" />
                  </div>
                ))}
                <button className={styles.addRow} onClick={() => setRoles((prev) => [...prev, { agent: '', role: '' }])}>
                  Add Agent
                </button>
              </div>
            </div>

            {/* Contingencies */}
            <div className={styles.planModule}>
              <div className={styles.pmHeader}>
                <span className={styles.pmTitle}><span className={styles.pmNum}>03</span>Contingencies</span>
              </div>
              <div className={styles.pmBody}>
                {contingencies.map((row, i) => (
                  <div key={i} className={styles.contRow}>
                    <div>
                      <div className={`${styles.contLabel} ${styles.fail}`}>If this fails</div>
                      <textarea className={styles.contTextarea} value={row.failure} onChange={(e) => updateCont(i, 'failure', e.target.value)} placeholder="What breaks?" />
                    </div>
                    <div>
                      <div className={`${styles.contLabel} ${styles.resp}`}>We respond</div>
                      <textarea className={styles.contTextarea} value={row.response} onChange={(e) => updateCont(i, 'response', e.target.value)} placeholder="Our response" />
                    </div>
                  </div>
                ))}
                <button className={styles.addRow} onClick={() => setContingencies((prev) => [...prev, { failure: '', response: '' }])}>
                  Add Contingency
                </button>

                {biggestRisk && (
                  <div className={styles.selfRiskNote}>
                    <span className={styles.selfRiskLabel}>⚑ Your Named Risk</span>
                    You flagged <strong>"{biggestRisk}"</strong> as your operation's biggest exposure. Cipher will be watching whether your plan accounts for it.
                  </div>
                )}
              </div>
            </div>

            {/* Exfil */}
            <div className={styles.planModule}>
              <div className={styles.pmHeader}>
                <span className={styles.pmTitle}><span className={styles.pmNum}>04</span>Exfil</span>
              </div>
              <div className={styles.pmBody}>
                <textarea className={styles.fieldTextarea} value={exfil} onChange={(e) => setExfil(e.target.value)} placeholder="Extraction route and method" />
              </div>
            </div>

            {/* Biggest risk */}
            <div className={styles.planModule}>
              <div className={styles.pmHeader}>
                <span className={styles.pmTitle}><span className={styles.pmNum}>05</span>Biggest Risk</span>
              </div>
              <div className={styles.pmBody}>
                <input className={styles.fieldInput} type="text" value={biggestRisk} onChange={(e) => setBiggestRisk(e.target.value)} placeholder="Name the single greatest threat to this operation" />
              </div>
            </div>

            {/* AI Partnership */}
            <div className={styles.sectionLabel} style={{ marginTop: 26 }}>
              Strategic Log <span className={styles.badge}>Required</span>
            </div>
            <div className={styles.partnershipBlock}>
              <div className={styles.fieldLabel}>
                How AI Stress-Tested This Plan <span className={styles.req}>Required</span>
              </div>
              <textarea
                className={styles.pbTextarea}
                value={aiPartnership}
                onChange={(e) => setAiPartnership(e.target.value)}
                placeholder="Don't paste the plan AI wrote for you. Show how you used AI to challenge it — what risks it surfaced, what assumptions it questioned, what you changed as a result, and what you chose to override."
                rows={5}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </div>
        </div>

        <div className={styles.actionsBar}>
          <div className={styles.integrationStatus}>
            Asset Integration
            <div className={styles.intPills}>
              {['Cover', 'Intel', 'Finding'].map((label) => (
                <span key={label} className={`${styles.intPill} ${assets.length > 0 ? styles.used : styles.unused}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className={styles.actions}>
            {savedLabel && <span className={styles.autosaveLabel}>{savedLabel}</span>}
            <button className={styles.submitBtn} disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? 'Transmitting…' : 'Transmit Final Plan →'}
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <span><span className={styles.red}>●</span> Classified // Internal Use Only</span>
          <span>Phase 04 · Final</span>
          <span>End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  );
}
