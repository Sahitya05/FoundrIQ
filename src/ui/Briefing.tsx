import { useEffect, useMemo, useRef } from 'react'
import type { FormEvent } from 'react'
import { parseEconomics } from '../data/report'
import { useVenture } from '../store/venture'
import type { VentureInput } from '../store/venture'

interface Question {
  key: keyof VentureInput
  kicker: string
  title: string
  hint: string
  placeholder: string
}

const questions: Question[] = [
  {
    key: 'idea',
    kicker: 'Dimension 01 · Core Idea',
    title: 'Tell us about the idea.',
    hint: 'Start with what you know. FoundrIQ will help you explore the rest.',
    placeholder: 'Describe your business idea...',
  },
  {
    key: 'type',
    kicker: 'Dimension 02 · Category',
    title: 'What kind of business is it?',
    hint: 'Food, SaaS, two-sided marketplace, clinic, studio, logistics, or retail.',
    placeholder: 'e.g. Food & beverage / ghost kitchen, B2B SaaS, mobile app…',
  },
  {
    key: 'location',
    kicker: 'Dimension 03 · Market & Catchment',
    title: 'Where does the venture live?',
    hint: 'Markets are physical and specific even when the product is digital.',
    placeholder: 'e.g. Bengaluru, India — Indiranagar & Koramangala corridor…',
  },
  {
    key: 'investment',
    kicker: 'Dimension 04 · Available Capital',
    title: 'How much capital is actually available?',
    hint: 'Not the theoretical round you desire. The capital you can actually spend.',
    placeholder: 'e.g. ₹28 lakh seed for kitchen fit-out, two months payroll…',
  },
  {
    key: 'team',
    kicker: 'Dimension 05 · Team Capacity',
    title: 'Who is in the room?',
    hint: 'Founders, operators, cooks, engineers — the humans executing the work.',
    placeholder: 'e.g. 2 founders (ops + brand), 4 cooks, 1 rider coordinator…',
  },
  {
    key: 'customers',
    kicker: 'Dimension 06 · Customer Segment',
    title: 'Who is the customer, specifically?',
    hint: 'A daily ritual beats a demographic. When and why do they spend?',
    placeholder: 'e.g. Desk-bound professionals aged 24–38 who skip breakfast…',
  },
  {
    key: 'demand',
    kicker: 'Dimension 07 · Target Volume',
    title: 'What demand are you counting on?',
    hint: 'The baseline order count or account volume your financial model requires.',
    placeholder: 'e.g. 100 weekday lunch orders at steady state within 4 months…',
  },
  {
    key: 'pricing',
    kicker: 'Dimension 08 · Unit Economics',
    title: 'Price, and the costs inside the price.',
    hint: 'Ticket price, food cost percentage, delivery fees, or take rates.',
    placeholder: 'e.g. ₹249–₹349 per bowl, 62% target food cost, 18% delivery fee…',
  },
  {
    key: 'competitors',
    kicker: 'Dimension 09 · Competition & Habit',
    title: 'Who already owns the habit today?',
    hint: 'Incumbents, substitutes, and alternatives the buyer uses right now.',
    placeholder: 'e.g. FreshMenu, Homely, local tiffin services, office cafeterias…',
  },
  {
    key: 'capacity',
    kicker: 'Dimension 10 · Operations',
    title: 'What can you actually operate?',
    hint: 'Throughput ceiling, kitchen space, shifts, peak window capacity.',
    placeholder: 'e.g. One 420 sq ft kitchen, 180 meals per peak window, two aggregators…',
  },
]

export function Briefing() {
  const step = useVenture((s) => s.briefingStep)
  const setStep = useVenture((s) => s.setBriefingStep)
  const venture = useVenture((s) => s.venture)
  const patchVenture = useVenture((s) => s.patchVenture)
  const loadSample = useVenture((s) => s.loadSample)
  const setPhase = useVenture((s) => s.setPhase)
  const resetAgents = useVenture((s) => s.resetAgents)
  const setDemandScale = useVenture((s) => s.setDemandScale)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const question = questions[step]
  const value = venture[question.key]
  const progress = ((step + 1) / questions.length) * 100

  useEffect(() => {
    inputRef.current?.focus()
  }, [step])

  const canNext = value.trim().length > 2

  const goNext = () => {
    if (!canNext) return
    if (step >= questions.length - 1) {
      resetAgents()
      setDemandScale(parseEconomics(venture).demand)
      setPhase('investigation')
      return
    }
    setStep(step + 1)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    goNext()
  }

  const counter = useMemo(() => `${String(step + 1).padStart(2, '0')} / ${questions.length}`, [step])

  return (
    <div className="briefing-view">
      {/* Top Subtle Progress Bar */}
      <div className="briefing-top-meter">
        <div className="briefing-top-fill" style={{ width: `${progress}%` }} />
      </div>

      <form className="briefing-sheet" onSubmit={onSubmit}>
        <div className="briefing-step-header">
          <span className="briefing-step-badge">{question.kicker}</span>
          <span className="briefing-step-count">{counter}</span>
        </div>

        <h1 className="briefing-title">{question.title}</h1>
        <p className="briefing-hint">{question.hint}</p>

        <textarea
          ref={inputRef}
          className="briefing-textarea"
          rows={4}
          value={value}
          placeholder={question.placeholder}
          onChange={(e) => patchVenture({ [question.key]: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              goNext()
            }
          }}
        />

        <div className="briefing-actions">
          <button
            type="button"
            className="btn-ghost"
            disabled={step === 0}
            onClick={() => setStep(Math.max(0, step - 1))}
          >
            ← Previous signal
          </button>

          <button type="submit" className="btn-primary" disabled={!canNext}>
            {step === questions.length - 1 ? 'Analyze venture from 5 angles →' : 'Continue →'}
          </button>
        </div>
      </form>

      <div className="briefing-footer-bar">
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '8px 16px', fontSize: '13px' }}
          onClick={() => {
            loadSample()
            setStep(questions.length - 1)
          }}
        >
          Load sample venture (Bengaluru Ghost Kitchen)
        </button>
        <span className="briefing-helper-text">
          Press <strong>Enter</strong> to continue · <strong>Shift + Enter</strong> for a new line
        </span>
      </div>
    </div>
  )
}
