import { useVenture } from '../store/venture'

const chapters = [
  {
    num: '01',
    dimension: 'synthesis',
    kicker: '01 — The Interconnected System',
    title: 'An idea is never just an idea.',
    desc: 'A business is not a standalone inspiration. It is a physical balance of five structural forces surrounding your central thesis. When one cracks, the whole structure feels the weight.',
    highlight: 'Central Idea & Five Dimensions',
    detail: 'Surrounding the core thesis with rigorous analytical angles',
  },
  {
    num: '02',
    dimension: 'market',
    kicker: '02 — Market Catchment',
    title: 'Understand the space.',
    desc: 'Where does the venture live? Geography, physical density, catchment corridors, and category noise dictate whether your business earns a right to exist.',
    highlight: 'Terracotta Layered Form',
    detail: 'Layered terraces testing market depth and category density',
  },
  {
    num: '03',
    dimension: 'customer',
    kicker: '03 — Customer Ritual',
    title: 'Understand the people.',
    desc: 'Who is the buyer, specifically? A real purchasing ritual beats a vague demographic persona. We examine whether urgency and true willingness to pay exist.',
    highlight: 'Sage Curved Form',
    detail: 'Sweeping ceramic arc tracing customer habits and friction',
  },
  {
    num: '04',
    dimension: 'competition',
    kicker: '04 — Incumbent Habit',
    title: 'Understand the alternatives.',
    desc: 'Who already owns the habit today? Competitors don’t need to be superior forever — they only need the customer not to switch to you this week.',
    highlight: 'Soft Pink Faceted Form',
    detail: 'Angular sculpted prism analyzing substitute defensibility',
  },
  {
    num: '05',
    dimension: 'finance',
    kicker: '05 — Unit Economics',
    title: 'Put the numbers under pressure.',
    desc: 'Ticket price, food cost, take rates, monthly burn, and break-even scale. The scenario simulator stress-tests what happens when actual volume falls short.',
    highlight: 'Butter Yellow Stacked Form',
    detail: 'Balanced token stack testing margin resilience and cash flow',
  },
  {
    num: '06',
    dimension: 'operations',
    kicker: '06 — Operational Capacity',
    title: 'Test whether it can actually work.',
    desc: 'Peak throughput, kitchen square footage, rider coordinator bandwidth, and supply bottlenecks. Can your actual team deliver the promise you wrote down?',
    highlight: 'Warm Brown Flowing Form',
    detail: 'Continuous ceramic loop testing throughput and failure modes',
  },
]

export function Landing() {
  const setPhase = useVenture((s) => s.setPhase)
  const setBriefingStep = useVenture((s) => s.setBriefingStep)

  const handleStartBriefing = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setBriefingStep(0)
    setPhase('briefing')
  }

  const handleHowItWorks = () => {
    window.scrollTo({ top: window.innerHeight * 0.95, behavior: 'smooth' })
  }

  return (
    <div className="landing-view">
      {/* Hero Section: Two-Column Editorial Composition */}
      <section className="hero-editorial">
        <div className="hero-content">
          <div className="badge-label">FoundrIQ / AI Venture Analysis</div>
          <h1 className="hero-heading">
            Your idea has
            <br />
            <em>somewhere to go.</em>
          </h1>
          <p className="hero-lede">
            Explore your market, customers, competition, finances and operations before you take the next step.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleStartBriefing}
            >
              Explore my idea →
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleHowItWorks}
            >
              How it works
            </button>
          </div>

          <div className="hero-dimension-strip">
            <div className="dimension-tag market">
              <span className="dot" />
              <span>Market</span>
            </div>
            <div className="dimension-tag customer">
              <span className="dot" />
              <span>Customer</span>
            </div>
            <div className="dimension-tag competition">
              <span className="dot" />
              <span>Competition</span>
            </div>
            <div className="dimension-tag finance">
              <span className="dot" />
              <span>Finance</span>
            </div>
            <div className="dimension-tag operations">
              <span className="dot" />
              <span>Operations</span>
            </div>
          </div>
        </div>

        {/* The right column is left deliberately spacious so the 3D sculpture breathes freely */}
        <div className="hero-sculpture-space" aria-hidden />
      </section>

      {/* Chapters: Scroll-Based Progression Across the 5 Dimensions */}
      {chapters.map((chapter) => (
        <section className="landing-chapter" key={chapter.num}>
          <div className="chapter-number">{chapter.kicker}</div>
          <h2 className="chapter-title">{chapter.title}</h2>
          <p className="chapter-desc">{chapter.desc}</p>
          <div className="chapter-pill-box">
            <strong>{chapter.highlight}</strong>
            <span>—</span>
            <span>{chapter.detail}</span>
          </div>
        </section>
      ))}

      {/* Final Chapter & CTA */}
      <section className="landing-final-cta">
        <div className="chapter-number">07 — Synthesis</div>
        <h2 className="chapter-title">Now you can see the whole picture.</h2>
        <p className="chapter-desc">
          Bring what you know: location, capital, team, demand, price, rivals, and capacity. FoundrIQ will not flatter your pitch. It will give you a clear, objective reading.
        </p>
        <div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleStartBriefing}
          >
            Explore my idea →
          </button>
        </div>
      </section>
    </div>
  )
}
