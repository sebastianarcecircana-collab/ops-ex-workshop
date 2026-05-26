const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'qs_session_token';
const TEAM_KEY = 'qs_team_id';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(teamId: string, token: string) {
  localStorage.setItem(TEAM_KEY, teamId);
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
  localStorage.removeItem(TEAM_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredTeamId(): string | null {
  return localStorage.getItem(TEAM_KEY);
}

export function hasSession(): boolean {
  return !!getToken();
}

interface FetchOptions extends RequestInit {
  auth?: boolean;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { auth = true, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---- Auth / Session ----

export interface JoinResponse {
  teamId: string;
  sessionToken: string;
  cohortId: string;
  missionId: string;
}

export async function joinCohort(joinCode: string, callsign: string): Promise<JoinResponse> {
  return apiFetch<JoinResponse>(`/cohorts/${encodeURIComponent(joinCode)}/join`, {
    method: 'POST',
    body: JSON.stringify({ callsign }),
    auth: false,
  });
}

// ---- Team State ----

export interface SubmissionSummary {
  gateNumber: number;
  artifact?: Record<string, unknown>;
  status: 'evaluating' | 'complete' | 'error';
  qualitySignals?: Record<string, unknown>;
  feedbackText?: string;
  submittedAt: string;
  evaluatedAt?: string;
}

export interface TeamState {
  teamId: string;
  callsign: string;
  cohortId: string;
  missionId: string;
  currentGate: number;
  submissions: SubmissionSummary[];
}

export async function getTeamState(): Promise<TeamState> {
  return apiFetch<TeamState>('/teams/me/state');
}

// ---- Gates ----

export interface GateSpec {
  gateNumber: number;
  name: string;
  skillFocus: string;
  briefing: string;
  instructions: string[];
  artifactSchema: Record<string, unknown>;
  hasMaterials: boolean;
}

export async function getGateSpec(gateNumber: number): Promise<GateSpec> {
  return apiFetch<GateSpec>(`/gates/${gateNumber}`);
}

export interface SubmitResponse {
  submissionId: string;
  status: 'evaluating';
}

export async function submitGate(gateNumber: number, artifact: Record<string, unknown>): Promise<SubmitResponse> {
  return apiFetch<SubmitResponse>(`/gates/${gateNumber}/submit`, {
    method: 'POST',
    body: JSON.stringify({ artifact }),
  });
}

export interface EvaluationResult {
  status: 'evaluating' | 'complete' | 'error';
  feedbackText?: string;
  qualitySignals?: Record<string, unknown>;
  evaluatedAt?: string;
}

export async function getEvaluation(gateNumber: number): Promise<EvaluationResult> {
  return apiFetch<EvaluationResult>(`/gates/${gateNumber}/evaluation`);
}

// ---- Gate 1 Dossier Extraction ----

export interface CoverDossierFields {
  cover_name?: string;
  employer?: string;
  pretext?: string;
  nationality?: string;
  background_summary?: string;
  vulnerability?: string;
  prepared_response?: string;
}

export async function extractDossier(step3Output: string): Promise<CoverDossierFields> {
  return apiFetch<CoverDossierFields>('/gates/1/extract-dossier', {
    method: 'POST',
    body: JSON.stringify({ step3Output }),
  });
}

// ---- Assets ----

// Fetches an asset file from the backend and returns a local Blob URL
// suitable for use in an <a href download> link.
async function fetchAssetBlobUrl(assetPath: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${assetPath}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function getGate3AssetUrl(): Promise<string> {
  return fetchAssetBlobUrl('/assets/gate3-intercept');
}

export async function getGate2RenouxProfileUrl(): Promise<string> {
  return fetchAssetBlobUrl('/assets/gate2-renoux-profile');
}

export async function getGate2AuctionProgrammeUrl(): Promise<string> {
  return fetchAssetBlobUrl('/assets/gate2-auction-programme');
}

export async function getGate2HermitageSchematicUrl(): Promise<string> {
  return fetchAssetBlobUrl('/assets/gate2-hermitage-schematic');
}

export async function getGate2InterceptFragmentUrl(): Promise<string> {
  return fetchAssetBlobUrl('/assets/gate2-intercept-fragment');
}

// ---- Scenario ----

export interface ScenarioAct {
  act_number: number;
  act_title: string;
  prose: string;
}

export interface ScenarioState {
  status: 'generating' | 'complete' | 'error';
  acts: ScenarioAct[];
  outcomeType?: 'clean_success' | 'partial_success' | 'failure';
  weightedAggregate?: number;
}

export async function triggerScenarioGeneration(): Promise<void> {
  await apiFetch<unknown>('/scenario/generate', { method: 'POST' });
}

export async function getScenario(): Promise<ScenarioState> {
  return apiFetch<ScenarioState>('/scenario');
}
