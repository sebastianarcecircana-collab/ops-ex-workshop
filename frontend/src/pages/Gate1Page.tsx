import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGateSpec, getStoredTeamId, submitGate, extractDossier, GateSpec } from '../api/client';
import { useGateAutosave, loadGateDraft } from '../hooks/useGateAutosave';
import styles from './GatePage.module.css';

// ---- Per-step data types ----
interface Step1Data { meta_prompt: string; generated_prompt: string; output: string }
interface Step2Data { cot_prompt: string; output: string }
interface Step3Data { critique_prompt: string; output: string }

type StepTechnique = 'meta' | 'cot' | 'critique';

interface ChainStep {
  id: number;
  technique: StepTechnique;
  label: string;
  techniqueLabel: string;
}

const CHAIN_STEPS: ChainStep[] = [
  { id: 1, technique: 'meta',     label: 'Bootstrap the cover',           techniqueLabel: 'META-PROMPT' },
  { id: 2, technique: 'cot',      label: 'Make the AI reason out loud',    techniqueLabel: 'CHAIN-OF-THOUGHT' },
  { id: 3, technique: 'critique', label: 'Attack and repair',              techniqueLabel: 'SELF-CRITIQUE' },
];

type Gate1Draft = {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  coverDossier: { cover_name: string; employer: string; pretext: string; nationality: string; background_summary: string; vulnerability: string; prepared_response: string; };
};

export default function Gate1Page() {
  const navigate = useNavigate();
  const [spec, setSpec] = useState<GateSpec | null>(null);

  const [step1, setStep1] = useState<Step1Data>(() => loadGateDraft<Gate1Draft>(1, getStoredTeamId())?.step1 ?? { meta_prompt: '', generated_prompt: '', output: '' });
  const [step2, setStep2] = useState<Step2Data>(() => loadGateDraft<Gate1Draft>(1, getStoredTeamId())?.step2 ?? { cot_prompt: '', output: '' });
  const [step3, setStep3] = useState<Step3Data>(() => loadGateDraft<Gate1Draft>(1, getStoredTeamId())?.step3 ?? { critique_prompt: '', output: '' });

  const [coverDossier, setCoverDossier] = useState<Gate1Draft['coverDossier']>(() => loadGateDraft<Gate1Draft>(1, getStoredTeamId())?.coverDossier ?? {
    cover_name: '',
    employer: '',
    pretext: '',
    nationality: '',
    background_summary: '',
    vulnerability: '',
    prepared_response: '',
  });

  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');

  const { savedLabel, clearSave } = useGateAutosave(1, { step1, step2, step3, coverDossier });

  useEffect(() => {
    getGateSpec(1).then(setSpec).catch(console.error);
  }, []);

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await submitGate(1, {
        chain: [
          { step: 1, ...step1 },
          { step: 2, ...step2 },
          { step: 3, ...step3 },
        ],
        cover_dossier: coverDossier,
      });
      clearSave();
      navigate('/feedback/1');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePullDossier() {
    setExtractError('');
    setExtracting(true);
    try {
      const fields = await extractDossier(step3.output);
      setCoverDossier((d) => ({
        cover_name:         fields.cover_name         ?? d.cover_name,
        employer:           fields.employer           ?? d.employer,
        pretext:            fields.pretext            ?? d.pretext,
        nationality:        fields.nationality        ?? d.nationality,
        background_summary: fields.background_summary ?? d.background_summary,
        vulnerability:      fields.vulnerability      ?? d.vulnerability,
        prepared_response:  fields.prepared_response  ?? d.prepared_response,
      }));
    } catch (e: unknown) {
      setExtractError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  }

  if (!spec) {
    return <div className={styles.loading}>Loading gate briefing…</div>;
  }

  // ---- Readiness checks ----
  const step1Ready = !!(step1.meta_prompt && step1.generated_prompt && step1.output);
  const step2Ready = !!(step2.cot_prompt && step2.output);
  const step3Ready = !!(step3.critique_prompt && step3.output);
  const dossierReady = !!coverDossier.cover_name;
  const canSubmit = step1Ready && step2Ready && step3Ready && dossierReady;

  function stepReadiness(idx: number) {
    if (idx === 0) return step1Ready;
    if (idx === 1) return step2Ready;
    return step3Ready;
  }

  return (
    <div className={styles.page}>
      <div className={styles.scanline} aria-hidden />
      <div className={styles.frame}>
        <span className={styles.cornerTl} aria-hidden />
        <span className={styles.cornerTr} aria-hidden />
        <span className={styles.cornerBl} aria-hidden />
        <span className={styles.cornerBr} aria-hidden />

        <div className={styles.topBar}>
          <div className={styles.gateLabel}>Gate 01 — {spec.name}</div>
          <button className={styles.backBtn} onClick={() => navigate('/hub')}>← Hub</button>
        </div>

        <div className={styles.cipherBlock}>
          <div className={styles.cipherLabel}>Cipher</div>
          <p className={styles.cipherText}>{spec.briefing}</p>
        </div>

        <div className={styles.content}>
          <div className={styles.sectionLabel}>Mission Instructions</div>
          <ul className={styles.instructions}>
            {spec.instructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ul>

          <div className={styles.sectionLabel}>Prompt Chain</div>
          <div className={styles.chainStack}>
            {CHAIN_STEPS.map((chainStep, idx) => {
              const isActive   = idx === activeStep;
              const isComplete = idx < activeStep;
              const isSealed   = idx > activeStep;
              return (
                <div
                  key={chainStep.id}
                  className={`${styles.chainStep} ${isComplete ? styles.completed : ''} ${isActive ? styles.active : ''} ${isSealed ? styles.sealed : ''}`}
                >
                  <div className={styles.stepHeader} onClick={() => isComplete && setActiveStep(idx)}>
                    <div className={styles.stepLeft}>
                      <span className={styles.stepNum}>Step {String(chainStep.id).padStart(2, '0')}</span>
                      <span className={styles.stepTechnique}>{chainStep.techniqueLabel}</span>
                      <span className={styles.stepLabel}>{chainStep.label}</span>
                    </div>
                    <span className={styles.stepStatus}>
                      {isComplete ? '● Complete' : isActive ? '◐ Active' : '○ Sealed'}
                    </span>
                  </div>

                  {(isActive || isComplete) && (
                    <div className={styles.stepBody}>
                      {chainStep.technique === 'meta' && (
                        <div className={styles.triplet}>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>Meta-Prompt</div>
                            <textarea
                              className={styles.textarea}
                              rows={2}
                              placeholder="Instruct the AI about the role/task context — this prompt will ask it to write your real prompt…"
                              value={step1.meta_prompt}
                              onChange={(e) => setStep1((s) => ({ ...s, meta_prompt: e.target.value }))}
                              readOnly={isComplete}
                            />
                          </div>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>Generated Prompt</div>
                            <textarea
                              className={styles.textarea}
                              rows={3}
                              placeholder="Paste the prompt the AI produced in response to your meta-prompt…"
                              value={step1.generated_prompt}
                              onChange={(e) => setStep1((s) => ({ ...s, generated_prompt: e.target.value }))}
                              readOnly={isComplete}
                            />
                          </div>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>AI Output</div>
                            <textarea
                              className={styles.textarea}
                              rows={3}
                              placeholder="Paste the cover identity the AI produced when you ran the generated prompt…"
                              value={step1.output}
                              onChange={(e) => setStep1((s) => ({ ...s, output: e.target.value }))}
                              readOnly={isComplete}
                            />
                          </div>
                        </div>
                      )}

                      {chainStep.technique === 'cot' && (
                        <div className={styles.pair}>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>Chain-of-Thought Prompt</div>
                            <textarea
                              className={styles.textarea}
                              rows={4}
                              placeholder="Write the prompt yourself (no meta layer). Tell the AI to reason step-by-step through operational details — daily routine, backstory specifics, pretext for the auction — before producing the final dossier section. Use your Step 01 cover identity as input."
                              value={step2.cot_prompt}
                              onChange={(e) => setStep2((s) => ({ ...s, cot_prompt: e.target.value }))}
                              readOnly={isComplete}
                            />
                          </div>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>AI Output</div>
                            <textarea
                              className={styles.textarea}
                              rows={4}
                              placeholder="Paste the deepened cover the AI produced…"
                              value={step2.output}
                              onChange={(e) => setStep2((s) => ({ ...s, output: e.target.value }))}
                              readOnly={isComplete}
                            />
                          </div>
                        </div>
                      )}

                      {chainStep.technique === 'critique' && (
                        <div className={styles.pair}>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>
                              Critique Prompt
                              <span className={styles.fieldTooltip}>Strong critique prompts assign the AI a specific adversarial role with specific expertise. Generic "find problems" produces generic problems.</span>
                            </div>
                            <textarea
                              className={styles.textarea}
                              rows={4}
                              placeholder="Assign the AI the role of a suspicious concierge with 20 years' experience. Have it identify the three weakest claims in your Step 02 output and produce specific repairs for each…"
                              value={step3.critique_prompt}
                              onChange={(e) => setStep3((s) => ({ ...s, critique_prompt: e.target.value }))}
                              readOnly={isComplete}
                            />
                          </div>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>AI Output</div>
                            <textarea
                              className={styles.textarea}
                              rows={4}
                              placeholder="Paste the hardened cover the AI produced…"
                              value={step3.output}
                              onChange={(e) => setStep3((s) => ({ ...s, output: e.target.value }))}
                              readOnly={isComplete}
                            />
                          </div>
                        </div>
                      )}

                      {isActive && idx < CHAIN_STEPS.length - 1 && (
                        <button
                          className={styles.nextBtn}
                          disabled={!stepReadiness(idx)}
                          onClick={() => setActiveStep(idx + 1)}
                        >
                          Continue to Step {String(idx + 2).padStart(2, '0')} →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.sectionLabel} style={{ marginTop: 28 }}>
            Cover Dossier
            <button
              className={styles.pullBtn}
              disabled={!step3.output || extracting}
              onClick={handlePullDossier}
              title="Uses AI to extract fields from your Step 03 output"
            >
              {extracting ? 'Extracting…' : 'Pull fields from Step 03 output →'}
            </button>
          </div>
          {extractError && <p className={styles.error}>{extractError}</p>}
          <div className={styles.dossierGrid}>
            {(Object.keys(coverDossier) as Array<keyof typeof coverDossier>).map((key) => (
              <div key={key} className={styles.dossierField}>
                <label className={styles.fieldLabel}>{key.replace(/_/g, ' ')}</label>
                {key === 'background_summary' || key === 'prepared_response' ? (
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={coverDossier[key]}
                    onChange={(e) => setCoverDossier((d) => ({ ...d, [key]: e.target.value }))}
                  />
                ) : (
                  <input
                    className={styles.input}
                    type="text"
                    value={coverDossier[key]}
                    onChange={(e) => setCoverDossier((d) => ({ ...d, [key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>

          <div className={styles.readinessRow}>
            {CHAIN_STEPS.map((chainStep, idx) => (
              <span key={chainStep.id} className={`${styles.readinessPill} ${stepReadiness(idx) ? styles.pillComplete : idx === activeStep ? styles.pillActive : ''}`}>
                {stepReadiness(idx) ? '●' : idx === activeStep ? '◐' : '○'} Step {String(chainStep.id).padStart(2, '0')} ({chainStep.techniqueLabel.toLowerCase()})
              </span>
            ))}
            <span className={`${styles.readinessPill} ${dossierReady ? styles.pillComplete : ''}`}>
              {dossierReady ? '●' : '○'} Cover dossier
            </span>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.submitRow}>
            {savedLabel && <span className={styles.autosaveLabel}>{savedLabel}</span>}
            <button
              className={styles.submitBtn}
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Transmitting…' : 'Submit Gate 01 →'}
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <span><span className={styles.red}>●</span> Gate 01 // Build the Legend</span>
          <span>Skill: Meta-Prompting + Chain-of-Thought + Self-Critique</span>
        </div>
      </div>
    </div>
  );
}
