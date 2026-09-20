import { useMemo } from 'react'
import {
  buildReport,
  contribution,
  monthlyRevenue,
  parseEconomics,
  synthesisLine,
} from '../data/report'
import { useVenture } from '../store/venture'
import type { AgentId } from '../store/venture'

function money(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export function Report() {
  const venture = useVenture((s) => s.venture)
  const demandScale = useVenture((s) => s.demandScale)
  const setDemandScale = useVenture((s) => s.setDemandScale)
  const setPhase = useVenture((s) => s.setPhase)
  const setBriefingStep = useVenture((s) => s.setBriefingStep)
  const activeDimension = useVenture((s) => s.activeDimension)
  const setActiveDimension = useVenture((s) => s.setActiveDimension)

  const report = useMemo(() => buildReport(venture), [venture])
  const economics = useMemo(() => parseEconomics(venture), [venture])

  const profit = contribution(demandScale, economics)
  const revenue = monthlyRevenue(demandScale, economics)
  const sliderMax = Math.max(160, Math.round(economics.demand * 2.2))
  const sliderMin = Math.max(1, Math.round(economics.demand * 0.15))
  const sliderValue = Math.min(sliderMax, Math.max(sliderMin, demandScale))

  // Calculate actual overall analytical score from the 5 real scores
  const overallScore = useMemo(() => {
    if (!report.scores.length) return 72
    return Math.round(report.scores.reduce((sum, s) => sum + s.score, 0) / report.scores.length)
  }, [report])

  const handleNewVenture = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setBriefingStep(0)
    setPhase('briefing')
  }

  const handleReturnToField = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setPhase('landing')
  }

  // Dimension color mapping
  const getDimensionClass = (id: string) => {
    if (id === 'market') return 'market'
    if (id === 'customer') return 'customer'
    if (id === 'competition') return 'competition'
    if (id === 'financial' || id === 'finance') return 'financial'
    if (id === 'operations') return 'operations'
    return 'market'
  }

  return (
    <div className="report-view">
      <div className="report-layout">
        {/* Left Column: Editorial Report Content */}
        <div className="report-document">
          {/* Executive Summary Card */}
          <div className="report-hero-card">
            <div className="badge-label">Your Venture Report</div>

            <div className="report-score-banner">
              <div className="overall-score-number">{overallScore}</div>
              <div className="overall-score-meta">
                <span className="overall-score-label">Overall Signal</span>
                <span className="overall-score-sub">
                  Synthesized across five independent analytical agents
                </span>
              </div>
            </div>

            <h1 className="verdict-title">{report.verdict}</h1>
            <p className="verdict-line">{report.verdictLine}</p>

            <div className="venture-meta-strip">
              <span className="meta-pill">
                <strong>Concept:</strong> {venture.idea ? venture.idea.slice(0, 60) + (venture.idea.length > 60 ? '…' : '') : 'Venture'}
              </span>
              <span className="meta-pill">
                <strong>Category:</strong> {venture.type || economics.category}
              </span>
              <span className="meta-pill">
                <strong>Catchment:</strong> {venture.location || 'Local market'}
              </span>
              <span className="meta-pill">
                <strong>Capital:</strong> {venture.investment ? venture.investment.split(/[—,]/)[0].trim() : 'Seed stage'}
              </span>
            </div>
          </div>

          {/* 5 Dimensional Readings */}
          <div className="dimension-cards-grid">
            {report.scores.map((card) => {
              const dimClass = getDimensionClass(card.id)
              const mappedAgentId = (card.id === 'financial' ? 'finance' : card.id) as AgentId
              const isSelected = activeDimension === mappedAgentId

              return (
                <article
                  key={card.id}
                  className="dimension-card"
                  style={{
                    borderColor: isSelected ? 'var(--terracotta)' : undefined,
                    boxShadow: isSelected ? 'var(--shadow-lift)' : undefined,
                  }}
                  onClick={() =>
                    setActiveDimension(isSelected ? null : mappedAgentId)
                  }
                >
                  <div className="dim-card-top">
                    <div className="dim-card-identity">
                      <span className={`dim-card-dot ${dimClass}`} />
                      <h3 className="dim-card-title">{card.label.toUpperCase()}</h3>
                    </div>
                    <div className="dim-card-score">{card.score}</div>
                  </div>

                  {/* Clean Horizontal Indicator */}
                  <div className="dim-card-meter">
                    <div
                      className={`dim-card-meter-fill ${dimClass}`}
                      style={{ width: `${card.score}%` }}
                    />
                  </div>

                  <p className="dim-card-reading">{card.reading}</p>
                </article>
              )
            })}
          </div>

          {/* Risk Intelligence & Cracks in the Story */}
          <div className="report-section-card">
            <div className="badge-label neutral">02 · Risk Intelligence</div>
            <h3>The cracks in the story</h3>
            <div className="risk-items">
              {report.risks.map((risk) => (
                <div key={risk.title} className="risk-item">
                  <h4>{risk.title}</h4>
                  <p>{risk.detail}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px' }}>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                Missing Proofs & Information Gaps:
              </strong>
              <ul className="gaps-list">
                {report.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Strategic Opportunities */}
          <div className="report-section-card">
            <div className="badge-label neutral">03 · Strategic Levers</div>
            <h3>Where the idea can become a business</h3>
            <div className="risk-items">
              {report.opportunities.map((item) => (
                <div key={item.title} className="risk-item" style={{ borderLeftColor: 'var(--sage)' }}>
                  <h4>{item.title}</h4>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scenario Simulator */}
          <div className="report-section-card">
            <div className="badge-label neutral">04 · Scenario Simulator</div>
            <h3>What if volume is not {economics.demand} {economics.unitLabel}?</h3>
            <p className="chapter-desc" style={{ fontSize: '15px', marginBottom: '16px' }}>
              Drag expected volume. Revenue and contribution adjust based on your specific ticket size, costs, and operating overhead.
            </p>

            <div className="simulator-box">
              <div className="sim-slider-container">
                <div className="sim-slider-header">
                  <span>Operating Volume ({economics.unitLabel})</span>
                  <strong>{sliderValue} / period</strong>
                </div>
                <input
                  type="range"
                  className="sim-slider"
                  min={sliderMin}
                  max={sliderMax}
                  value={sliderValue}
                  onChange={(e) => setDemandScale(Number(e.target.value))}
                />
              </div>

              <div className="sim-stats-grid">
                <div className="sim-stat-box">
                  <span className="sim-stat-label">Monthly Revenue</span>
                  <div className="sim-stat-value">{money(revenue)}</div>
                </div>
                <div className="sim-stat-box">
                  <span className="sim-stat-label">Net Contribution</span>
                  <div className={`sim-stat-value ${profit < 0 ? 'negative' : 'positive'}`}>
                    {money(profit)}
                  </div>
                </div>
                <div className="sim-stat-box">
                  <span className="sim-stat-label">Model Health</span>
                  <div className="sim-stat-value">
                    {profit < 0 ? 'Burns cash' : profit < 80000 ? 'Fragile' : 'Viable'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Plan */}
          <div className="report-section-card">
            <div className="badge-label neutral">05 · Validation Plan</div>
            <h3>A validation plan, not a pep talk</h3>
            <ol className="validation-steps">
              {report.validation.map((item, index) => (
                <li key={item.title} className="validation-step">
                  <div className="step-badge">{String(index + 1).padStart(2, '0')}</div>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Final Synthesis & Action */}
          <div className="report-section-card" style={{ textAlign: 'center', padding: '48px 40px' }}>
            <div className="badge-label">Analytical Synthesis</div>
            <h3 style={{ fontSize: '24px', maxWidth: '640px', margin: '0 auto 16px' }}>
              {synthesisLine(venture)}
            </h3>
            <p className="chapter-desc" style={{ maxWidth: '580px', margin: '0 auto 32px' }}>
              Evidence does not say pass or fail. It reveals what must be proven true before you commit capital.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={handleNewVenture}>
                Analyze another venture →
              </button>
              <button type="button" className="btn-secondary" onClick={handleReturnToField}>
                Return to the beginning
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Synchronized 3D Sculpture Companion */}
        <div className="report-sculpture-column">
          <div className="sculpture-companion-card">
            <div className="sculpture-companion-header">
              <span className="sculpture-companion-title">3D Sculpture State</span>
              <span className="badge-label neutral" style={{ marginBottom: 0 }}>
                Reactive Model
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.45 }}>
              The sculpture forms respond to your real dimension scores. Click a dimension below or interact directly with the 3D sculpture.
            </p>

            <div className="sculpture-guide-pills">
              {report.scores.map((card) => {
                const mappedAgentId = (card.id === 'financial' ? 'finance' : card.id) as AgentId
                const isActive = activeDimension === mappedAgentId

                return (
                  <button
                    type="button"
                    key={card.id}
                    className={`sculpture-guide-pill ${isActive ? 'active' : ''}`}
                    onClick={() =>
                      setActiveDimension(isActive ? null : mappedAgentId)
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`dim-card-dot ${getDimensionClass(card.id)}`} />
                      <span>{card.label}</span>
                    </div>
                    <strong>{card.score}/100</strong>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
