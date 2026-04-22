import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import challengerData from '../data/challenger.json'
import columbiaData from '../data/columbia.json'
import { CREW_IMAGES } from '../data/crewImages'
import styles from './Mission.module.css'

interface Props {
  mission: 'challenger' | 'columbia'
}

type Phase = 'hero' | 'crew' | 'warnings' | 'nesbitt' | 'transmission' | 'memorial'

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

const CHALLENGER_AUDIO_URL =
  'https://archive.org/download/space-shuttle-challenger-disaster-january-28-1986/SpaceShuttleChallengerDisaster-January-28-1986.ia.mp4'

// Nesbitt's "obviously a major malfunction" is approximately at 1:30–2:00 in the broadcast
const NESBITT_START = 90
const NESBITT_END = 119

// Parse "T+1:13" -> 73, "T+0:07" -> 7, "T+0" -> 0, "T-6 seconds" -> -6
function parseTranscriptTime(ts: string): number | null {
  const tPlus = ts.match(/T\+(\d+):(\d+)/)
  if (tPlus) return parseInt(tPlus[1], 10) * 60 + parseInt(tPlus[2], 10)
  const tPlusSimple = ts.match(/T\+(\d+)$/)
  if (tPlusSimple) return parseInt(tPlusSimple[1], 10)
  const tMinus = ts.match(/T-(\d+)/)
  if (tMinus) return -parseInt(tMinus[1], 10)
  return null
}

function formatAudioTime(secs: number): string {
  if (!isFinite(secs) || isNaN(secs)) return '--:--'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Mission({ mission }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const data = (mission === 'challenger' ? challengerData : columbiaData) as {
    crew: CrewMember[]
    transcript: TranscriptEntry[]
    designation?: string
    date?: string
  }
  const warnings = WARNINGS[mission]
  const isChallenger = mission === 'challenger'
  const accent = isChallenger ? '#c4862a' : '#4a8fd4'

  // Phase + progression state
  const [phase, setPhase] = useState<Phase>('hero')
  const [crewIdx, setCrewIdx] = useState(0)
  const [warnIdx, setWarnIdx] = useState(0)
  const [txIdx, setTxIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

  // Challenger audio state
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioTime, setAudioTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [syncOffset, setSyncOffset] = useState(0)
  const phaseRef = useRef<Phase>('hero')

  // Share state
  const [copied, setCopied] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Deep link: jump to a specific transcript line on load ──────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const lineParam = params.get('line')
    if (lineParam !== null) {
      const lineNum = parseInt(lineParam, 10)
      if (!isNaN(lineNum) && lineNum >= 0 && lineNum < data.transcript.length) {
        setPhase('transmission')
        setTxIdx(lineNum)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep phaseRef in sync for use inside event handlers
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // ── Challenger audio: wire up events ──────────────────────────────────────
  useEffect(() => {
    if (!isChallenger || !audioRef.current) return
    const audio = audioRef.current

    const onTimeUpdate = () => {
      setAudioTime(audio.currentTime)
      // Loop the Nesbitt clip while in nesbitt phase
      if (phaseRef.current === 'nesbitt' && audio.currentTime >= NESBITT_END) {
        audio.currentTime = NESBITT_START
      }
    }
    const onDuration = () => setAudioDuration(audio.duration)
    const onPlay = () => setAudioPlaying(true)
    const onPause = () => setAudioPlaying(false)
    const onEnded = () => setAudioPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('loadedmetadata', onDuration)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [isChallenger])

  // ── Auto-start Nesbitt loop when entering nesbitt phase ───────────────────
  useEffect(() => {
    if (!isChallenger || !audioRef.current) return
    if (phase === 'nesbitt') {
      const audio = audioRef.current
      audio.currentTime = NESBITT_START
      audio.play().catch(() => {/* Autoplay may be blocked; user can press play */})
    }
  }, [phase, isChallenger])

  // ── Audio-driven transcript advancement (Challenger, transmission) ─────────
  useEffect(() => {
    if (!isChallenger || !audioPlaying || phase !== 'transmission') return

    const txTime = audioTime - syncOffset
    const entries = data.transcript
    let newIdx = txIdx

    for (let i = 0; i < entries.length; i++) {
      const entryTime = parseTranscriptTime(entries[i].timestamp)
      if (entryTime !== null && entryTime <= txTime) {
        newIdx = i
      }
    }

    if (newIdx !== txIdx) {
      setTxIdx(newIdx)
    }
  // We deliberately exclude txIdx from deps to avoid feedback loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioTime, syncOffset, audioPlaying, phase, isChallenger, data.transcript])

  // ── Advance: manual tap progression ──────────────────────────────────────
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
        if (isChallenger) {
          setPhase('nesbitt')
        } else {
          setPhase('transmission')
          setTxIdx(0)
        }
      }
    } else if (phase === 'nesbitt') {
      // Stop the loop; let audio continue playing into transmission
      setPhase('transmission')
      setTxIdx(0)
    } else if (phase === 'transmission') {
      if (txIdx < data.transcript.length - 1) {
        setTxIdx((i) => i + 1)
      } else {
        setPhase('memorial')
      }
    }
  }, [phase, crewIdx, warnIdx, txIdx, data, warnings, isChallenger])

  // ── Auto-advance timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (paused || phase === 'memorial' || phase === 'nesbitt') return
    // Don't use timer for Challenger transmission when audio is driving it
    if (isChallenger && phase === 'transmission' && audioPlaying) return

    let ms = 5000
    if (phase === 'crew') ms = 5500
    if (phase === 'warnings') ms = 6500
    if (phase === 'transmission') {
      const text = data.transcript[txIdx]?.text ?? ''
      ms = Math.max(5000, text.length * 65)
    }
    timerRef.current = setTimeout(advance, ms)
    return () => clearTimeout(timerRef.current)
  }, [phase, crewIdx, warnIdx, txIdx, paused, advance, data, audioPlaying, isChallenger])

  // ── Progress bar calculation ─────────────────────────────────────────────
  const extraPhase = isChallenger ? 1 : 0 // nesbitt phase
  const totalSteps =
    1 + data.crew.length + warnings.length + extraPhase + data.transcript.length + 1
  const currentStep = (() => {
    if (phase === 'hero') return 0
    if (phase === 'crew') return 1 + crewIdx
    if (phase === 'warnings') return 1 + data.crew.length + warnIdx
    if (phase === 'nesbitt') return 1 + data.crew.length + warnings.length
    if (phase === 'transmission')
      return 1 + data.crew.length + warnings.length + extraPhase + txIdx
    return totalSteps - 1
  })()
  const progress = (currentStep / (totalSteps - 1)) * 100

  const handleTap = () => {
    if (phase === 'memorial' || phase === 'nesbitt') return
    advance()
  }

  const crew = data.crew[crewIdx]
  const tx = data.transcript[txIdx]
  const warn = warnings[warnIdx]

  const restart = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setAudioPlaying(false)
    setAudioTime(0)
    setPhase('hero')
    setCrewIdx(0)
    setWarnIdx(0)
    setTxIdx(0)
    setPaused(false)
  }

  // ── Share a specific transcript line ────────────────────────────────────
  const handleShare = (lineIdx: number) => {
    const base = `${window.location.origin}${window.location.pathname}`
    const hash = `#/${mission}?line=${lineIdx}`
    const url = `${base}${hash}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Fallback: prompt
      window.prompt('Copy this link:', url)
    })
  }

  // ── Audio player controls ────────────────────────────────────────────────
  const toggleAudio = () => {
    if (!audioRef.current) return
    if (audioPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
  }

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const t = parseFloat(e.target.value)
    audioRef.current.currentTime = t
    setAudioTime(t)
  }

  return (
    <div className={styles.stage} onClick={handleTap}>
      {/* Hidden audio element for Challenger */}
      {isChallenger && (
        <audio
          ref={audioRef}
          preload="none"
          src={CHALLENGER_AUDIO_URL}
        />
      )}

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

      {/* ── NESBITT CALLOUT (Challenger only) ── */}
      {phase === 'nesbitt' && isChallenger && (
        <div
          className={`${styles.slide} ${styles.nesbittSlide}`}
          onClick={(e) => {
            e.stopPropagation()
            advance()
          }}
        >
          <div className={styles.nesbittCard}>
            <div className={styles.nesbittEyebrow}>Mission Control — T+1:15</div>
            <blockquote className={styles.nesbittQuote}>
              "Obviously a major malfunction."
            </blockquote>
            <div className={styles.nesbittAttrib}>Steve Nesbitt, NASA Public Affairs Officer</div>

            {/* Mini audio control for Nesbitt clip — stop propagation so click doesn't advance */}
            <div
              className={styles.nesbittAudio}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.nesbittPlayBtn}
                onClick={toggleAudio}
                aria-label={audioPlaying ? 'Pause' : 'Play'}
              >
                {audioPlaying ? '⏸' : '▶'}
              </button>
              <span className={styles.nesbittAudioLabel}>
                {audioPlaying ? 'Playing broadcast audio…' : 'Play broadcast audio'}
              </span>
            </div>

            <div className={styles.nesbittCta}>
              Tap anywhere to enter the transcript &rarr;
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSMISSION ── */}
      {phase === 'transmission' && (
        <div className={`${styles.slide} ${styles.txSlide} ${isChallenger ? styles.txSlideAudio : styles.txSlideSilence}`}>
          <div className={styles.txHeader}>
            <span style={{ color: accent }}>FINAL TRANSMISSION</span>
            <span className={styles.txCount}>
              {txIdx + 1}&thinsp;/&thinsp;{data.transcript.length}
            </span>
          </div>

          {/* Challenger: embedded broadcast audio player */}
          {isChallenger && (
            <div
              className={styles.audioPlayer}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.audioLabel}>
                Live broadcast audio — NBC/CBS News, January 28, 1986. Recorded from television as it happened.
              </div>
              <div className={styles.audioControls}>
                <button
                  className={styles.audioPlayBtn}
                  onClick={toggleAudio}
                  aria-label={audioPlaying ? 'Pause broadcast' : 'Play broadcast'}
                >
                  {audioPlaying ? '⏸' : '▶'}
                </button>
                <span className={styles.audioTime}>
                  {formatAudioTime(audioTime)}
                </span>
                <input
                  type="range"
                  className={styles.audioScrubber}
                  min={0}
                  max={audioDuration || 100}
                  step={0.5}
                  value={audioTime}
                  onChange={handleScrub}
                  aria-label="Seek broadcast audio"
                />
                <span className={styles.audioDuration}>
                  {formatAudioTime(audioDuration)}
                </span>
              </div>
              <div className={styles.audioSync}>
                <span className={styles.audioSyncLabel}>Sync offset:</span>
                <button
                  className={styles.audioSyncBtn}
                  onClick={() => setSyncOffset((o) => o - 5)}
                  aria-label="Decrease sync offset by 5 seconds"
                >−5s</button>
                <span className={styles.audioSyncValue}>{syncOffset >= 0 ? '+' : ''}{syncOffset}s</span>
                <button
                  className={styles.audioSyncBtn}
                  onClick={() => setSyncOffset((o) => o + 5)}
                  aria-label="Increase sync offset by 5 seconds"
                >+5s</button>
              </div>
              <div className={styles.audioAttrib}>
                <a
                  href="https://archive.org/details/space-shuttle-challenger-disaster-january-28-1986"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Audio source: Internet Archive, CC Attribution 4.0
                </a>
              </div>
            </div>
          )}

          {/* Columbia: intentional silence note */}
          {!isChallenger && (
            <div className={styles.silenceNote}>
              No broadcast audio captures this moment. Columbia's crew were sixteen minutes from home.
            </div>
          )}

          <div key={`tx-${txIdx}`} className={styles.txEntry}>
            <div className={styles.txTime} style={{ color: accent }}>
              {tx.timestamp}
            </div>
            <div className={styles.txSpeaker}>{tx.speaker}</div>
            <div className={styles.txText}>{tx.text}</div>
            {tx.annotation && (
              <div className={styles.txAnnotation}>{tx.annotation.replace(/^\[|\]$/g, '')}</div>
            )}
            {/* Share this moment */}
            <div className={styles.txShareRow} onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.txShareBtn}
                onClick={() => handleShare(txIdx)}
                title="Copy link to this moment"
              >
                {copied ? 'Link copied' : 'Share this moment'}
              </button>
            </div>
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

            {/* Attribution footer */}
            <div className={styles.attribution}>
              {isChallenger && (
                <p>
                  Broadcast audio:{' '}
                  <a
                    href="https://archive.org/details/space-shuttle-challenger-disaster-january-28-1986"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Internet Archive
                  </a>
                  , original VHS recording, CC Attribution 4.0.
                </p>
              )}
              <p>
                Crew transcripts: NASA official mission records.
              </p>
              <p>
                Warning signs:{' '}
                {isChallenger ? (
                  <>
                    <a
                      href="https://history.nasa.gov/rogersrep/genindex.htm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Rogers Commission Report
                    </a>
                    , 1986.
                  </>
                ) : (
                  <>
                    <a
                      href="https://www.nasa.gov/columbia/caib/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Columbia Accident Investigation Board Report
                    </a>
                    , 2003.
                  </>
                )}
              </p>
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
