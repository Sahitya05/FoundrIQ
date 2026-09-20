import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useVenture } from '../store/venture'
import type { AgentId } from '../store/venture'
import { buildReport } from '../data/report'

// Color Palette Constants
const CLAY_PALETTE = {
  idea: '#FAF6EE',
  ideaOutline: '#E2D8C3',
  market: '#C96F52',
  customer: '#879B7A',
  competition: '#DDAA9B',
  finance: '#E6B957',
  operations: '#7A5C46',
  ground: '#F5F0E8',
}

interface PieceProps {
  id: AgentId | 'idea'
  title: string
  subtitle: string
  color: string
  basePos: [number, number, number]
  baseRot: [number, number, number]
  children: React.ReactNode
  score?: number
  isScanning?: boolean
  isComplete?: boolean
  scrollFactor?: number
}

function ClayPiece({
  id,
  title,
  subtitle,
  color,
  basePos,
  baseRot,
  children,
  score = 65,
  isScanning = false,
  isComplete = false,
  scrollFactor = 0,
}: PieceProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const activeDimension = useVenture((s) => s.activeDimension)
  const setActiveDimension = useVenture((s) => s.setActiveDimension)
  const setHoveredDimension = useVenture((s) => s.setHoveredDimension)
  const phase = useVenture((s) => s.phase)

  const isActive = activeDimension === id

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime

    // Target positions based on state
    let targetX = basePos[0] + Math.sin(t * 0.8 + basePos[0]) * 0.04
    let targetY = basePos[1] + Math.cos(t * 0.7 + basePos[1]) * 0.04
    let targetZ = basePos[2]

    // Completed state adds slight gentle elevation
    if (isComplete) {
      targetY += 0.04
    }

    // Hover or Active elevation
    if (hovered || isActive) {
      targetZ += 0.4
      targetY += 0.1
    }

    // Scroll explosion factor
    if (scrollFactor > 0.01) {
      const dirX = basePos[0] === 0 ? 0 : Math.sign(basePos[0])
      const dirY = basePos[1] === 0 ? 0.3 : Math.sign(basePos[1])
      targetX += dirX * scrollFactor * 0.9
      targetY += dirY * scrollFactor * 0.9
      targetZ += scrollFactor * 0.5
    }

    // Scanning pulse during investigation
    if (isScanning) {
      targetZ += Math.sin(t * 4) * 0.15 + 0.3
      targetY += 0.12
    }

    // Score based offset in Report phase
    if (phase === 'report' && id !== 'idea') {
      const scoreNormalized = (score - 60) / 40 // -0.5 to +0.8
      targetY += scoreNormalized * 0.25
      targetZ += scoreNormalized * 0.2
    }

    // Smooth lerp
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, delta * 4)
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, delta * 4)
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, delta * 4)

    // Gentle rotation breathing
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      baseRot[0] + Math.sin(t * 0.5) * 0.03,
      delta * 3,
    )
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      baseRot[1] + Math.cos(t * 0.5) * 0.03,
      delta * 3,
    )
  })

  return (
    <group
      ref={groupRef}
      position={basePos}
      rotation={baseRot}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        setHoveredDimension(id as AgentId)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        setHoveredDimension(null)
        document.body.style.cursor = 'default'
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (id !== 'idea') {
          setActiveDimension(activeDimension === id ? null : (id as AgentId))
        }
      }}
    >
      {children}

      {/* Floating Tactical Label on Hover or Active */}
      {(hovered || isActive) && (
        <Html
          position={[0, 0.95, 0]}
          center
          distanceFactor={10}
          className="sculpture-tooltip"
          style={{ pointerEvents: 'none' }}
        >
          <div className="sculpture-tooltip-title" style={{ color }}>
            {title}
          </div>
          <div className="sculpture-tooltip-desc">{subtitle}</div>
        </Html>
      )}
    </group>
  )
}

/* ========================================================================= */
/* 1. CENTRAL CORE: THE IDEA (Matte Ceramic Seed / Pebble Form)               */
/* ========================================================================= */
function CentralIdeaCore() {
  const meshRef = useRef<THREE.Mesh>(null)

  return (
    <ClayPiece
      id="idea"
      title="THE IDEA"
      subtitle="The central thesis and promise of the venture."
      color="#756A61"
      basePos={[0, 0, 0]}
      baseRot={[0, 0, 0]}
    >
      {/* Outer Ceramic Shell */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[0.9, 48, 48]} />
        <meshStandardMaterial
          color={CLAY_PALETTE.idea}
          roughness={0.65}
          metalness={0.03}
        />
      </mesh>

      {/* Subtle Ceramic Ribbon / Inset Contour */}
      <mesh position={[0, 0, 0.05]} rotation={[0.4, 0.3, 0.8]}>
        <torusGeometry args={[0.92, 0.025, 16, 64]} />
        <meshStandardMaterial
          color={CLAY_PALETTE.ideaOutline}
          roughness={0.8}
          metalness={0.02}
        />
      </mesh>
    </ClayPiece>
  )
}

/* ========================================================================= */
/* 2. MARKET: Terracotta Layered Form (Terraced Stepped Rounded Discs)       */
/* ========================================================================= */
function MarketForm({
  scrollFactor,
  isScanning,
  isComplete,
  score,
}: {
  scrollFactor: number
  isScanning: boolean
  isComplete: boolean
  score?: number
}) {
  return (
    <ClayPiece
      id="market"
      title="MARKET"
      subtitle="Understand the space and density you're entering."
      color={CLAY_PALETTE.market}
      basePos={[1.75, 0.75, 0.2]}
      baseRot={[0.2, -0.3, 0.15]}
      scrollFactor={scrollFactor}
      isScanning={isScanning}
      isComplete={isComplete}
      score={score}
    >
      <group>
        {/* Layer 1 - Base disc */}
        <mesh position={[0, -0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.62, 0.68, 0.16, 36]} />
          <meshStandardMaterial
            color={CLAY_PALETTE.market}
            roughness={0.7}
            metalness={0.02}
          />
        </mesh>
        {/* Layer 2 - Mid stepped disc */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.48, 0.54, 0.16, 36]} />
          <meshStandardMaterial
            color={CLAY_PALETTE.market}
            roughness={0.68}
            metalness={0.02}
          />
        </mesh>
        {/* Layer 3 - Crown disc */}
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.34, 0.4, 0.14, 36]} />
          <meshStandardMaterial
            color="#D97A5D"
            roughness={0.65}
            metalness={0.02}
          />
        </mesh>
      </group>
    </ClayPiece>
  )
}

/* ========================================================================= */
/* 3. CUSTOMER: Soft Sage Curved Form (Tactile Ceramic Arc / Crescent)       */
/* ========================================================================= */
function CustomerForm({
  scrollFactor,
  isScanning,
  isComplete,
  score,
}: {
  scrollFactor: number
  isScanning: boolean
  isComplete: boolean
  score?: number
}) {
  return (
    <ClayPiece
      id="customer"
      title="CUSTOMER"
      subtitle="Understand the buyers, their pain, and daily habits."
      color={CLAY_PALETTE.customer}
      basePos={[1.65, -0.95, 0.35]}
      baseRot={[0.6, 0.4, -0.5]}
      scrollFactor={scrollFactor}
      isScanning={isScanning}
      isComplete={isComplete}
      score={score}
    >
      <group>
        {/* Sweeping sculptural ceramic arc */}
        <mesh castShadow receiveShadow>
          <torusGeometry args={[0.68, 0.22, 28, 48, Math.PI * 1.3]} />
          <meshStandardMaterial
            color={CLAY_PALETTE.customer}
            roughness={0.65}
            metalness={0.02}
          />
        </mesh>
        {/* Soft rounded endcap sphere */}
        <mesh position={[0.68, 0, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial
            color={CLAY_PALETTE.customer}
            roughness={0.65}
            metalness={0.02}
          />
        </mesh>
      </group>
    </ClayPiece>
  )
}

/* ========================================================================= */
/* 4. COMPETITION: Soft Pink Angular-but-Rounded Form (Faceted Clay Prism)    */
/* ========================================================================= */
function CompetitionForm({
  scrollFactor,
  isScanning,
  isComplete,
  score,
}: {
  scrollFactor: number
  isScanning: boolean
  isComplete: boolean
  score?: number
}) {
  return (
    <ClayPiece
      id="competition"
      title="COMPETITION"
      subtitle="Understand alternatives and incumbent defensibility."
      color={CLAY_PALETTE.competition}
      basePos={[-1.75, 0.85, 0.15]}
      baseRot={[-0.3, 0.5, 0.4]}
      scrollFactor={scrollFactor}
      isScanning={isScanning}
      isComplete={isComplete}
      score={score}
    >
      <group>
        {/* Soft faceted ceramic crystal form */}
        <mesh castShadow receiveShadow>
          <dodecahedronGeometry args={[0.62, 1]} />
          <meshStandardMaterial
            color={CLAY_PALETTE.competition}
            roughness={0.68}
            metalness={0.03}
          />
        </mesh>
        {/* Complementary satellite bead */}
        <mesh position={[0.55, 0.45, -0.2]} castShadow receiveShadow>
          <sphereGeometry args={[0.18, 20, 20]} />
          <meshStandardMaterial
            color="#E8B8AA"
            roughness={0.62}
            metalness={0.02}
          />
        </mesh>
      </group>
    </ClayPiece>
  )
}

/* ========================================================================= */
/* 5. FINANCE: Butter Yellow Stacked Form (Balanced Tactile Stones/Tokens)   */
/* ========================================================================= */
function FinanceForm({
  scrollFactor,
  isScanning,
  isComplete,
  score,
}: {
  scrollFactor: number
  isScanning: boolean
  isComplete: boolean
  score?: number
}) {
  return (
    <ClayPiece
      id="finance"
      title="FINANCE"
      subtitle="Put the unit economics and margins under pressure."
      color={CLAY_PALETTE.finance}
      basePos={[0.05, 1.85, -0.2]}
      baseRot={[0.15, 0.2, -0.1]}
      scrollFactor={scrollFactor}
      isScanning={isScanning}
      isComplete={isComplete}
      score={score}
    >
      <group>
        {/* Stack 1 - Lower wide pebble */}
        <mesh position={[0, -0.24, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.58, 0.16, 32]} />
          <meshStandardMaterial
            color={CLAY_PALETTE.finance}
            roughness={0.68}
            metalness={0.02}
          />
        </mesh>
        {/* Stack 2 - Middle pebble */}
        <mesh position={[0.04, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.46, 0.16, 32]} />
          <meshStandardMaterial
            color={CLAY_PALETTE.finance}
            roughness={0.65}
            metalness={0.02}
          />
        </mesh>
        {/* Stack 3 - Top balanced rounded sphere */}
        <mesh position={[-0.02, 0.26, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.26, 28, 28]} />
          <meshStandardMaterial
            color="#F0C76B"
            roughness={0.6}
            metalness={0.03}
          />
        </mesh>
      </group>
    </ClayPiece>
  )
}

/* ========================================================================= */
/* 6. OPERATIONS: Warm Brown Flowing Form (Continuous Loop / Torus Flow)      */
/* ========================================================================= */
function OperationsForm({
  scrollFactor,
  isScanning,
  isComplete,
  score,
}: {
  scrollFactor: number
  isScanning: boolean
  isComplete: boolean
  score?: number
}) {
  return (
    <ClayPiece
      id="operations"
      title="OPERATIONS"
      subtitle="Test throughput, team capacity, and failure modes."
      color={CLAY_PALETTE.operations}
      basePos={[-1.65, -0.9, 0.25]}
      baseRot={[-0.4, -0.5, 0.3]}
      scrollFactor={scrollFactor}
      isScanning={isScanning}
      isComplete={isComplete}
      score={score}
    >
      <group>
        {/* Flowing ceramic torus loop */}
        <mesh castShadow receiveShadow>
          <torusGeometry args={[0.62, 0.2, 24, 48]} />
          <meshStandardMaterial
            color={CLAY_PALETTE.operations}
            roughness={0.7}
            metalness={0.02}
          />
        </mesh>
      </group>
    </ClayPiece>
  )
}

/* ========================================================================= */
/* MASTER 3D SCULPTURE COMPONENT                                             */
/* ========================================================================= */
export function Sculpture() {
  const masterGroup = useRef<THREE.Group>(null)
  const phase = useVenture((s) => s.phase)
  const scroll = useVenture((s) => s.scroll)
  const pointer = useVenture((s) => s.pointer)
  const agents = useVenture((s) => s.agents)
  const venture = useVenture((s) => s.venture)

  // Memoize report scores if in report phase
  const reportScores = useMemo(() => {
    if (phase !== 'report') return {}
    try {
      const rep = buildReport(venture)
      const map: Record<string, number> = {}
      rep.scores.forEach((s) => {
        map[s.id] = s.score
      })
      return map
    } catch {
      return {}
    }
  }, [phase, venture])

  // Landing Scroll Breakdown:
  // 0.00 - 0.15: Chapter 0 (Together)
  // 0.15 - 0.32: Market separation
  // 0.32 - 0.48: Customer separation
  // 0.48 - 0.64: Competition separation
  // 0.64 - 0.80: Finance separation
  // 0.80 - 0.92: Operations separation
  // > 0.92: All return together
  const scrollFactors = useMemo(() => {
    if (phase !== 'landing') {
      return { market: 0, customer: 0, competition: 0, finance: 0, operations: 0 }
    }
    const s = scroll
    let market = 0
    let customer = 0
    let competition = 0
    let finance = 0
    let operations = 0

    if (s > 0.12 && s < 0.92) {
      if (s >= 0.15 && s < 0.32) {
        market = (s - 0.15) / 0.17
      } else if (s >= 0.32 && s < 0.48) {
        customer = (s - 0.32) / 0.16
      } else if (s >= 0.48 && s < 0.64) {
        competition = (s - 0.48) / 0.16
      } else if (s >= 0.64 && s < 0.80) {
        finance = (s - 0.64) / 0.16
      } else if (s >= 0.80 && s < 0.92) {
        operations = (s - 0.80) / 0.12
      }
    }

    return { market, customer, competition, finance, operations }
  }, [phase, scroll])

  // Agent scanning lookup
  const getAgentStatus = (id: AgentId) => {
    const a = agents.find((ag) => ag.id === id)
    return {
      isScanning: a?.status === 'scanning',
      isComplete: a?.status === 'complete',
    }
  }

  useFrame((state, delta) => {
    if (!masterGroup.current) return
    const t = state.clock.elapsedTime

    // Gentle unified rotation (slow & elegant)
    masterGroup.current.rotation.y += delta * 0.18

    // Subtle pointer parallax
    masterGroup.current.rotation.x = THREE.MathUtils.lerp(
      masterGroup.current.rotation.x,
      pointer.y * 0.25,
      delta * 2,
    )
    masterGroup.current.rotation.z = THREE.MathUtils.lerp(
      masterGroup.current.rotation.z,
      -pointer.x * 0.2,
      delta * 2,
    )

    // Position offset based on current phase and responsive layout
    let targetPosX = 0
    let targetPosY = Math.sin(t * 0.5) * 0.04
    let targetPosZ = 0
    let targetScale = 1.0

    const isMobile = window.innerWidth < 768
    const isTablet = window.innerWidth < 1080 && !isMobile

    if (phase === 'landing') {
      const isHero = scroll < 0.18
      if (isMobile) {
        targetPosX = 0
        targetPosY = isHero ? 1.4 : 0
        targetScale = isHero ? 0.68 : 0.62
      } else if (isTablet) {
        targetPosX = isHero ? 1.0 : 0
        targetPosY = isHero ? 0.2 : 0
        targetScale = 0.85
      } else {
        targetPosX = isHero ? 1.6 : 0
        targetPosY = isHero ? 0.2 : 0
        targetScale = isHero ? 1.15 : 0.98
      }
    } else if (phase === 'briefing') {
      targetPosX = isMobile ? 0 : 2.4
      targetPosY = isMobile ? -2.2 : 0
      targetScale = isMobile ? 0.55 : 0.85
    } else if (phase === 'investigation') {
      targetPosX = isMobile ? 0 : 1.6
      targetPosY = isMobile ? -2.0 : 0.1
      targetScale = isMobile ? 0.68 : 1.05
    } else if (phase === 'report') {
      targetPosX = isMobile ? 0 : 1.7
      targetPosY = isMobile ? -2.2 : 0.3
      targetScale = isMobile ? 0.65 : 0.95
    }

    masterGroup.current.position.x = THREE.MathUtils.lerp(masterGroup.current.position.x, targetPosX, delta * 3)
    masterGroup.current.position.y = THREE.MathUtils.lerp(masterGroup.current.position.y, targetPosY, delta * 3)
    masterGroup.current.position.z = THREE.MathUtils.lerp(masterGroup.current.position.z, targetPosZ, delta * 3)
    masterGroup.current.scale.setScalar(
      THREE.MathUtils.lerp(masterGroup.current.scale.x, targetScale, delta * 3),
    )
  })

  return (
    <group ref={masterGroup}>
      {/* Central Idea Core */}
      <CentralIdeaCore />

      {/* 1. Market (Terracotta) */}
      <MarketForm
        scrollFactor={scrollFactors.market}
        isScanning={getAgentStatus('market').isScanning}
        isComplete={getAgentStatus('market').isComplete}
        score={reportScores['market']}
      />

      {/* 2. Customer (Sage) */}
      <CustomerForm
        scrollFactor={scrollFactors.customer}
        isScanning={getAgentStatus('customer').isScanning}
        isComplete={getAgentStatus('customer').isComplete}
        score={reportScores['customer']}
      />

      {/* 3. Competition (Soft Pink) */}
      <CompetitionForm
        scrollFactor={scrollFactors.competition}
        isScanning={getAgentStatus('competition').isScanning}
        isComplete={getAgentStatus('competition').isComplete}
        score={reportScores['competition']}
      />

      {/* 4. Finance (Butter Yellow) */}
      <FinanceForm
        scrollFactor={scrollFactors.finance}
        isScanning={getAgentStatus('finance').isScanning}
        isComplete={getAgentStatus('finance').isComplete}
        score={reportScores['financial']}
      />

      {/* 5. Operations (Warm Brown) */}
      <OperationsForm
        scrollFactor={scrollFactors.operations}
        isScanning={getAgentStatus('operations').isScanning}
        isComplete={getAgentStatus('operations').isComplete}
        score={reportScores['operations']}
      />

      {/* Soft Contact Shadow Catcher Ground */}
      <mesh
        position={[0, -2.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[14, 14]} />
        <shadowMaterial opacity={0.14} />
      </mesh>
    </group>
  )
}
