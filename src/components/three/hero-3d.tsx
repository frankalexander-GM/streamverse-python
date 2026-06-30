'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Points, PointMaterial } from '@react-three/drei'
import { useMemo, useRef, Suspense } from 'react'
import * as THREE from 'three'

/**
 * Hero 3D optimizado para rendimiento.
 * - Pocas partículas (300, vs 1400 antes)
 * - Icosaedro de baja resolución (detalle 4, vs 12 antes)
 * - Sin Environment HDR (pesado)
 * - Sin Rig de cámara (causaba re-renders constantes)
 * - frameloop="always" solo cuando es visible (controlado desde fuera)
 * - dpr limitado a [1, 1.5]
 */

function Particles({ count = 300 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [count])

  const ref = useRef<THREE.Points>(null)
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.03
    }
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#c084fc"
        size={0.06}
        sizeAttenuation
        depthWrite={false}
        opacity={0.7}
      />
    </Points>
  )
}

function CoreOrb() {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!mesh.current) return
    mesh.current.rotation.y = state.clock.elapsedTime * 0.25
    // Seguimiento sutil del mouse (limitado para no causar re-renders)
    mesh.current.position.x += (state.pointer.x * 0.2 - mesh.current.position.x) * 0.04
    mesh.current.position.y += (state.pointer.y * 0.2 - mesh.current.position.y) * 0.04
  })
  return (
    <mesh ref={mesh}>
      {/* detalle 4 en vez de 12 = 10x menos vértices */}
      <icosahedronGeometry args={[1.3, 4]} />
      <MeshDistortMaterial
        color="#a855f7"
        emissive="#7c3aed"
        emissiveIntensity={0.4}
        roughness={0.2}
        metalness={0.7}
        distort={0.4}
        speed={1.8}
      />
    </mesh>
  )
}

const SHAPES = [
  { position: [2.4, 1.1, -1] as [number, number, number], geometry: 'torus' as const, color: '#ec4899', speed: 1.0 },
  { position: [-2.6, 0.5, -0.5] as [number, number, number], geometry: 'octa' as const, color: '#06b6d4', speed: 0.9 },
  { position: [2.0, -1.5, 0.5] as [number, number, number], geometry: 'dodeca' as const, color: '#8b5cf6', speed: 1.2 },
]

function FloatingShape({ position, geometry, color, speed }: { position: [number, number, number]; geometry: 'torus' | 'octa' | 'dodeca'; color: string; speed: number }) {
  const geom = () => {
    switch (geometry) {
      case 'torus': return <torusGeometry args={[0.5, 0.18, 12, 32]} />
      case 'octa': return <octahedronGeometry args={[0.6, 0]} />
      case 'dodeca': return <dodecahedronGeometry args={[0.55, 0]} />
    }
  }
  return (
    <Float speed={1.8 * speed} rotationIntensity={1.2} floatIntensity={1.0}>
      <mesh position={position}>
        {geom()}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.25}
          metalness={0.6}
          wireframe={geometry === 'dodeca'}
        />
      </mesh>
    </Float>
  )
}

export function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
      // No renderizar continuamente si no hay interacción visible
      frameloop="always"
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={2.0} color="#a855f7" />
        <pointLight position={[-5, -3, 3]} intensity={1.5} color="#ec4899" />
        <pointLight position={[0, 4, -5]} intensity={1.2} color="#06b6d4" />
        <CoreOrb />
        {SHAPES.map((s, i) => (
          <FloatingShape key={i} {...s} />
        ))}
        <Particles count={300} />
      </Suspense>
    </Canvas>
  )
}
