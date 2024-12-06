import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { gsap } from "gsap";

const images =  [
    'Andoni.png',
    'Baptiste.png',
    'Francois.png',
    'Geryes.png',
    'Hugues.png',
    'Matthias.png',
    'Peter.png',
    'Thomas.png',
]

const dev = [
    'Andoni',
    'Baptiste',
    'François',
    'Geryes',
    'Hugues',
    'Matthias',
    'Peter',
    'Thomas',
]

const title = [
    'Présent',
    'Le cerveau',
    'Gribouilleur',
    'Le bonhomme d\'eau',
    'Annihilateur Idéologique',
    'Chateau de sable',
    'Entraineur de ping-pong',
    'Tonnelier',
]

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const rootNode = new THREE.Object3D();
scene.add(rootNode);

let count = 8;
for (let i = 0; i < count; i++) {
    const baseNode = new THREE.Object3D();
    baseNode.rotation.y = i * Math.PI * 2 / count;
    rootNode.add(baseNode);

    const border = new THREE.Mesh(
        new THREE.BoxGeometry(2.8,3.3,0.1),
        new THREE.MeshStandardMaterial({ color: 0x202020 })
    );
    border.position.z = -4.05;
    baseNode.add(border);

    const image = new THREE.Mesh(
        new THREE.BoxGeometry(2.5,3,0.1),
        new THREE.MeshStandardMaterial({ map: new THREE.TextureLoader().load(`./images/${images[i]}`) })
    );
    image.position.z = -4;
    baseNode.add(image);

    const left = new THREE.Mesh(
        new THREE.BoxGeometry(0.2,0.2,0.1),
        new THREE.MeshStandardMaterial({ 
            map: new THREE.TextureLoader().load(`./images/left.png`),
            transparent: true,
         })
    );
    left.name = 'left';
    if (i === count-1) {
        left.userData = 0;

    }
    else {
        left.userData = i+1;
    }
    left.position.set(1.8,0,-4);
    baseNode.add(left);
    const right = new THREE.Mesh(
        new THREE.BoxGeometry(0.2,0.2,0.1),
        new THREE.MeshStandardMaterial({ 
            map: new THREE.TextureLoader().load(`./public/right.png`),
            transparent: true,
         })
    );
    right.name = 'right'; 
    if (i === 0) {
        right.userData = count-1;
    }
    else{
        right.userData = i-1;
    }
    right.position.set(-1.8,0,-4);
    baseNode.add(right);
    console.log("right",right.userData);
    console.log("left",left.userData);

}

const light  =  new THREE.SpotLight(0xffffff, 100.0,10.0,0.65,1);
light.position.set(0,5,0);
light.target.position.set(0,0.5,-5);
scene.add(light);
scene.add(light.target);

const mirror = new Reflector(
    new THREE.CircleGeometry(10),
    {
        color : 0xffffff,
        textureWidth : window.innerWidth,
        textureHeight : window.innerHeight,
    }
)
mirror.position.y = -1.1;
mirror.rotateX(-Math.PI / 2);
scene.add(mirror);

function rotateGallery(direction, newIndex) {
    const deltaY = direction * (Math.PI * 2 / count);

    console.log(`Rotating gallery. Direction: ${direction}, New Index: ${newIndex}`);
    gsap.to(rootNode.rotation, {
        y: rootNode.rotation.y + deltaY,
        duration: 1, 
        ease: "power2.inOut", 
        onStart: () => {
            document.getElementById('dev').style.opacity = 0;
            document.getElementById('title').style.opacity = 0;
        },
        onComplete: () => {
            console.log(`Updating dev and title. New Index: ${newIndex}`);
            document.getElementById('dev').style.opacity = 1;
            document.getElementById('title').style.opacity = 1;
            document.getElementById('dev').innerText = dev[newIndex];
            document.getElementById('title').innerText = title[newIndex];
        }
    });
}

function animate() {    
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    mirror.getRenderTarget().setSize(window.innerWidth, window.innerHeight);
}); 

window.addEventListener('click', (ev) => {
    const raycaster = new THREE.Raycaster();

    const mouse = new THREE.Vector2(
        (ev.clientX / window.innerWidth) * 2 - 1,
        -(ev.clientY / window.innerHeight) * 2 + 1
    );  

    raycaster.setFromCamera(mouse, camera);

    const intersections = raycaster.intersectObject(rootNode, true);
    if (intersections.length > 0) {
        const obj = intersections[0].object;
        const newIndex = obj.userData;
        console.log(`Object clicked: ${obj.name}, New Index: ${newIndex}`);
        if (obj.name === 'left') {
            rotateGallery(-1,newIndex-1);
        }
        if (obj.name === 'right') {
            rotateGallery(1,newIndex+1);
        }
    }
});

document.getElementById('dev').innerHTML = dev[0];
document.getElementById('title').innerHTML = title[0];