import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, OrbitControls } from '@react-three/drei'

export default function Earth() {
    const earthRef = useRef()

    useFrame(() => {
        if (earthRef.current) {
            earthRef.current.rotation.y += 0.001
            earthRef.current.rotation.x += 0.0005
        }
    })

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight color="white" position={[5, 3, 5]} intensity={2} />
            <pointLight color="#06b6d4" position={[-5, -5, -5]} intensity={5} />

            {/* 1. The Earth */}
            <Sphere ref={earthRef} args={[2, 64, 64]}>
                <meshStandardMaterial color="#0ea5e9" wireframe={true} transparent={true} opacity={0.4} />
            </Sphere>

            {/* 2. NEW: The 0.05 AU Danger Zone boundary */}
            <Sphere args={[5, 32, 32]}>
                <meshBasicMaterial color="#ef4444" wireframe={true} transparent={true} opacity={0.05} />
            </Sphere>

            <OrbitControls enableZoom={true} enablePan={false} minDistance={3} maxDistance={20} />
        </>
    )
}