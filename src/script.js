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
        position: new THREE.Vector3(3, 1, - 0.7),
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
        // gui.add(boat.position, 'x', -10, 10, 0.001).name('boatX')
        // gui.add(boat.position, 'y', -10, 10, 0.001).name('boatY')
        // gui.add(boat.position, 'z', -10, 10, 0.001).name('boatZ')
        // gui.add(boat.rotation, 'y', -Math.PI, Math.PI, 0.001).name('boatRotY')
    }
)

let barrel = null;
const riseTarget = -0.200; // Position finale de la montée
const oscillationMin = -0.300; // Limite inférieure de l'oscillation
const oscillationMax = -0.200; // Limite supérieure de l'oscillation
const riseSpeed = 0.01; // Vitesse de montée
const oscillationSpeed = 2; // Vitesse de l'oscillation

let animationPhase = 'rising'; // Phase actuelle : "rising" ou "oscillating"

const raycaster = new THREE.Raycaster();

gltfLoader.load(
    './tonneau.glb',
    (gltf) => {
        barrel = gltf.scene;
        barrel.scale.set(0.005, 0.005, 0.005);
        barrel.position.set(Math.random() * 18 - 9, -4, Math.random() * -6);
        barrel.rotation.y = Math.PI / 2;
        scene.add(barrel);

        // Add GUI controls for the barrel after it has been loaded
        // gui.add(barrel.position, 'x', -10, 10, 0.001).name('barrelX');
        // gui.add(barrel.position, 'y', -10, 10, 0.001).name('barrelY');
        // gui.add(barrel.position, 'z', -10, 10, 0.001).name('barrelZ');
    }
);

const coralPositions = [
    { x: 0, y: -1.345, z: -0.3 },
    { x: 0.599, y: -1.345, z: -0.35 },
    { x: 0.300, y: -1.345, z: -0.35 },
    { x: -0.374, y: -1.348, z: -0.374 },
    { x: 0.981, y: -1.327, z: -0.503 }
];

for (let i = 0; i < coralPositions.length; i++) {
    gltfLoader.load(
        './coral.glb',
        (gltf) => {
            const coral = gltf.scene;
            coral.scale.set(0.05, 0.05, 0.05);
            coral.position.set(coralPositions[i].x, coralPositions[i].y, coralPositions[i].z);
            scene.add(coral);
        }
    );
}

/**
 * Terrain
 */
// Geometry
const geometry = new THREE.PlaneGeometry(50, 50, 500, 500)
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


// gui.add(uniforms.uPositionFrequency, 'value', 0, 1, 0.001).name('uPositionFrequency')
// gui.add(uniforms.uOffsetX, 'value', 0, 20, 0.001).name('uOffsetX')
// gui.add(uniforms.uOffsetY, 'value', 0, 20, 0.001).name('uOffsetY')
// gui.add(uniforms.uStrength, 'value', 0, 10, 0.001).name('uStrength')
// gui.add(uniforms.uWarpFrequency, 'value', 0, 10, 0.001).name('uWarpFrequency')
// gui.add(uniforms.uWarpStrength, 'value', 0, 1, 0.001).name('uWarpStrength')
// gui.addColor(debugObject, 'colorWaterDeep').onChange(() => uniforms.uColorWaterDeep.value.set(debugObject.colorWaterDeep))
// gui.addColor(debugObject, 'colorWaterSurface').onChange(() => uniforms.uColorWaterSurface.value.set(debugObject.colorWaterSurface))
// gui.addColor(debugObject, 'colorSand').onChange(() => uniforms.uColorSand.value.set(debugObject.colorSand))
// gui.addColor(debugObject, 'colorGrass').onChange(() => uniforms.uColorGrass.value.set(debugObject.colorGrass))
// gui.addColor(debugObject, 'colorSnow').onChange(() => uniforms.uColorSnow.value.set(debugObject.colorSnow))
// gui.addColor(debugObject, 'colorRock').onChange(() => uniforms.uColorRock.value.set(debugObject.colorRock))

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
    new THREE.PlaneGeometry(50, 50, 1, 1),
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
const boardFill = new Brush(new THREE.BoxGeometry(51, 2, 51))
const boardHole = new Brush(new THREE.BoxGeometry(50, 2.1, 50))
// boardHole.position.y = 0.2
// boardHole.updateMatrixWorld()
// Evaluate
const evaluator = new Evaluator()
const board = evaluator.evaluate(boardFill, boardHole, SUBTRACTION)
board.geometry.clearGroups()
board.material = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0, roughness: 0.3 })
board.castShadow = true
board.receiveShadow = true
// scene.add(board)

/**
 * Lights
 */
// const directionalLight = new THREE.DirectionalLight('#ffffff', 2)
// directionalLight.position.set(6.25, 3, 4)
// directionalLight.castShadow = true
// directionalLight.shadow.mapSize.set(1024, 1024)
// directionalLight.shadow.camera.near = 0.1
// directionalLight.shadow.camera.far = 30
// directionalLight.shadow.camera.top = 8
// directionalLight.shadow.camera.right = 8Mo
// directionalLight.shadow.camera.bottom = -8
// directionalLight.shadow.camera.left = -8
// scene.add(directionalLight)

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
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

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

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openAIClient = new OpenAIClient(apiKey);

const cameraMovement = (targetIndex) => {
    resetCamera();

    let apiRequestSent = false; // Add a flag to prevent multiple requests

    const oceanPart = points[targetIndex].element.getAttribute('data-ocean-part');
    const bodyPart = points[targetIndex].element.getAttribute('data-body-part');

    let offsetY = 1;
    let rotationX = -Math.PI / 2; // Default rotationX

    if (targetIndex === 1) {
        offsetY = -1;
        rotationX = -Math.PI; // Update rotationX for index 1
    }

    console.log(targetIndex);
    

    gsap.to(camera.position, { 
        duration: 2, 
        x: points[targetIndex].position.x,
        y: points[targetIndex].position.y + offsetY,
        z: points[targetIndex].position.z - 2,
        ease: "power3.out",
        onUpdate: async function() {
            if (this.progress() >= 0.5 && !points[targetIndex].element.querySelector('.text').classList.contains('bubble')) {
                points[targetIndex].element.querySelector('.card-img').classList.add('bubble');
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
    });

    // Animate the camera rotation
    gsap.to(camera.rotation, {
        duration: 2,
        x: rotationX,
        ease: "power3.out"
    });
};


// Reset camera position
const resetCamera = () => {
    
    gsap.to(camera.position, { duration: 2, x: 2.28, y: 7.59, z: -12.2, ease: "power3.out" });

    // Animate camera's rotation (in radians)
    gsap.to(camera.rotation, {
        duration: 2,
        x: -2.497,
        y: 0.14,
        z: 0,
        ease: 'power3.out',
        onComplete: () => {
            points.forEach(point => point.element.querySelector('.card-img').classList.remove('bubble'))
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

const logo = document.getElementById('logo');
const container = document.getElementById('particles-container');

function explodeLogo() {
    // Make the logo and particle container visible
    logo.style.visibility = 'visible'; // Ensure visibility is set to visible
    container.style.visibility = 'visible'; // Ensure container is also visible

    // Reset the logo's scale and opacity for each click
    gsap.set(logo, { scale: 1, opacity: 1 });

    // Create more particles
    createParticles(container);

    // GSAP animation for the logo explosion with a duration of 1 second
    gsap.timeline()
        .to(logo, {
            duration: 2,      // Duration reduced to 1 second for faster explosion
            scale: 4,         // Logo grows to 4x its original size
            opacity: 0,       // Logo fades out
            ease: "power1.out"
        });
}

// Function to create more particles for the explosion effect
function createParticles(container) {
    // First, clear any existing particles
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Create 120 particles
    for (let i = 0; i < 60; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        container.appendChild(particle);

        // Randomize the direction and size of the particles
        const angle = Math.random() * 360;
        const distance = Math.random() * 200 + 100;  // Random distance between 100px and 300px
        const size = Math.random() * 10 + 20;  // Random size between 20px and 30px

        // Randomize color for particles (yellow, orange, red)
        const colors = ['#FF4500', '#FFD700'];  // Orange, Yellow
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Position the particles at the center of the logo initially
        particle.style.position = 'absolute';
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.backgroundColor = color;  // Set random color
        particle.style.borderRadius = '50%';
        particle.style.top = '50%';
        particle.style.left = '50%';
        particle.style.transformOrigin = 'center center';
        particle.style.transform = `translate(-50%, -50%)`;

        // GSAP animation for the particles (faster explosion with a duration of 1 second)
        gsap.to(particle, {
            duration: 2,        // Duration reduced to 1 second
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            scale: 0,           // Shrink particles to simulate explosion
            opacity: 0,         // Fade out particles
            ease: "power1.out",
            onComplete: () => particle.remove() // Remove particle after animation
        });
    }
}

window.addEventListener('click', (event) => {
        if (event.target === canvas) {
            if (isZoomed) {
                resetCamera()
            }
            
            isZoomed = false
        }

        // Mettre à jour le raycaster avec la position de la caméra et la direction de la souris
        raycaster.setFromCamera(mouse, camera);

        // Vérifier les intersections avec le tonneau
        if (barrel) {
            const intersects = raycaster.intersectObject(barrel, true); // `true` pour vérifier tous les enfants du modèle

            if (intersects.length > 0) {
                console.log('Tonneau cliqué !', intersects[0].object);
                alert('Tonneau cliqué !'); // Action lors du clic sur le tonneau
                explodeLogo()

                barrel.position.set(Math.random() * 18 - 9, -4, Math.random() * -5)
                animationPhase = 'rising'
            }
        }
    }
)

document.getElementById('info-button').addEventListener('click', () => {
    window.location.href = 'https://example.com'; // Replace this with the desired URL
  })

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

    if (barrel) {
        if (animationPhase === 'rising') {
            // Phase de montée
            if (barrel.position.y < riseTarget) {
                barrel.position.y += riseSpeed; // Monter progressivement
            } else {
                // Passer immédiatement à l'oscillation
                animationPhase = 'oscillating';
            }
        } else if (animationPhase === 'oscillating') {
            // Phase d'oscillation
            const amplitude = (oscillationMax - oscillationMin) / 2;
            const offset = oscillationMin + amplitude;
            barrel.position.y = offset + amplitude * Math.sin(elapsedTime * oscillationSpeed);
        }
    }

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()