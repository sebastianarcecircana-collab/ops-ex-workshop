import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './BriefingPage.module.css';

export default function BriefingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.scanline} aria-hidden />
      <div className={styles.frame}>
        <span className={styles.cornerTl} aria-hidden />
        <span className={styles.cornerTr} aria-hidden />
        <span className={styles.cornerBl} aria-hidden />
        <span className={styles.cornerBr} aria-hidden />

        <div className={styles.banner}>
          <span>◢ ◣</span>
          <span>{t('briefingPage.bannerTitle')}</span>
          <span>◢ ◣</span>
        </div>

        <div className={styles.meta}>
          <span className={styles.recStatus}>
            <span className={styles.dot} />
            {t('briefingPage.statusDecryptedLive')}
          </span>
          <span>FREQ 04.711 MHz</span>
          <span>SOURCE: Cipher</span>
          <span>2026-05-18 11:59 UTC</span>
        </div>

        <div className={styles.content}>
          <div className={styles.missionLabel}>{t('briefingPage.missionLabel')}</div>
          <h1 className={styles.missionName}><span className={styles.accent}>{t('briefingPage.missionName')}</span></h1>

          <div className={styles.dossierGrid}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>{t('briefingPage.dossier.location')}</div>
              <div className={styles.cardValue}>{t('briefingPage.locationValue')}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>{t('briefingPage.dossier.antagonist')}</div>
              <div className={styles.cardValue}>{t('briefingPage.antagonistValue')}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>{t('briefingPage.dossier.asset')}</div>
              <div className={styles.cardValue}>{t('briefingPage.assetValue')}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>{t('briefingPage.dossier.timePressure')}</div>
              <div className={styles.cardValue}>{t('briefingPage.timePressureValue')}</div>
            </div>
          </div>

          <div className={styles.situation}>
            <div className={styles.sectionLabel}>{t('briefingPage.situationLabel')}</div>
            <p>{t('briefingPage.situationText1')}</p>
            <p>{t('briefingPage.situationText2')}</p>
          </div>

          <div className={styles.gatesOverview}>
            <div className={styles.sectionLabel}>{t('briefingPage.missionStructureLabel')}</div>
            <div className={styles.gates}>
              {[
                { n: 1, name: t('briefingPage.gate.1'), desc: t('briefingPage.gate.1Desc') },
                { n: 2, name: t('briefingPage.gate.2'), desc: t('briefingPage.gate.2Desc') },
                { n: 3, name: t('briefingPage.gate.3'), desc: t('briefingPage.gate.3Desc') },
                { n: 4, name: t('briefingPage.gate.4'), desc: t('briefingPage.gate.4Desc') },
              ].map((g) => (
                <div key={g.n} className={styles.gate}>
                  <div className={styles.gateNum}>0{g.n}</div>
                  <div>
                    <div className={styles.gateName}>{g.name}</div>
                    <div className={styles.gateDesc}>{g.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.acceptance}>
            <p className={styles.acceptNote}>{t('briefingPage.acceptNote')}</p>
            <div className={styles.actions}>
              <button
                className={styles.btnAccept}
                onClick={() => navigate('/opening')}
              >
                {t('briefingPage.acceptButton')}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <span><span className={styles.red}>●</span> Classified // IMF Internal</span>
          <span>Pre-Session · Awaiting Acceptance</span>
        </div>
      </div>
    </div>
  );
}
