import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const container = document.getElementById('factor3dScene');

if (container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0.08, 1.05, 6.2);
  camera.lookAt(0, -0.02, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xffffff, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 2.1));

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-2.5, 3.2, 4.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
  rimLight.position.set(3.2, 2.1, -2.5);
  scene.add(rimLight);

  const group = new THREE.Group();
  group.rotation.set(-0.05, -0.24, -0.015);
  group.position.set(0.06, -0.03, 0);
  scene.add(group);

  const platformMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb8b8b8,
    metalness: 0,
    roughness: 0.32,
    transmission: 0.2,
    thickness: 0.34,
    transparent: true,
    opacity: 0.72,
    ior: 1.42,
    clearcoat: 1,
    clearcoatRoughness: 0.18
  });

  const platformGeometry = new THREE.ExtrudeGeometry(
    createRoundedRectShape(3.65, 1.78, 0.22),
    {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 16
    }
  );
  platformGeometry.rotateX(-Math.PI / 2);
  platformGeometry.center();

  const platform = new THREE.Mesh(
    platformGeometry,
    platformMaterial
  );
  platform.position.set(0, -1.08, 0);
  group.add(platform);

  const platformEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(platform.geometry, 18),
    new THREE.LineBasicMaterial({
      color: 0x777777,
      transparent: true,
      opacity: 0.48
    })
  );
  platformEdges.position.copy(platform.position);
  group.add(platformEdges);

  const invoiceShape = new THREE.Shape();
  const w = 1.58;
  const h = 2.48;
  const r = 0.15;
  const left = -w / 2;
  const right = w / 2;
  const bottom = -h / 2;
  const top = h / 2;
  invoiceShape.moveTo(left + r, top);
  invoiceShape.lineTo(right - r, top);
  invoiceShape.quadraticCurveTo(right, top, right, top - r);
  invoiceShape.lineTo(right, bottom + 0.34);
  invoiceShape.quadraticCurveTo(right, bottom + 0.16, right - 0.16, bottom + 0.09);

  const waveStart = right - 0.16;
  const waveEnd = left + 0.15;
  const segments = 5;
  const segmentWidth = (waveStart - waveEnd) / segments;
  let currentX = waveStart;
  for (let i = 0; i < segments; i += 1) {
    const nextX = waveStart - segmentWidth * (i + 1);
    const midX = (currentX + nextX) / 2;
    invoiceShape.quadraticCurveTo(midX + segmentWidth * 0.18, bottom - 0.08, midX, bottom - 0.08);
    invoiceShape.quadraticCurveTo(midX - segmentWidth * 0.18, bottom - 0.08, nextX, bottom + 0.07);
    currentX = nextX;
  }
  invoiceShape.quadraticCurveTo(left, bottom + 0.1, left, bottom + 0.34);
  invoiceShape.lineTo(left, top - r);
  invoiceShape.quadraticCurveTo(left, top, left + r, top);

  const invoiceGeometry = new THREE.ExtrudeGeometry(invoiceShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 12
  });
  invoiceGeometry.center();

  const invoiceMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd7d7d7,
    metalness: 0,
    roughness: 0.34,
    transmission: 0.06,
    thickness: 0.18,
    transparent: true,
    opacity: 0.94,
    ior: 1.34,
    clearcoat: 0.82,
    clearcoatRoughness: 0.18,
    side: THREE.DoubleSide
  });

  const invoice = new THREE.Mesh(invoiceGeometry, invoiceMaterial);
  invoice.position.set(0.02, 0.05, 0.05);
  invoice.rotation.y = -0.06;
  group.add(invoice);

  const invoiceEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(invoiceGeometry, 24),
    new THREE.LineBasicMaterial({
      color: 0x777777,
      transparent: true,
      opacity: 0.34
    })
  );
  invoiceEdges.position.copy(invoice.position);
  invoiceEdges.rotation.copy(invoice.rotation);
  group.add(invoiceEdges);

  const invoiceTexture = new THREE.CanvasTexture(createInvoiceCanvas());
  invoiceTexture.colorSpace = THREE.SRGBColorSpace;
  invoiceTexture.anisotropy = 8;

  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, 2.26),
    new THREE.MeshBasicMaterial({
      map: invoiceTexture,
      transparent: true,
      opacity: 0.92,
      depthWrite: false
    })
  );
  decal.position.set(0.03, 0.12, 0.145);
  decal.rotation.copy(invoice.rotation);
  group.add(decal);

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 0.48),
    new THREE.MeshBasicMaterial({
      color: 0x050505,
      transparent: true,
      opacity: 0.075,
      depthWrite: false
    })
  );
  contactShadow.position.set(0.06, -0.88, 0.18);
  contactShadow.rotation.x = -Math.PI / 2;
  group.add(contactShadow);

  const resize = () => {
    const { clientWidth, clientHeight } = container;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight || 1;
    camera.updateProjectionMatrix();
  };

  const render = () => {
    group.rotation.y = -0.24;
    group.rotation.x = -0.05;
    renderer.render(scene, camera);
  };

  resize();
  render();
  window.addEventListener('resize', () => {
    resize();
    render();
  });
}

function createInvoiceCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1320;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bodyGradient = ctx.createLinearGradient(0, 80, 900, 1220);
  bodyGradient.addColorStop(0, 'rgba(255,255,255,0.24)');
  bodyGradient.addColorStop(0.52, 'rgba(255,255,255,0.02)');
  bodyGradient.addColorStop(1, 'rgba(0,0,0,0.06)');
  ctx.fillStyle = bodyGradient;
  ctx.fillRect(42, 28, 820, 1240);

  ctx.fillStyle = 'rgba(0,0,0,0.11)';
  roundRect(ctx, 190, 130, 245, 32, 8);
  ctx.fill();

  ctx.font = '700 82px "Space Grotesk", Arial, sans-serif';
  ctx.fillStyle = '#111111';
  ctx.fillText('Factor', 535, 245);
  ctx.fillStyle = '#8d8d8d';
  ctx.fillText('0x', 770, 245);

  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(275, 365, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 24;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(230, 360);
  ctx.lineTo(268, 405);
  ctx.lineTo(340, 314);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  roundRect(ctx, 505, 346, 255, 32, 8);
  ctx.fill();
  roundRect(ctx, 505, 410, 250, 32, 8);
  ctx.fill();
  roundRect(ctx, 505, 474, 135, 32, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.20)';
  ctx.lineWidth = 4;
  roundRect(ctx, 180, 640, 570, 330, 8);
  ctx.stroke();
  ctx.lineWidth = 3;
  [730, 820, 910].forEach((yy) => line(ctx, 180, yy, 750, yy));
  [455, 590].forEach((xx) => line(ctx, xx, 640, xx, 970));

  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  const tableLines = [
    [230, 690, 118, 18],
    [230, 772, 142, 32],
    [230, 862, 142, 32],
    [230, 952, 142, 32],
    [500, 694, 66, 22],
    [500, 784, 52, 26],
    [500, 874, 52, 26],
    [500, 964, 52, 26],
    [640, 694, 82, 22],
    [640, 784, 72, 26],
    [640, 874, 72, 26],
    [640, 964, 72, 26]
  ];
  tableLines.forEach(([xx, yy, ww, hh]) => {
    roundRect(ctx, xx, yy, ww, hh, 8);
    ctx.fill();
  });

  roundRect(ctx, 190, 1090, 185, 34, 9);
  ctx.fill();
  roundRect(ctx, 585, 1090, 190, 34, 9);
  ctx.fill();

  return canvas;
}

function createRoundedRectShape(width, depth, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -depth / 2;
  const w = width;
  const h = depth;
  const r = Math.min(radius, width / 2, depth / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  return shape;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
