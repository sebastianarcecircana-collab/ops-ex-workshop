import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGateSpec, getStoredTeamId, submitGate, extractDossier, GateSpec } from '../api/client';
import { useGateAutosave, loadGateDraft } from '../hooks/useGateAutosave';
import { useTranslation } from 'react-i18next';
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
  infoTitle: string;
  infoSummary: string;
  infoDetails: string[];
  infoExampleLabel: string;
  infoExample: string;
}

const CHAIN_STEPS: ChainStep[] = [
  {
    id: 1,
    technique: 'meta',
    label: 'Bootstrap the cover',
    techniqueLabel: 'META-PROMPT',
    infoTitle: 'Meta-prompting',
    infoSummary: 'Meta-prompting means prompting the model to design or refine another prompt before you use it for the real task.',
    infoDetails: [
      'Use it when the first prompt is hard to structure and you want the model to help define roles, constraints, and output format.',
      'A strong meta-prompt usually names the audience, the job to be done, the required sections, and the tone you want in the final prompt.',
      'This works well for repeatable tasks because you can save the generated prompt as a reusable template instead of rebuilding it each time.',
    ],
    infoExampleLabel: 'Example: building a study helper prompt',
    infoExample: 'Ask the model: "Write a prompt I can reuse to teach photosynthesis to a 10-year-old. Include an analogy, a three-question quiz, and a one-sentence recap." The generated prompt is then what you run for the actual lesson.',
  },
  {
    id: 2,
    technique: 'cot',
    label: 'Make the AI reason out loud',
    techniqueLabel: 'CHAIN-OF-THOUGHT',
    infoTitle: 'Chain-of-thought prompting',
    infoSummary: 'Chain-of-thought prompting asks the model to work through a problem in ordered steps so the output is more deliberate and less jumpy.',
    infoDetails: [
      'Use it when the task depends on comparing factors, sequencing decisions, or showing how a conclusion was reached.',
      'It is most useful when you want the model to surface checkpoints such as assumptions, tradeoffs, or criteria before it gives the final answer.',
      'Good prompts keep the steps bounded. Ask for a short reasoning sequence or checklist rather than a vague "think harder" instruction.',
    ],
    infoExampleLabel: 'Example: choosing a commuter bike',
    infoExample: 'Ask the model: "Compare three commuter bikes. First list the criteria you will use, then score each bike for comfort, maintenance, and price, and finally recommend one for a 5-mile city commute." The value comes from seeing the ordered comparison before the recommendation.',
  },
  {
    id: 3,
    technique: 'critique',
    label: 'Attack and repair',
    techniqueLabel: 'SELF-CRITIQUE',
    infoTitle: 'Self-critique prompting',
    infoSummary: 'Self-critique prompts have the model review a draft, identify weaknesses against clear criteria, and then improve the draft based on that review.',
    infoDetails: [
      'Use it after you already have a first pass and want the model to switch roles from creator to reviewer.',
      'The critique is better when you define the lens, such as clarity, accuracy, accessibility, tone, or completeness.',
      'This pattern is useful because it separates generation from evaluation, which often produces more specific revisions than asking for "a better version" in one shot.',
    ],
    infoExampleLabel: 'Example: revising a community newsletter',
    infoExample: 'Ask the model: "Review this neighborhood newsletter announcement as an editor. Identify the three weakest sentences for clarity and accessibility, explain why each is weak, then rewrite the announcement." The final revision benefits from the explicit critique stage.',
  },
];

type Gate1Draft = {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  coverDossier: { cover_name: string; employer: string; pretext: string; nationality: string; background_summary: string; vulnerability: string; prepared_response: string; };
};

export default function Gate1Page() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [infoStep, setInfoStep] = useState<ChainStep | null>(null);

  const { savedLabel } = useGateAutosave(1, { step1, step2, step3, coverDossier });

  useEffect(() => {
    getGateSpec(1).then(setSpec).catch(console.error);
  }, []);

  useEffect(() => {
    if (!infoStep) {
      return undefined;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setInfoStep(null);
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [infoStep]);

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
    return <div className={styles.loading}>{t('gate1Page.loading')}</div>;
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
          <div className={styles.gateLabel}>{t('gate1Page.gateLabel', { name: spec.name })}</div>
          <button className={styles.backBtn} onClick={() => navigate('/hub')}>{t('gate1Page.backToHub')}</button>
        </div>

        <div className={styles.cipherBlock}>
          <div className={styles.cipherLabel}>{t('gate1Page.cipherLabel')}</div>
          <p className={styles.cipherText}>{spec.briefing}</p>
        </div>

        <div className={styles.content}>
          <div className={styles.sectionLabel}>{t('gate1Page.missionInstructions')}</div>
          <ul className={styles.instructions}>
            {spec.instructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ul>

          <div className={styles.sectionLabel}>{t('gate1Page.promptChain')}</div>
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
                    <div className={styles.stepMeta}>
                      <button
                        type="button"
                        className={styles.infoBtn}
                        onClick={(event) => {
                          event.stopPropagation();
                          setInfoStep(chainStep);
                        }}
                        aria-label={`Open ${chainStep.techniqueLabel} information`}
                      >
                        i
                      </button>
                      <span className={styles.stepStatus}>
                        {isComplete ? t('gate1Page.status.complete') : isActive ? t('gate1Page.status.active') : t('gate1Page.status.sealed')}
                      </span>
                    </div>
                  </div>

                  {(isActive || isComplete) && (
                    <div className={styles.stepBody}>
                      {chainStep.technique === 'meta' && (
                        <div className={styles.triplet}>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>{t('gate1Page.metaPromptLabel')}</div>
                            <textarea
                              className={styles.textarea}
                              rows={2}
                              placeholder={t('gate1Page.placeholder.metaPrompt')}
                              value={step1.meta_prompt}
                              onChange={(e) => setStep1((s) => ({ ...s, meta_prompt: e.target.value }))}
                              readOnly={isComplete}
                            />
                          </div>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>{t('gate1Page.generatedPromptLabel')}</div>
                            <textarea
                              className={styles.textarea}
                              rows={3}
                              placeholder={t('gate1Page.placeholder.generatedPrompt')}
                              value={step1.generated_prompt}
                              onChange={(e) => setStep1((s) => ({ ...s, generated_prompt: e.target.value }))}
                              readOnly={isComplete}
                            />
                          </div>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>{t('gate1Page.aiOutputLabel')}</div>
                            <textarea
                              className={styles.textarea}
                              rows={3}
                              placeholder={t('gate1Page.placeholder.aiOutput')}
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
                            <div className={styles.tsLabel}>{t('gate1Page.cotPromptLabel')}</div>
                            <textarea
                              className={styles.textarea}
                              rows={4}
                              placeholder={t('gate1Page.placeholder.cotPrompt')}
                              value={step2.cot_prompt}
                              onChange={(e) => setStep2((s) => ({ ...s, cot_prompt: e.target.value }))}
                              readOnly={isComplete}
                            />
                          </div>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>{t('gate1Page.cotOutputLabel')}</div>
                            <textarea
                              className={styles.textarea}
                              rows={4}
                              placeholder={t('gate1Page.placeholder.cotOutput')}
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
                              <div className={styles.tsLabel}>{t('gate1Page.critiquePromptLabel')}
                              <span className={styles.fieldTooltip}>Strong critique prompts assign the AI a specific adversarial role with specific expertise. Generic "find problems" produces generic problems.</span>
                            </div>
                            <textarea
                              className={styles.textarea}
                              rows={4}
                              placeholder={t('gate1Page.placeholder.critiquePrompt')}
                              value={step3.critique_prompt}
                              onChange={(e) => setStep3((s) => ({ ...s, critique_prompt: e.target.value }))}
                              readOnly={isComplete}
                            />
                          </div>
                          <div className={styles.tripletSection}>
                            <div className={styles.tsLabel}>{t('gate1Page.critiqueOutputLabel')}</div>
                            <textarea
                              className={styles.textarea}
                              rows={4}
                              placeholder={t('gate1Page.placeholder.critiqueOutput')}
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
                          {t('gate1Page.continueToStep', { step: String(idx + 2).padStart(2, '0') })}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.sectionLabel} style={{ marginTop: 28 }}>
            {t('gate1Page.coverDossier')}
            <button
              className={styles.pullBtn}
              disabled={!step3.output || extracting}
              onClick={handlePullDossier}
              title="Uses AI to extract fields from your Step 03 output"
            >
              {extracting ? t('gate1Page.extracting') : t('gate1Page.pullFields')}
            </button>
          </div>
          {extractError && <p className={styles.error}>{extractError}</p>}
          <div className={styles.dossierGrid}>
            {(Object.keys(coverDossier) as Array<keyof typeof coverDossier>).map((key) => (
              <div key={key} className={styles.dossierField}>
                <label className={styles.fieldLabel}>{t(`gate1Page.field.${key}`)}</label>
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
                {stepReadiness(idx) ? '●' : idx === activeStep ? '◐' : '○'} {t('gate1Page.step')} {String(chainStep.id).padStart(2, '0')} ({chainStep.techniqueLabel.toLowerCase()})
              </span>
            ))}
            <span className={`${styles.readinessPill} ${dossierReady ? styles.pillComplete : ''}`}>
              {dossierReady ? '●' : '○'} {t('gate1Page.coverDossier')}
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
              {submitting ? t('gate1Page.transmitting') : t('gate1Page.submitGate')}
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <span><span className={styles.red}>●</span> {t('gate1Page.footerLabel')}</span>
          <span>{t('gate1Page.footerSkill')}</span>
        </div>
      </div>

      {infoStep && (
        <div
          className={styles.infoModalBackdrop}
          onClick={() => setInfoStep(null)}
          role="presentation"
        >
          <div
            className={styles.infoModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate1-technique-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.infoModalHeader}>
              <div>
                <div className={styles.infoModalEyebrow}>{infoStep.techniqueLabel}</div>
                <h2 id="gate1-technique-title" className={styles.infoModalTitle}>{infoStep.infoTitle}</h2>
              </div>
              <button
                type="button"
                className={styles.infoModalClose}
                onClick={() => setInfoStep(null)}
                aria-label="Close technique information"
              >
                Close
              </button>
            </div>

            <p className={styles.infoModalSummary}>{infoStep.infoSummary}</p>

            <div className={styles.infoModalSectionLabel}>How it works</div>
            <ul className={styles.infoModalList}>
              {infoStep.infoDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>

            <div className={styles.infoExampleCard}>
              <div className={styles.infoModalSectionLabel}>{infoStep.infoExampleLabel}</div>
              <p className={styles.infoExampleText}>{infoStep.infoExample}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
