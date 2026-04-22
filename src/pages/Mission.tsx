import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import challengerData from '../data/challenger.json'
import columbiaData from '../data/columbia.json'
import CrewAct from '../components/CrewAct'
import TimelineAct from '../components/TimelineAct'
import TranscriptAct from '../components/TranscriptAct'
import styles from './Mission.module.css'

interface Props {
  mission: 'challenger' | 'columbia'
}

const ACT_LABELS = ['I. The Crew', 'II. The Mission', 'III. Final Words']

export default function Mission({ mission }: Props) {
  const data = mission === 'challenger' ? challengerData : columbiaData
  const [activeAct, setActiveAct] = useState(0)
  const actRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const accentColor = mission === 'challenger' ? '#c4862a' : '#2d6db5'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [mission])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = actRefs.findIndex((r) => r.current === entry.target)
            if (idx !== -1) setActiveAct(idx)
          }
        })
      },
      { threshold: 0.2, rootMargin: '-10% 0px -60% 0px' }
    )

    actRefs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className={styles.page}>
      {/* Fixed progress bar */}
      <nav className={styles.progress}>
        <Link to="/" className={styles.backLink}>
          &larr; Final Words
        </Link>
        <div className={styles.actIndicators}>
          {ACT_LABELS.map((label, i) => (
            <button
              key={i}
              className={`${styles.actDot} ${i === activeAct ? styles.actDotActive : ''} ${i < activeAct ? styles.actDotPast : ''}`}
              onClick={() => actRefs[i].current?.scrollIntoView({ behavior: 'smooth' })}
              aria-label={`Go to ${label}`}
              style={i === activeAct ? { borderColor: accentColor, color: accentColor } : {}}
            >
              <span className={styles.actDotLabel}>{label}</span>
            </button>
          ))}
        </div>
        <div className={styles.missionBadge}>
          <span className={styles.designation}>{data.designation}</span>
        </div>
      </nav>

      {/* Mission hero */}
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroDesignation} style={{ color: accentColor }}>{data.designation}</div>
          <h1 className={styles.heroTitle}>
            {mission === 'challenger' ? 'Challenger' : 'Columbia'}
          </h1>
          <div className={styles.heroDate}>{data.date}</div>
          <div className={styles.heroSubtitle}>
            {mission === 'challenger'
              ? 'Seventy-three seconds after launch, the shuttle broke apart over the Atlantic. Seven people were aboard.'
              : 'Sixteen minutes before landing, the shuttle broke apart over Texas. Seven people were aboard.'}
          </div>
        </div>
      </header>

      {/* Acts */}
      <div ref={actRefs[0]}>
        <CrewAct data={data} mission={mission} />
      </div>

      <div ref={actRefs[1]}>
        <TimelineAct data={data} mission={mission} />
      </div>

      <div ref={actRefs[2]}>
        <TranscriptAct data={data} mission={mission} />
      </div>

      <footer className={styles.footer}>
        <Link to="/" className={styles.footerBack}>
          &larr; Return to Final Words
        </Link>
      </footer>
    </div>
  )
}
