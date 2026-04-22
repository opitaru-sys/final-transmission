import styles from './TimelineAct.module.css'

interface Props {
  data: {
    timeline: string
    warningSigns: string
    designation: string
  }
  mission: string
}

function renderParagraphs(text: string, className: string) {
  return text.split('\n\n').filter(Boolean).map((para, i) => (
    <p key={i} className={className}>{para.trim()}</p>
  ))
}

export default function TimelineAct({ data, mission }: Props) {
  const label = mission === 'challenger' ? 'STS-51-L' : 'STS-107'
  const warningLabel = mission === 'challenger'
    ? 'The engineers who tried to stop it'
    : 'The warnings no one acted on'

  return (
    <section className={styles.section}>
      {/* Timeline */}
      <div className={styles.block}>
        <div className={styles.actHeader}>
          <div className={styles.actNumber}>Act II</div>
          <h2 className={styles.actTitle}>The Mission</h2>
          <div className={styles.designation}>{label}</div>
        </div>

        <div className={styles.narrative}>
          {renderParagraphs(data.timeline, styles.para)}
        </div>
      </div>

      {/* Warning Signs — tonal shift */}
      <div className={styles.warningBlock}>
        <div className={styles.warningHeader}>
          <div className={styles.warningEyebrow}>Warning Signs</div>
          <h3 className={styles.warningTitle}>{warningLabel}</h3>
        </div>
        <div className={styles.warningNarrative}>
          {renderParagraphs(data.warningSigns, styles.warningPara)}
        </div>
      </div>
    </section>
  )
}
