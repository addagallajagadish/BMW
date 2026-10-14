import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import './CarScene.css'

const MODEL_PATH = '/models/car.glb'
const MODEL_LENGTH = 5.8
const SKY_BLUE = '#72c8ff'

const cameraStops = [
  { position: [5.5, 2.45, 7.6], target: [0, 0.95, 0] },
  { position: [6.8, 2.4, 5.8], target: [0, 0.95, 0] },
  { position: [5.8, 3.2, -7.2], target: [0, 1, 0] },
  { position: [-7.4, 2.8, 5.8], target: [0, 0.95, 0] },
  { position: [6.9, 2, 4], target: [0.5, 0.7, 0.8] },
  { position: [-7, 2, 4.1], target: [-0.5, 0.7, 0.8] },
  { position: [0, 7, 5.2], target: [0, 1.2, 0] },
  { position: [-6, 2.5, -6.8], target: [0, 0.95, 0] },
  { position: [6.5, 2.7, -7], target: [0, 0.95, 0] },
]

const cameraVectors = cameraStops.map(({ position, target }) => ({
  position: new Vector3(...position),
  target: new Vector3(...target),
}))

const bodyObjectPattern = /body|exterior|bodywork|carrosserie/i
const paintMaterialPattern = /paint|body.?paint|exterior.?paint|spectral blue/i
const protectedMaterialPattern = /glass|window|light|lamp|rubber|tire|tyre|wheel|rim|chrome|metal|interior|carbon|grille|caliper|brake/i
const pinkMaterialPattern = /pink|magenta|fuchsia|burgundy/i
const shadowCasterPattern = /body|wheel|tire|tyre|rim|roof|hood|door/i

function prepareModel(scene) {
  const model = scene.clone(true)
  model.updateMatrixWorld(true)

  let bounds = new Box3().setFromObject(model)
  const initialSize = bounds.getSize(new Vector3())
  if (initialSize.x > initialSize.z) model.rotation.y = -Math.PI / 2

  model.updateMatrixWorld(true)
  bounds = new Box3().setFromObject(model)
  const size = bounds.getSize(new Vector3())
  const horizontalLength = Math.max(size.x, size.z)
  if (!Number.isFinite(horizontalLength) || horizontalLength <= 0) {
    throw new Error('The GLB contains no measurable car geometry.')
  }
  const scale = MODEL_LENGTH / horizontalLength
  model.scale.multiplyScalar(scale)
  model.updateMatrixWorld(true)

  bounds = new Box3().setFromObject(model)
  const center = bounds.getCenter(new Vector3())
  model.position.x -= center.x
  model.position.y -= bounds.min.y
  model.position.z -= center.z

  let bluePaintApplied = false
  model.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = shadowCasterPattern.test(object.name)
    object.receiveShadow = object.castShadow
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    const adjustedMaterials = materials.map((material) => {
      const name = `${object.name} ${material.name}`
      const adjusted = material.clone()
      if (
        (bodyObjectPattern.test(object.name) || paintMaterialPattern.test(material.name))
        && !protectedMaterialPattern.test(name)
        && adjusted.color
      ) {
        adjusted.color.set(SKY_BLUE)
        if ('metalness' in adjusted) adjusted.metalness = Math.max(adjusted.metalness, 0.72)
        if ('roughness' in adjusted) adjusted.roughness = 0.2
        if ('clearcoat' in adjusted) adjusted.clearcoat = 1
        if ('clearcoatRoughness' in adjusted) adjusted.clearcoatRoughness = 0.12
        bluePaintApplied = true
      } else if (pinkMaterialPattern.test(material.name) && adjusted.color) {
        adjusted.color.set('#182638')
        if ('metalness' in adjusted) adjusted.metalness = 0
        if ('roughness' in adjusted) adjusted.roughness = 0.72
        if ('clearcoat' in adjusted) adjusted.clearcoat = 0
      }
      return adjusted
    })
    object.material = Array.isArray(object.material) ? adjustedMaterials : adjustedMaterials[0]
  })

  return { model, bluePaintApplied }
}

function LoadedCar({ model, onRendered }) {
  useEffect(() => {
    onRendered()
  }, [model, onRendered])

  return <primitive object={model} />
}

class ModelErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(`Unable to load the 3D car model at ${MODEL_PATH}.`, error)
    this.props.onFailure(error.message)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function ScrollCamera({ scroll, reducedMotion }) {
  const { camera, size } = useThree()
  const cameraRef = useRef(camera)
  const position = useMemo(() => cameraVectors[0].position.clone(), [])
  const target = useMemo(() => cameraVectors[0].target.clone(), [])
  const nextPosition = useMemo(() => new Vector3(), [])
  const nextTarget = useMemo(() => new Vector3(), [])

  useEffect(() => {
    camera.position.copy(position)
    camera.lookAt(target)
  }, [camera, position, target])

  useFrame((_, delta) => {
    const activeCamera = cameraRef.current
    const aspect = size.width / size.height
    const fov = size.width < 600
      ? MathUtils.radToDeg(2 * Math.atan(Math.tan(MathUtils.degToRad(17)) / aspect))
      : 34
    if (Math.abs(activeCamera.fov - fov) > 0.01) {
      activeCamera.fov = fov
      activeCamera.updateProjectionMatrix()
    }
    if (reducedMotion) {
      activeCamera.lookAt(target)
      return
    }
    const progress = MathUtils.clamp(scroll.current, 0, 0.999999) * (cameraStops.length - 1)
    const index = Math.floor(progress)
    const blend = progress - index
    const from = cameraVectors[index]
    const to = cameraVectors[index + 1]
    nextPosition.copy(from.position).lerp(to.position, blend)
    nextTarget.copy(from.target).lerp(to.target, blend)
    position.lerp(nextPosition, 1 - Math.exp(-delta * 2.8))
    target.lerp(nextTarget, 1 - Math.exp(-delta * 3.2))

    activeCamera.position.copy(position)
    activeCamera.lookAt(target)
  })

  return null
}

function Scene({ scroll, reducedMotion, model, onModelFailure, onModelRendered }) {
  return (
    <>
      <color attach="background" args={['#06090d']} />
      <fog attach="fog" args={['#06090d', 24, 52]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight intensity={0.72} color="#d8edff" groundColor="#10151d" />
      <spotLight position={[-5, 7, 5]} intensity={150} angle={0.56} penumbra={0.8} color="#c9e9ff" castShadow />
      <spotLight position={[5, 4, -5]} intensity={115} angle={0.72} penumbra={1} color="#3e9eff" />
      <pointLight position={[0, 2.1, 4]} intensity={15} color="#a9dcff" />
      <Suspense fallback={null}>
        <Environment frames={1} resolution={256} background={false}>
          <Lightformer form="rect" intensity={4} position={[0, 6, 0]} scale={[10, 4, 1]} />
          <Lightformer form="rect" intensity={3} position={[-7, 3, 1]} rotation={[0, Math.PI / 3, 0]} scale={[2, 6, 1]} />
          <Lightformer form="rect" intensity={3.5} position={[7, 3, -1]} rotation={[0, -Math.PI / 3, 0]} scale={[2, 6, 1]} />
          <Lightformer form="rect" intensity={2} position={[0, 2, -7]} scale={[8, 3, 1]} />
        </Environment>
      </Suspense>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#080b10" metalness={0.26} roughness={0.68} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[3.8, 3.84, 120]} />
        <meshBasicMaterial color="#3c9bea" transparent opacity={0.2} />
      </mesh>
      <ContactShadows frames={1} position={[0, 0.005, 0]} opacity={0.48} scale={14} blur={2.8} far={5} />
      {model && (
        <ModelErrorBoundary onFailure={onModelFailure}>
          <LoadedCar model={model} onRendered={onModelRendered} />
        </ModelErrorBoundary>
      )}
      <ScrollCamera scroll={scroll} reducedMotion={reducedMotion} />
    </>
  )
}

export default function CarScene({ scroll, reducedMotion, onModelError }) {
  const sceneRef = useRef(null)
  const [model, setModel] = useState(null)
  const [modelStatus, setModelStatus] = useState('loading')
  const [modelError, setModelError] = useState('')
  const bluePaintApplied = useRef(false)
  const failed = useMemo(() => (message) => {
    setModelError(message)
    setModelStatus('error')
    onModelError(message)
  }, [onModelError])
  const handleModelRendered = useMemo(() => () => {
    setModelStatus(bluePaintApplied.current ? 'loaded-blue' : 'loaded-original')
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return undefined
    let frame = 0
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return
      observer.disconnect()
      frame = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
    })
    observer.observe(scene)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    let active = true
    new GLTFLoader().loadAsync(MODEL_PATH)
      .then((gltf) => {
        if (!gltf.scene) throw new Error('The GLB file does not contain a scene.')
        if (active) setModelStatus('fitting')
        const prepared = prepareModel(gltf.scene)
        if (active) {
          bluePaintApplied.current = prepared.bluePaintApplied
          setModel(prepared.model)
          setModelError('')
          setModelStatus('rendering')
        }
      })
      .catch((error) => {
        console.error(`Unable to load the 3D car model at ${MODEL_PATH}.`, error)
        if (active) failed(error.message)
      })
    return () => {
      active = false
    }
  }, [failed])

  return (
    <div ref={sceneRef} className="scene-shell" role="region" aria-label="Interactive 3D car model">
      <Canvas
        dpr={[1, 1.6]}
        shadows="percentage"
        camera={{ position: cameraStops[0].position, fov: 34, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Scene
          scroll={scroll}
          reducedMotion={reducedMotion}
          model={model}
          onModelFailure={failed}
          onModelRendered={handleModelRendered}
        />
      </Canvas>
      <div className="scene-vignette" aria-hidden="true" />
      <div className={`model-label${modelStatus === 'error' ? ' is-error' : ''}`} role="status">
        <span className={`model-status-dot${modelStatus.startsWith('loaded') ? ' is-loaded' : ''}${modelStatus === 'error' ? ' is-error' : ''}`} />
        {modelStatus === 'loading' && 'LOADING LOCAL GLB MODEL'}
        {modelStatus === 'fitting' && 'PREPARING 3D CAR MODEL'}
        {modelStatus === 'rendering' && 'RENDERING LOCAL 3D MODEL'}
        {modelStatus === 'loaded-blue' && 'LOCAL MODEL · SKY-BLUE PAINT APPLIED'}
        {modelStatus === 'loaded-original' && 'LOCAL MODEL · ORIGINAL MATERIALS PRESERVED'}
        {modelStatus === 'error' && '3D MODEL FAILED TO LOAD'}
      </div>
      {modelError && <span className="sr-only">{modelError}</span>}
    </div>
  )
}
