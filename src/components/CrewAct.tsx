import styles from './CrewAct.module.css'

interface CrewMember {
  name: string
  role: string
  age: number
  hometown: string
  portrait: string
  afterFlight: string
}

interface Props {
  data: { crew: CrewMember[]; designation: string }
  mission: string
}

function getInitials(name: string): string {
  const parts = name.replace(/['"]/g, '').split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0][0].toUpperCase()
}

function CrewCard({ member, index }: { member: CrewMember; index: number }) {
  const initials = getInitials(member.name)
  // Subtle hue variation per card
  const hues = [210, 220, 200, 215, 205, 225, 210]
  const hue = hues[index % hues.length]

  return (
    <article className={styles.card}>
      <div className={styles.portraitCircle} style={{ '--hue': hue } as React.CSSProperties}>
        <span className={styles.initials}>{initials}</span>
      </div>
      <div className={styles.cardMeta}>
        <div className={styles.role}>{member.role}</div>
        <h3 className={styles.name}>{member.name}</h3>
        <div className={styles.details}>
          Age {member.age} &middot; {member.hometown}
        </div>
      </div>
      <p className={styles.portrait}>{member.portrait}</p>
      <div className={styles.afterFlight}>
        <span className={styles.afterLabel}>After the flight:</span> {member.afterFlight}
      </div>
    </article>
  )
}

export default function CrewAct({ data }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.actHeader}>
        <div className={styles.actNumber}>Act I</div>
        <h2 className={styles.actTitle}>The Crew</h2>
        <p className={styles.actIntro}>
          Seven people. Each one arrived here by a different road.
          Before anything else happens, you should know who they were.
        </p>
      </div>

      <div className={styles.grid}>
        {data.crew.map((member, i) => (
          <CrewCard key={member.name} member={member} index={i} />
        ))}
      </div>
    </section>
  )
}
