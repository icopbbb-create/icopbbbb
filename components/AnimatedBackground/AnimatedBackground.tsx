// components/AnimatedBackground/AnimatedBackground.tsx
'use client'

import React, { useEffect, useRef } from 'react'
import styles from './AnimatedBackground.module.css'

type Variant = 'waves' | 'particles' | 'matrix'

export default function AnimatedBackground({
  variant = 'particles',
  opacity = 0.97,
  zIndex = -1,
}: {
  variant?: Variant
  opacity?: number
  zIndex?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // Waves are SVG-based and need no canvas logic
    if (variant === 'waves') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const canvas2 = canvasRef2.current
    const ctx2 = canvas2?.getContext('2d') ?? null

    let width = 0
    let height = 0
    const DPR = Math.max(1, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

    function resize() {
      width = canvas!.clientWidth
      height = canvas!.clientHeight
      canvas!.width = Math.floor(width * DPR)
      canvas!.height = Math.floor(height * DPR)
      canvas!.style.width = width + 'px'
      canvas!.style.height = height + 'px'
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)

      if (canvas2) {
        canvas2.width = Math.floor(width * DPR)
        canvas2.height = Math.floor(height * DPR)
        canvas2.style.width = width + 'px'
        canvas2.style.height = height + 'px'
        ctx2?.setTransform(DPR, 0, 0, DPR, 0, 0)
      }
    }

    resize()
    window.addEventListener('resize', resize)

    // ------- PARTICLES (EMBERS) -------
    if (variant === 'particles') {
      // Ember palette (warm orange / gold tones)
      const colors = ['#ff8f3c', '#ff6a00', '#ffb45e', '#ffcf9a', '#ff5e00']

      // fewer particles for a warmer, calmer feel
      const PCOUNT = Math.max(20, Math.floor((width * height) / 110000))

      type Particle = {
        angle: number
        radius: number
        speed: number
        size: number
        color: string
        twinkle: number
        sway: number
      }

      const particles: Particle[] = []
      const centerX = () => width / 2
      const centerY = () => height / 2

      for (let i = 0; i < PCOUNT; i++) {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * Math.min(width, height) * (0.2 + Math.random() * 0.5)
        const speed = 0.0005 + Math.random() * 0.0012
        particles.push({
          angle,
          radius,
          speed,
          size: 0.8 + Math.random() * 3.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          twinkle: Math.random() * Math.PI * 2,
          sway: (Math.random() - 0.5) * 0.6,
        })
      }

      function drawParticles(t: number) {
        // clear with a very faint dark wash so embers blend nicely
        ctx.clearRect(0, 0, width, height)
        const g = ctx.createLinearGradient(0, 0, width, height)
        g.addColorStop(0, 'rgba(12,6,10,0.02)')
        g.addColorStop(1, 'rgba(8,10,14,0.02)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, width, height)

        for (const p of particles) {
          // natural orbit + slight vertical drift to mimic rising embers
          p.angle += p.speed * (1 + Math.sin(t * 0.00035 + p.twinkle) * 0.4)
          p.radius += Math.sin(t * 0.00018 + p.twinkle) * 0.01
          const sway = Math.sin(t * 0.0005 + p.twinkle) * p.sway * 6
          const x = centerX() + Math.cos(p.angle) * p.radius + sway
          // embers gently rise (scale by 0.7 to bias vertical motion)
          const y = centerY() + Math.sin(p.angle) * p.radius * 0.68 - (t * 0.00002 * (p.size * 0.6))

          // glow layer (radial gradient) for soft, warm bloom
          const glowRadius = Math.max(10, p.size * 6)
          const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius)
          glow.addColorStop(0, p.color)
          glow.addColorStop(0.5, p.color + '88')
          glow.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = glow
          ctx.fillRect(x - glowRadius, y - glowRadius, glowRadius * 2, glowRadius * 2)

          // core ember
          ctx.beginPath()
          ctx.fillStyle = p.color
          ctx.arc(x, y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }

        // soft starfield / dust on secondary canvas for depth
        if (ctx2) {
          ctx2.clearRect(0, 0, width, height)
          // draw a handful of soft dust specks each frame (keeps it subtle)
          for (let i = 0; i < 18; i++) {
            const sx = Math.random() * width
            const sy = Math.random() * height
            const r = Math.random() * 1.2
            const a = 0.02 + Math.random() * 0.06
            ctx2.beginPath()
            ctx2.fillStyle = `rgba(255, ${200 + Math.floor(Math.random() * 55)}, ${120 + Math.floor(Math.random() * 40)}, ${a})`
            ctx2.arc(sx, sy, r, 0, Math.PI * 2)
            ctx2.fill()
          }
        }
      }

      function loop(t: number) {
        drawParticles(t)
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } // end particles

    // ------- MATRIX (subtle) -------
    if (variant === 'matrix') {
      const cols = Math.max(20, Math.floor(width / 18))
      const fontSize = 14
      const drops = new Array(cols).fill(0).map(() => Math.random() * height)
      const chars = 'アァカサタナハマヤャラワン0123456789ABCDEF#$%&*+-'.split('')

      function drawMatrix() {
        // fade previous frame
        ctx.fillStyle = 'rgba(6,10,14,0.08)'
        ctx.fillRect(0, 0, width, height)

        ctx.font = `${fontSize}px monospace`
        ctx.textBaseline = 'top'
        for (let i = 0; i < drops.length; i++) {
          const x = i * 18
          const y = drops[i]
          const text = chars[Math.floor(Math.random() * chars.length)]
          ctx.shadowColor = 'rgba(255,150,80,0.06)' // warm tint
          ctx.shadowBlur = 6
          ctx.fillStyle = 'rgba(255,200,140,0.08)'
          ctx.fillText(text, x, y)

          drops[i] = y > height && Math.random() > 0.975 ? 0 : y + fontSize * (0.4 + Math.random() * 0.9)
        }
      }

      function loop() {
        drawMatrix()
        rafRef.current = requestAnimationFrame(loop)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [variant])

  return (
    <div
      className={styles.container}
      style={{ opacity, zIndex }}
      aria-hidden
      data-variant={variant}
    >
      {variant === 'waves' && (
        <div className={styles.wavesWrap}>
          <svg className={styles.waves} viewBox="0 0 1440 600" preserveAspectRatio="none" role="img" aria-hidden>
            <defs>
              <linearGradient id="g1" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#ff8f3c" stopOpacity="0.92" />
                <stop offset="52%" stopColor="#ffb45e" stopOpacity="0.82" />
                <stop offset="100%" stopColor="#ffd4a6" stopOpacity="0.62" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="18" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              className={styles.wave}
              d="M0,200 C240,260 360,120 720,180 C1080,240 1200,120 1440,160 L1440,600 L0,600 Z"
              fill="url(#g1)"
              filter="url(#glow)"
              opacity="0.86"
            />

            <path
              className={`${styles.wave} ${styles.wave2}`}
              d="M0,260 C240,320 420,160 720,220 C1020,280 1200,140 1440,180 L1440,600 L0,600 Z"
              fill="url(#g1)"
              filter="url(#glow)"
              opacity="0.62"
            />

            <path
              className={`${styles.wave} ${styles.wave3}`}
              d="M0,320 C260,380 460,200 720,260 C980,320 1180,180 1440,220 L1440,600 L0,600 Z"
              fill="url(#g1)"
              filter="url(#glow)"
              opacity="0.48"
            />
          </svg>
        </div>
      )}

      {/* canvases for particles & subtle stars/dust */}
      <canvas ref={canvasRef} className={styles.canvas} />
      <canvas ref={canvasRef2} className={styles.canvas2} />
    </div>
  )
}
