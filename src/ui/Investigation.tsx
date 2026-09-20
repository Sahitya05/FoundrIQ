import { useEffect, useMemo, useState } from 'react'
import { investigationScript } from '../data/report'
import { useVenture } from '../store/venture'

const fiveAngles = [
  { id: 'market', label: 'Market', dimension: 'Catchment, density, and category dynamics' },
  { id: 'customer', label: 'Customer', dimension: 'Buyer profile, urgency, and willingness to pay' },
  { id: 'competition', label: 'Competition', dimension: 'Incumbents, alternatives, and switching friction' },
  { id: 'finance', label: 'Finance', dimension: 'Unit economics, margins, and contribution model' },
  { id: 'operations', label: 'Operations', dimension: 'Throughput ceiling, team capacity, and failure modes' },
]

export function Investigation() {
  const agents = useVenture((s) => s.agents)
  const setAgent = useVenture((s) => s.setAgent)
  const setPhase = useVenture((s) => s.setPhase)
  const venture = useVenture((s) => s.venture)
  const sequence = useMemo(() => investigationScript(venture), [venture])
  const [log, setLog] = useState<string[]>(['Beginning 5-dimensional venture stress test…'])

  useEffect(() => {
    const timers: number[] = []
    sequence.forEach((item, index) => {
      timers.push(
        window.setTimeout(() => {
          setAgent(item.id, { status: 'scanning', note: item.scanning })
          setLog((rows) => [`${item.id.toUpperCase()}: ${item.scanning}`, ...rows].slice(0, 6))
        }, 600 + index * 1200),
      )
      timers.push(
        window.setTimeout(() => {
          setAgent(item.id, { status: 'complete', note: item.complete })
          setLog((rows) => [`✓ ${item.id.toUpperCase()}: ${item.complete}`, ...rows].slice(0, 6))
        }, 1400 + index * 1200),
      )
    })
    timers.push(
      window.setTimeout(() => {
        setLog((rows) => ['Synthesis finalized. Generating executive venture report…', ...rows])
      }, 8200),
    )
    timers.push(
      window.setTimeout(() => {
        window.scrollTo(0, 0)
        setPhase('report')
      }, 9200),
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [sequence, setAgent, setPhase])

  const completedCount = agents.filter((a) => a.status === 'complete').length

  return (
    <div className="investigation-view">
      <div className="investigation-card">
        <div className="investigation-header">
          <div className="badge-label">Active Analysis · {completedCount}/5 Angles Completed</div>
          <h1 className="investigation-title">Let’s look at this from five angles.</h1>
          <p className="investigation-subtitle">
            FoundrIQ is examining your venture thesis across market, customer, competition, finance, and operations.
          </p>
        </div>

        {/* Five Angles Checklist */}
        <ul className="angles-list">
          {fiveAngles.map((angle) => {
            const agent = agents.find((a) => a.id === angle.id)
            const isScanning = agent?.status === 'scanning'
            const isComplete = agent?.status === 'complete'

            return (
              <li
                key={angle.id}
                className={`angle-row ${isScanning ? 'scanning' : isComplete ? 'complete' : ''}`}
              >
                <div className="angle-left">
                  <div className="angle-icon-box">
                    {isComplete ? '✓' : isScanning ? '•' : '○'}
                  </div>
                  <div className="angle-info">
                    <h4>{angle.label}</h4>
                    <p>{isScanning || isComplete ? agent?.note : angle.dimension}</p>
                  </div>
                </div>

                <span className="angle-status-badge">
                  {isComplete ? 'Analyzed' : isScanning ? 'Examining…' : 'Queued'}
                </span>
              </li>
            )
          })}
        </ul>

        {/* Live commentary / feed */}
        <div className="investigation-live-feed">
          <div className="live-feed-title">Analytical Ledger</div>
          {log.slice(0, 3).map((line, idx) => (
            <p key={`${idx}-${line}`} className="live-feed-line">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Right Column: 3D Sculpture Area */}
      <div className="investigation-sculpture-space" aria-hidden />
    </div>
  )
}
