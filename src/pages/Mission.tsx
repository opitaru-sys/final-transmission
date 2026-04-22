import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import challengerData from '../data/challenger.json'
import columbiaData from '../data/columbia.json'
import { CREW_IMAGES } from '../data/crewImages'
import styles from './Mission.module.css'

interface Props {
  mission: 'challenger' | 'columbia'
}

type Phase = 'hero' | 'crew' | 'warnings' | 'transmission' | 'memorial'

interface CrewMember {
  name: string
  role: string
  age?: number
  hometown?: string
  portrait?: string
}

interface TranscriptEntry {
  timestamp: string
  speaker: string
  text: string
  annotation?: string
}

const WARNINGS = {
  challenger: [
    {
      label: 'Six months before launch',
      text: "Engineer Roger Boisjoly warned NASA: \"It is my honest and real fear that we will lose a crew before we even attempt to address this problem.\"",
    },
    {
      label: 'The night before launch',
      text: 'Thiokol engineers voted to delay. The O-ring seals weren\'t rated for temperatures below 53°F. It was 18°F at the pad that night.',
    },
    {
      label: 'Launch morning, 11:38 AM',
      text: 'NASA overruled the engineers. The launch proceeded. Seventy-three seconds later, Challenger was gone.',
    },
  ],
  columbia: [
    {
      label: '82 seconds after launch',
      text: 'A 1.67-pound foam piece broke off the external tank and struck the left wing at over 500 mph, punching through the heat shield.',
    },
    {
      label: 'Day 2 of the mission',
      text: 'Engineers urgently requested satellite imagery to assess the damage to Columbia\'s wing. NASA management denied the request.',
    },
    {
      label: 'Day 16 — reentry morning',
      text: 'Sensors began failing at 8:52 AM. The last radio contact was at 9:00 AM. Columbia never landed.',
    },
  ],
}

function startSpaceDrone(): () => void {
  try {
    const ctx = new AudioContext()
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.value = 42
    osc2.type = 'sine'
    osc2.frequency.value = 44.8

    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 4)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)
    osc1.start()
    osc2.start()

    return () => {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2)
      setTimeout(() => ctx.close(), 2500)
    }
  } catch {
    return () => {}
  }
}

export default function Mission({ mission }: Props) {
  const navigate = useNavigate()
  const data = (mission === 'challenger' ? challengerData : columbiaData) as {
    crew: CrewMember[]
    transcript: TranscriptEntry[]
    designation?: string
    date?: string
  }
  const warnings = WARNINGS[mission]
  const isChallenger = mission === 'challenger'
  const accent = isChallenger ? '#c4862a' : '#4a8fd4'

  const [phase, setPhase] = useState<Phase>('hero')
  const [crewIdx, setCrewIdx] = useState(0)
  const [warnIdx, setWarnIdx] = useState(0)
  const [txIdx, setTxIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())
  const [audioActive, setAudioActive] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stopDroneRef = useRef<() => void>(() => {})

  useEffect(() => () => stopDroneRef.current(), [])

  // Speak each transcript line aloud as it appears
  useEffect(() => {
    if (phase !== 'transmission') {
      window.speechSynthesis?.cancel()
      return
    }
    const entry = data.transcript[txIdx]
    if (!entry) return

    window.speechSynthesis.cancel()

    const say = () => {
      const utt = new SpeechSynthesisUtterance(`${(entry as TranscriptEntry).speaker}. ${(entry as TranscriptEntry).text}`)
      utt.rate = 0.82
      utt.pitch = 0.88
      utt.volume = 1
      // Prefer a calm, clear English voice
      const voices = window.speechSynthesis.getVoices()
      const preferred =
        voices.find((v) => /daniel|alex|karen/i.test(v.name)) ||
        voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
        voices.find((v) => /en/i.test(v.lang))
      if (preferred) utt.voice = preferred
      window.speechSynthesis.speak(utt)
    }

    if (window.speechSynthesis.getVoices().length > 0) {
      say()
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', say, { once: true })
    }

    return () => window.speechSynthesis.cancel()
  }, [phase, txIdx, data.transcript])

  const advance = useCallback(() => {
    clearTimeout(timerRef.current)
    if (phase === 'hero') {
      setPhase('crew')
      setCrewIdx(0)
    } else if (phase === 'crew') {
      if (crewIdx < data.crew.length - 1) {
        setCrewIdx((i) => i + 1)
      } else {
        setPhase('warnings')
        setWarnIdx(0)
      }
    } else if (phase === 'warnings') {
      if (warnIdx < warnings.length - 1) {
        setWarnIdx((i) => i + 1)
      } else {
        setPhase('transmission')
        setTxIdx(0)
        if (!audioActive) {
          setAudioActive(true)
          stopDroneRef.current = startSpaceDrone()
        }
      }
    } else if (phase === 'transmission') {
      if (txIdx < data.transcript.length - 1) {
        setTxIdx((i) => i + 1)
      } else {
        stopDroneRef.current()
        setPhase('memorial')
      }
    }
  }, [phase, crewIdx, warnIdx, txIdx, data, warnings, audioActive])

  useEffect(() => {
    if (paused || phase === 'memorial') return
    let ms = 5000
    if (phase === 'crew') ms = 5500
    if (phase === 'warnings') ms = 6500
    if (phase === 'transmission') {
      const text = data.transcript[txIdx]?.text ?? ''
      ms = Math.max(5000, text.length * 65)
    }
    timerRef.current = setTimeout(advance, ms)
    return () => clearTimeout(timerRef.current)
  }, [phase, crewIdx, warnIdx, txIdx, paused, advance, data])

  const totalSteps =
    1 + data.crew.length + warnings.length + data.transcript.length + 1
  const currentStep = (() => {
    if (phase === 'hero') return 0
    if (phase === 'crew') return 1 + crewIdx
    if (phase === 'warnings') return 1 + data.crew.length + warnIdx
    if (phase === 'transmission')
      return 1 + data.crew.length + warnings.length + txIdx
    return totalSteps - 1
  })()
  const progress = (currentStep / (totalSteps - 1)) * 100

  const handleTap = () => {
    if (phase === 'memorial') return
    advance()
  }

  const crew = data.crew[crewIdx]
  const tx = data.transcript[txIdx]
  const warn = warnings[warnIdx]

  const restart = () => {
    stopDroneRef.current()
    setAudioActive(false)
    setPhase('hero')
    setCrewIdx(0)
    setWarnIdx(0)
    setTxIdx(0)
    setPaused(false)
  }

  return (
    <div className={styles.stage} onClick={handleTap}>
      {/* Progress bar */}
      <div
        className={styles.progressBar}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%`, background: accent }}
        />
      </div>

      {/* Top controls */}
      <div className={styles.controls} onClick={(e) => e.stopPropagation()}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          &larr; Back
        </button>
        <div className={styles.missionLabel} style={{ color: `${accent}99` }}>
          {isChallenger ? 'STS-51-L  CHALLENGER' : 'STS-107  COLUMBIA'}
        </div>
        <button
          className={styles.pauseBtn}
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          {paused ? '▶' : '⏸'}
        </button>
      </div>

      {/* ── HERO ── */}
      {phase === 'hero' && (
        <div className={`${styles.slide} ${styles.heroSlide}`}>
          <div className={styles.heroContent}>
            <div className={styles.heroDesig} style={{ color: accent }}>
              {isChallenger ? 'STS-51-L' : 'STS-107'}
            </div>
            <h1 className={styles.heroTitle}>
              {isChallenger ? 'Challenger' : 'Columbia'}
            </h1>
            <div className={styles.heroDate}>
              {isChallenger ? 'January 28, 1986' : 'February 1, 2003'}
            </div>
            <div className={styles.heroCrew}>7 crew members</div>
            <div className={styles.heroTap} style={{ color: accent }}>
              Tap anywhere to begin
            </div>
          </div>
        </div>
      )}

      {/* ── CREW ── */}
      {phase === 'crew' && (
        <div key={`crew-${crewIdx}`} className={`${styles.slide} ${styles.crewSlide}`}>
          {CREW_IMAGES[crew.name] && !imgErrors.has(crew.name) ? (
            <img
              src={CREW_IMAGES[crew.name]}
              className={styles.crewPhoto}
              alt={crew.name}
              onError={() =>
                setImgErrors((prev) => new Set([...prev, crew.name]))
              }
            />
          ) : (
            <div
              className={styles.crewFallback}
              style={{
                background: `radial-gradient(ellipse at 50% 40%, ${accent}18 0%, #000 65%)`,
              }}
            >
              <span className={styles.crewInitials}>
                {crew.name
                  .replace(/['"]/g, '')
                  .split(' ')
                  .filter((w) => w.length > 1)
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)}
              </span>
            </div>
          )}
          <div className={styles.crewGrad} />
          <div className={styles.crewInfo}>
            <div className={styles.crewRole} style={{ color: accent }}>
              {crew.role}
            </div>
            <div className={styles.crewName}>{crew.name}</div>
            {crew.hometown && (
              <div className={styles.crewHometown}>{crew.hometown}</div>
            )}
            <div className={styles.dots}>
              {data.crew.map((_, i) => (
                <span
                  key={i}
                  className={styles.dot}
                  style={{
                    background: i <= crewIdx ? accent : 'rgba(255,255,255,0.2)',
                    transform: i === crewIdx ? 'scale(1.4)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── WARNINGS ── */}
      {phase === 'warnings' && (
        <div key={`warn-${warnIdx}`} className={`${styles.slide} ${styles.warnSlide}`}>
          <div className={styles.warnInner}>
            <div className={styles.warnChapter} style={{ color: accent }}>
              {warnIdx === 0 ? 'They were warned' : warnIdx === 1 ? 'They pushed back' : 'They were overruled'}
            </div>
            <div className={styles.warnLabel}>{warn.label}</div>
            <div className={styles.warnText}>{warn.text}</div>
            <div className={styles.dots} style={{ marginTop: 40 }}>
              {warnings.map((_, i) => (
                <span
                  key={i}
                  className={styles.dot}
                  style={{
                    background: i <= warnIdx ? accent : 'rgba(255,255,255,0.15)',
                    transform: i === warnIdx ? 'scale(1.4)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSMISSION ── */}
      {phase === 'transmission' && (
        <div className={`${styles.slide} ${styles.txSlide}`}>
          <div className={styles.txHeader}>
            <span style={{ color: accent }}>FINAL TRANSMISSION</span>
            <span className={styles.txCount}>
              {txIdx + 1}&thinsp;/&thinsp;{data.transcript.length}
            </span>
          </div>

          <div key={`tx-${txIdx}`} className={styles.txEntry}>
            <div className={styles.txTime} style={{ color: accent }}>
              {tx.timestamp}
            </div>
            <div className={styles.txSpeaker}>{tx.speaker}</div>
            <div className={styles.txText}>{tx.text}</div>
            {tx.annotation && (
              <div className={styles.txAnnotation}>{tx.annotation.replace(/^\[|\]$/g, '')}</div>
            )}
          </div>

          <div className={styles.txDots}>
            {data.transcript.map((_, i) => (
              <span
                key={i}
                className={styles.tDot}
                style={{ background: i <= txIdx ? accent : '#1e1e1e' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── MEMORIAL ── */}
      {phase === 'memorial' && (
        <div
          className={`${styles.slide} ${styles.memSlide}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.memContent}>
            <div className={styles.memLabel} style={{ color: accent }}>
              In Memoriam
            </div>
            <div className={styles.memNames}>
              {data.crew.map((c, i) => (
                <div
                  key={c.name}
                  className={styles.memName}
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  {c.name}
                </div>
              ))}
            </div>
            <div className={styles.memDate}>
              {isChallenger ? 'January 28, 1986' : 'February 1, 2003'}
            </div>
            <div className={styles.memActions}>
              <button
                className={styles.watchAgain}
                style={{ borderColor: accent, color: accent }}
                onClick={restart}
              >
                Watch again
              </button>
              <button className={styles.memBack} onClick={() => navigate('/')}>
                &larr; Choose another mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tap hint overlay when paused */}
      {paused && phase !== 'memorial' && (
        <div className={styles.pausedOverlay} onClick={(e) => e.stopPropagation()}>
          <button
            className={styles.resumeBtn}
            style={{ borderColor: accent, color: accent }}
            onClick={() => setPaused(false)}
          >
            ▶ Resume
          </button>
        </div>
      )}
    </div>
  )
}
