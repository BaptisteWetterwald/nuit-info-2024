import * as THREE from 'three'
import gsap from 'gsap'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { SUBTRACTION, Evaluator, Brush } from 'three-bvh-csg'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import terrainVertexShader from './shaders/terrain/vertex.glsl'
import terrainFragmentShader from './shaders/terrain/fragment.glsl'
import OpenAIClient from './prompt.js'

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 325 })
const debugObject = {}

const points = [
    {
        position: new THREE.Vector3(4.787, 3, -4.622),
        element: document.querySelector('.point-0')
    },
    {
        position: new THREE.Vector3(0, 0, -0.3),
        element: document.querySelector('.point-1')
    },
    {
        position: new THREE.Vector3(1.6, 1, - 0.7),
        element: document.querySelector('.point-2')
    }
]

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const rgbeLoader = new RGBELoader()

// Loaders
const gltfLoader = new GLTFLoader()

/**
 * Environment map
 */
rgbeLoader.load('/spruit_sunrise.hdr', (environmentMap) =>
{
    environmentMap.mapping = THREE.EquirectangularReflectionMapping

    scene.background = environmentMap
    scene.backgroundBlurriness = 0.5
    scene.environment = environmentMap
})

// Boat
let boat = null
gltfLoader.load(
    './sailing_boat.glb',
    (gltf) =>
    {
        boat = gltf.scene

        boat.position.set(4.787, -0.405, -4.622)
        boat.rotation.set(0, -0.83, 0)
        boat.scale.set(0.005, 0.005, 0.005)
        scene.add(boat)

        // Add GUI controls for the boat after it has been loaded
        gui.add(boat.position, 'x', -10, 10, 0.001).name('boatX')
        gui.add(boat.position, 'y', -10, 10, 0.001).name('boatY')
        gui.add(boat.position, 'z', -10, 10, 0.001).name('boatZ')
        gui.add(boat.rotation, 'y', -Math.PI, Math.PI, 0.001).name('boatRotY')
    }
)

let coral = null
gltfLoader.load(
    './coral.glb',
    (gltf) =>
    {
        coral = gltf.scene
        coral.scale.set(0.05, 0.05, 0.05)
        coral.position.set(0, -1.345, -0.3)
        scene.add(coral)

        // Add GUI controls for the coral after it has been loaded
        gui.add(coral.position, 'x', -10, 10, 0.001).name('coralX')
        gui.add(coral.position, 'y', -10, 10, 0.001).name('coralY')
        gui.add(coral.position, 'z', -10, 10, 0.001).name('coralZ')
    }
)

/**
 * Terrain
 */
// Geometry
const geometry = new THREE.PlaneGeometry(20, 20, 500, 500)
geometry.deleteAttribute('normal')
geometry.deleteAttribute('uv')
geometry.rotateX(- Math.PI * 0.5)

// Material

debugObject.colorWaterDeep = '#002b3d'
debugObject.colorWaterSurface = '#66a8ff'
debugObject.colorSand = '#ffe894'
debugObject.colorGrass = '#85d534'
debugObject.colorSnow = '#ffffff'
debugObject.colorRock = '#bfbd8d'

const uniforms = {
    uTime: new THREE.Uniform(0),
    uOffsetX: new THREE.Uniform(0),
    uOffsetY: new THREE.Uniform(0),
    uPositionFrequency: new THREE.Uniform(0.06),
    uStrength: new THREE.Uniform(6.793),
    uWarpFrequency: new THREE.Uniform(5),
    uWarpStrength: new THREE.Uniform(0.712),
    uColorWaterDeep: new THREE.Uniform(new THREE.Color(debugObject.colorWaterDeep)),
    uColorWaterSurface: new THREE.Uniform(new THREE.Color(debugObject.colorWaterSurface)),
    uColorSand: new THREE.Uniform(new THREE.Color(debugObject.colorSand)),
    uColorGrass: new THREE.Uniform(new THREE.Color(debugObject.colorGrass)),
    uColorSnow: new THREE.Uniform(new THREE.Color(debugObject.colorSnow)),
    uColorRock: new THREE.Uniform(new THREE.Color(debugObject.colorRock)),
}


gui.add(uniforms.uPositionFrequency, 'value', 0, 1, 0.001).name('uPositionFrequency')
gui.add(uniforms.uOffsetX, 'value', 0, 20, 0.001).name('uOffsetX')
gui.add(uniforms.uOffsetY, 'value', 0, 20, 0.001).name('uOffsetY')
gui.add(uniforms.uStrength, 'value', 0, 10, 0.001).name('uStrength')
gui.add(uniforms.uWarpFrequency, 'value', 0, 10, 0.001).name('uWarpFrequency')
gui.add(uniforms.uWarpStrength, 'value', 0, 1, 0.001).name('uWarpStrength')
gui.addColor(debugObject, 'colorWaterDeep').onChange(() => uniforms.uColorWaterDeep.value.set(debugObject.colorWaterDeep))
gui.addColor(debugObject, 'colorWaterSurface').onChange(() => uniforms.uColorWaterSurface.value.set(debugObject.colorWaterSurface))
gui.addColor(debugObject, 'colorSand').onChange(() => uniforms.uColorSand.value.set(debugObject.colorSand))
gui.addColor(debugObject, 'colorGrass').onChange(() => uniforms.uColorGrass.value.set(debugObject.colorGrass))
gui.addColor(debugObject, 'colorSnow').onChange(() => uniforms.uColorSnow.value.set(debugObject.colorSnow))
gui.addColor(debugObject, 'colorRock').onChange(() => uniforms.uColorRock.value.set(debugObject.colorRock))

const material = new CustomShaderMaterial({
    // CSM
    baseMaterial: THREE.MeshStandardMaterial,
    vertexShader: terrainVertexShader,
    fragmentShader: terrainFragmentShader,
    uniforms: uniforms,
    silent: true,

    // MeshStandardMaterial
    metalness: 0,
    roughness: 0.5,
    color: '#85d534'
})

const depthMaterial = new CustomShaderMaterial({
    // CSM
    baseMaterial: THREE.MeshDepthMaterial,
    vertexShader: terrainVertexShader,
    uniforms: uniforms,
    silent: true,

    // MeshStandardMaterial
    depthPacking: THREE.RGBADepthPacking
})
const terrain = new THREE.Mesh(geometry, material)
terrain.customDepthMaterial = depthMaterial
terrain.castShadow = true
terrain.receiveShadow = true
scene.add(terrain)

// Water
const water = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20, 1, 1),
    new THREE.MeshPhysicalMaterial({
        transmission: 1,
        roughness: 0.3,
    })
)
water.rotation.x = - Math.PI * 0.5
water.position.y = - 0.1
scene.add(water)

// Board
// Brushes
const boardFill = new Brush(new THREE.BoxGeometry(21, 2, 21))
const boardHole = new Brush(new THREE.BoxGeometry(20, 2.1, 20))
// boardHole.position.y = 0.2
// boardHole.updateMatrixWorld()
// Evaluate
const evaluator = new Evaluator()
const board = evaluator.evaluate(boardFill, boardHole, SUBTRACTION)
board.geometry.clearGroups()
board.material = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0, roughness: 0.3 })
board.castShadow = true
board.receiveShadow = true
scene.add(board)

// const axesHelper = new THREE.AxesHelper(2)
// scene.add(axesHelper)

// const geometryCoral = new THREE.BufferGeometry()

// const count = 50
// const positionsArray = new Float32Array(count * 3 * 3)

// for(let i = 0; i < count * 3 * 3; i++)
// {
//     positionsArray[i] = (Math.random() - 0.5)*4
// }

// const positionsAttribute = new THREE.BufferAttribute(positionsArray, 3)
// geometryCoral.setAttribute('position', positionsAttribute)

// const materialCoral = new THREE.MeshBasicMaterial({ 
//     color: 0xff0000,
//  })
// const meshCoral = new THREE.Mesh(geometryCoral, materialCoral)
// scene.add(meshCoral)


/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 2)
directionalLight.position.set(6.25, 3, 4)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.near = 0.1
directionalLight.shadow.camera.far = 30
directionalLight.shadow.camera.top = 8
directionalLight.shadow.camera.right = 8
directionalLight.shadow.camera.bottom = -8
directionalLight.shadow.camera.left = -8
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 100)
camera.position.set(2.28, 7.59, -12.2)
camera.rotation.set(-2.497, 0.14, 3.03)
scene.add(camera)

// Controls
// const controls = new OrbitControls(camera, canvas)
// controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

const openAIClient = new OpenAIClient("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");

const cameraMovement = (targetIndex) => {
    let apiRequestSent = false; // Add a flag to prevent multiple requests

    const oceanPart = points[targetIndex].element.getAttribute('data-ocean-part');
    const bodyPart = points[targetIndex].element.getAttribute('data-body-part');

    gsap.to(camera.position, { 
        duration: 2, 
        x: points[targetIndex].position.x,
        y: points[targetIndex].position.y + 1,
        z: points[targetIndex].position.z - 2,

        ease: "power3.out",
        onUpdate: async function() {
            if (this.progress() >= 0.5 && !points[targetIndex].element.querySelector('.text').classList.contains('bubble')) {
                points[targetIndex].element.querySelector('.text').classList.add('bubble');
            }
            // Send the prompt at 70% progress, but only once

            if (this.progress() >= 0.7 && !apiRequestSent) {
                apiRequestSent = true; // Set the flag to prevent multiple requests
                try {
                    const prompt = `Explain how the ${bodyPart} in humans is comparable to the ${oceanPart} in the ocean in a few sentences in French up to 30 words.`;
                    const completion = await openAIClient.getCompletion(prompt);

                    // Update the text element with the response
                    const textElement = points[targetIndex].element.querySelector('.text');
                    if (textElement) {
                        textElement.textContent = completion; // Replace the existing text with the completion response
                    }
                } catch (error) {
                    console.error("Error fetching completion:", error);

                    // Optional: Update the text to show an error message
                    const textElement = points[targetIndex].element.querySelector('.text');
                    if (textElement) {
                        textElement.textContent = "Erreur lors de l'inférence.";
                    }
                }
            }
        },
        onComplete: function() {
            // Reset the flag for the next movement animation if needed
            apiRequestSent = false;
        },
    })
}

// Reset camera position
const resetCamera = () => {
    gsap.to(camera.position, { duration: 2, x: 2.28, y: 7.59, z: -12.2, ease: "power3.out" });

    // Animate camera's rotation (in radians)
    gsap.to(camera.rotation, {
        duration: 2,
        x: -2.497,
        y: 0.14,
        z: 3.03,
        ease: 'power3.out',
        onComplete: () => {
            points.forEach(point => point.element.querySelector('.text').classList.remove('bubble'))
        }
    })
}

/**
 * Mouse
 */
const mouse = new THREE.Vector2()

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / sizes.width) * 2 - 1
    mouse.y = - (event.clientY / sizes.height) * 2 + 1
})

let isZoomed = false
points.forEach((point, index) => {
    if (point.element) {
        point.element.addEventListener('click', () => {
            if (!isZoomed) {
                cameraMovement(index)
                isZoomed = true
            } 
            else {
                resetCamera()
                isZoomed = false
            }
        })

        // Change cursor to pointer on hover
        point.element.addEventListener('mouseenter', () => {
            document.body.style.cursor = 'pointer'
        })

        // Reset cursor when not hovering
        point.element.addEventListener('mouseleave', () => {
            document.body.style.cursor = 'default'
        })
    }
})

window.addEventListener('click', (event) => {
        if (event.target === canvas) {
            resetCamera()
            
            isZoomed = false
        }
    }
)

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Uniforms
    uniforms.uTime.value = elapsedTime

    const elapsedTimeDivided = elapsedTime / 100

    // // Update boat
    if(boat)
    {
        boat.position.x += Math.cos(elapsedTimeDivided * 100) / 150
        boat.position.z += Math.cos(elapsedTimeDivided * 100) / 150
    }

    for (const point of points) 
    {
        const screenPosition = point.position.clone()
        screenPosition.project(camera)

        const translateX = screenPosition.x * sizes.width * 0.5
        const translateY = - screenPosition.y * sizes.height * 0.5
        point.element.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`
    }

    // Update controls
    // controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()