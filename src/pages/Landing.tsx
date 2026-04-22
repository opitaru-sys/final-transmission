import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

export default function Landing() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Final Words</h1>
          <p className={styles.tagline}>
            Two missions. Fourteen astronauts.<br />
            Everything that was said before the silence.
          </p>
        </header>

        <div className={styles.divider} />

        <nav className={styles.missions}>
          <Link to="/challenger" className={styles.missionCard}>
            <div className={styles.missionLabel}>STS-51-L</div>
            <div className={styles.missionName}>Challenger</div>
            <div className={styles.missionDate}>January 28, 1986</div>
            <div className={styles.missionCrew}>Seven crew members</div>
            <div className={styles.missionArrow}>Enter &rarr;</div>
          </Link>

          <div className={styles.missionSeparator}>
            <span className={styles.yearGap}>17 years</span>
          </div>

          <Link to="/columbia" className={`${styles.missionCard} ${styles.columbia}`}>
            <div className={styles.missionLabel}>STS-107</div>
            <div className={styles.missionName}>Columbia</div>
            <div className={styles.missionDate}>February 1, 2003</div>
            <div className={styles.missionCrew}>Seven crew members</div>
            <div className={styles.missionArrow}>Enter &rarr;</div>
          </Link>
        </nav>

        <footer className={styles.footer}>
          <p>
            Built as an act of remembrance. All content drawn from NASA records,
            the Rogers Commission Report, and the Columbia Accident Investigation Board Report.
          </p>
        </footer>
      </div>
    </div>
  )
}
