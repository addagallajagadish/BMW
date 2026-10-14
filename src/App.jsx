import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, Menu, X } from 'lucide-react'
import './App.css'
import { HERO_VIDEO_SRC } from './media.js'
import CarExplosionPlayer from './CarExplosionPlayer.jsx'
import RoadJourneyExperience from './RoadJourneyExperience.jsx'

const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'engineering', label: '3D Anatomy' },
  { id: 'performance', label: 'Performance' },
  { id: 'technology', label: 'Technology' },
  { id: 'specs', label: 'Specifications' },
  { id: 'experience', label: 'Experience' },
]

function Navbar({ activeSection }) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  return (
    <header className="site-header">
      <a className="brand" href="#home" aria-label="Skyline 4 concept home">
        <span className="brand-mark" aria-hidden="true">S4</span>
        <span className="brand-name">SKYLINE <span>PERFORMANCE STUDY</span></span>
      </a>
      <button
        className="menu-toggle"
        type="button"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>
      <nav
        className={`primary-navigation${menuOpen ? ' is-open' : ''}`}
        id="primary-navigation"
        aria-label="Chapter navigation"
      >
        {navItems.map((item, index) => (
          <a
            key={item.id}
            className={activeSection === item.id ? 'is-active' : ''}
            href={`#${item.id}`}
            aria-current={activeSection === item.id ? 'location' : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-number">{String(index).padStart(2, '0')}</span>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  )
}

function HeroVideo() {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true
    video.playsInline = true

    let waitingForGesture = false
    const retryAfterGesture = () => {
      waitingForGesture = false
      if (video.paused) {
        video.play().catch(() => {})
      }
    }

    const tryPlay = () => {
      if (!video || !video.paused) return
      const playPromise = video.play()
      if (playPromise) {
        playPromise.catch(() => {
          if (waitingForGesture) return
          waitingForGesture = true
          window.addEventListener('pointerdown', retryAfterGesture, { once: true })
          window.addEventListener('keydown', retryAfterGesture, { once: true })
        })
      }
    }

    tryPlay()
    video.addEventListener('canplay', tryPlay, { once: true })
    video.addEventListener('loadeddata', tryPlay, { once: true })

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          tryPlay()
        } else {
          if (!video.paused) video.pause()
        }
      },
      { threshold: 0.05 }
    )
    observer.observe(video)

    const onVisible = () => {
      if (document.visibilityState === 'visible') tryPlay()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      observer.disconnect()
      video.removeEventListener('canplay', tryPlay)
      video.removeEventListener('loadeddata', tryPlay)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pointerdown', retryAfterGesture)
      window.removeEventListener('keydown', retryAfterGesture)
    }
  }, [])

  return (
    <video
      ref={videoRef}
      className="hero-video"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      poster="/videos/hero-poster.webp"
      src={HERO_VIDEO_SRC || '/videos/hero_smooth.mp4'}
      aria-hidden="true"
    />
  )
}

function HeroSection() {
  return (
    <section className="story-chapter chapter-hero" id="home" aria-labelledby="home-title">
      <HeroVideo />
      <div className="chapter-content">
        <p className="chapter-eyebrow"><span />SKYLINE / PERFORMANCE COUPE CONCEPT</p>
        <h1 id="home-title">BORN TO<br /><span>OUTPERFORM.</span></h1>
        <p className="chapter-description">A study in precision, presence and pure driving intent. Meet a concept built around the feeling of motion.</p>
        <p className="chapter-detail">Independent design concept · Not affiliated with BMW AG</p>
        <a className="chapter-link" href="#engineering">
          Explore Anatomy
          <ArrowRight size={16} />
        </a>
      </div>
      <a className="hero-scroll-cue" href="#engineering">
        <span>SCROLL TO EXPLORE</span>
        <ArrowDown size={15} />
      </a>
      <span className="chapter-index" aria-hidden="true">
        01 <i>/ 06</i>
      </span>
    </section>
  )
}

export default function App() {
  const progressBar = useRef(null)
  const [activeSection, setActiveSection] = useState('home')
  const sectionIds = useMemo(() => navItems.map(({ id }) => `#${id}`), [])

  useEffect(() => {
    const handleScrollProgress = () => {
      const scrollTotal = document.documentElement.scrollHeight - window.innerHeight
      if (scrollTotal > 0 && progressBar.current) {
        const progress = Math.min(1, Math.max(0, window.scrollY / scrollTotal))
        progressBar.current.style.transform = `scaleX(${progress})`
      }
    }

    window.addEventListener('scroll', handleScrollProgress, { passive: true })
    handleScrollProgress()
    return () => window.removeEventListener('scroll', handleScrollProgress)
  }, [])

  useEffect(() => {
    const sections = sectionIds
      .map((selector) => document.querySelector(selector))
      .filter(Boolean)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveSection(visible.target.id)
      },
      { threshold: [0.15, 0.45, 0.7] }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [sectionIds])

  return (
    <main className="site-shell">
      {/* Scroll Progress Bar */}
      <div className="scroll-progress" aria-hidden="true">
        <div className="scroll-progress-fill" ref={progressBar} />
      </div>

      {/* Global Navbar */}
      <Navbar activeSection={activeSection} />

      {/* 01: Hero Section (Undisturbed) */}
      <HeroSection />

      {/* 02: 3D Exploded Anatomy Experience (300 Frames Scrubbing) */}
      <CarExplosionPlayer />

      {/* 03 — 06: The M Road Journey Experience (Performance, Technology, Specs, Experience with Blue Car on Road) */}
      <RoadJourneyExperience />

      {/* Site Footer */}
      <footer className="site-footer">
        <a className="brand footer-brand" href="#home" aria-label="Skyline 4 concept home">
          <span className="brand-mark" aria-hidden="true">S4</span>
          <span className="brand-name">SKYLINE <span>INDEPENDENT CONCEPT STUDY</span></span>
        </a>
        <p>Independent concept study. Not affiliated with or endorsed by BMW AG.</p>
        <a href="#home">Back to top ↑</a>
      </footer>
    </main>
  )
}
