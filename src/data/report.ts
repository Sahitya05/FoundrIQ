import type { VentureInput } from '../store/venture'

export interface ScoreCard {
  id: string
  label: string
  score: number
  reading: string
}

export interface ReportModel {
  verdict: string
  verdictLine: string
  scores: ScoreCard[]
  risks: { title: string; detail: string }[]
  gaps: string[]
  opportunities: { title: string; detail: string }[]
  validation: { title: string; detail: string }[]
}

export type Category =
  | 'food'
  | 'saas'
  | 'marketplace'
  | 'clinic'
  | 'studio'
  | 'retail'
  | 'education'
  | 'logistics'
  | 'general'

export type Cadence = 'day' | 'week' | 'month'

export interface Economics {
  category: Category
  price: number
  demand: number
  cadence: Cadence
  cogsRate: number
  takeRate: number
  fixedMonthly: number
  investment: number | null
  unitLabel: string
}

export function detectCategory(venture: VentureInput): Category {
  const blob = `${venture.type} ${venture.idea} ${venture.capacity}`.toLowerCase()
  if (/food|kitchen|restaurant|cafe|tiffin|bowl|fnb|f&b|cloud kitchen|ghost|bakery|meal/.test(blob)) {
    return 'food'
  }
  if (/saas|software|app\b|platform|b2b|api|subscription/.test(blob)) return 'saas'
  if (/marketplace|two.?sided|aggregator|gig/.test(blob)) return 'marketplace'
  if (/clinic|hospital|health|dental|pharma|wellness/.test(blob)) return 'clinic'
  if (/studio|agency|design|content|creative/.test(blob)) return 'studio'
  if (/retail|shop|store|d2c|e-?commerce/.test(blob)) return 'retail'
  if (/school|edtech|course|tutor|coaching|academy/.test(blob)) return 'education'
  if (/logistics|delivery|fleet|warehouse|freight/.test(blob)) return 'logistics'
  return 'general'
}

function firstNumber(text: string): number | null {
  const match = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) ? n : null
}

export function parseMoneyInr(text: string): number | null {
  const t = text.replace(/,/g, '').toLowerCase()
  const crore = t.match(/([\d.]+)\s*(cr|crore)\b/)
  if (crore) return Number(crore[1]) * 1e7
  const lakh = t.match(/([\d.]+)\s*(lakh|lac)\b/)
  if (lakh) return Number(lakh[1]) * 1e5
  const thousand = t.match(/([\d.]+)\s*k\b/)
  if (thousand) return Number(thousand[1]) * 1000
  const rupee = t.match(/(?:₹|rs\.?|inr)\s*([\d.]+)/)
  if (rupee) return Number(rupee[1])
  const bare = t.match(/\b(\d{5,})\b/)
  if (bare) return Number(bare[1])
  return null
}

function parsePercent(text: string, keywords: string[]): number | null {
  const lower = text.toLowerCase()
  for (const key of keywords) {
    const idx = lower.indexOf(key)
    if (idx < 0) continue
    const window = text.slice(Math.max(0, idx - 18), idx + key.length + 18)
    const match = window.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*%/)
    if (match) return Number(match[1]) / 100
  }
  return null
}

function parseCadence(text: string, category: Category): Cadence {
  const t = text.toLowerCase()
  if (/per\s*day|daily|weekday|a\s*day|\/day/.test(t)) return 'day'
  if (/per\s*week|weekly|a\s*week/.test(t)) return 'week'
  if (/per\s*month|monthly|mrr|a\s*month/.test(t)) return 'month'
  if (category === 'saas' || category === 'marketplace') return 'month'
  if (category === 'clinic' || category === 'studio' || category === 'education') return 'week'
  return 'day'
}

function defaultPrice(category: Category): number {
  switch (category) {
    case 'food':
      return 299
    case 'saas':
      return 1999
    case 'marketplace':
      return 499
    case 'clinic':
      return 1200
    case 'studio':
      return 25000
    case 'retail':
      return 899
    case 'education':
      return 4999
    case 'logistics':
      return 250
    default:
      return 999
  }
}

function defaultDemand(category: Category, cadence: Cadence): number {
  if (cadence === 'month') return category === 'saas' ? 80 : 200
  if (cadence === 'week') return category === 'clinic' ? 40 : 12
  return category === 'food' ? 100 : 40
}

function parseTeamSize(text: string): number {
  const nums = [...text.matchAll(/(\d+)/g)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 500)
  if (!nums.length) return text.trim() ? 3 : 2
  return Math.min(40, nums.reduce((a, b) => a + b, 0))
}

function hashSalt(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h % 9) - 4
}

export function parseEconomics(venture: VentureInput): Economics {
  const category = detectCategory(venture)
  const cadence = parseCadence(`${venture.demand} ${venture.idea} ${venture.pricing}`, category)
  const demandRaw = firstNumber(venture.demand)
  const demand = Math.max(1, Math.round(demandRaw ?? defaultDemand(category, cadence)))
  const priceRaw = parseMoneyInr(venture.pricing) ?? firstNumber(venture.pricing)
  let price = priceRaw && priceRaw > 0 ? priceRaw : defaultPrice(category)
  if (priceRaw && priceRaw >= 10000 && /lakh|crore|payroll|fit-?out|seed|capital/.test(venture.pricing.toLowerCase())) {
    price = defaultPrice(category)
  }
  if (price > 5e6) price = defaultPrice(category)

  const cogsMention =
    parsePercent(venture.pricing, ['food cost', 'cogs', 'ingredient', 'hosting']) ??
    (category === 'food' ? 0.62 : category === 'saas' ? 0.22 : category === 'retail' ? 0.48 : 0.35)
  const takeMention =
    parsePercent(venture.pricing, ['delivery', 'take-rate', 'take rate', 'commission', 'aggregator', 'platform']) ??
    (category === 'food' ? 0.18 : category === 'marketplace' ? 0.2 : 0.08)

  const people = parseTeamSize(venture.team)
  const rentHint = /rent|lease|sq\s?ft|kitchen|clinic|studio|warehouse/.test(
    `${venture.capacity} ${venture.investment}`.toLowerCase(),
  )
  const wage = category === 'saas' ? 90000 : category === 'food' ? 38000 : 55000
  const rent = rentHint ? (category === 'food' ? 90000 : 60000) : category === 'saas' ? 20000 : 35000
  const other = 25000 + people * 4000
  const fixedMonthly = people * wage + rent + other

  const unitLabel =
    cadence === 'month'
      ? category === 'saas'
        ? 'paying accounts'
        : 'monthly orders'
      : cadence === 'week'
        ? 'weekly jobs'
        : category === 'food'
          ? 'daily covers'
          : 'daily orders'

  return {
    category,
    price: Math.round(price),
    demand,
    cadence,
    cogsRate: Math.min(0.85, Math.max(0.08, cogsMention)),
    takeRate: Math.min(0.4, Math.max(0, takeMention)),
    fixedMonthly,
    investment: parseMoneyInr(venture.investment),
    unitLabel,
  }
}

function volumeToMonth(demandScale: number, cadence: Cadence) {
  if (cadence === 'month') return demandScale
  if (cadence === 'week') return demandScale * 4.3
  return demandScale * 22
}

export function monthlyRevenue(demandScale: number, economics: Economics) {
  return Math.round(volumeToMonth(demandScale, economics.cadence) * economics.price)
}

export function contribution(demandScale: number, economics: Economics) {
  const rev = monthlyRevenue(demandScale, economics)
  const variable = rev * (economics.cogsRate + economics.takeRate)
  return Math.round(rev - variable - economics.fixedMonthly)
}

export function dailyOrders(demandScale: number) {
  return Math.round(demandScale)
}

function clamp(n: number, min = 28, max = 94) {
  return Math.round(Math.min(max, Math.max(min, n)))
}

function specificity(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const named = (text.match(/[A-Z][a-z]{2,}/g) || []).length
  const numbered = /\d/.test(text) ? 10 : 0
  return Math.min(28, words.length * 1.1 + named * 2.4 + numbered)
}

function categoryBase(category: Category) {
  switch (category) {
    case 'food':
      return { market: 62, financial: 54, customer: 70, competition: 52, operations: 58 }
    case 'saas':
      return { market: 68, financial: 66, customer: 64, competition: 58, operations: 72 }
    case 'marketplace':
      return { market: 60, financial: 50, customer: 62, competition: 48, operations: 52 }
    case 'clinic':
      return { market: 64, financial: 58, customer: 72, competition: 60, operations: 56 }
    case 'studio':
      return { market: 58, financial: 60, customer: 66, competition: 62, operations: 64 }
    case 'retail':
      return { market: 61, financial: 55, customer: 63, competition: 50, operations: 60 }
    case 'education':
      return { market: 66, financial: 57, customer: 71, competition: 55, operations: 59 }
    case 'logistics':
      return { market: 63, financial: 52, customer: 60, competition: 54, operations: 50 }
    default:
      return { market: 60, financial: 56, customer: 62, competition: 55, operations: 58 }
  }
}

function avg(scores: ScoreCard[]) {
  return scores.reduce((sum, card) => sum + card.score, 0) / scores.length
}

export function buildReport(venture: VentureInput): ReportModel {
  const economics = parseEconomics(venture)
  const location = venture.location.trim() || 'the stated market'
  const customers = venture.customers.trim() || 'the intended buyer'
  const competitors = venture.competitors.trim() || 'incumbent alternatives'
  const idea = venture.idea.trim() || 'this venture'
  const type = venture.type.trim() || economics.category
  const team = venture.team.trim() || 'a small team'
  const demand = venture.demand.trim() || `${economics.demand} ${economics.unitLabel}`
  const pricing = venture.pricing.trim() || `about ₹${economics.price} a ticket`
  const capacity = venture.capacity.trim() || 'the current operating envelope'
  const investment = venture.investment.trim() || 'the available capital'
  const salt = hashSalt(`${idea}|${location}|${demand}|${pricing}`)
  const base = categoryBase(economics.category)

  const market = clamp(base.market + specificity(location) * 0.45 + specificity(type) * 0.2 + salt)
  const financial = clamp(
    base.financial +
      (economics.investment ? 8 : -6) +
      (/\d/.test(venture.pricing) ? 10 : -8) +
      (/\d/.test(venture.demand) ? 8 : -6) +
      (economics.cogsRate > 0.7 ? -10 : 0) +
      salt,
  )
  const customer = clamp(base.customer + specificity(customers) * 0.7 + (customers.split(' ').length > 6 ? 6 : 0) + salt)
  const competition = clamp(
    base.competition +
      specificity(competitors) * 0.55 +
      ((competitors.match(/,/g) || []).length > 0 ? 6 : 0) +
      salt,
  )
  const operations = clamp(base.operations + specificity(capacity) * 0.5 + (/\d/.test(venture.capacity) ? 8 : -4) + salt)

  const scores: ScoreCard[] = [
    {
      id: 'market',
      label: 'Market',
      score: market,
      reading: `${location} is the catchment for a ${type} play. Density and access look ${
        market >= 70 ? 'usable' : market >= 55 ? 'mixed' : 'thin'
      }; the category still has to earn a reason to exist there.`,
    },
    {
      id: 'financial',
      label: 'Financial',
      score: financial,
      reading: `Ticket around ₹${economics.price.toLocaleString('en-IN')}, ${Math.round(
        economics.cogsRate * 100,
      )}% direct cost and ${Math.round(economics.takeRate * 100)}% take/commission. At ${
        economics.demand
      } ${economics.unitLabel}, the model is ${financial >= 68 ? 'coherent' : financial >= 52 ? 'thin' : 'stressed'}.`,
    },
    {
      id: 'customer',
      label: 'Customer',
      score: customer,
      reading: `${customers} ${
        customer >= 72
          ? 'is a sharp, observable segment. That is the strongest part of the thesis.'
          : customer >= 55
            ? 'is named, but the buying ritual is still partly assumed.'
            : 'is still too broad. A ritual beats a demographic.'
      }`,
    },
    {
      id: 'competition',
      label: 'Competition',
      score: competition,
      reading: `${competitors} already own habit. Differentiation has to come from ${
        economics.category === 'food'
          ? 'speed, reliability, and a tighter plate — not another SKU.'
          : economics.category === 'saas'
            ? 'a painful workflow you actually replace, not a feature list.'
            : 'a job the incumbents leave unfinished, not a nicer story.'
      }`,
    },
    {
      id: 'operations',
      label: 'Operations',
      score: operations,
      reading: `${capacity} ${
        operations >= 70
          ? 'can hold if scope stays tight.'
          : operations >= 55
            ? 'is tight once peak load, quality, and delivery hit together.'
            : 'does not yet prove you can deliver the promise at the volume you wrote down.'
      }`,
    },
  ]

  const mean = avg(scores)
  const profitAtPlan = contribution(economics.demand, economics)
  let verdict = 'Hold — thin thesis'
  let verdictLine = `${idea} is still mostly a story. The numbers and the operating plan do not yet support a build-out.`
  if (mean >= 78 && profitAtPlan >= 0) {
    verdict = 'Proceed — with proof'
    verdictLine = `${idea} hangs together, but treat the next 45 days as evidence collection, not a rollout. ${investment} should follow a measured win, not precede it.`
  } else if (mean >= 62) {
    verdict = 'Conditional go'
    verdictLine = `${idea} is coherent, but the current plan only works if ${demand} and ${capacity} both hold. Treat the next 45 days as a proof, not a build-out.`
  } else if (mean < 48 || profitAtPlan < -economics.fixedMonthly * 0.35) {
    verdict = 'Do not scale yet'
    verdictLine = `${idea} should stay on paper until demand is counted and unit economics stop depending on hope. ${investment} is too expensive as a first experiment.`
  }

  const risks = [
    {
      title: 'Demand is an assumption, not a signal',
      detail: `“${demand}” is a hope until it is counted at a real point of purchase in ${location.split(/[—,-]/)[0].trim()}.`,
    },
    {
      title: 'Unit economics can erase the model',
      detail: `${pricing}. A few points of cost, discounting, or take-rate swing wipes contribution at ${economics.demand} ${economics.unitLabel}.`,
    },
    {
      title: 'Incumbents already own the habit',
      detail: `${competitors} do not need to be better forever — they only need the customer not to switch this week.`,
    },
    {
      title: 'Founder bandwidth',
      detail: `${team} cannot simultaneously run delivery quality, acquisition, and the next experiment. Scope will leak first.`,
    },
  ]

  const gaps = [
    `No measured conversion from a landing page, waitlist, stall, or sales call for ${customers}.`,
    `Cost stack is not locked against ${pricing}; COGS is still a claim.`,
    `No mystery-shop or teardown of ${competitors.split(',')[0]?.trim() || 'the closest alternative'}.`,
    `Capacity plan (${capacity}) does not include a down day, a spike day, or a quality failure.`,
  ]

  const opportunities = [
    {
      title: 'Win a corridor, not a category',
      detail: `Sell a standing order or design partner inside ${location} before you chase the whole market. Predictable demand is worth more than reach.`,
    },
    {
      title: 'Narrow the offer until it is a ritual',
      detail: `${idea.slice(0, 120)}${idea.length > 120 ? '…' : ''} becomes stronger when it does one job for ${customers} every cycle.`,
    },
    {
      title: 'Escape rented distribution',
      detail:
        economics.category === 'food'
          ? 'A direct weekday club (WhatsApp / UPI) after the first 200 fans cuts aggregator gravity.'
          : 'Own a list, a workflow, or a contract. Channels you rent can vanish in a ranking change.',
    },
  ]

  const validation = [
    {
      title: 'Prove hunger in one corridor',
      detail: `Run a 10-day test near ${location.split(/[—,-]/)[0].trim()} and count paid ${economics.unitLabel}, not interest.`,
    },
    {
      title: 'Price the real unit',
      detail: `Deliver a small batch at ${pricing}, log every rupee, and freeze contribution before more ${investment}.`,
    },
    {
      title: 'Watch the substitute',
      detail: `See how ${customers} actually buy today versus ${competitors}. Time, app, cash, habit — pick the path that already exists.`,
    },
    {
      title: 'Pilot, then commit',
      detail: `Hold back ${investment} until ${Math.round(economics.demand * 0.7)} ${economics.unitLabel} happens twice in one cycle.`,
    },
  ]

  return { verdict, verdictLine, scores, risks, gaps, opportunities, validation }
}

export function synthesisLine(venture: VentureInput) {
  const idea = venture.idea.trim() || 'the venture'
  return `The field has read ${idea.slice(0, 88)}${idea.length > 88 ? '…' : ''} Evidence does not say succeed or fail. It says what must be true.`
}

export function investigationScript(venture: VentureInput) {
  const location = venture.location.trim() || 'the catchment'
  const customers = venture.customers.trim() || 'the buyer'
  const competitors = venture.competitors.trim() || 'incumbents'
  const demand = venture.demand.trim() || 'stated demand'
  const pricing = venture.pricing.trim() || 'stated pricing'
  const capacity = venture.capacity.trim() || 'stated capacity'
  const type = venture.type.trim() || detectCategory(venture)

  return [
    {
      id: 'market' as const,
      scanning: `Mapping ${location} and the ${type} category…`,
      complete: `${location.split(/[—,-]/)[0].trim()} is real. The ${type} category is already noisy.`,
    },
    {
      id: 'customer' as const,
      scanning: `Reading the ritual around ${customers.slice(0, 72)}…`,
      complete: `${customers.split(/[,.]/)[0].trim()} is the named buyer. Habit still has to be proven.`,
    },
    {
      id: 'finance' as const,
      scanning: `Stressing ${pricing.slice(0, 72)} against ${demand.slice(0, 48)}…`,
      complete: `Model is ${/\d/.test(venture.pricing) ? 'readable' : 'under-specified'} at the volume you claimed.`,
    },
    {
      id: 'competition' as const,
      scanning: `Naming who already owns the habit: ${competitors.slice(0, 72)}…`,
      complete: `${competitors.split(',')[0]?.trim() || 'Incumbents'} already own habit. Differentiation must be operational.`,
    },
    {
      id: 'operations' as const,
      scanning: `Throughput and failure modes for ${capacity.slice(0, 72)}…`,
      complete: `${capacity.split(',')[0]?.trim() || 'Operations'} can hold — until scope sprawls.`,
    },
    {
      id: 'risk' as const,
      scanning: `Hunting weak assumptions in ${demand.slice(0, 56)}…`,
      complete: 'Demand is still a story. Prove it in one corridor.',
    },
  ]
}
