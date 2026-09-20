import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr, ContactShadows } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'
import { useVenture } from '../store/venture'
import { Sculpture } from './Sculpture'

function CameraRig() {
  const pointer = useVenture((s) => s.pointer)
  const phase = useVenture((s) => s.phase)
  const scroll = useVenture((s) => s.scroll)
  const reportScroll = useVenture((s) => s.reportScroll)
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0))

  useFrame((state, delta) => {
    // Determine target camera position
    let targetX = 0
    let targetY = 0.8
    let targetZ = 6.8

    if (phase === 'landing') {
      // Hero elevated 3/4 camera
      if (scroll < 0.18) {
        targetX = 0.4
        targetY = 0.9
        targetZ = 6.6
      } else {
        // Scrolling through chapters
        targetX = 0.8 * Math.sin(scroll * Math.PI * 2)
        targetY = 0.6 + scroll * 0.4
        targetZ = 6.2 + Math.cos(scroll * Math.PI * 2) * 0.5
      }
    } else if (phase === 'briefing') {
      targetX = 0.8
      targetY = 0.6
      targetZ = 7.4
    } else if (phase === 'investigation') {
      targetX = 0.6
      targetY = 0.7
      targetZ = 6.2
    } else if (phase === 'report') {
      targetX = 0.7
      targetY = 0.8 - reportScroll * 0.4
      targetZ = 6.4
    }

    // Add subtle pointer parallax
    const finalX = targetX + pointer.x * 0.45
    const finalY = targetY + pointer.y * 0.35

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, finalX, delta * 3)
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, finalY, delta * 3)
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, delta * 3)

    // Center look-at point
    const targetLookX = phase === 'landing' && scroll < 0.18 ? 0.7 : 0
    lookAtTarget.current.x = THREE.MathUtils.lerp(lookAtTarget.current.x, targetLookX, delta * 3)
    lookAtTarget.current.y = THREE.MathUtils.lerp(lookAtTarget.current.y, 0.1, delta * 3)
    lookAtTarget.current.z = THREE.MathUtils.lerp(lookAtTarget.current.z, 0, delta * 3)

    state.camera.lookAt(lookAtTarget.current)
  })

  return null
}

export function Experience() {
  return (
    <Canvas
      className="field-canvas"
      shadows
      camera={{ position: [0, 0.8, 6.8], fov: 42, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
      dpr={[1, 2]}
      onCreated={({ gl }) => {
        gl.setClearColor('#F5F0E8')
      }}
    >
      <AdaptiveDpr pixelated />
      <CameraRig />

      {/* Studio Lighting: Warm sunlight on ceramic art sculpture */}
      {/* 1. Warm Ambient Base */}
      <ambientLight intensity={0.8} color="#FDFBF7" />

      {/* 2. Soft Key Directional Light (Sunlight from upper right) */}
      <directionalLight
        position={[6, 9, 6]}
        intensity={1.85}
        color="#FFF6EB"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />

      {/* 3. Soft Bounce Fill Light (from left/back) */}
      <directionalLight
        position={[-6, 4, -3]}
        intensity={0.65}
        color="#F3E9DD"
      />

      {/* 4. Subtle Under-bounce to keep ceramic undersides warm & readable */}
      <directionalLight
        position={[0, -4, 4]}
        intensity={0.35}
        color="#EDE1D1"
      />

      {/* Realistic Soft Contact Shadows grounded on the warm background */}
      <ContactShadows
        position={[0, -2.18, 0]}
        opacity={0.38}
        scale={12}
        blur={2.4}
        far={4.5}
        resolution={512}
        color="#5C4D43"
      />

      {/* The Central Clay 3D Sculpture */}
      <Sculpture />
    </Canvas>
  )
}
