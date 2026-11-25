import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
  import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
  import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
 import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xD48ECD)
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000)
camera.position.set(0, 0, 1)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1

document.body.appendChild(renderer.domElement)
const hdrloader = new EXRLoader()
const hdrpath = './assets/hdris/hdr.exr'
hdrloader.load(
 hdrpath,
 (tex) =>{
    tex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = tex
    scene.background = tex
 },
 undefined,
 () => {
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.displose()
 }
)
const draco = new DRACOLoader()
draco.setDecoderPath('https://unpkg.com/three@0.170.0/examples/jsm/libs/draco/gltf/')
const gltf = new GLTFLoader()
gltf.setDRACOLoader(draco)
const modelp = './assets/menuhome/final.glb'
gltf.load(
    modelp,
    (gltf) =>{
        const model = gltf.scene
        const target = model.getObjectByName('windows')
if (target) {
  target.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material = child.material.clone();
      child.material.emissive = new THREE.Color(0xFDF4DC)
      child.material.emissiveIntensity = 1
      child.material.toneMapped = false
    }
  });
}
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        const maxdim = Math.max(size.x, size.y, size.z)
        const scale = 2.0 / maxdim
        model.scale.setScalar(scale)
        model.position.sub(center.multiplyScalar(scale))
        scene.add(model)
    },
    undefined,
    (error) => {
        console.error(error)
    }
)

const customshader = {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uDistortion: { value: 0.12 },
        uTracking: { value: 1.0 },
        uChromaBleed: { value: 0.001 },
        uScanlines: { value: 0.28 },
        uNoise: { value: 0.11 },
        uVignette: { value: 0.4 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader:`
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform float uDistortion;
        uniform float uTracking;
        uniform float uChromaBleed;
        uniform float uScanlines;
        uniform float uNoise;
        uniform float uVignette;
        varying vec2 vUv;
        float rand(vec2 co) {
          return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }

        vec2 barrelDistort(vec2 uv, float amt) {
          vec2 cc = uv - 0.5;
          float dist = dot(cc, cc);
          return uv + cc * dist * amt;
        }

        void main() {
          vec2 uv = barrelDistort(vUv, uDistortion);

          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
          float wobble = sin(uv.y * 40.0 + uTime * 8.0) * 0.0007 * uTracking;
          float bandPos = fract(uTime * 0.12);
          float bandMask = smoothstep(0.05, 0.0, abs(uv.y - bandPos));
          float bandJitter = (rand(vec2(floor(uv.y * 160.0), floor(uTime * 30.0))) - 0.5) * 0.035 * bandMask * uTracking;
          float headSwitch = smoothstep(0.055, 0.0, uv.y);
          float tearOffset = (rand(vec2(floor(uv.y * 240.0), floor(uTime * 60.0))) - 0.5) * 0.06 * headSwitch * uTracking;
          vec2 sampleUv = vec2(clamp(uv.x + wobble + bandJitter + tearOffset, 0.0, 1.0), uv.y);
          float bleed = uChromaBleed * (1.0 + bandMask * 2.5);
          float r = texture2D(tDiffuse, vec2(clamp(sampleUv.x + bleed, 0.0, 1.0), sampleUv.y)).r;
          float g = texture2D(tDiffuse, sampleUv).g;
          float b = texture2D(tDiffuse, vec2(clamp(sampleUv.x - bleed, 0.0, 1.0), sampleUv.y)).b;
          vec3 color = vec3(r, g, b);
          color = mix(color, vec3(dot(color, vec3(0.299, 0.587, 0.114))), 0.12);
          color *= vec3(1.03, 1.0, 0.96);
          float scanline = sin(uv.y * uResolution.y * 1.5) * 0.5 + 0.5;
          color *= 1.0 - (1.0 - scanline) * uScanlines;
          float grain = (rand(uv * uResolution.xy + fract(uTime * 100.0)) - 0.5) * uNoise;
          float staticLine = step(0.996, rand(vec2(floor(uv.y * 220.0), floor(uTime * 45.0)))) * bandMask * 0.35;
          color += grain + staticLine;
          vec2 vigUv = uv - 0.5;
          float vig = 1.0 - dot(vigUv, vigUv) * uVignette * 2.4;
          color *= clamp(vig, 0.0, 1.0);
          gl_FragColor = vec4(color, 1.0);
        }
      `
}
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloompass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,
    0.4,
    0.85
)
composer.addPass(bloompass)
composer.addPass(new OutputPass())
const vhs = new ShaderPass(customshader)
composer.addPass(vhs)
window.addEventListener('resize', () => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    bloompass.setSize(w, h)
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer.setSize(w, h)
    vhs.uniforms.uResolution.value.set(w, h)
})
const clock = new THREE.Clock()
function animate() {
    const delta = clock.getDelta()
    vhs.uniforms.uTime.value += delta
    composer.render()
    requestAnimationFrame(animate)
}
animate()

