import { create } from 'zustand'

export type Phase = 'boot' | 'landing' | 'briefing' | 'investigation' | 'report'

export type AgentId =
  | 'market'
  | 'customer'
  | 'finance'
  | 'competition'
  | 'operations'
  | 'risk'

export interface VentureInput {
  idea: string
  type: string
  location: string
  investment: string
  team: string
  customers: string
  demand: string
  pricing: string
  competitors: string
  capacity: string
}

export interface AgentState {
  id: AgentId
  label: string
  status: 'idle' | 'scanning' | 'complete'
  note: string
}

const emptyVenture: VentureInput = {
  idea: '',
  type: '',
  location: '',
  investment: '',
  team: '',
  customers: '',
  demand: '',
  pricing: '',
  competitors: '',
  capacity: '',
}

export const sampleVenture: VentureInput = {
  idea: 'A ghost kitchen in Bengaluru serving high-protein South Indian meals to office workers, delivered in under 25 minutes.',
  type: 'Food & beverage / ghost kitchen',
  location: 'Bengaluru, India — Indiranagar & Koramangala corridor',
  investment: '₹28 lakh seed for kitchen fit-out, two months of payroll, and launch marketing',
  team: '2 founders (ops + brand), 4 cooks, 1 rider coordinator',
  customers: 'Desk-bound professionals aged 24–38 who skip breakfast and order lunch at work',
  demand: '100 weekday lunch orders at steady state within 4 months',
  pricing: '₹249–₹349 per bowl, 62% target food cost, 18% delivery fee',
  competitors: 'FreshMenu, Homely, local tiffin services, office cafeterias',
  capacity: 'One 420 sq ft kitchen, 180 meals per peak window, two cloud-kitchen aggregators',
}

const agents: AgentState[] = [
  { id: 'market', label: 'Market Intelligence', status: 'idle', note: 'Waiting' },
  { id: 'customer', label: 'Customer Intelligence', status: 'idle', note: 'Waiting' },
  { id: 'finance', label: 'Financial Agent', status: 'idle', note: 'Waiting' },
  { id: 'competition', label: 'Competition Agent', status: 'idle', note: 'Waiting' },
  { id: 'operations', label: 'Operations Agent', status: 'idle', note: 'Waiting' },
  { id: 'risk', label: 'Risk Agent', status: 'idle', note: 'Waiting' },
]

interface VentureStore {
  phase: Phase
  scroll: number
  reportScroll: number
  pointer: { x: number; y: number }
  briefingStep: number
  venture: VentureInput
  agents: AgentState[]
  demandScale: number
  activeDimension: AgentId | null
  hoveredDimension: AgentId | null
  setPhase: (phase: Phase) => void
  setScroll: (scroll: number) => void
  setReportScroll: (reportScroll: number) => void
  setPointer: (x: number, y: number) => void
  setBriefingStep: (briefingStep: number) => void
  patchVenture: (patch: Partial<VentureInput>) => void
  loadSample: () => void
  setAgent: (id: AgentId, patch: Partial<AgentState>) => void
  resetAgents: () => void
  setDemandScale: (demandScale: number) => void
  setActiveDimension: (id: AgentId | null) => void
  setHoveredDimension: (id: AgentId | null) => void
}

export const useVenture = create<VentureStore>((set) => ({
  phase: 'boot',
  scroll: 0,
  reportScroll: 0,
  pointer: { x: 0, y: 0 },
  briefingStep: 0,
  venture: emptyVenture,
  agents,
  demandScale: 100,
  activeDimension: null,
  hoveredDimension: null,
  setPhase: (phase) => set({ phase }),
  setScroll: (scroll) => set({ scroll }),
  setReportScroll: (reportScroll) => set({ reportScroll }),
  setPointer: (x, y) => set({ pointer: { x, y } }),
  setBriefingStep: (briefingStep) => set({ briefingStep }),
  patchVenture: (patch) =>
    set((state) => ({ venture: { ...state.venture, ...patch } })),
  loadSample: () => set({ venture: sampleVenture, demandScale: 100 }),
  setAgent: (id, patch) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, ...patch } : agent,
      ),
    })),
  resetAgents: () =>
    set({
      agents: agents.map((agent) => ({ ...agent, status: 'idle', note: 'Waiting' })),
    }),
  setDemandScale: (demandScale) => set({ demandScale }),
  setActiveDimension: (activeDimension) => set({ activeDimension }),
  setHoveredDimension: (hoveredDimension) => set({ hoveredDimension }),
}))
