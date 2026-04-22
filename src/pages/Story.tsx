import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './Story.module.css'
import { CREW_IMAGES } from '../data/crewImages'
import challengerJson from '../data/challenger.json'
import columbiaJson from '../data/columbia.json'

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

// ─── Curated bios (distilled from the full portrait text) ────────────────────

const CHALLENGER_BIOS: Record<string, string> = {
  "Francis 'Dick' Scobee":
    'He enlisted in the Air Force at eighteen as an engine mechanic — not a pilot — and put himself through night school until he earned his wings. By 1984, he had already flown Challenger on STS-41-C.',
  'Michael J. Smith':
    'Mike Smith grew up on the North Carolina coast and became a Navy test pilot who flew 28 combat missions over Vietnam. This was his first spaceflight.',
  'Judith Resnik':
    "Judy Resnik scored a perfect 800 on the SAT math section at sixteen. She earned a PhD in electrical engineering, was among the first six women NASA selected in 1978, and had already orbited Earth on Discovery's first flight.",
  'Ellison Onizuka':
    "Born in Hawaii to Japanese immigrant grandparents, Ellison had become the first Asian American in space on STS-51-C in January 1985. This morning, he was four days from his 40th birthday.",
  'Ronald McNair':
    "Ron McNair came from Lake City, South Carolina, where the public library didn't admit Black children. He walked in anyway at nine, refused to leave without the books he came for, and eventually earned a PhD in physics from MIT.",
  'Gregory Jarvis':
    'Greg Jarvis almost missed this flight three times — bumped twice by a senator and then a congressman who wanted the seat. STS-51-L was finally his.',
  'S. Christa McAuliffe':
    'Chosen from more than 11,000 applicants to be the first teacher in space, Christa planned to teach two lessons from orbit. Her students were watching from their school gymnasium.',
}

const COLUMBIA_BIOS: Record<string, string> = {
  'Rick Husband':
    'Rick Husband applied to NASA four times before they said yes — three rejections, four years of waiting. When the call finally came in 1994, he went home and wept.',
  'William McCool':
    'Everyone called him Willie. He graduated second in a class of 1,083 from the Naval Academy and mentioned it approximately never. This was his first spaceflight.',
  'Michael Anderson':
    'Born on Christmas Day 1959, Michael Anderson grew up near Spokane studying physics and dreaming of space. He became one of only three Black payload commanders in shuttle history.',
  'Kalpana Chawla':
    'Kalpana Chawla grew up in Karnal, India, watching small planes cross the sky. She earned a PhD in aerospace engineering in Colorado and became the first Indian-American woman in space.',
  'David Brown':
    'David Brown became a doctor and then decided he also needed to be a pilot. He flew A-6 Intruders from carrier decks before NASA selected him in 1996. This was his first spaceflight.',
  'Laurel Clark':
    'Laurel Clark met her husband Jonathan at Navy dive school in 1989. He said she swam like a race boat. Her last email home from orbit described the view of Earth as impossibly beautiful.',
  'Ilan Ramon':
    "Born in Ramat Gan in 1954, his mother and grandmother were Auschwitz survivors. Israel's first astronaut, Ilan carried aboard a drawing made by a child who died in the Holocaust.",
}

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

// ─── Crew scroll ──────────────────────────────────────────────────────────────

function CrewScroll({
  crew,
  bios,
}: {
  crew: CrewMember[]
  bios: Record<string, string>
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const handleScroll = () => {
      const rect = el.getBoundingClientRect()
      const scrollable = el.offsetHeight - window.innerHeight
      if (scrollable <= 0) return
      const scrolled = -rect.top
      if (scrolled > -window.innerHeight * 0.4) setEntered(true)
      const progress = Math.max(0, Math.min(1, scrolled / scrollable))
      setActiveIdx(Math.min(crew.length - 1, Math.floor(progress * crew.length)))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [crew.length])

  const member = crew[activeIdx]
  const portrait = CREW_IMAGES[member.name]

  return (
    <div
      ref={wrapRef}
      style={{ height: `${crew.length * 90}vh` }}
      className={styles.crewScrollWrap}
    >
      <div className={styles.crewSticky}>
        <div className={`${styles.crewStickyInner} ${entered ? styles.crewEntered : ''}`}>
          <div className={styles.crewPortraitSide}>
            <img
              key={member.name}
              src={portrait}
              alt={member.name}
              className={styles.crewPortrait}
            />
          </div>
          <div className={styles.crewInfoSide}>
            <div key={member.name + '-info'} className={styles.crewInfoInner}>
              <div className={styles.crewCounter}>
                {activeIdx + 1} / {crew.length}
              </div>
              <div className={styles.crewName}>{member.name}</div>
              <div className={styles.crewRole}>{member.role}</div>
              <div className={styles.crewMeta}>
                {member.age} years old &nbsp;&middot;&nbsp; {member.hometown}
              </div>
              <div className={styles.crewBio}>{bios[member.name]}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Transcript line ──────────────────────────────────────────────────────────

function TxLine({
  timestamp,
  speaker,
  text,
  index,
}: TxEntry & { index: number }) {
  const [ref, visible] = useInView(0.25)
  const isContext = speaker === 'System' || speaker.includes(' / ')
  return (
    <div
      ref={ref}
      className={[
        styles.txLine,
        visible ? styles.txLineVisible : '',
        isContext ? styles.txContext : '',
      ].join(' ')}
      style={{ transitionDelay: `${Math.min(index * 30, 180)}ms` }}
    >
      <div className={styles.txTimestamp}>{timestamp}</div>
      {!isContext && <div className={styles.txSpeaker}>{speaker}</div>}
      <div className={styles.txText}>
        {isContext ? text : <>&ldquo;{text}&rdquo;</>}
      </div>
    </div>
  )
}

// ─── Main Story component ─────────────────────────────────────────────────────

export default function Story() {
  const challengerCrew = challengerJson.crew as unknown as CrewMember[]
  const columbiaCrew = columbiaJson.crew as unknown as CrewMember[]
  const challengerTx = challengerJson.transcript as unknown as TxEntry[]
  const columbiaTx = columbiaJson.transcript as unknown as TxEntry[]

  return (
    <div className={styles.page}>

      {/* ══════════════════ CHALLENGER HERO ══════════════════ */}
      <section className={styles.challengerHero}>
        <StarCanvas />
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>STS-51-L &nbsp;&middot;&nbsp; January 28, 1986</div>
          <div className={styles.heroNumber}>73</div>
          <div className={styles.heroUnit}>seconds.</div>
          <div className={styles.heroSub}>
            Everything the crew of Challenger said
            <br />
            before the silence.
          </div>
        </div>
        <div className={styles.scrollArrow}>&#8595;</div>
      </section>

      {/* ══════════════════ CHALLENGER CONTEXT ══════════════════ */}
      <section className={`${styles.section} ${styles.dark}`}>
        <div className={styles.narrow}>
          <Reveal>
            <p className={styles.contextP}>
              At 11:38 AM Eastern, Space Shuttle Challenger lifted off from Pad 39B
              into 28-degree weather. The night before, engineer Roger Boisjoly had
              written a memo to his managers at Morton Thiokol. He begged them not to
              launch. He wrote that the O-ring seals on the solid rocket boosters were
              not certified for cold temperatures, and that if they failed, the crew
              would be lost.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p className={styles.contextP}>
              NASA's managers overruled the engineers. The launch happened anyway.
            </p>
          </Reveal>
          <Reveal delay={400}>
            <div className={styles.memoCard}>
              <div className={styles.memoLabel}>
                INTERNAL MEMO &nbsp;&middot;&nbsp; MORTON THIOKOL &nbsp;&middot;&nbsp; JANUARY 27, 1986
              </div>
              <blockquote className={styles.memoQuote}>
                &ldquo;It is my honest and considered opinion that if we do not take
                immediate action to dedicate a team to solve the problem with the SRB
                O-ring sealing, then we stand in jeopardy of losing a flight along
                with all the people.&rdquo;
              </blockquote>
              <div className={styles.memoCredit}>
                Roger Boisjoly, Thiokol engineer &nbsp;&middot;&nbsp; Written the night before launch
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ CHALLENGER CREW ══════════════════ */}
      <section className={`${styles.section} ${styles.crewIntro}`}>
        <Reveal>
          <h2 className={styles.sectionHeadline}>Seven people flew that morning.</h2>
        </Reveal>
      </section>

      <CrewScroll crew={challengerCrew} bios={CHALLENGER_BIOS} />

      {/* ══════════════════ CHALLENGER TRANSCRIPT ══════════════════ */}
      <section className={styles.txSection}>
        <Reveal>
          <div className={styles.txLabel}>THE LAST 73 SECONDS</div>
          <div className={styles.txSublabel}>
            Cockpit voice recorder &nbsp;&middot;&nbsp; 11:38 AM Eastern
          </div>
        </Reveal>
        {challengerTx.map((entry, i) => (
          <TxLine key={i} {...entry} index={i} />
        ))}
      </section>

      {/* ══════════════════ "UH OH." ══════════════════ */}
      <section className={`${styles.fullScreen} ${styles.uhoh}`}>
        <Reveal className={styles.climaxReveal}>
          <div className={styles.climaxText}>&ldquo;Uh oh.&rdquo;</div>
        </Reveal>
        <Reveal delay={500}>
          <div className={styles.climaxCredit}>
            T+1:13 &nbsp;&mdash;&nbsp; Michael J. Smith &nbsp;&middot;&nbsp; Pilot, STS-51-L
          </div>
        </Reveal>
        <Reveal delay={800}>
          <div className={styles.climaxSub}>
            Last words on the cockpit voice recorder.
            <br />
            The orbiter broke apart eleven seconds later.
          </div>
        </Reveal>
      </section>

      {/* ══════════════════ CHALLENGER AFTERMATH ══════════════════ */}
      <section className={`${styles.section} ${styles.dark}`}>
        <div className={styles.narrow}>
          <Reveal>
            <blockquote className={styles.aftermathQuote}>
              &ldquo;Obviously a major malfunction.&rdquo;
            </blockquote>
          </Reveal>
          <Reveal delay={300}>
            <div className={styles.aftermathCredit}>
              Jack Riley Nesbitt &nbsp;&middot;&nbsp; NASA Public Affairs
              <br />
              11:39:13 AM &nbsp;&middot;&nbsp; 73 seconds after liftoff
            </div>
          </Reveal>
          <Reveal delay={600}>
            <p className={styles.contextP} style={{ marginTop: '3.5rem' }}>
              The crew cabin survived the initial breakup intact. Investigators later
              found that at least three crew members had activated their personal
              egress air packs — evidence they were alive and conscious after the
              vehicle came apart. The cabin struck the Atlantic Ocean at 207 miles per
              hour, two minutes and forty-five seconds after the breakup.
            </p>
          </Reveal>
          <Reveal delay={800}>
            <p className={styles.contextP}>
              The Rogers Commission found that the disaster was not an accident of
              physics. It was an accident of culture: a decision-making process that
              had normalized known risk, and that had no effective mechanism for
              engineers to stop a launch they knew was unsafe.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ CHAPTER DIVIDER ══════════════════ */}
      <div className={styles.chapterDivider}>
        <Reveal>
          <div className={styles.dividerDots}>&#xB7; &nbsp; &#xB7; &nbsp; &#xB7;</div>
        </Reveal>
        <Reveal delay={300}>
          <div className={styles.dividerText}>
            Seventeen years later, the shuttle program had one more mission to lose.
          </div>
        </Reveal>
      </div>

      {/* ══════════════════ COLUMBIA HERO ══════════════════ */}
      <section className={styles.columbiaHero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>STS-107 &nbsp;&middot;&nbsp; February 1, 2003</div>
          <div className={`${styles.heroNumber} ${styles.heroNumberColumbia}`}>16</div>
          <div className={styles.heroUnit}>minutes from home.</div>
          <div className={styles.heroSub}>
            Everything Mission Control heard
            <br />
            before Columbia went silent.
          </div>
        </div>
      </section>

      {/* ══════════════════ COLUMBIA CONTEXT ══════════════════ */}
      <section className={`${styles.section} ${styles.dark}`}>
        <div className={styles.narrow}>
          <Reveal>
            <p className={styles.contextP}>
              During launch on January 16, a 1.7-pound piece of foam insulation had
              broken off the external tank and struck the left wing's leading edge.
              Engineers at NASA requested satellite imagery to assess the damage.
              Management denied the request. They concluded the foam strike was not a
              safety-of-flight issue, citing previous flights where foam had fallen
              without incident. They were wrong about what that meant.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p className={styles.contextP}>
              For sixteen days, Columbia's crew conducted experiments in orbit. They
              had no idea their vehicle was already broken. On the morning of
              February 1, they strapped in and began their descent toward Kennedy
              Space Center.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ COLUMBIA CREW ══════════════════ */}
      <section className={`${styles.section} ${styles.crewIntro}`}>
        <Reveal>
          <h2 className={styles.sectionHeadline}>Seven people were coming home.</h2>
        </Reveal>
      </section>

      <CrewScroll crew={columbiaCrew} bios={COLUMBIA_BIOS} />

      {/* ══════════════════ COLUMBIA TRANSCRIPT ══════════════════ */}
      <section className={styles.txSection}>
        <Reveal>
          <div className={styles.txLabel}>THE LAST SIXTEEN MINUTES</div>
          <div className={styles.txSublabel}>
            Mission Control, Houston &nbsp;&middot;&nbsp; 8:44 – 9:12 AM Eastern
          </div>
        </Reveal>
        {columbiaTx.map((entry, i) => (
          <TxLine key={i} {...entry} index={i} />
        ))}
      </section>

      {/* ══════════════════ "LOCK THE DOORS." ══════════════════ */}
      <section className={`${styles.fullScreen} ${styles.lockDoors}`}>
        <Reveal className={styles.climaxReveal}>
          <div className={styles.climaxText}>&ldquo;Lock the doors.&rdquo;</div>
        </Reveal>
        <Reveal delay={500}>
          <div className={styles.climaxCredit}>
            9:12 AM &nbsp;&mdash;&nbsp; Flight Director LeRoy Cain
          </div>
        </Reveal>
        <Reveal delay={800}>
          <div className={styles.climaxSub}>
            Mission Control's contingency declaration.
            <br />
            The vehicle was gone. The debris field stretched 250 miles.
          </div>
        </Reveal>
      </section>

      {/* ══════════════════ COLUMBIA AFTERMATH ══════════════════ */}
      <section className={`${styles.section} ${styles.dark}`}>
        <div className={styles.narrow}>
          <Reveal>
            <blockquote className={styles.aftermathQuote}>
              &ldquo;Columbia's crew and Columbia itself are gone.&rdquo;
            </blockquote>
          </Reveal>
          <Reveal delay={300}>
            <div className={styles.aftermathCredit}>
              President George W. Bush &nbsp;&middot;&nbsp; February 1, 2003, 2:04 PM
            </div>
          </Reveal>
          <Reveal delay={600}>
            <p className={styles.contextP} style={{ marginTop: '3.5rem' }}>
              More than 25,000 searchers fanned out across a debris field stretching
              into eastern Texas and Louisiana. They recovered more than 84,000 pieces
              of Columbia — roughly 38 percent of the orbiter by weight. All seven
              crew members' remains were found.
            </p>
          </Reveal>
          <Reveal delay={800}>
            <p className={styles.contextP}>
              The Columbia Accident Investigation Board's central finding was
              unambiguous: the physical cause was the foam strike. The institutional
              cause was the same organizational failure that had produced Challenger
              seventeen years earlier. NASA had once again allowed schedule pressure
              to override safety, and had created no effective path for engineers to
              stop a flight they believed was unsafe.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ MEMORIAL ══════════════════ */}
      <section className={styles.memorial}>
        <Reveal>
          <div className={styles.memorialHeadline}>Fourteen names.</div>
        </Reveal>
        <div className={styles.memorialCrews}>
          <div className={styles.memorialMission}>
            <Reveal>
              <div className={styles.memorialDate}>
                Challenger &nbsp;&middot;&nbsp; January 28, 1986
              </div>
            </Reveal>
            {challengerCrew.map((c, i) => (
              <Reveal key={c.name} delay={i * 80}>
                <div className={styles.memorialName}>{c.name}</div>
              </Reveal>
            ))}
          </div>
          <div className={styles.memorialMission}>
            <Reveal>
              <div className={styles.memorialDate}>
                Columbia &nbsp;&middot;&nbsp; February 1, 2003
              </div>
            </Reveal>
            {columbiaCrew.map((c, i) => (
              <Reveal key={c.name} delay={i * 80}>
                <div className={styles.memorialName}>{c.name}</div>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal delay={600}>
          <div className={styles.memorialSource}>
            Drawn from NASA records, the Rogers Commission Report (1986),
            and the Columbia Accident Investigation Board Report (2003).
          </div>
        </Reveal>
      </section>

    </div>
  )
}
