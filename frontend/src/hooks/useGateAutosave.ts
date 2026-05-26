import { useEffect, useRef, useState } from 'react';
import { getStoredTeamId } from '../api/client';

const DRAFT_PREFIX = 'qs_gate_draft';

function draftKey(teamId: string, gateNumber: number): string {
  return `${DRAFT_PREFIX}_${teamId}_${gateNumber}`;
}

export function loadGateDraft<T>(gateNumber: number, teamId: string | null): T | null {
  if (!teamId) return null;
  try {
    const raw = localStorage.getItem(draftKey(teamId, gateNumber));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearGateDraft(gateNumber: number, teamId: string | null): void {
  if (!teamId) return;
  localStorage.removeItem(draftKey(teamId, gateNumber));
}

function formatAgo(savedAt: Date, now: number): string {
  const secs = Math.round((now - savedAt.getTime()) / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  return `${Math.round(secs / 60)}m ago`;
}

export interface AutosaveResult {
  savedLabel: string | null;
  clearSave: () => void;
}

export function useGateAutosave<T>(gateNumber: number, state: T): AutosaveResult {
  const teamId = getStoredTeamId();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipRef = useRef(true);
  const pendingRef = useRef(false);
  // Always holds the latest serialised state so flush can use it after async gaps
  const latestJsonRef = useRef('');
  const stateJson = JSON.stringify(state);
  latestJsonRef.current = stateJson;

  // Debounced save whenever content actually changes
  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    if (!teamId) return;

    pendingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(teamId, gateNumber), latestJsonRef.current);
        setSavedAt(new Date());
      } catch {
        // quota exceeded or private-browsing restriction — silently ignore
      }
      pendingRef.current = false;
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // stateJson captures every content change; teamId and gateNumber are stable
    // per mounted page — using JSON.stringify intentionally for value equality.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateJson, gateNumber, teamId]);

  // Flush any pending (debounced) save on unmount (← Hub click) or page close
  useEffect(() => {
    const flush = () => {
      if (!pendingRef.current || !teamId) return;
      pendingRef.current = false;
      try {
        localStorage.setItem(draftKey(teamId, gateNumber), latestJsonRef.current);
      } catch {
        // noop
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush(); // also fires on SPA unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateNumber, teamId]);

  // Tick every 5 s to keep the "Xs ago" label fresh without forcing a full re-render
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  function clearSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = false;
    clearGateDraft(gateNumber, teamId);
    setSavedAt(null);
  }

  const savedLabel = savedAt ? `Saved · ${formatAgo(savedAt, now)}` : null;
  return { savedLabel, clearSave };
}
