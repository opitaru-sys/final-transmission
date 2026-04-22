import { useEffect, useRef, useState } from 'react'
import styles from './Story.module.css'
import { CREW_IMAGES } from '../data/crewImages'
import challengerJson from '../data/challenger.json'

// ─── Constants ────────────────────────────────────────────────────────────────

const VIDEO_URL =
  'https://archive.org/download/space-shuttle-challenger-disaster-january-28-1986/SpaceShuttleChallengerDisaster-January-28-1986.mp4'

// Transcript timed to seconds from liftoff (T+0)
// Two entries at T+0:01 are staggered 3s apart for readability
const LINES = [
  { t: 1,  ts: 'T+0:01', speaker: 'Judith Resnik',    text: 'Aaall Riight!' },
  { t: 4,  ts: 'T+0:01', speaker: 'Michael J. Smith', text: 'Here we go.' },
  { t: 11, ts: 'T+0:11', speaker: 'Michael J. Smith', text: 'Go you mother.' },
  { t: 15, ts: 'T+0:15', speaker: 'Judith Resnik',    text: '[Expletive] hot!' },
  { t: 19, ts: 'T+0:19', speaker: 'Michael J. Smith', text: "Looks like we've got a lot of wind here today." },
  { t: 40, ts: 'T+0:40', speaker: 'Michael J. Smith', text: "There's Mach 1." },
  { t: 60, ts: 'T+1:00', speaker: 'Michael J. Smith', text: 'Feel that mother go.' },
  { t: 67, ts: 'T+1:07', speaker: 'Mission Control',  text: 'Challenger, go at throttle up.' },
  { t: 72, ts: 'T+1:12', speaker: 'Dick Scobee',      text: 'Roger, go at throttle up.' },
  { t: 73, ts: 'T+1:13', speaker: 'Michael J. Smith', text: 'Uh oh.' },
]

const TOTAL_SECONDS = 73

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrewMember {
  name: string
  role: string
}

type Phase = 'intro' | 'playing' | 'uhoh' | 'aftermath'

// ─── Star canvas ──────────────────────────────────────────────────────────────

function StarCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      a: Math.random(), speed: Math.random() * 0.003 + 0.001,
      dir: Math.random() > 0.5 ? 1 : -1,
    }))
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach(s => {
        s.a += s.speed * s.dir
        if (s.a >= 1) s.dir = -1
        if (s.a <= 0) s.dir = 1
        ctx.beginPath()
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, s.a)})`
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className={styles.starCanvas} />
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function Story() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [lineIdx, setLineIdx] = useState(-1)
  const [muted, setMuted] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null)

  const crew = challengerJson.crew as unknown as CrewMember[]

  const begin = () => {
    setPhase('playing')
    const video = videoRef.current
    if (video) {
      video.muted = true // start muted (autoplay policy)
      video.play().catch(() => {})
    }

    // Transcript line timers
    LINES.forEach((line, i) => {
      timers.current.push(setTimeout(() => setLineIdx(i), line.t * 1000))
    })

    // Elapsed counter
    const startMs = Date.now()
    ticker.current = setInterval(() => {
      setElapsed(Math.min(TOTAL_SECONDS, Math.floor((Date.now() - startMs) / 1000)))
    }, 200)

    // Transition: "Uh oh." full screen at T+75
    timers.current.push(setTimeout(() => {
      setPhase('uhoh')
      if (ticker.current) clearInterval(ticker.current)
      if (videoRef.current) videoRef.current.pause()
    }, 75 * 1000))

    // Transition: aftermath at T+88
    timers.current.push(setTimeout(() => setPhase('aftermath'), 88 * 1000))
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !muted
    setMuted(m => !m)
  }

  const replay = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (ticker.current) clearInterval(ticker.current)
    setPhase('intro')
    setLineIdx(-1)
    setElapsed(0)
    setMuted(true)
    const video = videoRef.current
    if (video) { video.pause(); video.currentTime = 0 }
  }

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout)
      if (ticker.current) clearInterval(ticker.current)
    }
  }, [])

  // Format elapsed as T+0:XX or T+1:XX
  const fmtTime = (s: number) => {
    if (s < 60) return `T+0:${String(s).padStart(2, '0')}`
    return `T+1:${String(s - 60).padStart(2, '0')}`
  }

  return (
    <div className={styles.page}>

      {/* ── Video (rendered always, visible only during playing) ── */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        className={`${styles.video} ${phase === 'playing' ? styles.videoOn : ''}`}
        playsInline
        muted
        preload="auto"
      />

      {/* ══════════ INTRO ══════════ */}
      {phase === 'intro' && (
        <div className={styles.intro}>
          <StarCanvas />
          <div className={styles.introContent}>
            <div className={styles.eyebrow}>STS-51-L &nbsp;&middot;&nbsp; January 28, 1986</div>
            <div className={styles.bigNum}>73</div>
            <div className={styles.bigUnit}>seconds.</div>
            <div className={styles.introContext}>
              The night before launch, engineers begged NASA not to fly.
              <br />NASA overruled them.
            </div>
            <button className={styles.beginBtn} onClick={begin}>
              &#9654;&ensp;Experience it in real time
            </button>
            <div className={styles.introHint}>Sound recommended &nbsp;&middot;&nbsp; 73 seconds</div>
          </div>
        </div>
      )}

      {/* ══════════ PLAYING ══════════ */}
      {phase === 'playing' && (
        <div className={styles.playing}>
          {/* Dark scrim over video */}
          <div className={styles.scrim} />

          {/* Timer top-left */}
          <div className={styles.timer}>{fmtTime(elapsed)}</div>

          {/* Sound toggle top-right */}
          <button className={styles.soundBtn} onClick={toggleMute}>
            {muted ? '🔇 Tap for sound' : '🔊 Sound on'}
          </button>

          {/* Caption */}
          {lineIdx >= 0 && (
            <div key={lineIdx} className={styles.caption}>
              <div className={styles.captionWho}>
                {LINES[lineIdx].speaker}&ensp;&middot;&ensp;{LINES[lineIdx].ts}
              </div>
              <div className={styles.captionText}>
                &ldquo;{LINES[lineIdx].text}&rdquo;
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ animationDuration: `${TOTAL_SECONDS}s` }}
            />
          </div>
        </div>
      )}

      {/* ══════════ UH OH ══════════ */}
      {phase === 'uhoh' && (
        <div className={styles.uhoh}>
          <div className={styles.uhohText}>&ldquo;Uh oh.&rdquo;</div>
          <div className={styles.uhohWho}>
            T+1:13 &nbsp;&mdash;&nbsp; Michael J. Smith &nbsp;&middot;&nbsp; Pilot, STS-51-L
          </div>
          <div className={styles.uhohNote}>
            Last words on the cockpit voice recorder.
            <br />The orbiter broke apart eleven seconds later.
          </div>
        </div>
      )}

      {/* ══════════ AFTERMATH ══════════ */}
      {phase === 'aftermath' && (
        <div className={styles.aftermath}>
          <div className={styles.aftermathInner}>
            <blockquote className={styles.nesbitt}>
              &ldquo;Obviously a major malfunction.&rdquo;
            </blockquote>
            <div className={styles.nesbittWho}>
              Jack Riley Nesbitt &nbsp;&middot;&nbsp; NASA Public Affairs
              <br />11:39:13 AM &nbsp;&middot;&nbsp; 73 seconds after liftoff
            </div>

            <div className={styles.crewGrid}>
              {crew.map((c) => (
                <div key={c.name} className={styles.crewCard}>
                  <div className={styles.crewImgWrap}>
                    <img
                      src={CREW_IMAGES[c.name]}
                      alt={c.name}
                      className={styles.crewImg}
                    />
                  </div>
                  <div className={styles.crewName}>{c.name}</div>
                  <div className={styles.crewRole}>{c.role}</div>
                </div>
              ))}
            </div>

            <div className={styles.source}>
              Drawn from NASA records and the Rogers Commission Report, 1986.
            </div>

            <button className={styles.replayBtn} onClick={replay}>
              &#8635;&ensp;Watch again
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
