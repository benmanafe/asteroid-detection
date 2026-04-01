import { useState, useEffect } from 'react' 
import { Canvas } from '@react-three/fiber'
import Earth from './components/earth.jsx'
import AsteroidPath from './components/asteroidPath.jsx'

function App(){
  // Holds the telemetry data from API
  const [asteroids, setAsteroids] = useState([])
  // Loading spinner when fetching data (Boolean)
  const [loading, setLoading] = useState(true)
  // Store the predictions from the ML API call
  const [predictions, setPredictions] = useState([])
  const [activeAsteroid, setActiveAsteroid] = useState(null)
  const [isPlaying, setIsPlaying] = useState(true)
  // Sandbox Toggle & Values
  const [showSandbox, setShowSandbox] = useState(false)
  const [customDist, setCustomDist] = useState(0.03)
  const [customVel, setCustomVel] = useState(15)
  const [customSize, setCustomSize] = useState(150)

  useEffect(() => {
    // Fetch Asteroid Data API
    fetch("http://127.0.0.1:8000/api/tracking")
    .then(response => response.json())
    // Store the raw JSON data and completes the Loading Spin
    .then(data => {
      setAsteroids(data.asteroids)
      setLoading(false)
    })
    // Error message if fetching data fails
    .catch(error => {
      console.error("Error fetching data:", error)
      setLoading(false)
    })
  }, [])

  // Function that runs when "Run ML Analysis" button is clicked
  const handlePredict = async (asteroid) => {
    const designation = asteroid[0]

    // Set the asteroid clicked to "Loading"
    setPredictions(prev => ({ ...prev, [designation]: { status: 'loading'} }))

    // 1. Translate NASA data to ML Ready Data
    const missDistanceAU = parseFloat(asteroid[4])
    const velocityKmS = parseFloat(asteroid[7])
    // NASA "H" is usually at index 10
    const absoluteMagnitudeH = parseFloat(asteroid[10]) || 20.0

    const missDistanceKm = missDistanceAU * 149597870.7
    const velocityKmh = velocityKmS * 3600
    const estimatedDiameterKm = (1329 / Math.sqrt(0.25)) * Math.pow(10, -0.2 * absoluteMagnitudeH)
  
    // 2. Package the data for the FastAPI backend
    const payload = {
      absolute_magnitude_h: absoluteMagnitudeH,
      estimated_diameter_max_km: estimatedDiameterKm,
      relative_velocity_kmh: velocityKmh,
      miss_distance_km: missDistanceKm
    }

    // 3. Send it to the Python Brain
    try {
      const response = await fetch("http://127.0.0.1:8000/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      // 4. Save the result and upadte the UI
      setPredictions(prev => ({ 
        ...prev, 
        [designation]: { 
          status: 'complete', 
          isHazardous: result.is_hazardous === 1 
        } 
      }))

      // ----------------------------------
      setActiveAsteroid({
        designation: designation,
        missDistanceAU: missDistanceAU,
        velocityKmS: velocityKmS,
        diameterKm: estimatedDiameterKm,
        isHazardous: result.is_hazardous === 1
      })

    } catch (error) {
      console.error("Prediction failed:", error)
      setPredictions(prev => ({
        ...prev,
        [designation]: {
          status: 'error'
        }
      }))
    }
  }

  // Function to create custom user asteroid
  const handleCustomLaunch = async () => {
    const designation = "USER-CREATED"
    setPredictions(prev => ({ ...prev, [designation]: { status: 'loading'} }))

    const missDistanceKm = customDist * 149597870.7
    const velocityKmh = customVel * 3600
    const diameterKm = customSize / 1000
    const absoluteMagnitudeH = -5 * Math.log10(diameterKm / (1329 / Math.sqrt(0.25)))

    const payload = {
      absolute_magnitude_h: absoluteMagnitudeH,
      estimated_diameter_max_km: diameterKm,
      relative_velocity_kmh: velocityKmh,
      miss_distance_km: missDistanceKm
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      
      // NEW: The Strict Deterministic NASA Rule
      const actualNasaRule = customDist <= 0.05 && customSize >= 140;
      const isMlCorrect = (result.is_hazardous === 1) === actualNasaRule;

      setPredictions(prev => ({ 
        ...prev, 
        [designation]: { 
          status: 'complete', 
          isHazardous: result.is_hazardous === 1,
          actualNasaRule: actualNasaRule, // Store the truth
          isMlCorrect: isMlCorrect        // Store the RCA evaluation
        } 
      }))

      setActiveAsteroid({
        designation: designation,
        missDistanceAU: customDist,
        velocityKmS: customVel,
        diameterKm: diameterKm,
        isHazardous: actualNasaRule // Force the 3D visualizer to show the TRUE threat level
      })

    } catch (error) {
      console.error("Custom Prediction failed:", error)
      setPredictions(prev => ({ ...prev, [designation]: { status: 'error' } }))
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans selection:bg-cyan-900">
      {/* Header Section */}
      <div className="max-w-[1600px] mx-auto mb-8">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">
          ☄️ NEO Command Center
        </h1>
        <p className="text-slate-300 mt-2 text-lg">
          Live orbital telemetry for Near-Earth Objects passing within 0.05 AU today.
        </p>
      </div>
      {/* Main Grid Container */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* LEFT COLUMN: ASTEROID LIST OR SANDBOX UI */}
        <div className="xl:col-span-5 flex flex-col h-[800px]">
          
          {/* View Toggle Tabs */}
          <div className="flex space-x-2 mb-4">
            <button 
              onClick={() => setShowSandbox(false)}
              className={`flex-1 py-3 text-sm font-bold tracking-widest rounded-t-lg border-b-2 transition-all ${!showSandbox ? 'bg-slate-900 border-cyan-500 text-cyan-400' : 'bg-slate-900/50 border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              LIVE NASA FEED
            </button>
            <button 
              onClick={() => setShowSandbox(true)}
              className={`flex-1 py-3 text-sm font-bold tracking-widest rounded-t-lg border-b-2 transition-all ${showSandbox ? 'bg-slate-900 border-purple-500 text-purple-400' : 'bg-slate-900/50 border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              CUSTOM LAB
            </button>
          </div>

          {showSandbox ? (
            
            /* ================= THE SANDBOX UI ================= */
            <div className="bg-slate-900 border border-slate-800 rounded-b-2xl rounded-tr-2xl shadow-2xl flex-1 p-6 flex flex-col space-y-8">
              <div>
                <h2 className="text-xl font-bold text-purple-400 mb-1">Forge an Asteroid</h2>
                <p className="text-slate-400 text-sm">Adjust orbital parameters to test the XGBoost hazard model.</p>
              </div>

              {/* Slider 1: Distance */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-slate-300 font-mono text-sm">Miss Distance</label>
                  <span className="text-purple-400 font-mono text-sm">{customDist} AU</span>
                </div>
                <input type="range" min="0.005" max="0.1" step="0.005" value={customDist} onChange={(e) => setCustomDist(parseFloat(e.target.value))} className="w-full accent-purple-500" />
              </div>

              {/* Slider 2: Velocity */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-slate-300 font-mono text-sm">Velocity</label>
                  <span className="text-purple-400 font-mono text-sm">{customVel} km/s</span>
                </div>
                <input type="range" min="1" max="50" step="1" value={customVel} onChange={(e) => setCustomVel(parseFloat(e.target.value))} className="w-full accent-purple-500" />
              </div>

              {/* Slider 3: Size */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-slate-300 font-mono text-sm">Diameter</label>
                  <span className="text-purple-400 font-mono text-sm">{customSize} meters</span>
                </div>
                <input type="range" min="10" max="1000" step="10" value={customSize} onChange={(e) => setCustomSize(parseFloat(e.target.value))} className="w-full accent-purple-500" />
              </div>

              <div className="pt-8 mt-auto">
                <button 
                  onClick={handleCustomLaunch}
                  className="w-full py-4 bg-purple-900/40 hover:bg-purple-600 text-purple-300 hover:text-white font-bold tracking-widest rounded-xl border border-purple-700/50 hover:border-purple-400 transition-all shadow-lg"
                >
                  INITIALIZE & ANALYZE
                </button>
                
                {/* Status Readout with RCA Check */}
                {predictions["USER-CREATED"] && (
                  <div className="mt-6 flex flex-col space-y-3">
                    
                    {/* The Hard NASA Math */}
                    <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-slate-800">
                      <span className="text-slate-400 font-mono text-xs">PHYSICS ENGINE:</span>
                      <span className={predictions["USER-CREATED"].actualNasaRule ? "text-red-500 font-bold text-xs" : "text-emerald-500 font-bold text-xs"}>
                        {predictions["USER-CREATED"].actualNasaRule ? "CRITICAL THREAT" : "SAFE TRAJECTORY"}
                      </span>
                    </div>

                    {/* The ML Prediction */}
                    <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-slate-800">
                      <span className="text-slate-400 font-mono text-xs">XGBOOST AI:</span>
                      <span className={predictions["USER-CREATED"].isHazardous ? "text-red-500 font-bold text-xs" : "text-emerald-500 font-bold text-xs"}>
                        {predictions["USER-CREATED"].isHazardous ? "HAZARDOUS" : "SAFE"}
                      </span>
                    </div>

                    {/* The Anomaly Flag */}
                    {!predictions["USER-CREATED"].isMlCorrect && (
                      <div className="p-3 bg-orange-900/30 border border-orange-500/50 rounded-lg text-center animate-pulse">
                        <span className="text-orange-400 font-bold text-xs tracking-widest">
                          ⚠️ AI ANOMALY DETECTED (FALSE NEGATIVE)
                        </span>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>

          ) : (

            /* ================= THE ORIGINAL NASA TABLE ================= */
            /* Note: Wrap your existing loading/table logic in this block */
            <>
              {loading ? (
                <div className="flex-1 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-b-2xl shadow-2xl">
                  {/* ... your existing loading spinner ... */}
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-cyan-400 font-mono tracking-widest">ESTABLISHING JPL UPLINK...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-b-2xl shadow-2xl flex-1 flex flex-col overflow-hidden">
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                       {/* ... Paste your exact existing <thead> and <tbody> here ... */}
                       <thead className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
                         <tr>
                           <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Designation</th>
                           <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Dist (AU)</th>
                           <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest text-right">ML Prediction</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-800/50">
                         {asteroids.map((asteroid, index) => {
                           const designation = asteroid[0];
                           const predictionState = predictions[designation];
                           const isActive = activeAsteroid?.designation === designation;
     
                           return (
                             <tr key={index} className={`transition-colors duration-200 ${isActive ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}>
                               <td className="px-4 py-4 whitespace-nowrap"><span className="font-mono text-cyan-400 font-bold text-base">{designation}</span></td>
                               <td className="px-4 py-4 whitespace-nowrap text-slate-300 hidden sm:table-cell">{parseFloat(asteroid[4]).toFixed(4)}</td>
                               <td className="px-4 py-4 whitespace-nowrap text-right">
                                 {!predictionState ? (
                                   <button onClick={() => handlePredict(asteroid)} className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-600 text-cyan-400 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 hover:border-cyan-500 transition-all shadow-sm cursor-pointer">Analyze</button>
                                 ) : predictionState.status === 'loading' ? (
                                   <span className="px-3 py-1.5 text-slate-400 text-xs font-mono animate-pulse">Calculating...</span>
                                 ) : predictionState.status === 'error' ? (
                                   <span className="px-3 py-1.5 text-red-400 text-xs font-mono">API Error</span>
                                 ) : predictionState.isHazardous ? (
                                   <span className="px-3 py-1.5 bg-red-900/50 text-red-400 border border-red-700/50 rounded-lg text-xs font-bold animate-pulse">⚠️ HAZARDOUS</span>
                                 ) : (
                                   <span className="px-3 py-1.5 bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 rounded-lg text-xs font-bold">✅ SAFE</span>
                                 )}
                               </td>
                             </tr>
                           )
                         })}
                       </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {/* Right Column: 3D Radar */}
        <div className="xl:col-span-7 h-[800px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative cursor-move">
          
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <p className="text-cyan-500 font-mono text-sm font-bold tracking-widest">TACTICAL ORBITAL RADAR</p>
            <p className="text-slate-500 font-mono text-xs">
              {activeAsteroid ? `TRACKING: ${activeAsteroid.designation}` : "AWAITING ASTEROID TELEMETRY..."}
            </p>
          </div>

          {activeAsteroid && (
            <div className="absolute bottom-4 left-4 z-10">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 bg-slate-950/80 hover:bg-slate-800 text-cyan-400 text-xs font-bold font-mono tracking-widest rounded-lg border border-cyan-900 hover:border-cyan-500 backdrop-blur-md transition-all shadow-lg cursor-pointer"
              >
                {isPlaying ? "⏸ PAUSE SIM" : "▶️ RESUME SIM"}
              </button>
            </div>
          )}

          <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
            <Earth />
            {activeAsteroid && (
              <AsteroidPath 
                missDistance={activeAsteroid.missDistanceAU} 
                velocity={activeAsteroid.velocityKmS} 
                diameter={activeAsteroid.diameterKm} 
                color={activeAsteroid.isHazardous ? "#ef4444" : "#10b981"} 
                isPlaying={isPlaying}
              />
            )}
          </Canvas>
        </div>
      </div>
    </div>
  )
}

export default App