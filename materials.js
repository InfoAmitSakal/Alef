import * as THREE from './assets/three.module.min.js';

export function createMaterialSet(renderer, scene, onLoad) {
  const loader = new THREE.TextureLoader();
  const getTexture = (name, color = false) => {
    const texture = loader.load(new URL('./assets/' + name + '.webp', import.meta.url).href, onLoad);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  const lightMap = studioEnvironment();
  const generator = new THREE.PMREMGenerator(renderer);
  const environment = generator.fromEquirectangular(lightMap);
  scene.environment = environment.texture;
  generator.dispose();
  lightMap.dispose();

  const stoneBump = getTexture('stone-bump');
  const brush = getTexture('brushed');
  const fluidBump = getTexture('fluid-bump');
  const metal = new THREE.MeshPhysicalMaterial({
    color: '#a697ee', metalness: .91, roughness: .27, roughnessMap: brush,
    bumpMap: brush, bumpScale: .008, anisotropy: .44, envMapIntensity: 1.45,
    clearcoat: .25, clearcoatRoughness: .25
  });
  const stone = new THREE.MeshStandardMaterial({
    color: '#c4ac98', map: getTexture('stone', true), bumpMap: stoneBump,
    bumpScale: .105, roughness: .93, metalness: 0, envMapIntensity: .40
  });
  const mirror = new THREE.MeshStandardMaterial({
    color: '#f1f4ff', metalness: 1, roughness: .026, envMapIntensity: 1.72
  });
  const fur = new THREE.MeshStandardMaterial({
    color: '#ee91c2', map: getTexture('fur', true), roughness: 1, envMapIntensity: .43
  });
  const latexBump = getTexture('latex-bump');
  latexBump.repeat.setScalar(.52);
  latexBump.offset.set(.5,.5);
  const liquid = new THREE.MeshPhysicalMaterial({
    color: '#c7edff', metalness: 0, roughness: .074, transmission: .89,
    ior: 1.333, thickness: .55, attenuationColor: '#7dd7f6', attenuationDistance: 1.95,
    bumpMap: fluidBump, bumpScale: .063, envMapIntensity: 2.0
  });
  const rubber = new THREE.MeshPhysicalMaterial({
    color: '#111116', metalness: 0, roughness: .245,
    bumpMap: latexBump, bumpScale: .105,
    clearcoat: .9, clearcoatRoughness: .17, envMapIntensity: 1.72,
    specularIntensity: 1
  });
  const wood = new THREE.MeshStandardMaterial({
    color: '#fff2dc', map: getTexture('wood', true), bumpMap: getTexture('wood'),
    bumpScale: .048, roughness: .69, metalness: 0, envMapIntensity: .57
  });
  const print = (name, roughness) => {
    const map = getTexture(name, true);
    map.repeat.setScalar(.56);
    map.offset.set(.5,.5);
    return new THREE.MeshStandardMaterial({ map, roughness, envMapIntensity: .33 });
  };
  const graffiti = print('graffiti', .88);
  const comic = print('comic', .69);
  return { choices: { metal, stone, mirror, fur, liquid, rubber, wood, graffiti, comic }, fluidBump };
}

function studioEnvironment() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#939bb8');
  sky.addColorStop(.33, '#44415c');
  sky.addColorStop(.5, '#141322');
  sky.addColorStop(.67, '#343147');
  sky.addColorStop(1, '#1c192e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 512);

  const softboxes = [
    [180,71,195,115,-.25,'#f5f0ff','#9790b3'],
    [453,119,49,247,.19,'#f8f5ff','#747394'],
    [593,211,205,38,-.13,'#b5a7ff','#554588'],
    [859,111,82,183,-.21,'#e8f6fe','#698bb7'],
    [109,324,179,32,.06,'#bea0ff','#534179'],
    [739,350,205,58,-.16,'#8c89ae','#3b3650']
  ];
  for (const [x, y, width, height, rotation, center, edge] of softboxes) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.shadowColor = edge;
    ctx.shadowBlur = 24;
    const gradient = ctx.createLinearGradient(-width/2, -height/2, width/2, height/2);
    gradient.addColorStop(0, edge);
    gradient.addColorStop(.63, center);
    gradient.addColorStop(1, '#c0c6db');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(-width/2, -height/2, width, height, 5);
    ctx.fill();
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
