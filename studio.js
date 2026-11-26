import * as THREE from './assets/three.module.min.js';
import { createFur, createLetter } from './geometry.js';
import { createMaterialSet } from './materials.js';
import { createSoftwareRenderer } from './software.js';

const viewport = document.querySelector('#viewport');
const spinButton = document.querySelector('#spin');
const depth = document.querySelector('#depth');
const materials = [...document.querySelectorAll('.material')];
const angles = [...document.querySelectorAll('.angle')];

try {
  startStudio();
} catch (error) {
  console.error(error);
  document.querySelector('#fallback').hidden = false;
  for (const control of document.querySelectorAll('button, input')) control.disabled = true;
}

function startStudio() {
  const { group, meshes } = createLetter();
  const latex = createLetter(true);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', {alpha:true, antialias:true});
  const renderer = context
    ? new THREE.WebGLRenderer({canvas, context, alpha:true, antialias:true})
    : createSoftwareRenderer(meshes, latex.meshes, () => requestRender());
  if (context) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.13;
  }
  viewport.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 80);
  camera.position.set(0, 1.14, 8.7);
  camera.lookAt(0, -.18, 0);
  camera.updateMatrixWorld();

  const hemi = new THREE.HemisphereLight('#f4efff', '#52416a', 1.55);
  scene.add(hemi);
  for (const [color, strength, x, y, z] of [
    ['#fff1e7', 2.85, -4, 6, 5],
    ['#b2a0ff', 1.16, 4, 1.5, 3],
    ['#d1c4ff', 2.2, 2, 3, -6]
  ]) {
    const light = new THREE.DirectionalLight(color, strength);
    light.position.set(x,y,z);
    scene.add(light);
  }

  scene.add(group);
  group.add(latex.group);
  latex.group.visible = false;
  if (context) scene.add(createGround());
  const gpu = context ? createMaterialSet(renderer, scene, () => requestRender()) : null;
  const views = [
    [.08, -.44, -.10],
    [-.36, .55, .16],
    [.48, .52, .27],
    [.14, -.78, -.31]
  ].map(([x,y,z]) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'YXZ')));

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointers = new Map();
  const xAxis = new THREE.Vector3(1,0,0);
  const yAxis = new THREE.Vector3(0,1,0);
  const rotation = new THREE.Quaternion();
  const target = new THREE.Quaternion();
  let movingToPreset = false;
  let spinning = false;
  let selected = 'metal';
  let zoom = 1;
  let fur;
  let frame = 0;
  let previousTime = null;
  let time = 0;
  const ripple = { energy:0, x:0, y:0 };

  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function render(now) {
    frame = 0;
    const dt = previousTime === null ? 0 : Math.min(.045, (now - previousTime) / 1000);
    previousTime = now;
    time += dt;
    ripple.energy *= Math.exp(-dt*2.15);
    if (ripple.energy < .002) ripple.energy = 0;
    ripple.x *= Math.exp(-dt*2.9);
    ripple.y *= Math.exp(-dt*2.9);
    if (spinning) group.quaternion.premultiply(rotation.setFromAxisAngle(yAxis, dt * .66));
    if (movingToPreset) {
      group.quaternion.slerp(target, 1 - Math.exp(-dt * 12));
      if (group.quaternion.angleTo(target) < .002) {
        group.quaternion.copy(target);
        movingToPreset = false;
      }
    }
    if (gpu) {
      if (selected === 'liquid') {
        gpu.choices.liquid.bumpScale = .063 + ripple.energy*.16;
        const waterTime = reducedMotion.matches ? 0 : time;
        gpu.fluidBump.offset.set((waterTime*.045 + ripple.x*.21)%1, (waterTime*.028 + ripple.y*.21)%1);
      }
      renderer.render(scene, camera);
    } else {
      renderer.render(camera, group, selected, reducedMotion.matches ? 0 : time, fur, ripple);
    }
    if (spinning || movingToPreset || (selected === 'liquid' && !reducedMotion.matches)) requestRender();
    else previousTime = null;
  }

  function resize() {
    const { width, height } = viewport.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.zoom = Math.min(1.19, camera.aspect * 1.18) * zoom;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    requestRender();
  }

  function pickMaterial(button) {
    selected = button.dataset.material;
    for (const choice of materials) choice.setAttribute('aria-pressed', choice === button);
    document.querySelector('#active-material').textContent = button.textContent.trim();
    latex.group.visible = selected === 'rubber';
    for (const mesh of meshes) mesh.visible = selected !== 'rubber';
    if (gpu) {
      for (const mesh of meshes) mesh.material = gpu.choices[selected];
      for (const mesh of latex.meshes) mesh.material = gpu.choices.rubber;
    }
    if (selected === 'fur' && !fur) {
      fur = createFur(meshes);
      group.add(fur);
    }
    if (fur) fur.visible = selected === 'fur';
    requestRender();
  }

  function setSpin(value) {
    spinning = value;
    if (value) {
      movingToPreset = false;
      flagAngle(-1);
    }
    spinButton.setAttribute('aria-pressed', value);
    spinButton.querySelector('use').setAttribute('href', value ? '#pause' : '#play');
    spinButton.querySelector('span').textContent = value ? 'עצירת סיבוב' : 'סיבוב אוטומטי';
    requestRender();
  }

  function flagAngle(index) {
    angles.forEach((button, i) => button.setAttribute('aria-pressed', i === index));
  }

  function setView(index, animate = true) {
    setSpin(false);
    target.copy(views[index]);
    movingToPreset = animate && !reducedMotion.matches;
    if (!movingToPreset) group.quaternion.copy(target);
    flagAngle(index);
    requestRender();
  }

  function adjustDepth() {
    group.scale.z = .26 + Number(depth.value) * .016;
    document.querySelector('#depth-value').value = depth.value + '%';
    requestRender();
  }

  function adjustZoom(amount) {
    zoom = THREE.MathUtils.clamp(zoom * amount, .59, 1.8);
    resize();
  }

  function drag(dx, dy) {
    if (selected === 'liquid' && !reducedMotion.matches) {
      ripple.energy = Math.min(1, ripple.energy + Math.hypot(dx,dy)*1.15);
      ripple.x = THREE.MathUtils.clamp(ripple.x + dx, -1, 1);
      ripple.y = THREE.MathUtils.clamp(ripple.y + dy, -1, 1);
    }
    movingToPreset = false;
    flagAngle(-1);
    group.quaternion.premultiply(rotation.setFromAxisAngle(yAxis, dx));
    group.quaternion.premultiply(rotation.setFromAxisAngle(xAxis, dy));
    group.quaternion.normalize();
    requestRender();
  }

  for (const button of materials) button.addEventListener('click', () => pickMaterial(button));
  for (const angle of angles) angle.addEventListener('click', () => setView(Number(angle.dataset.angle)));
  spinButton.addEventListener('click', () => setSpin(!spinning));
  document.querySelector('#reset-view').addEventListener('click', () => {
    zoom = 1;
    resize();
    setView(0);
  });
  depth.addEventListener('input', adjustDepth);
  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || pointers.size >= 2) return;
    viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x:event.clientX, y:event.clientY });
    viewport.classList.add('dragging');
    setSpin(false);
  });
  viewport.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const next = {x:event.clientX, y:event.clientY};
    if (pointers.size === 2) {
      const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)[1];
      const before = Math.hypot(other.x - previous.x, other.y - previous.y);
      const after = Math.hypot(other.x - next.x, other.y - next.y);
      if (before > 1) adjustZoom(after / before);
    } else {
      drag((next.x - previous.x) * .009, (next.y - previous.y) * .009);
    }
    pointers.set(event.pointerId, next);
  });
  function release(event) {
    pointers.delete(event.pointerId);
    if (!pointers.size) viewport.classList.remove('dragging');
  }
  for (const type of ['pointerup','pointercancel','lostpointercapture']) viewport.addEventListener(type, release);
  viewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    const scale = event.deltaMode === 1 ? 15 : event.deltaMode === 2 ? 400 : 1;
    adjustZoom(Math.exp(-event.deltaY * scale * .00125));
  }, {passive:false});
  const arrowKeys = {ArrowLeft:[-.16,0], ArrowRight:[.16,0], ArrowUp:[0,-.16], ArrowDown:[0,.16]};
  viewport.addEventListener('keydown', (event) => {
    if (Object.hasOwn(arrowKeys, event.key)) {
      event.preventDefault();
      setSpin(false);
      drag(...arrowKeys[event.key]);
    } else if (['+','=','-'].includes(event.key)) {
      event.preventDefault();
      adjustZoom(event.key === '-' ? .91 : 1.1);
    }
  });
  reducedMotion.addEventListener('change', requestRender);
  renderer.domElement.addEventListener('webglcontextrestored', requestRender);
  new ResizeObserver(resize).observe(viewport);
  pickMaterial(materials[0]);
  setView(0, false);
  adjustDepth();
  resize();
}

function createGround() {
  const group = new THREE.Group();
  group.position.y = -1.80;
  const grid = new THREE.GridHelper(12, 24, '#9380c2', '#776699');
  grid.material.transparent = true;
  grid.material.opacity = .12;
  group.add(grid);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64,64,2,64,64,64);
  gradient.addColorStop(0,'rgba(4,3,11,.77)');
  gradient.addColorStop(.36,'rgba(5,3,13,.41)');
  gradient.addColorStop(1,'rgba(7,4,15,0)');
  context.fillStyle = gradient;
  context.fillRect(0,0,128,128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6,3.1),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas), transparent:true, depthWrite:false})
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .002;
  group.add(shadow);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.73,1.742,120),
    new THREE.MeshBasicMaterial({color:'#9c82f3', transparent:true, opacity:.42, depthWrite:false})
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .007;
  group.add(ring);
  return group;
}
