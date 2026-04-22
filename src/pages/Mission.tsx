import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import challengerData from '../data/challenger.json'
import columbiaData from '../data/columbia.json'
import { CREW_IMAGES } from '../data/crewImages'
import styles from './Mission.module.css'

interface Props {
  mission: 'challenger' | 'columbia'
}

// coldOpen is Challenger-only: shows the final line first as a hook
type Phase = 'coldOpen' | 'hero' | 'crew' | 'warnings' | 'nesbitt' | 'transmission' | 'memorial'

interface CrewMember {
  name: string
  role: string
  age?: number
  hometown?: string
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

const CHALLENGER_VIDEO_URL =
  'https://archive.org/download/space-shuttle-challenger-disaster-january-28-1986/SpaceShuttleChallengerDisaster-January-28-1986.mp4'

const NESBITT_START = 90
const NESBITT_END = 119

// ── Helpers ────────────────────────────────────────────────────────────────

function parseTranscriptTime(ts: string): number | null {
  const tPlus = ts.match(/T\+(\d+):(\d+)/)
  if (tPlus) return parseInt(tPlus[1], 10) * 60 + parseInt(tPlus[2], 10)
  const tPlusSimple = ts.match(/T\+(\d+)$/)
  if (tPlusSimple) return parseInt(tPlusSimple[1], 10)
  const tMinus = ts.match(/T-(\d+)/)
  if (tMinus) return -parseInt(tMinus[1], 10)
  return null
}

function formatTime(secs: number): string {
  if (!isFinite(secs) || isNaN(secs)) return '--:--'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// 1.5-second burst of filtered radio static using Web Audio API
function playStaticBurst(): void {
  try {
    const ctx = new AudioContext()
    const sampleRate = ctx.sampleRate
    const duration = 1.5
    const bufferSize = Math.floor(sampleRate * duration)
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1400
    filter.Q.value = 0.6

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.4)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start()
    setTimeout(() => ctx.close(), (duration + 0.5) * 1000)
  } catch {
    // AudioContext not available — fail silently
  }
}

// Link icon SVG (inline, no external dep)
function LinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function Mission({ mission }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const data = (mission === 'challenger' ? challengerData : columbiaData) as {
    crew: CrewMember[]
    transcript: TranscriptEntry[]
  }
  const warnings = WARNINGS[mission]
  const isChallenger = mission === 'challenger'
  const accent = isChallenger ? '#c4862a' : '#4a8fd4'

  // Phase + progression
  const [phase, setPhase] = useState<Phase>(isChallenger ? 'coldOpen' : 'hero')
  const [crewIdx, setCrewIdx] = useState(0)
  const [warnIdx, setWarnIdx] = useState(0)
  const [txIdx, setTxIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

  // Video state (Challenger)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [syncOffset, setSyncOffset] = useState(0)

  // Share
  const [copied, setCopied] = useState(false)

  // Touch tracking for swipe gestures
  const touchStartY = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Deep link ──────────────────────────────────────────────────────────────
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

  // ── Auto-start Nesbitt loop ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'nesbitt' || !isChallenger) return
    const t = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = NESBITT_START
        videoRef.current.play().catch(() => {})
      }
    }, 80)
    return () => clearTimeout(t)
  }, [phase, isChallenger])

  // ── Video-driven transcript sync ───────────────────────────────────────────
  useEffect(() => {
    if (!isChallenger || !videoPlaying || phase !== 'transmission') return
    const txTime = videoTime - syncOffset
    let newIdx = txIdx
    for (let i = 0; i < data.transcript.length; i++) {
      const t = parseTranscriptTime(data.transcript[i].timestamp)
      if (t !== null && t <= txTime) newIdx = i
    }
    if (newIdx !== txIdx) setTxIdx(newIdx)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoTime, syncOffset, videoPlaying, phase, isChallenger])

  // ── Advance ────────────────────────────────────────────────────────────────
  const advance = useCallback(() => {
    clearTimeout(timerRef.current)
    if (phase === 'coldOpen') {
      setPhase('hero')
    } else if (phase === 'hero') {
      setPhase('crew'); setCrewIdx(0)
    } else if (phase === 'crew') {
      if (crewIdx < data.crew.length - 1) setCrewIdx(i => i + 1)
      else { setPhase('warnings'); setWarnIdx(0) }
    } else if (phase === 'warnings') {
      if (warnIdx < warnings.length - 1) setWarnIdx(i => i + 1)
      else {
        if (isChallenger) {
          playStaticBurst()
          setPhase('nesbitt')
        } else {
          playStaticBurst()
          setPhase('transmission')
          setTxIdx(0)
        }
      }
    } else if (phase === 'nesbitt') {
      setPhase('transmission'); setTxIdx(0)
    } else if (phase === 'transmission') {
      if (txIdx < data.transcript.length - 1) setTxIdx(i => i + 1)
      else setPhase('memorial')
    }
  }, [phase, crewIdx, warnIdx, txIdx, data, warnings, isChallenger])

  // ── Retreat (swipe down goes back one step) ────────────────────────────────
  const retreat = useCallback(() => {
    clearTimeout(timerRef.current)
    if (phase === 'coldOpen' || phase === 'hero') return
    if (phase === 'crew') {
      if (crewIdx > 0) setCrewIdx(i => i - 1)
      else setPhase('hero')
    } else if (phase === 'warnings') {
      if (warnIdx > 0) setWarnIdx(i => i - 1)
      else { setPhase('crew'); setCrewIdx(data.crew.length - 1) }
    } else if (phase === 'nesbitt') {
      setPhase('warnings'); setWarnIdx(warnings.length - 1)
    } else if (phase === 'transmission') {
      if (txIdx > 0) setTxIdx(i => i - 1)
      else setPhase(isChallenger ? 'nesbitt' : 'warnings')
    } else if (phase === 'memorial') {
      setPhase('transmission'); setTxIdx(data.transcript.length - 1)
    }
  }, [phase, crewIdx, warnIdx, txIdx, data, warnings, isChallenger])

  // ── Auto-advance timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (paused || phase === 'memorial' || phase === 'nesbitt') return
    if (isChallenger && phase === 'transmission' && videoPlaying) return

    let ms = 5000
    if (phase === 'coldOpen') ms = 3200
    if (phase === 'crew') ms = 4000        // tightened from 5500
    if (phase === 'warnings') ms = 5500    // tightened from 6500
    if (phase === 'transmission') {
      const text = data.transcript[txIdx]?.text ?? ''
      ms = Math.max(2500, text.length * 50) // tightened from 5000 / 65ms
    }
    timerRef.current = setTimeout(advance, ms)
    return () => clearTimeout(timerRef.current)
  }, [phase, crewIdx, warnIdx, txIdx, paused, advance, data, videoPlaying, isChallenger])

  // ── Touch / swipe handling ─────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return
    const dy = touchStartY.current - e.changedTouches[0].clientY
    const dx = Math.abs(touchStartX.current - e.changedTouches[0].clientX)
    touchStartY.current = null
    touchStartX.current = null
    // Require vertical swipe, not diagonal scroll
    if (Math.abs(dy) < 45 || dx > Math.abs(dy) * 0.8) return
    if (dy > 0) advance()   // swipe up → forward
    else retreat()           // swipe down → back
  }

  // ── Progress bar ──────────────────────────────────────────────────────────
  const extraPhase = isChallenger ? 2 : 0 // coldOpen + nesbitt
  const totalSteps = 1 + data.crew.length + warnings.length + extraPhase + data.transcript.length + 1
  const currentStep = (() => {
    if (phase === 'coldOpen') return 0
    if (phase === 'hero') return isChallenger ? 1 : 0
    if (phase === 'crew') return (isChallenger ? 2 : 1) + crewIdx
    if (phase === 'warnings') return (isChallenger ? 2 : 1) + data.crew.length + warnIdx
    if (phase === 'nesbitt') return 2 + data.crew.length + warnings.length
    if (phase === 'transmission') return (isChallenger ? 2 : 1) + data.crew.length + warnings.length + (isChallenger ? 1 : 0) + txIdx
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
  const lastEntry = data.transcript[data.transcript.length - 1]

  const restart = () => {
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 }
    setVideoPlaying(false); setVideoTime(0)
    setPhase(isChallenger ? 'coldOpen' : 'hero')
    setCrewIdx(0); setWarnIdx(0); setTxIdx(0); setPaused(false)
  }

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = (lineIdx: number) => {
    const url = `${window.location.origin}${window.location.pathname}#/${mission}?line=${lineIdx}`
    navigator.clipboard.writeText(url)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) })
      .catch(() => window.prompt('Copy this link:', url))
  }

  // ── Video handlers ─────────────────────────────────────────────────────────
  const onTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    setVideoTime(v.currentTime)
    if (phase === 'nesbitt' && v.currentTime >= NESBITT_END) v.currentTime = NESBITT_START
  }
  const onLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) =>
    setVideoDuration(e.currentTarget.duration)
  const onPlay = () => setVideoPlaying(true)
  const onPause = () => setVideoPlaying(false)
  const onEnded = () => setVideoPlaying(false)

  const toggleVideo = () => {
    if (!videoRef.current) return
    videoPlaying ? videoRef.current.pause() : videoRef.current.play().catch(() => {})
  }

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const t = parseFloat(e.target.value)
    videoRef.current.currentTime = t
    setVideoTime(t)
  }

  const videoProps = {
    ref: videoRef,
    src: CHALLENGER_VIDEO_URL,
    preload: 'none' as const,
    playsInline: true,
    onTimeUpdate,
    onLoadedMetadata,
    onDurationChange: onLoadedMetadata,
    onPlay,
    onPause,
    onEnded,
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={styles.stage}
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar */}
      <div className={styles.progressBar} onClick={e => e.stopPropagation()}>
        <div className={styles.progressFill} style={{ width: `${progress}%`, background: accent }} />
      </div>

      {/* Top controls */}
      <div className={styles.controls} onClick={e => e.stopPropagation()}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>&larr; Back</button>
        <div className={styles.missionLabel} style={{ color: `${accent}99` }}>
          {isChallenger ? 'STS-51-L  CHALLENGER' : 'STS-107  COLUMBIA'}
        </div>
        <button className={styles.pauseBtn} onClick={() => setPaused(p => !p)} aria-label={paused ? 'Resume' : 'Pause'}>
          {paused ? '▶' : '⏸'}
        </button>
      </div>

      {/* ── COLD OPEN (Challenger only) ── */}
      {phase === 'coldOpen' && (
        <div className={`${styles.slide} ${styles.coldOpenSlide}`}>
          <div className={styles.coldOpenInner}>
            <div className={styles.coldOpenMeta}>CREW AUDIO — STS-51-L — {lastEntry.timestamp}</div>
            <div className={styles.coldOpenText}>{lastEntry.text}</div>
            <div className={styles.coldOpenAttrib}>{lastEntry.speaker}</div>
            <div className={styles.coldOpenBar}>
              <div className={styles.coldOpenBarFill} />
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      {phase === 'hero' && (
        <div className={`${styles.slide} ${styles.heroSlide}`}>
          <div className={styles.heroContent}>
            <div className={styles.heroDesig} style={{ color: accent }}>
              {isChallenger ? 'STS-51-L' : 'STS-107'}
            </div>
            <h1 className={styles.heroTitle}>{isChallenger ? 'Challenger' : 'Columbia'}</h1>
            <div className={styles.heroDate}>{isChallenger ? 'January 28, 1986' : 'February 1, 2003'}</div>
            <div className={styles.heroCrew}>7 crew members</div>
            {isChallenger && (
              <div className={styles.heroRewind} style={{ color: accent }}>
                What led here &rarr;
              </div>
            )}
            {!isChallenger && (
              <div className={styles.heroTap} style={{ color: accent }}>Tap anywhere to begin</div>
            )}
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
              onError={() => setImgErrors(prev => new Set([...prev, crew.name]))}
            />
          ) : (
            <div className={styles.crewFallback} style={{ background: `radial-gradient(ellipse at 50% 40%, ${accent}18 0%, #000 65%)` }}>
              <span className={styles.crewInitials}>
                {crew.name.replace(/['"]/g, '').split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2)}
              </span>
            </div>
          )}
          <div className={styles.crewGrad} />
          <div className={styles.crewInfo}>
            <div className={styles.crewRoleRow}>
              <div className={styles.crewRole} style={{ color: accent }}>{crew.role}</div>
              {/* Progress counter */}
              <div className={styles.crewCounter} style={{ color: `${accent}88` }}>
                {crewIdx + 1}&thinsp;/&thinsp;{data.crew.length}
              </div>
            </div>
            <div className={styles.crewName}>{crew.name}</div>
            {crew.hometown && <div className={styles.crewHometown}>{crew.hometown}</div>}
            <div className={styles.dots}>
              {data.crew.map((_, i) => (
                <span key={i} className={styles.dot} style={{
                  background: i <= crewIdx ? accent : 'rgba(255,255,255,0.2)',
                  transform: i === crewIdx ? 'scale(1.4)' : 'scale(1)',
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── WARNINGS ── */}
      {phase === 'warnings' && (
        <div key={`warn-${warnIdx}`} className={`${styles.slide} ${styles.warnSlide}`}>
          <div className={styles.warnInner}>
            <div className={styles.warnTopRow}>
              <div className={styles.warnChapter} style={{ color: accent }}>
                {warnIdx === 0 ? 'They were warned' : warnIdx === 1 ? 'They pushed back' : 'They were overruled'}
              </div>
              <div className={styles.warnCounter} style={{ color: `${accent}77` }}>
                {warnIdx + 1}&thinsp;/&thinsp;{warnings.length}
              </div>
            </div>

            {/* Boisjoly evidence card for Challenger warning 1 */}
            {isChallenger && warnIdx === 0 ? (
              <div className={styles.boisjolyCard}>
                <div className={styles.boisjolyHeader}>
                  <div className={styles.boisjolyMemo}>INTER-COMPANY MEMO</div>
                  <div className={styles.boisjolyName}>Roger M. Boisjoly</div>
                  <div className={styles.boisjolyTitle}>Senior Engineer — Morton Thiokol, Inc.</div>
                  <div className={styles.boisjolyDate}>July 31, 1985</div>
                </div>
                <div className={styles.boisjolyQuote}>
                  "It is my honest and real fear that we will lose a crew before we even attempt to address this problem."
                </div>
              </div>
            ) : (
              <>
                <div className={styles.warnLabel}>{warn.label}</div>
                <div className={styles.warnText}>{warn.text}</div>
              </>
            )}

            <div className={styles.dots} style={{ marginTop: 32 }}>
              {warnings.map((_, i) => (
                <span key={i} className={styles.dot} style={{
                  background: i <= warnIdx ? accent : 'rgba(255,255,255,0.15)',
                  transform: i === warnIdx ? 'scale(1.4)' : 'scale(1)',
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NESBITT CALLOUT (Challenger only) ── */}
      {phase === 'nesbitt' && isChallenger && (
        <div
          className={`${styles.slide} ${styles.nesbittSlide}`}
          onClick={e => { e.stopPropagation(); advance() }}
        >
          <div className={styles.nesbittCard}>
            <div className={styles.nesbittEyebrow}>Mission Control — T+1:15</div>
            <div className={styles.nesbittVideoWrap} onClick={e => e.stopPropagation()}>
              <video {...videoProps} className={styles.nesbittVideo} />
              <button className={styles.nesbittPlayBtn} onClick={toggleVideo} aria-label={videoPlaying ? 'Pause' : 'Play'}>
                {videoPlaying ? '⏸' : '▶'}
              </button>
            </div>
            <blockquote className={styles.nesbittQuote}>"Obviously a major malfunction."</blockquote>
            <div className={styles.nesbittAttrib}>Steve Nesbitt, NASA Public Affairs Officer</div>
            <div className={styles.nesbittCta}>Tap anywhere to enter the transcript &rarr;</div>
          </div>
        </div>
      )}

      {/* ── TRANSMISSION ── */}
      {phase === 'transmission' && (
        <div className={`${styles.slide} ${styles.txSlide} ${isChallenger ? styles.txSlideVideo : styles.txSlideSilence}`}>
          <div className={styles.txHeader}>
            <span style={{ color: accent }}>FINAL TRANSMISSION</span>
            <span className={styles.txCount}>{txIdx + 1}&thinsp;/&thinsp;{data.transcript.length}</span>
          </div>

          {/* Challenger: broadcast video player */}
          {isChallenger && (
            <div className={styles.videoPlayer} onClick={e => e.stopPropagation()}>
              <video {...videoProps} className={styles.broadcastVideo} />
              <div className={styles.videoControls}>
                <button className={styles.audioPlayBtn} onClick={toggleVideo} aria-label={videoPlaying ? 'Pause' : 'Play'}>
                  {videoPlaying ? '⏸' : '▶'}
                </button>
                <span className={styles.audioTime}>{formatTime(videoTime)}</span>
                <input
                  type="range"
                  className={styles.audioScrubber}
                  min={0} max={videoDuration || 100} step={0.5} value={videoTime}
                  onChange={handleScrub}
                  aria-label="Seek broadcast"
                />
                <span className={styles.audioDuration}>{formatTime(videoDuration)}</span>
              </div>
              <div className={styles.videoMeta}>
                <span className={styles.videoMetaLabel}>NBC/CBS News live broadcast — January 28, 1986</span>
                <div className={styles.audioSync}>
                  <span className={styles.audioSyncLabel}>Transcript sync:</span>
                  <button className={styles.audioSyncBtn} onClick={() => setSyncOffset(o => o - 5)}>−5s</button>
                  <span className={styles.audioSyncValue}>{syncOffset >= 0 ? '+' : ''}{syncOffset}s</span>
                  <button className={styles.audioSyncBtn} onClick={() => setSyncOffset(o => o + 5)}>+5s</button>
                </div>
              </div>
              <div className={styles.audioAttrib}>
                <a href="https://archive.org/details/space-shuttle-challenger-disaster-january-28-1986" target="_blank" rel="noopener noreferrer">
                  Source: Internet Archive, CC Attribution 4.0
                </a>
              </div>
            </div>
          )}

          {/* Columbia: silence note */}
          {!isChallenger && (
            <div className={styles.silenceNote}>
              No broadcast audio captures this moment. Columbia's crew were sixteen minutes from home.
            </div>
          )}

          <div key={`tx-${txIdx}`} className={styles.txEntry}>
            {/* Timestamp + inline share icon */}
            <div className={styles.txTimeRow}>
              <div className={styles.txTime} style={{ color: accent }}>{tx.timestamp}</div>
              <button
                className={`${styles.txShareIcon} ${copied ? styles.txShareIconCopied : ''}`}
                onClick={e => { e.stopPropagation(); handleShare(txIdx) }}
                title={copied ? 'Copied!' : 'Copy link to this moment'}
                aria-label="Share this line"
              >
                <LinkIcon />
              </button>
            </div>
            <div className={styles.txSpeaker}>{tx.speaker}</div>
            <div className={styles.txText}>{tx.text}</div>
            {tx.annotation && (
              <div className={styles.txAnnotation}>{tx.annotation.replace(/^\[|\]$/g, '')}</div>
            )}
          </div>

          <div className={styles.txDots}>
            {data.transcript.map((_, i) => (
              <span key={i} className={styles.tDot} style={{ background: i <= txIdx ? accent : '#1e1e1e' }} />
            ))}
          </div>
        </div>
      )}

      {/* ── MEMORIAL ── */}
      {phase === 'memorial' && (
        <div className={`${styles.slide} ${styles.memSlide}`} onClick={e => e.stopPropagation()}>
          <div className={styles.memContent}>
            <div className={styles.memLabel} style={{ color: accent }}>In Memoriam</div>
            <div className={styles.memNames}>
              {data.crew.map((c, i) => (
                <div key={c.name} className={styles.memName} style={{ animationDelay: `${i * 0.15}s` }}>
                  {c.name}
                </div>
              ))}
            </div>
            <div className={styles.memDate}>{isChallenger ? 'January 28, 1986' : 'February 1, 2003'}</div>
            <div className={styles.memActions}>
              <button className={styles.watchAgain} style={{ borderColor: accent, color: accent }} onClick={restart}>
                Watch again
              </button>
              <button className={styles.memBack} onClick={() => navigate('/')}>&larr; Choose another mission</button>
            </div>
            <div className={styles.attribution}>
              {isChallenger && (
                <p>Broadcast footage: <a href="https://archive.org/details/space-shuttle-challenger-disaster-january-28-1986" target="_blank" rel="noopener noreferrer">Internet Archive</a>, original VHS recording, CC Attribution 4.0.</p>
              )}
              <p>Crew transcripts: NASA official mission records.</p>
              <p>Warning signs: {isChallenger
                ? <a href="https://history.nasa.gov/rogersrep/genindex.htm" target="_blank" rel="noopener noreferrer">Rogers Commission Report</a>
                : <a href="https://www.nasa.gov/columbia/caib/" target="_blank" rel="noopener noreferrer">Columbia Accident Investigation Board Report</a>
              }, {isChallenger ? '1986' : '2003'}.</p>
            </div>
          </div>
        </div>
      )}

      {/* Paused overlay */}
      {paused && phase !== 'memorial' && (
        <div className={styles.pausedOverlay} onClick={e => e.stopPropagation()}>
          <button className={styles.resumeBtn} style={{ borderColor: accent, color: accent }} onClick={() => setPaused(false)}>
            ▶ Resume
          </button>
        </div>
      )}
    </div>
  )
}
