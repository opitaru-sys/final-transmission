import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './Story.module.css'
import { CREW_IMAGES } from '../data/crewImages'
import challengerJson from '../data/challenger.json'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CrewMember {
  name: string
  role: string
  age: number
  hometown: string
}

interface TxEntry {
  timestamp: string
  speaker: string
  text: string
}

// ─── Transcript lines to show (remove system events + routine callouts) ──────

const SKIP_TIMESTAMPS = new Set(['T-6 seconds', 'T+0', 'T+0:07', 'T+0:14', 'T+0:28'])

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

// ─── Reveal wrapper ───────────────────────────────────────────────────────────

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const [ref, visible] = useInView()
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealVisible : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// ─── Star canvas ──────────────────────────────────────────────────────────────

function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.3 + 0.2,
      alpha: Math.random(),
      speed: Math.random() * 0.003 + 0.001,
      dir: Math.random() > 0.5 ? 1 : -1,
    }))
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach((s) => {
        s.alpha += s.speed * s.dir
        if (s.alpha >= 1) s.dir = -1
        if (s.alpha <= 0) s.dir = 1
        ctx.beginPath()
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, s.alpha)})`
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={canvasRef} className={styles.starCanvas} />
}

// ─── Crew grid ────────────────────────────────────────────────────────────────

function CrewGrid({ crew }: { crew: CrewMember[] }) {
  return (
    <div className={styles.crewGrid}>
      {crew.map((member, i) => (
        <Reveal key={member.name} delay={i * 60}>
          <div className={styles.crewCard}>
            <div className={styles.crewImgWrap}>
              <img
                src={CREW_IMAGES[member.name]}
                alt={member.name}
                className={styles.crewImg}
              />
            </div>
            <div className={styles.crewCardName}>{member.name}</div>
            <div className={styles.crewCardRole}>{member.role}</div>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

// ─── Transcript line ──────────────────────────────────────────────────────────

function TxLine({ timestamp, speaker, text, index }: TxEntry & { index: number }) {
  const [ref, visible] = useInView(0.3)
  const isMC = speaker.startsWith('Mission Control')
  return (
    <div
      ref={ref}
      className={`${styles.txLine} ${visible ? styles.txLineVisible : ''} ${isMC ? styles.txMC : ''}`}
      style={{ transitionDelay: `${Math.min(index * 30, 150)}ms` }}
    >
      <span className={styles.txTime}>{timestamp}</span>
      <span className={styles.txWho}>{speaker}</span>
      <span className={styles.txWords}>&ldquo;{text}&rdquo;</span>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function Story() {
  const crew = challengerJson.crew as unknown as CrewMember[]
  const transcript = (challengerJson.transcript as unknown as TxEntry[]).filter(
    (e) => !SKIP_TIMESTAMPS.has(e.timestamp)
  )

  return (
    <div className={styles.page}>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <StarCanvas />
        <div className={styles.heroInner}>
          <div className={styles.heroEyebrow}>STS-51-L &nbsp;&middot;&nbsp; January 28, 1986</div>
          <div className={styles.heroNum}>73</div>
          <div className={styles.heroUnit}>seconds.</div>
          <div className={styles.heroSub}>
            Everything the crew of Challenger said
            <br />before the silence.
          </div>
        </div>
        <div className={styles.scrollHint}>&#8595;</div>
      </section>

      {/* ── MEMO ─────────────────────────────────────────────── */}
      <section className={styles.memoSection}>
        <Reveal>
          <div className={styles.memoSetup}>
            The night before launch, an engineer wrote this.
          </div>
        </Reveal>
        <Reveal delay={200}>
          <div className={styles.memoCard}>
            <div className={styles.memoLabel}>
              MORTON THIOKOL &nbsp;&middot;&nbsp; JANUARY 27, 1986
            </div>
            <blockquote className={styles.memoQuote}>
              &ldquo;If we do not take immediate action to solve the problem
              with the SRB O-ring sealing, then we stand in jeopardy of
              losing a flight along with all the people.&rdquo;
            </blockquote>
            <div className={styles.memoCredit}>
              Roger Boisjoly, Thiokol engineer
            </div>
          </div>
        </Reveal>
        <Reveal delay={400}>
          <div className={styles.memoOutcome}>
            NASA overruled the engineers. The launch happened anyway.
          </div>
        </Reveal>
      </section>

      {/* ── CREW ─────────────────────────────────────────────── */}
      <section className={styles.crewSection}>
        <Reveal>
          <div className={styles.crewHeadline}>Seven people flew that morning.</div>
        </Reveal>
        <CrewGrid crew={crew} />
      </section>

      {/* ── TRANSCRIPT ───────────────────────────────────────── */}
      <section className={styles.txSection}>
        <Reveal>
          <div className={styles.txHeader}>
            <span className={styles.txLabel}>THE LAST 73 SECONDS</span>
            <span className={styles.txSub}>Cockpit voice recorder &nbsp;&middot;&nbsp; 11:38 AM Eastern</span>
          </div>
        </Reveal>
        {transcript.map((entry, i) => (
          <TxLine key={i} {...entry} index={i} />
        ))}
      </section>

      {/* ── "UH OH." ─────────────────────────────────────────── */}
      <section className={styles.climax}>
        <Reveal>
          <div className={styles.climaxText}>&ldquo;Uh oh.&rdquo;</div>
        </Reveal>
        <Reveal delay={500}>
          <div className={styles.climaxWho}>
            T+1:13 &nbsp;&mdash;&nbsp; Michael J. Smith &nbsp;&middot;&nbsp; Pilot
          </div>
        </Reveal>
        <Reveal delay={800}>
          <div className={styles.climaxNote}>
            Last words on the cockpit voice recorder.
            <br />The orbiter broke apart eleven seconds later.
          </div>
        </Reveal>
      </section>

      {/* ── AFTERMATH + NAMES ────────────────────────────────── */}
      <section className={styles.endSection}>
        <Reveal>
          <blockquote className={styles.nesbitt}>
            &ldquo;Obviously a major malfunction.&rdquo;
          </blockquote>
        </Reveal>
        <Reveal delay={300}>
          <div className={styles.nesbittWho}>
            Jack Riley Nesbitt &nbsp;&middot;&nbsp; NASA Public Affairs
            <br />11:39:13 AM &nbsp;&middot;&nbsp; 73 seconds after liftoff
          </div>
        </Reveal>
        <div className={styles.names}>
          {crew.map((c, i) => (
            <Reveal key={c.name} delay={i * 90}>
              <div className={styles.name}>{c.name}</div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={800}>
          <div className={styles.source}>
            Drawn from NASA records and the Rogers Commission Report, 1986.
          </div>
        </Reveal>
      </section>

    </div>
  )
}
