import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'

export default function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 400)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      alpha: Math.random(),
      speed: Math.random() * 0.003 + 0.001,
      dir: Math.random() > 0.5 ? 1 : -1,
    }))

    let animFrame: number
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
      animFrame = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className={styles.landing}>
      <canvas ref={canvasRef} className={styles.stars} />

      <div className={`${styles.content} ${visible ? styles.visible : ''}`}>
        <div className={styles.eyebrow}>NASA Space Shuttle Program</div>
        <h1 className={styles.title}>Final Transmission</h1>
        <p className={styles.subtitle}>
          Two missions. Fourteen lives.
          <br />
          Everything said before the silence.
        </p>

        <div className={styles.missions}>
          <button
            className={`${styles.missionCard} ${styles.challenger}`}
            onClick={() => navigate('/challenger')}
          >
            <div className={styles.cardDate}>January 28, 1986</div>
            <div className={styles.cardName}>Challenger</div>
            <div className={styles.cardSub}>STS-51-L &nbsp;&middot;&nbsp; 7 crew members</div>
            <div className={styles.cardCta}>Watch their story &rarr;</div>
          </button>

          <button
            className={`${styles.missionCard} ${styles.columbia}`}
            onClick={() => navigate('/columbia')}
          >
            <div className={styles.cardDate}>February 1, 2003</div>
            <div className={styles.cardName}>Columbia</div>
            <div className={styles.cardSub}>STS-107 &nbsp;&middot;&nbsp; 7 crew members</div>
            <div className={styles.cardCta}>Watch their story &rarr;</div>
          </button>
        </div>

        <div className={styles.footer}>
          Built from NASA records and the Rogers Commission Report.
        </div>
      </div>
    </div>
  )
}
