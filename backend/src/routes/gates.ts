import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getGate } from '../services/missionSpec';
import { createSubmission, getSubmission, advanceTeamGate } from '../db/queries';
import { evaluateGate, extractDossierFields } from '../services/evaluation';
import { GateSpecResponse, SubmitGateRequest, EvaluationResponse } from '../types/api';

const router = Router();

// GET /api/gates/:gateNumber
router.get('/:gateNumber', requireAuth, async (req: Request, res: Response) => {
  const gateNumber = parseInt(req.params.gateNumber, 10);
  if (isNaN(gateNumber) || gateNumber < 1 || gateNumber > 4) {
    return res.status(400).json({ error: 'Invalid gate number' });
  }

  const team = req.team!;
  if (team.current_gate < gateNumber - 1) {
    return res.status(403).json({ error: 'Gate not yet unlocked' });
  }

  const gate = getGate(gateNumber);
  const response: GateSpecResponse = {
    gateNumber: gate.number,
    name: gate.name,
    skillFocus: gate.skill_focus,
    briefing: gate.briefing,
    instructions: gate.instructions,
    artifactSchema: gate.artifact_schema,
    hasMaterials: !!(gate.materials && gate.materials.length > 0),
  };

  return res.json(response);
});

// POST /api/gates/:gateNumber/submit
router.post('/:gateNumber/submit', requireAuth, async (req: Request, res: Response) => {
  const gateNumber = parseInt(req.params.gateNumber, 10);
  if (isNaN(gateNumber) || gateNumber < 1 || gateNumber > 4) {
    return res.status(400).json({ error: 'Invalid gate number' });
  }

  const team = req.team!;
  if (team.current_gate < gateNumber - 1) {
    return res.status(403).json({ error: 'Gate not yet unlocked' });
  }

  const { artifact } = req.body as SubmitGateRequest;
  if (!artifact || typeof artifact !== 'object') {
    return res.status(400).json({ error: 'artifact is required' });
  }

  const submissionId = await createSubmission(team.id, gateNumber, artifact);

  // Advance gate tracking immediately (teams always progress)
  await advanceTeamGate(team.id, gateNumber);

  // Kick off async evaluation (no await — fire and forget)
  evaluateGate(submissionId, gateNumber, artifact, team).catch((err: Error) => {
    console.error(`Evaluation failed for submission ${submissionId}:`, err.message);
  });

  return res.status(202).json({ submissionId, status: 'evaluating' });
});

// GET /api/gates/:gateNumber/evaluation
router.get('/:gateNumber/evaluation', requireAuth, async (req: Request, res: Response) => {
  const gateNumber = parseInt(req.params.gateNumber, 10);
  if (isNaN(gateNumber) || gateNumber < 1 || gateNumber > 4) {
    return res.status(400).json({ error: 'Invalid gate number' });
  }

  const team = req.team!;
  const submission = await getSubmission(team.id, gateNumber);

  if (!submission) {
    return res.status(404).json({ error: 'No submission found for this gate' });
  }

  const response: EvaluationResponse = {
    status: submission.status,
    feedbackText: submission.feedback_text,
    qualitySignals: submission.quality_signals_json,
    evaluatedAt: submission.evaluated_at?.toISOString(),
  };

  return res.json(response);
});

// POST /api/gates/:gateNumber/extract-dossier
router.post('/:gateNumber/extract-dossier', requireAuth, async (req: Request, res: Response) => {
  const gateNumber = parseInt(req.params.gateNumber, 10);
  if (gateNumber !== 1) {
    return res.status(400).json({ error: 'Dossier extraction is only available for Gate 1' });
  }

  const { step3Output } = req.body as { step3Output?: unknown };
  if (!step3Output || typeof step3Output !== 'string' || step3Output.trim().length === 0) {
    return res.status(400).json({ error: 'step3Output must be a non-empty string' });
  }

  try {
    const fields = await extractDossierFields(step3Output);
    return res.json(fields);
  } catch (err) {
    console.error('Dossier extraction failed:', err);
    return res.status(502).json({ error: 'Extraction service unavailable' });
  }
});

export default router;
