import * as THREE from './assets/three.module.min.js';
import outlines from './outline.js';

export function createLetter() {
  const group = new THREE.Group();
  const meshes = outlines.map((outline) => {
    const points = outline.map(([x, y]) => new THREE.Vector2((x - 540) / 260, (675 - y) / 260));
    if (points[0].equals(points.at(-1))) points.pop();
    const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points), {
      depth: .52,
      bevelEnabled: true,
      bevelSize: .035,
      bevelThickness: .035,
      bevelSegments: 4,
      steps: 1
    });
    geometry.translate(0, 0, -.26);

    // Keep the texture scale consistent on the faces, the bevels, and the sides.
    const { position, normal, uv } = geometry.attributes;
    for (let i = 0; i < uv.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      if (Math.abs(normal.getZ(i)) > .6) uv.setXY(i, x * .66, y * .66);
      else uv.setXY(i, (Math.abs(normal.getX(i)) > .6 ? y : x) * .66, z * .66);
    }

    const mesh = new THREE.Mesh(geometry);
    group.add(mesh);
    return mesh;
  });
  return { group, meshes };
}

export function createFur(meshes) {
  THREE.MathUtils.seededRandom(51817);
  const next = () => THREE.MathUtils.seededRandom();
  const positions = [];
  const colors = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const light = new THREE.Vector3(-.5, 1, 1).normalize();
  const root = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const end = new THREE.Vector3();
  const middle = new THREE.Vector3();
  const rootColor = new THREE.Color();
  const midColor = new THREE.Color();
  const tipColor = new THREE.Color();
  const color = new THREE.Color();

  function addSegment(from, to, first, last) {
    positions.push(...from.toArray(), ...to.toArray());
    colors.push(...first.toArray(), ...last.toArray());
  }

  for (const mesh of meshes) {
    const vertices = mesh.geometry.attributes.position;
    for (let i = 0; i < vertices.count; i += 3) {
      a.fromBufferAttribute(vertices, i);
      b.fromBufferAttribute(vertices, i + 1);
      c.fromBufferAttribute(vertices, i + 2);
      edge.subVectors(b, a);
      normal.subVectors(c, a).cross(edge);
      const area = normal.length() * .5;
      normal.normalize().negate();
      const strands = Math.floor(area * 2800 + next());
      const illumination = .55 + Math.max(0, normal.dot(light)) * .45;
      for (let j = 0; j < strands; j++) {
        let u = next();
        let v = next();
        if (u + v > 1) { u = 1 - u; v = 1 - v; }
        root.copy(a).multiplyScalar(1-u-v).addScaledVector(b,u).addScaledVector(c,v);
        direction.set(next()-.5, next()-.5, next()-.5).multiplyScalar(.62).add(normal);
        const length = .033 + .106 * Math.pow(next(), 1.25);
        bend.set((next()-.5)*.065,-.040,(next()-.5)*.06);
        middle.copy(root).addScaledVector(direction,length*.55).addScaledVector(bend,.22);
        end.copy(root).addScaledVector(direction,length).add(bend);
        const variation = next();
        color.setHSL(.889 + next()*.070, .59 + next()*.19, .44 + variation*.39).convertSRGBToLinear();
        rootColor.copy(color).multiplyScalar(illumination*.40);
        midColor.copy(color).multiplyScalar(illumination*.88);
        tipColor.copy(color).multiplyScalar(illumination*(.77 + next()*.32));
        addSegment(root, middle, rootColor, midColor);
        addSegment(middle, end, midColor, tipColor);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({vertexColors: true, toneMapped: false}));
}
