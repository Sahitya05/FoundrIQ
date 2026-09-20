import { useEffect } from 'react'
import { useVenture } from '../store/venture'

export function Boot() {
  const setPhase = useVenture((s) => s.setPhase)

  useEffect(() => {
    const t = window.setTimeout(() => setPhase('landing'), 2400)
    return () => window.clearTimeout(t)
  }, [setPhase])

  return (
    <div className="boot-screen">
      <div className="boot-card">
        <div className="badge-label">FoundrIQ · Venture Intelligence</div>
        <h1 className="boot-brand-title">Preparing the Canvas</h1>
        <p className="boot-subtitle">
          Calibrating the five dimensions of startup validation: market, customer, competition, finance, and operations.
        </p>
        <div className="boot-progress-bar">
          <div className="boot-progress-fill" />
        </div>
        <span className="badge-label neutral" style={{ marginBottom: 0 }}>
          Don’t invest in assumptions. Validate them.
        </span>
      </div>
    </div>
  )
}
