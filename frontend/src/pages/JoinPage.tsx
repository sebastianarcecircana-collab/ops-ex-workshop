import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinCohort, setSession, ApiError } from '../api/client';
import styles from './JoinPage.module.css';

export default function JoinPage() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [callsign, setCallsign] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await joinCohort(joinCode.trim().toUpperCase(), callsign.trim().toUpperCase());
      setSession(res.teamId, res.sessionToken);
      navigate('/opening');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Connection failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.scanline} aria-hidden />
      <div className={styles.frame}>
        <span className={styles.cornerTl} aria-hidden />
        <span className={styles.cornerTr} aria-hidden />
        <span className={styles.cornerBl} aria-hidden />
        <span className={styles.cornerBr} aria-hidden />

        <div className={styles.header}>
          <div className={styles.classLabel}>Eyes Only · Cosmic Clearance · Athena-7</div>
        </div>

        <div className={styles.body}>
          <div className={styles.lockIcon} aria-hidden>▣</div>
          <div className={styles.missionId}>Operation</div>
          <h1 className={styles.title}><span className={styles.codename}>Quicksilver</span></h1>
          <p className={styles.subtitle}>Secure channel authentication required</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="joinCode">
                Mission Code
              </label>
              <input
                id="joinCode"
                className={styles.input}
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="QUICKSILVER"
                required
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="callsign">
                Team Callsign
              </label>
              <input
                id="callsign"
                className={styles.input}
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="e.g. NIGHT ARROW"
                minLength={2}
                required
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Authenticating…' : 'Establish Secure Connection →'}
            </button>
          </form>
        </div>

        <div className={styles.footer}>
          <span><span className={styles.red}>●</span> Classified // IMF Internal</span>
          <span>Encrypted Channel</span>
        </div>
      </div>
    </div>
  );
}
