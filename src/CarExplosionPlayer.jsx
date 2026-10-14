import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, ArrowDown } from 'lucide-react'
import './CarExplosionPlayer.css'

const TOTAL_FRAMES = 300
const MAX_CACHED_FRAMES = 24
const FRAME_PREFETCH_RADIUS = 4

const stages = [
  {
    id: 'assembled',
    name: '01 / Assembled',
    shortLabel: '01 Assembled',
    frameStart: 1,
    frameEnd: 70,
    targetFrame: 1,
    title: 'Aerodynamic Architecture',
    desc: 'Yas Marina Blue metallic finish over sculpted carbon-fiber bodywork. Low, planted stance with frameless M kidney grilles engineered for maximum high-speed downforce.',
    metric: '0.28 Cd Drag Coefficient',
  },
  {
    id: 'engine',
    name: '02 / Powertrain',
    shortLabel: '02 Powertrain',
    frameStart: 71,
    frameEnd: 150,
    targetFrame: 105,
    title: '3.0L S58 M TwinPower Turbo',
    desc: 'High-revving inline-6 powerplant equipped with dual mono-scroll turbochargers, forged lightweight crankshaft, and track-tested high-capacity cooling.',
    metric: '503 HP · 650 Nm Torque · 7,200 RPM',
  },
  {
    id: 'carbon',
    name: '03 / Carbon Core',
    shortLabel: '03 Carbon Core',
    frameStart: 151,
    frameEnd: 230,
    targetFrame: 185,
    title: 'CFRP Structural Architecture',
    desc: 'Carbon-fiber reinforced plastic roof, carbon front suspension strut brace, and lightweight M Carbon bucket seats lower the center of gravity significantly.',
    metric: '-18 kg Roof Mass · High Torsional Rigidity',
  },
  {
    id: 'drivetrain',
    name: '04 / Chassis & M xDrive',
    shortLabel: '04 Chassis',
    frameStart: 231,
    frameEnd: 300,
    targetFrame: 300,
    title: 'Chassis, Suspension & Exhaust',
    desc: 'Rear-biased intelligent M xDrive system with Active M Differential, Adaptive M suspension, 6-piston fixed calipers, and quad performance exhaust.',
    metric: '0-60 in 3.4s · Active M Differential',
  },
]

function getFrameUrl(index) {
  const padded = String(index).padStart(3, '0')
  return `/explosion-frames/ezgif-frame-${padded}.jpg`
}

export default function CarExplosionPlayer() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const imagesRef = useRef(new Map())
  const loadingImagesRef = useRef(new Set())
  const frameLoaderRef = useRef(null)
  const lastRequestedFrameRef = useRef(1)
  const loadedCountRef = useRef(0)
  const targetFrameRef = useRef(1)
  const currentFrameRef = useRef(1)
  const lastDrawnFrameRef = useRef(0)
  const lastDisplayedFrameRef = useRef(1)
  const animFrameIdRef = useRef(null)
  const autoPlayTimerRef = useRef(null)

  const [currentFrameDisplay, setCurrentFrameDisplay] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loadPercent, setLoadPercent] = useState(0)
  const [isBuffering, setIsBuffering] = useState(true)

  // Determine current active stage based on frame
  const currentStage = stages.find(
    (s) => currentFrameDisplay >= s.frameStart && currentFrameDisplay <= s.frameEnd
  ) || stages[0]

  const requestFrameNeighborhood = useCallback((frameIndex) => {
    const center = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(frameIndex)))
    if (Math.abs(center - lastRequestedFrameRef.current) < 3) return

    lastRequestedFrameRef.current = center
    const loadImage = frameLoaderRef.current
    if (!loadImage) return

    const frameIndexes = [center]
    for (let offset = 1; offset <= FRAME_PREFETCH_RADIUS; offset++) {
      frameIndexes.push(center - offset, center + offset)
    }
    frameIndexes
      .filter((index) => index >= 1 && index <= TOTAL_FRAMES)
      .forEach(loadImage)
  }, [])

  // Render a specific frame onto canvas
  const drawFrame = useCallback((frameIndex, force = false) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const roundedIndex = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(frameIndex)))
    if (!force && lastDrawnFrameRef.current === roundedIndex) return
    let img = imagesRef.current.get(roundedIndex)

    // Fallback to nearest loaded image if current not ready
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < 20; offset++) {
        const prev = imagesRef.current.get(roundedIndex - offset)
        if (prev && prev.complete && prev.naturalWidth > 0) {
          img = prev
          break
        }
        const next = imagesRef.current.get(roundedIndex + offset)
        if (next && next.complete && next.naturalWidth > 0) {
          img = next
          break
        }
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) return

    lastDrawnFrameRef.current = roundedIndex
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    const targetW = Math.round(rect.width * dpr)
    const targetH = Math.round(rect.height * dpr)

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW
      canvas.height = targetH
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Calculate aspect fit (contain)
    const imgRatio = img.naturalWidth / img.naturalHeight
    const canvasRatio = canvas.width / canvas.height

    let drawW, drawH, drawX, drawY

    if (canvasRatio > imgRatio) {
      drawH = canvas.height
      drawW = canvas.height * imgRatio
      drawX = (canvas.width - drawW) / 2
      drawY = 0
    } else {
      drawW = canvas.width
      drawH = canvas.width / imgRatio
      drawX = 0
      drawY = (canvas.height - drawH) / 2
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH)
  }, [])

  // Image preloader
  useEffect(() => {
    let cancelled = false
    const loadingImages = loadingImagesRef.current
    loadedCountRef.current = 0

    const loadImage = (index) => {
      return new Promise((resolve) => {
        if (imagesRef.current.has(index) || loadingImages.has(index)) {
          resolve()
          return
        }

        loadingImages.add(index)
        const img = new Image()
        img.src = getFrameUrl(index)
        img.onload = () => {
          loadingImages.delete(index)
          if (!cancelled) {
            imagesRef.current.set(index, img)
            loadedCountRef.current = Math.min(TOTAL_FRAMES, loadedCountRef.current + 1)
            const pct = Math.round((loadedCountRef.current / TOTAL_FRAMES) * 100)
            setLoadPercent(pct)
            if (pct >= 90) setIsBuffering(false)

            while (imagesRef.current.size > MAX_CACHED_FRAMES) {
              let farthestFrame
              let farthestDistance = -1
              for (const cachedFrame of imagesRef.current.keys()) {
                const distance = Math.abs(cachedFrame - targetFrameRef.current)
                if (distance > farthestDistance) {
                  farthestFrame = cachedFrame
                  farthestDistance = distance
                }
              }
              if (farthestFrame === undefined) break
              imagesRef.current.delete(farthestFrame)
            }

            if (index === Math.round(currentFrameRef.current)) {
              drawFrame(currentFrameRef.current, true)
            }
          }
          resolve()
        }
        img.onerror = () => {
          loadingImages.delete(index)
          resolve()
        }
      })
    }

    frameLoaderRef.current = loadImage
    let observer

    const preloadKeyframes = async () => {
      await Promise.all([1, ...Array.from({ length: TOTAL_FRAMES / 10 }, (_, index) => (index + 1) * 10)].map(loadImage))
      if (!cancelled) setIsBuffering(false)
    }

    const section = containerRef.current
    if (!section || !('IntersectionObserver' in window)) {
      preloadKeyframes()
    } else {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return
          observer.disconnect()
          preloadKeyframes()
        },
        { rootMargin: '200px 0px' }
      )
      observer.observe(section)
    }

    return () => {
      cancelled = true
      observer?.disconnect()
      frameLoaderRef.current = null
      loadingImages.clear()
    }
  }, [drawFrame])

  // Continuous animation / lerp loop
  useEffect(() => {
    let running = true
    let previousTime = 0

    const loop = (time) => {
      if (!running) return

      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60
      previousTime = time
      const diff = targetFrameRef.current - currentFrameRef.current
      if (Math.abs(diff) > 0.05) {
        currentFrameRef.current += diff * (1 - Math.exp(-11 * delta))
        const rounded = Math.round(currentFrameRef.current)
        if (rounded !== lastDisplayedFrameRef.current) {
          lastDisplayedFrameRef.current = rounded
          drawFrame(rounded)
          setCurrentFrameDisplay(rounded)
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop)
    }

    animFrameIdRef.current = requestAnimationFrame(loop)

    return () => {
      running = false
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current)
    }
  }, [drawFrame])

  // Scroll listener to update targetFrame based on scroll position
  useEffect(() => {
    const handleResize = () => drawFrame(currentFrameRef.current, true)
    const handleScroll = () => {
      if (isPlaying) return // Ignore scroll during auto-play
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const windowH = window.innerHeight
      const totalScrollable = rect.height - windowH

      if (totalScrollable <= 0) return

      const scrolled = -rect.top
      const progress = Math.min(1, Math.max(0, scrolled / totalScrollable))
      const target = 1 + progress * (TOTAL_FRAMES - 1)
      targetFrameRef.current = target
      requestFrameNeighborhood(target)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [isPlaying, drawFrame, requestFrameNeighborhood])

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current)
      return
    }

    autoPlayTimerRef.current = setInterval(() => {
      let next = targetFrameRef.current + 1
      if (next > TOTAL_FRAMES) next = 1
      targetFrameRef.current = next
      currentFrameRef.current = next
      const lookahead = ((next - 1 + 3) % TOTAL_FRAMES) + 1
      frameLoaderRef.current?.(lookahead)
      drawFrame(next)
      setCurrentFrameDisplay(Math.round(next))
    }, 1000 / 30)

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current)
    }
  }, [isPlaying, drawFrame, requestFrameNeighborhood])

  const handleSliderChange = (e) => {
    setIsPlaying(false)
    const val = Number(e.target.value)
    targetFrameRef.current = val
    currentFrameRef.current = val
    requestFrameNeighborhood(val)
    drawFrame(val)
    setCurrentFrameDisplay(val)
  }

  const jumpToStage = (stage) => {
    setIsPlaying(false)
    targetFrameRef.current = stage.targetFrame
    requestFrameNeighborhood(stage.targetFrame)
  }

  const togglePlay = () => {
    setIsPlaying((prev) => !prev)
  }

  return (
    <section className="explosion-section" id="engineering" ref={containerRef}>
      <div className="explosion-scroll-track">
        <div className="explosion-sticky-viewport">
          
          {/* Canvas Component */}
          <div className="explosion-canvas-container">
            <canvas ref={canvasRef} className="explosion-canvas" />
          </div>

          {/* Top HUD: Editorial Header, Stage Pills, Frame Counter */}
          <div className="explosion-hud-top">
            <div className="explosion-title-group">
              <span className="explosion-eyebrow">
                <span className="explosion-eyebrow-line" />
                EXPLODED ANATOMY STUDY // 02
              </span>
              <h2 className="explosion-main-heading">
                DISSECTED <span>PERFECTION.</span>
              </h2>
            </div>

            {/* Elegant Segmented Stage Pills */}
            <div className="explosion-stage-pills">
              {stages.map((stage) => {
                const isActive = stage.id === currentStage.id
                return (
                  <button
                    key={stage.id}
                    type="button"
                    className={`stage-pill-btn${isActive ? ' is-active' : ''}`}
                    onClick={() => jumpToStage(stage)}
                  >
                    <span className="stage-pill-dot" />
                    {stage.shortLabel}
                  </button>
                )
              })}
            </div>

            {/* Frame Counter Pill */}
            <div className="explosion-frame-counter">
              <span className="counter-current">{String(currentFrameDisplay).padStart(3, '0')}</span>
              <span className="counter-divider">/</span>
              <span className="counter-total">{TOTAL_FRAMES}</span>
            </div>
          </div>

          {/* Middle HUD: Telemetry Card on lower left */}
          <div className="explosion-hud-mid">
            <div className="explosion-callout-card">
              <div className="explosion-callout-stage">{currentStage.name}</div>
              <h3 className="explosion-callout-title">{currentStage.title}</h3>
              <p className="explosion-callout-desc">{currentStage.desc}</p>
              <div className="explosion-callout-metric">{currentStage.metric}</div>
            </div>
          </div>

          {/* Bottom HUD: Sleek Precision Control Capsule */}
          <div className="explosion-hud-bottom">
            <button
              type="button"
              className="explosion-play-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              {isPlaying ? 'Pause' : 'Auto Play'}
            </button>

            <div className="explosion-slider-wrap">
              <input
                type="range"
                className="explosion-slider"
                min="1"
                max={TOTAL_FRAMES}
                value={currentFrameDisplay}
                onChange={handleSliderChange}
                aria-label="Car explosion animation scrub slider"
              />
              <span className="explosion-progress-label">
                {Math.round(((currentFrameDisplay - 1) / (TOTAL_FRAMES - 1)) * 100)}%
              </span>
            </div>

            <div className="explosion-scroll-hint">
              <span>SCROLL TO DISSECT</span>
              <ArrowDown size={11} />
            </div>
          </div>

          {/* Loading Indicator */}
          {isBuffering && loadPercent < 90 && (
            <div className="explosion-loading-hud">
              <div className="explosion-loading-bar">
                <div className="explosion-loading-fill" style={{ width: `${loadPercent}%` }} />
              </div>
              <span>Preloading {loadPercent}%</span>
            </div>
          )}

        </div>
      </div>
    </section>
  )
}
