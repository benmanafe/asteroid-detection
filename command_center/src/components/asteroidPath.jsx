import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, Sphere, Html } from '@react-three/drei'
import * as THREE from 'three'

// 1. Add the isPlaying button prop
export default function AsteroidPath({
    missDistance, velocity, diameter, color = "#ef4444", isPlaying = true
}) {
    const asteroidRef = useRef()

    // 2. Create a new ref to track our "internal" paused time
    const progressRef = useRef(0)

    const { points, curve } = useMemo(() => {
        const pts = []
        const visualMissDistance = Math.max(missDistance * 100, 2.5)
        const vFactor = Math.max(velocity / 10, 1.0)

        for (let t = -20; t <= 20; t += 0.4) {
            const y = t * 2
            const x = -Math.sqrt(Math.pow(y / vFactor, 2) + Math.pow(visualMissDistance, 2))
            const z = t * 0.5
            pts.push(new THREE.Vector3(x, y, z))
        }

        const smoothCurve = new THREE.CatmullRomCurve3(pts)
        return { points: pts, curve: smoothCurve }}, [missDistance, velocity])
    
    // 3.  Update the animation loop to use 'delta' (time since last frame)
    useFrame((state, delta) => {
        if (!asteroidRef.current) return
    // Only move the asteroid forward if the simulation is playing!
    if (isPlaying) {
      const speed = 0.2
      progressRef.current += delta * speed
    }
    
    // Loop the animation seamlessly
    const progress = progressRef.current % 1.0 
    const position = curve.getPointAt(progress)
    asteroidRef.current.position.copy(position)
  })

  return (
    <group>
      <Line points={points} color={color} lineWidth={2} dashed={true} dashSize={0.5} gapSize={0.2} opacity={0.5} transparent />
      
      <group ref={asteroidRef}>
        <Sphere args={[0.2, 16, 16]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </Sphere>
        
        {/* The Holographic HUD Tooltip (Unchanged) */}
        <Html distanceFactor={15} position={[0, 0.5, 0]} center>
          <div className="bg-slate-900/80 border border-slate-700 backdrop-blur-md p-3 rounded-lg shadow-xl text-slate-200 pointer-events-none w-48 transition-all">
            <div className="border-b border-slate-700 pb-1 mb-2">
              <span className="text-xs font-bold tracking-widest text-cyan-400">TARGET LOCK</span>
            </div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">DIST:</span>
              <span className={missDistance <= 0.05 ? "text-red-400 font-bold" : "text-emerald-400"}>
                {missDistance.toFixed(4)} AU
              </span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">SIZE:</span>
              <span className={diameter >= 0.14 ? "text-red-400 font-bold" : "text-emerald-400"}>
                {(diameter * 1000).toFixed(0)} meters
              </span>
            </div>
          </div>
        </Html>
      </group>
    </group>
  )
}