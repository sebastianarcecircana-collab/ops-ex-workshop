import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getMinioStream } from '../services/minio';
import { getGate } from '../services/missionSpec';
import { GateMaterial } from '../types/mission';

const router = Router();

const CONTENT_TYPES: Record<string, string> = {
  '.csv': 'text/csv',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

function contentTypeFor(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.'));
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

async function streamMaterial(res: Response, material: GateMaterial) {
  const stream = await getMinioStream(material.minio_key);
  res.setHeader('Content-Type', contentTypeFor(material.filename));
  res.setHeader('Content-Disposition', `attachment; filename="${material.filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  stream.pipe(res);
}

// GET /api/assets/gate3-intercept
// Streams the Gate 3 RFID CSV — requires Gate 2 to be completed
router.get('/gate3-intercept', requireAuth, async (req: Request, res: Response) => {
  const team = req.team!;
  if (team.current_gate < 2) {
    return res.status(403).json({ error: 'Gate 3 materials are not yet available' });
  }
  const gate = getGate(3);
  const material = gate.materials?.find((m) => m.id === 'gate3_intercept');
  if (!material) {
    return res.status(404).json({ error: 'Material not found in mission spec' });
  }
  await streamMaterial(res, material);
});

// GET /api/assets/gate2-renoux-profile
router.get('/gate2-renoux-profile', requireAuth, async (req: Request, res: Response) => {
  const team = req.team!;
  if (team.current_gate < 1) {
    return res.status(403).json({ error: 'Gate 2 materials are not yet available' });
  }
  const gate = getGate(2);
  const material = gate.materials?.find((m) => m.id === 'gate2_renoux_profile');
  if (!material) return res.status(404).json({ error: 'Material not found in mission spec' });
  await streamMaterial(res, material);
});

// GET /api/assets/gate2-auction-programme
router.get('/gate2-auction-programme', requireAuth, async (req: Request, res: Response) => {
  const team = req.team!;
  if (team.current_gate < 1) {
    return res.status(403).json({ error: 'Gate 2 materials are not yet available' });
  }
  const gate = getGate(2);
  const material = gate.materials?.find((m) => m.id === 'gate2_auction_programme');
  if (!material) return res.status(404).json({ error: 'Material not found in mission spec' });
  await streamMaterial(res, material);
});

// GET /api/assets/gate2-hermitage-schematic
router.get('/gate2-hermitage-schematic', requireAuth, async (req: Request, res: Response) => {
  const team = req.team!;
  if (team.current_gate < 1) {
    return res.status(403).json({ error: 'Gate 2 materials are not yet available' });
  }
  const gate = getGate(2);
  const material = gate.materials?.find((m) => m.id === 'gate2_hermitage_schematic');
  if (!material) return res.status(404).json({ error: 'Material not found in mission spec' });
  await streamMaterial(res, material);
});

// GET /api/assets/gate2-intercept-fragment
router.get('/gate2-intercept-fragment', requireAuth, async (req: Request, res: Response) => {
  const team = req.team!;
  if (team.current_gate < 1) {
    return res.status(403).json({ error: 'Gate 2 materials are not yet available' });
  }
  const gate = getGate(2);
  const material = gate.materials?.find((m) => m.id === 'gate2_intercept_fragment');
  if (!material) return res.status(404).json({ error: 'Material not found in mission spec' });
  await streamMaterial(res, material);
});

export default router;
