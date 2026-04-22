import styles from './TranscriptAct.module.css'

interface TranscriptEntry {
  timestamp: string
  speaker: string
  text: string
  annotation: string
}

interface Props {
  data: {
    transcript: TranscriptEntry[]
    transcriptConclusion: string
    aftermath: string
    designation: string
    crew: { name: string }[]
  }
  mission: string
}

// Challenger audio clips from Internet Archive (public domain NASA recordings)
const CHALLENGER_AUDIO: Record<string, string> = {
  'T+0:07': 'https://archive.org/download/challenger-audio/challenger-roll.mp3',
}

function renderParagraphs(text: string, className: string) {
  return text.split('\n\n').filter(Boolean).map((para, i) => (
    <p key={i} className={className}>{para.trim()}</p>
  ))
}

function cleanAnnotation(text: string): string {
  // Remove surrounding brackets if present
  return text.replace(/^\[|\]$/g, '').trim()
}

export default function TranscriptAct({ data, mission }: Props) {
  const isChallenger = mission === 'challenger'
  const transcriptTitle = isChallenger
    ? 'The Last 73 Seconds'
    : 'The Last 16 Minutes'
  const transcriptSubtitle = isChallenger
    ? 'From liftoff to breakup — the crew communications transcript'
    : 'From reentry interface to loss of signal — the Mission Control transcript'

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {/* Act header */}
        <div className={styles.actHeader}>
          <div className={styles.actNumber}>Act III</div>
          <h2 className={styles.actTitle}>Final Words</h2>
        </div>

        {/* Transcript */}
        <div className={styles.transcriptBlock}>
          <div className={styles.transcriptHeader}>
            <h3 className={styles.transcriptTitle}>{transcriptTitle}</h3>
            <p className={styles.transcriptSubtitle}>{transcriptSubtitle}</p>
          </div>

          <div className={styles.transcript} role="list">
            {data.transcript.map((entry, i) => (
              <div key={i} className={styles.entry} role="listitem">
                <div className={styles.entryHeader}>
                  <span className={styles.timestamp}>{entry.timestamp}</span>
                  <span className={styles.speaker}>{entry.speaker}</span>
                  {isChallenger && CHALLENGER_AUDIO[entry.timestamp] && (
                    <audio
                      className={styles.audio}
                      controls
                      preload="none"
                      aria-label={`Audio for ${entry.timestamp}`}
                    >
                      <source src={CHALLENGER_AUDIO[entry.timestamp]} type="audio/mpeg" />
                    </audio>
                  )}
                </div>
                <div className={styles.text}>{entry.text}</div>
                <div className={styles.annotation}>{cleanAnnotation(entry.annotation)}</div>
              </div>
            ))}
          </div>

          {/* Transcript conclusion */}
          <div className={styles.conclusion}>
            <div className={styles.conclusionEyebrow}>Investigation Findings</div>
            <div className={styles.conclusionText}>
              {renderParagraphs(data.transcriptConclusion, styles.conclusionPara)}
            </div>
          </div>
        </div>

        {/* Aftermath */}
        <div className={styles.aftermath}>
          <div className={styles.aftermathHeader}>
            <div className={styles.aftermathEyebrow}>Aftermath</div>
            <h3 className={styles.aftermathTitle}>What came after</h3>
          </div>
          <div className={styles.aftermathText}>
            {renderParagraphs(data.aftermath, styles.aftermathPara)}
          </div>
        </div>
      </div>
    </section>
  )
}
