import { useEffect, useState, useRef } from 'react'
import { Shield, Zap, Gauge, Sparkles, ArrowUpRight } from 'lucide-react'
import './RoadJourneyExperience.css'

// Continuous S-Curve path in 1000 x 3600 coordinate system
const S_PATH_D = 'M 500,40 C 800,450 820,950 500,1400 C 180,1850 180,2350 500,2800 C 740,3100 680,3350 500,3560'

export default function RoadJourneyExperience() {
  const [speed, setSpeed] = useState(180)
  const [gear, setGear] = useState('7')
  const [gForce, setGForce] = useState('0.45G')

  const wrapperRef = useRef(null)
  const pathRef = useRef(null)
  const carMarkerRef = useRef(null)

  const targetDistRef = useRef(0)
  const currentDistRef = useRef(0)
  const animFrameIdRef = useRef(null)

  useEffect(() => {
    const path = pathRef.current
    const car = carMarkerRef.current
    const wrapper = wrapperRef.current
    if (!path || !car || !wrapper) return

    const totalLength = path.getTotalLength()

    const updateScrollTarget = () => {
      const rect = wrapper.getBoundingClientRect()
      const scrollableHeight = rect.height - window.innerHeight
      if (scrollableHeight <= 0) return

      const progress = Math.min(1, Math.max(0, -rect.top / scrollableHeight))
      targetDistRef.current = progress * totalLength

      // Telemetry updates based on S-curve section
      if (progress < 0.28) {
        setSpeed(Math.min(180, Math.round(145 + progress * 125)))
        setGear('7')
        setGForce('0.45G')
      } else if (progress < 0.58) {
        setSpeed(Math.max(120, Math.round(180 - (progress - 0.28) * 200)))
        setGear('5')
        setGForce('1.32G APEX')
      } else if (progress < 0.85) {
        setSpeed(Math.max(85, Math.round(120 - (progress - 0.58) * 130)))
        setGear('4')
        setGForce('0.85G')
      } else {
        setSpeed(Math.max(0, Math.round(85 - (progress - 0.85) * 560)))
        setGear('P')
        setGForce('0.00G')
      }
    }

    // Animation loop: smooth lerp of car position & tangential steering along S-curve
    let running = true
    const loop = () => {
      if (!running) return

      const diff = targetDistRef.current - currentDistRef.current
      if (Math.abs(diff) > 0.05) {
        currentDistRef.current += diff * 0.14
      }

      const dist = Math.min(totalLength, Math.max(0, currentDistRef.current))
      const pt = path.getPointAtLength(dist)
      const ptNext = path.getPointAtLength(Math.min(totalLength, dist + 4))

      const rect = wrapper.getBoundingClientRect()
      const scaleX = rect.width / 1000
      const scaleY = rect.height / 3600

      const posX = pt.x * scaleX
      const posY = pt.y * scaleY

      // Compute heading angle so car nose points along the S-curve
      const dx = (ptNext.x - pt.x) * scaleX
      const dy = (ptNext.y - pt.y) * scaleY
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90

      car.style.transform = `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%) rotate(${angle}deg)`

      animFrameIdRef.current = requestAnimationFrame(loop)
    }

    animFrameIdRef.current = requestAnimationFrame(loop)
    window.addEventListener('scroll', updateScrollTarget, { passive: true })
    window.addEventListener('resize', updateScrollTarget)
    updateScrollTarget()

    return () => {
      running = false
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current)
      window.removeEventListener('scroll', updateScrollTarget)
      window.removeEventListener('resize', updateScrollTarget)
    }
  }, [])

  return (
    <div className="road-journey-wrapper" ref={wrapperRef}>
      
      {/* --------------------------------------------------------
          CONTINUOUS S-CURVE RACETRACK SVG
          -------------------------------------------------------- */}
      <div className="s-road-svg-container" aria-hidden="true">
        <svg
          className="s-road-svg"
          viewBox="0 0 1000 3600"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="m-curb-left" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#5bb9ff" />
              <stop offset="50%" stopColor="#0044aa" />
              <stop offset="100%" stopColor="#e61c24" />
            </linearGradient>
            <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Road Asphalt Outer Border */}
          <path d={S_PATH_D} className="s-track-border" />

          {/* Road Asphalt Bed */}
          <path d={S_PATH_D} className="s-track-bed" />

          {/* BMW M Tricolor Track Curbs */}
          <path d={S_PATH_D} className="s-track-curb-left" />
          <path d={S_PATH_D} className="s-track-curb-right" />

          {/* Center Lane Dashed Divider Line */}
          <path d={S_PATH_D} className="s-track-centerline" />

          {/* Racing Line */}
          <path d={S_PATH_D} className="s-track-racing-line" />

          {/* Invisible Calculation Path */}
          <path
            ref={pathRef}
            d={S_PATH_D}
            fill="none"
            stroke="transparent"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* --------------------------------------------------------
          THE TOP-VIEW BLUE CAR WITH DUAL LASER HEADLIGHT BEAMS
          -------------------------------------------------------- */}
      <div className="s-curve-car-marker" ref={carMarkerRef} aria-hidden="true">
        {/* Forward Projecting Laser Headlight Cones */}
        <div className="car-headlight-beams">
          <div className="beam-cone-left" />
          <div className="beam-cone-right" />
        </div>

        {/* Top-View Blue BMW M4 Image */}
        <img
          src="/m4_top_view.jpg"
          alt="Top view of BMW M4 Competition in Yas Marina Blue"
          className="top-view-m4-img"
        />

        {/* Rear Red OLED Taillight Glow */}
        <div className="car-taillight-glow" />
      </div>

      {/* --------------------------------------------------------
          STICKY LIVE TELEMETRY HUD BAR
          -------------------------------------------------------- */}
      <div className="road-telemetry-hud">
        <div className="road-hud-capsule">
          <div className="road-hud-mode">
            <span className="road-mode-pulse" />
            <span>M DYNAMIC TRACK MODE // SPORT+</span>
          </div>

          <div className="road-hud-telemetry">
            <div className="road-hud-speed">
              <span>{speed}</span>
              <small>MPH</small>
            </div>

            <div className="road-hud-gforce">
              LAT G: <span>{gForce}</span>
            </div>

            <div className="road-hud-gear">
              GEAR <span>{gear}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------
          STATION 01: PERFORMANCE (ON LEFT OF RIGHT-HAND APEX)
          -------------------------------------------------------- */}
      <section className="s-station-section" id="performance">
        <div className="s-station-container">
          <div className="s-content-left">
            <div className="s-milestone-tag">
              MILESTONE 01 // S-CURVE ENTRY ACCELERATION
            </div>
            <h2 className="s-station-title">
              LAUNCH <span>DYNAMICS.</span>
            </h2>
            <p className="s-station-desc">
              Maximum straight-line momentum. The twin-turbocharged S58 powerplant rockets the M4 through the first high-speed curve with total traction vectoring.
            </p>

            <div className="s-perf-cards-grid">
              <div className="s-perf-card">
                <div className="s-perf-num">503<span>HP</span></div>
                <div className="s-perf-name">TwinPower Turbo</div>
                <div className="s-perf-info">3.0L S58 high-revving inline-6.</div>
              </div>

              <div className="s-perf-card">
                <div className="s-perf-num">3.4<span>SEC</span></div>
                <div className="s-perf-name">0 — 60 MPH</div>
                <div className="s-perf-info">Launch control with rear-biased AWD.</div>
              </div>

              <div className="s-perf-card">
                <div className="s-perf-num">650<span>NM</span></div>
                <div className="s-perf-name">Peak Torque</div>
                <div className="s-perf-info">Broad plateau: 2,750 – 5,500 RPM.</div>
              </div>

              <div className="s-perf-card">
                <div className="s-perf-num">50:50<span></span></div>
                <div className="s-perf-name">Axle Balance</div>
                <div className="s-perf-info">Near-perfect chassis balance.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------
          STATION 02: TECHNOLOGY (ON RIGHT OF LEFT-HAND APEX)
          -------------------------------------------------------- */}
      <section className="s-station-section" id="technology">
        <div className="s-station-container">
          <div className="s-content-right">
            <div className="s-milestone-tag">
              MILESTONE 02 // S-CURVE APEX & CHASSIS G-FORCE
            </div>
            <h2 className="s-station-title">
              APEX <span>MASTERY.</span>
            </h2>
            <p className="s-station-desc">
              Carving through the apex. Cutting-edge carbon fiber architecture and active differential lock transform high-lateral G forces into laser-sharp agility.
            </p>

            <div className="s-tech-stack">
              <div className="s-tech-item">
                <div className="s-tech-icon-box"><Shield size={20} /></div>
                <div>
                  <h3 className="s-tech-item-title">CFRP Carbon Roof Structure</h3>
                  <p className="s-tech-item-text">
                    Carbon Fiber Reinforced Plastic lowers the center of gravity by shedding 18 kg at the highest point of the body.
                  </p>
                </div>
              </div>

              <div className="s-tech-item">
                <div className="s-tech-icon-box"><Zap size={20} /></div>
                <div>
                  <h3 className="s-tech-item-title">Track Cooling Package</h3>
                  <p className="s-tech-item-text">
                    Dual remote radiators and supplementary engine oil coolers sustain maximum boost throughout grueling high-speed laps.
                  </p>
                </div>
              </div>

              <div className="s-tech-item">
                <div className="s-tech-icon-box"><Gauge size={20} /></div>
                <div>
                  <h3 className="s-tech-item-title">Active M Differential Lock</h3>
                  <p className="s-tech-item-text">
                    Multi-plate clutch dynamically modulates 0–100% lock between rear wheels to slingshot out of tight S-curve transitions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------
          STATION 03: SPECIFICATIONS (COUNTER-CURVE PIT BOARD)
          -------------------------------------------------------- */}
      <section className="s-station-section" id="specs">
        <div className="s-station-container">
          <div className="s-content-left">
            <div className="s-milestone-tag">
              MILESTONE 03 // PIT-LANE BLUEPRINT TELEMETRY
            </div>
            <h2 className="s-station-title">
              PRECISION <span>DATA.</span>
            </h2>
            <p className="s-station-desc">
              Factory performance metrics and dimensional telemetry engineered for the track.
            </p>

            <div className="s-specs-board">
              <div className="s-specs-grid">
                <div className="s-spec-cell">
                  <div className="s-spec-tag">Engine Code</div>
                  <div className="s-spec-data">S58 3.0L Twin-Turbo</div>
                </div>

                <div className="s-spec-cell">
                  <div className="s-spec-tag">Displacement</div>
                  <div className="s-spec-data">2,993 cc Inline-6</div>
                </div>

                <div className="s-spec-cell">
                  <div className="s-spec-tag">Transmission</div>
                  <div className="s-spec-data">8-Speed M Steptronic</div>
                </div>

                <div className="s-spec-cell">
                  <div className="s-spec-tag">Top Speed</div>
                  <div className="s-spec-data">180 MPH (290 km/h)</div>
                </div>

                <div className="s-spec-cell">
                  <div className="s-spec-tag">Drivetrain</div>
                  <div className="s-spec-data">M xDrive with 2WD Mode</div>
                </div>

                <div className="s-spec-cell">
                  <div className="s-spec-tag">Braking System</div>
                  <div className="s-spec-data">6-Piston Fixed Calipers</div>
                </div>

                <div className="s-spec-cell">
                  <div className="s-spec-tag">Front Tires</div>
                  <div className="s-spec-data">275/35 ZR19 Forged</div>
                </div>

                <div className="s-spec-cell">
                  <div className="s-spec-tag">Rear Tires</div>
                  <div className="s-spec-data">285/30 ZR20 Forged</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------
          STATION 04: EXPERIENCE (FINISH LINE & LAUNCH PAD)
          -------------------------------------------------------- */}
      <section className="s-station-section" id="experience">
        <div className="s-station-container">
          <div className="s-content-center">
            <div className="s-finish-card">
              <div className="s-milestone-tag" style={{ margin: '0 auto 14px' }}>
                MILESTONE 04 // THE FINISH LINE
              </div>

              <h2 className="s-station-title">
                THE ROAD IS <span>YOURS.</span>
              </h2>

              <p className="s-station-desc">
                From the drawing board to the asphalt. Immerse yourself in the pure driving intent of the BMW M4 concept study.
              </p>

              <div className="finish-actions">
                <a href="#engineering" className="btn-primary">
                  <Sparkles size={14} />
                  Explore 3D Exploded Anatomy
                </a>
                <a href="#home" className="btn-secondary">
                  Re-Drive The S-Curve
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
