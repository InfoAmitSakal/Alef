import * as THREE from './assets/three.module.min.js';

// Canvas renderer for devices where a WebGL context is unavailable.
export function createSoftwareRenderer(meshes, latexMeshes, onLoad) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const polygons = meshes.flatMap(({geometry}) => readPolygons(geometry));
  const latexPolygons = latexMeshes.flatMap(({geometry}) => readPolygons(geometry));
  const textures = {};
  for (const [name,file] of Object.entries({metal:'brushed',stone:'stone',fur:'fur',liquid:'water-caustics',rubber:'latex-finish',wood:'wood',graffiti:'graffiti',comic:'comic'})) {
    const image = new Image();
    image.onload = () => {
      textures[name] = ctx.createPattern(image, 'repeat');
      onLoad();
    };
    image.src = new URL('./assets/' + file + '.webp', import.meta.url).href;
  }
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  const projected = new THREE.Vector3();
  const world = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const intoCamera = new THREE.Vector3();
  const reflected = new THREE.Vector3();
  const lighting = new THREE.Vector3(-.54,.63,.56).normalize();
  const bounce = new THREE.Vector3(.81,-.16,.55).normalize();

  function project(v, camera, matrix) {
    world.copy(v);
    if (matrix) world.applyMatrix4(matrix);
    projected.copy(world).project(camera);
    return [width * (.5 + projected.x / 2), height * (.5 - projected.y / 2), projected.z];
  }

  function setSize(w,h) {
    width = w;
    height = h;
    pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    canvas.width = Math.round(w * pixelRatio);
    canvas.height = Math.round(h * pixelRatio);
  }

  function render(camera, group, kind, time, fur, ripple) {
    if (!width || !height) return;
    ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    ctx.clearRect(0,0,width,height);
    drawGround();
    group.updateMatrixWorld(true);
    const matrix = group.matrixWorld;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    const visible = [];
    for (const face of kind === 'rubber' ? latexPolygons : polygons) {
      normal.copy(face.normal).applyNormalMatrix(normalMatrix);
      world.copy(face.center).applyMatrix4(matrix);
      intoCamera.subVectors(camera.position, world).normalize();
      if (normal.dot(intoCamera) <= 0) continue;
      reflected.copy(intoCamera).negate().reflect(normal);
      const points = face.points.map(v => project(v,camera,matrix));
      visible.push({
        face, points, depth: project(face.center,camera,matrix)[2],
        key: Math.max(0,normal.dot(lighting)),
        fill: Math.max(0,normal.dot(bounce)),
        reflection: Math.atan2(reflected.x,reflected.z),
        elevation: reflected.y
      });
    }
    visible.sort((a,b) => b.depth - a.depth);
    for (const surface of visible) drawFace(surface);
    if (kind === 'fur' && fur) drawHair();
    return;

    function drawGround() {
      const point = (x,y,z) => project(new THREE.Vector3(x,y,z),camera);
      const segment = (a,b) => {
        const p = point(...a);
        const q = point(...b);
        ctx.moveTo(p[0],p[1]);
        ctx.lineTo(q[0],q[1]);
      };
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#b6a0fb17';
      ctx.beginPath();
      for (let i=-6;i<=6;i+=.5) {
        segment([i,-1.8,-6],[i,-1.8,4.8]);
        segment([-6,-1.8,i*.8],[6,-1.8,i*.8]);
      }
      ctx.stroke();
      const [x,y] = point(0,-1.8,0);
      const [edge] = point(1.73,-1.8,0);
      const radius = edge-x;
      ctx.save();
      ctx.translate(x,y);
      ctx.scale(1,.32);
      const shadow = ctx.createRadialGradient(0,0,0,0,0,radius*1.29);
      shadow.addColorStop(0,'#070610ca');
      shadow.addColorStop(1,'#07061000');
      ctx.fillStyle = shadow;
      ctx.fillRect(-radius*1.3,-radius*1.3,radius*2.6,radius*2.6);
      ctx.restore();
      ctx.beginPath();
      for (let i=0;i<=80;i++) {
        const a=i/80*Math.PI*2;
        const p=point(Math.cos(a)*1.73,-1.8,Math.sin(a)*1.73);
        if (i===0) ctx.moveTo(p[0],p[1]);
        else ctx.lineTo(p[0],p[1]);
      }
      ctx.strokeStyle='#a68deb66';
      ctx.stroke();
    }

    function drawFace({face, points, key, fill, reflection, elevation}) {
      ctx.beginPath();
      points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
      ctx.closePath();
      const l = Math.min(1, .17 + key*.71 + fill*.31);
      const color = (h,s,v) => `hsl(${h} ${s}% ${Math.min(96,Math.max(7,v))}%)`;
      const bounds = points.reduce(([a,b,c,d],[x,y]) => [Math.min(a,x),Math.min(b,y),Math.max(c,x),Math.max(d,y)], [Infinity,Infinity,-Infinity,-Infinity]);
      const [x0,y0,x1,y1] = bounds;
      const side = !face.cap;
      const printed = kind === 'graffiti' || kind === 'comic';
      const shift = Math.sin(reflection*2.2 + .4)*.17;
      const centeredGradient = () => ctx.createLinearGradient(x0,y0,x1===x0?x1+1:x1,y0 +(y1-y0)*(.44+elevation*.32));
      const stripe = (gradient, stops) => stops.forEach(([position,tint]) => gradient.addColorStop(THREE.MathUtils.clamp(position+shift,0,1),tint));
      let paint;
      if (kind === 'metal') {
        paint = centeredGradient();
        stripe(paint,[[0,color(252,43,18+l*28)],[.36,color(250,62,45+l*35)],[.49,color(246,44,18+l*36)],[.74,color(254,69,36+l*51)],[1,color(253,43,18+l*29)]]);
      } else if (kind === 'mirror') {
        paint = centeredGradient();
        stripe(paint,[[0,color(225,21,18+l*25)],[.22,color(227,32,43+l*25)],[.24,'#e5e8fc'],[.43,'#f7f7ff'],[.44,color(240,25,22+l*19)],[.63,color(240,22,20+l*13)],[.65,'#a9b5d7'],[.84,'#e2eaff'],[.86,color(230,30,32+l*20)],[1,'#5f6882']]);
      } else if (kind === 'liquid') {
        paint = centeredGradient();
        stripe(paint, [[0,'#7ee9ff9e'],[.21,'#3692bc52'],[.39,'#dcfbffab'],[.54,'#27679653'],[.76,'#90e9fd80'],[1,'#2c79b862']]);
      } else if (kind === 'rubber') {
        paint = centeredGradient();
        stripe(paint, [[0,'#0c0d12'],[.20,'#3a393d'],[.35,'#858589'],[.55,'#232329'],[.79,'#08090f'],[1,'#444652']]);
      } else if (printed) {
        paint = kind === 'comic' ? '#e0ae43' : '#3c2d59';
      } else if (kind === 'wood') {
        paint = color(31,45,25+l*50);
      } else {
        paint = kind === 'stone' ? color(27,13,29 + l*39) : color(329,69,27 + l*43);
      }
      ctx.fillStyle = paint;
      ctx.fill();
      if (textures[kind] && (face.cap || kind === 'liquid' || (x1-x0)*(y1-y0)>240)) {
        ctx.save();
        ctx.clip();
        const scale = Math.max(.18, Math.min(width,height)/760);
        const pattern = textures[kind];
        const origin = project(face.points[0],camera,matrix);
        const axis = project(face.points[0].clone().add(face.tangent),camera,matrix);
        pattern.setTransform(new DOMMatrix().translate(origin[0],origin[1]).rotate(Math.atan2(axis[1]-origin[1],axis[0]-origin[0])*180/Math.PI).scale(scale,scale));
        ctx.fillStyle = pattern;
        if ((printed || kind === 'rubber') && face.cap) {
          const z = face.points[0].z;
          const at = (x,y) => project(new THREE.Vector3(x,y,z),camera,matrix);
          const [x,y] = at(0,0);
          const [u,v] = at(1,0);
          const [p,q] = at(0,-1);
          const textureSize = printed ? 640 : 768;
          const uvScale = 1/(textureSize*.66*(printed ? .56 : .52));
          pattern.setTransform(new DOMMatrix([
            (u-x)*uvScale, (v-y)*uvScale, (p-x)*uvScale, (q-y)*uvScale,
            x-(u+p-2*x)*uvScale*textureSize/2, y-(v+q-2*y)*uvScale*textureSize/2
          ]));
        }
        ctx.globalAlpha = kind === 'stone' || kind === 'wood' ? .94 : kind === 'fur' ? .58 : .40;
        ctx.globalCompositeOperation = kind === 'stone' || kind === 'fur' || kind === 'wood' ? 'overlay' : 'soft-light';
        if (printed) {
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
        if (kind === 'rubber') {
          ctx.globalAlpha = side ? .29 : .91;
          ctx.globalCompositeOperation = 'source-over';
        }
        if (kind === 'liquid') {
          const [ox,oy] = project(new THREE.Vector3(0,0,face.center.z),camera,matrix);
          const phase = time*.62;
          const cell = Math.min(width,height)/3500;
          const pulse = ripple.energy;
          pattern.setTransform(new DOMMatrix().translate(
            ox + 17*Math.sin(phase) + ripple.x*70,
            oy + 14*Math.cos(phase*.83) + ripple.y*58
          ).rotate(reflection*11 + Math.sin(phase)*9)
            .skewX(ripple.x*27 + Math.sin(phase*.9)*11)
            .scale(cell*(1+pulse*.22),cell*(.78 + pulse*.36)));
          ctx.globalAlpha = (side ? .45 : .82) + pulse*.15;
          ctx.globalCompositeOperation = 'screen';
        }
        ctx.fillRect(x0,y0,x1-x0,y1-y0);
        if (kind === 'rubber') {
          ctx.globalAlpha = .48;
          ctx.globalCompositeOperation = 'soft-light';
          ctx.fillStyle = paint;
          ctx.fillRect(x0,y0,x1-x0,y1-y0);
        }
        if (printed) {
          ctx.fillStyle = `rgba(12,9,27,${(1-l)*.52 + (side ? .14 : 0)})`;
          ctx.fillRect(x0,y0,x1-x0,y1-y0);
        }
        ctx.restore();
      }
      ctx.strokeStyle = side && (kind === 'metal' || kind === 'mirror') ? color(247,28,22+l*29) : paint;
      if (kind === 'comic' && face.cap) ctx.strokeStyle = '#20162e';
      if (kind === 'liquid') ctx.strokeStyle = side ? '#a8e8ff58' : '#b7f2ffab';
      if (kind === 'rubber' && !side) ctx.strokeStyle = '#17171e';
      ctx.lineWidth = kind === 'liquid' && !side ? 1.35 : kind === 'comic' && face.cap ? 2 : side ? .58 : .42;
      ctx.stroke();
    }

    function drawHair() {
      const positions = fur.geometry.attributes.position;
      const colors = fur.geometry.attributes.color;
      const strand = new THREE.Vector3();
      const root = new THREE.Vector3();
      const mid = new THREE.Vector3();
      const end = new THREE.Vector3();
      const palette = Array.from({length:12}, () => new Path2D());
      const silhouettes = visible.filter(({face}) => face.cap);
      for (let i=0;i<positions.count;i+=20) {
        root.fromBufferAttribute(positions,i);
        mid.fromBufferAttribute(positions,i+1);
        end.fromBufferAttribute(positions,i+3);
        const a = project(root,camera,matrix);
        const b = project(mid,camera,matrix);
        const c = project(end,camera,matrix);
        strand.subVectors(mid,root).transformDirection(matrix);
        if (b[2] > a[2]+.00020 || silhouettes.some(({points,depth}) => depth<a[2]-.0011 && inside([a[0],a[1]],points))) continue;
        if (strand.z < -.22) continue;
        const tone = Math.min(11,Math.floor(Math.sqrt(colors.getX(i+3))*12));
        palette[tone].moveTo(a[0],a[1]);
        palette[tone].quadraticCurveTo(b[0],b[1],c[0],c[1]);
      }
      ctx.lineWidth = Math.max(.59, Math.min(width,height)/850);
      ctx.globalAlpha = .78;
      for (let i=0;i<palette.length;i++) {
        ctx.strokeStyle = `hsl(${315+i*1.8} 78% ${24+i*5.7}%)`;
        ctx.stroke(palette[i]);
      }
      ctx.globalAlpha = 1;
    }
  }
  return {domElement:canvas,setSize,render};
}

function readPolygons(geometry) {
  const position = geometry.attributes.position;
  const capDepth = Math.abs(position.getZ(0));
  const faces = [-1,1].map(sign => {
    const capPoints = geometry.userData.contour.map(({x,y}) => new THREE.Vector3(x,y,sign*capDepth));
    return createPolygon(capPoints,new THREE.Vector3(0,0,sign),true);
  });
  const normal = geometry.attributes.normal;
  const vector = i => new THREE.Vector3().fromBufferAttribute(position,i);
  for (let i=geometry.groups[1].start;i<position.count;i+=6) {
    faces.push(createPolygon([vector(i),vector(i+1),vector(i+4),vector(i+2)], new THREE.Vector3().fromBufferAttribute(normal,i),false));
  }
  return faces;
}

function createPolygon(points,normal,cap) {
  const center = points.reduce((value,point) => value.add(point),new THREE.Vector3()).multiplyScalar(1/points.length);
  const tangent = cap ? new THREE.Vector3(1,0,0) : points[1].clone().sub(points[0]).normalize();
  return {points, normal, cap, center, tangent};
}

function inside([x,y],points) {
  let hit = false;
  for (let i=0,j=points.length-1;i<points.length;j=i++) {
    const [xi,yi] = points[i];
    const [xj,yj] = points[j];
    if ((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) hit=!hit;
  }
  return hit;
}
