import { useVenture } from '../store/venture'

export function Nav() {
  const phase = useVenture((s) => s.phase)
  const setPhase = useVenture((s) => s.setPhase)
  const setBriefingStep = useVenture((s) => s.setBriefingStep)

  if (phase === 'boot') return null

  const handleExplore = () => {
    if (phase !== 'landing') {
      setPhase('landing')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleHowItWorks = () => {
    if (phase !== 'landing') {
      setPhase('landing')
      setTimeout(() => {
        window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' })
      }, 50)
    } else {
      window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' })
    }
  }

  const handleInsights = () => {
    if (phase !== 'landing') {
      setPhase('landing')
      setTimeout(() => {
        window.scrollTo({ top: window.innerHeight * 3, behavior: 'smooth' })
      }, 50)
    } else {
      window.scrollTo({ top: window.innerHeight * 3, behavior: 'smooth' })
    }
  }

  const handleCta = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setBriefingStep(0)
    setPhase('briefing')
  }

  return (
    <nav className="navbar-wrapper" aria-label="Main Navigation">
      <div className="navbar">
        {/* Left: Brand Identity */}
        <button type="button" className="nav-brand" onClick={handleExplore}>
          <span className="nav-brand-dot" />
          <span>FoundrIQ</span>
        </button>

        {/* Middle: Navigation Links */}
        <ul className="nav-links">
          <li>
            <button
              type="button"
              className={`nav-link ${phase === 'landing' ? 'active' : ''}`}
              onClick={handleExplore}
            >
              Explore
            </button>
          </li>
          <li>
            <button type="button" className="nav-link" onClick={handleHowItWorks}>
              How it works
            </button>
          </li>
          <li>
            <button type="button" className="nav-link" onClick={handleInsights}>
              Insights
            </button>
          </li>
        </ul>

        {/* Right: Action CTA */}
        <button type="button" className="nav-cta" onClick={handleCta}>
          {phase === 'report' ? 'New venture →' : 'Start exploring →'}
        </button>
      </div>
    </nav>
  )
}

export function Grain() {
  return <div className="grain" aria-hidden />
}
