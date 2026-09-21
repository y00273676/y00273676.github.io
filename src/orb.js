import { Scene, PerspectiveCamera, WebGLRenderer, Group, SphereGeometry, Mesh, MeshBasicMaterial, LineBasicMaterial, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, LineLoop, Vector3, SRGBColorSpace } from 'three';

export function mountOrb(container) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 767px)');
  let renderer;
  try { renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, .1, 20);
  camera.position.z = 5.2;
  const group = new Group();
  group.rotation.set(.28, .2, -.3);
  scene.add(group);
  const sphereGeometry = new SphereGeometry(.92, 28, 18);
  const shellMaterial = new MeshBasicMaterial({ color: '#cbd6bd', transparent: true, opacity: .07, depthWrite: false });
  group.add(new Mesh(sphereGeometry, shellMaterial));
  const wireMaterial = new LineBasicMaterial({ color: '#849671', transparent: true, opacity: .27, depthWrite: false });
  const lines = [];
  function loop(points) { const geometry = new BufferGeometry().setFromPoints(points); lines.push(geometry); const line = new LineLoop(geometry, wireMaterial); group.add(line); }
  for (let i = 1; i < 13; i++) {
    const phi = i / 13 * Math.PI;
    loop(Array.from({ length: 90 }, (_, j) => { const theta = j / 90 * Math.PI * 2; return new Vector3(.94 * Math.sin(phi) * Math.cos(theta), .94 * Math.cos(phi), .94 * Math.sin(phi) * Math.sin(theta)); }));
  }
  for (let i = 0; i < 18; i++) {
    const theta = i / 18 * Math.PI;
    loop(Array.from({ length: 90 }, (_, j) => { const phi = j / 90 * Math.PI * 2; return new Vector3(.94 * Math.sin(phi) * Math.cos(theta), .94 * Math.cos(phi), .94 * Math.sin(phi) * Math.sin(theta)); }));
  }
  const positions = [];
  // Deterministic Fibonacci points keep the same composition across renders.
  for (let i = 0; i < 330; i++) {
    const y = 1 - i / 329 * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = i * Math.PI * (3 - Math.sqrt(5));
    positions.push(r * Math.cos(theta) * .95, y * .95, r * Math.sin(theta) * .95);
  }
  const pointGeometry = new BufferGeometry();
  pointGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const pointMaterial = new PointsMaterial({ color: '#81916f', size: .013, transparent: true, opacity: .55 });
  group.add(new Points(pointGeometry, pointMaterial));
  const orbitGeometry = new BufferGeometry().setFromPoints(Array.from({ length: 120 }, (_, i) => { const a = i / 120 * Math.PI * 2; return new Vector3(Math.cos(a) * 1.28, Math.sin(a) * .22, Math.sin(a) * .95); }));
  const orbit = new LineLoop(orbitGeometry, wireMaterial);
  orbit.rotation.z = -.2;
  scene.add(orbit);
  container.append(renderer.domElement);
  container.closest('.orb-panel').querySelector('.orb-fallback').hidden = true;
  let visible = true, frame = 0, previous = 0, disposed = false, paused = false;
  const pauseButton = container.closest('.orb-panel').querySelector('[data-pause-orb]');
  pauseButton.setAttribute('aria-pressed', 'false');
  function render() { renderer.render(scene, camera); }
  function tick(time) {
    if (disposed) return;
    if (time - previous > 32) {
      const delta = Math.min((time - previous) / 1000, .05);
      group.rotation.y += delta * .045;
      previous = time;
      render();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (disposed) return;
    pauseButton.hidden = motion.matches || compact.matches;
    render();
    if (!motion.matches && !compact.matches && !paused && !document.hidden && visible) { previous = performance.now(); frame = requestAnimationFrame(tick); }
  }
  function togglePause() { paused = !paused; pauseButton.textContent = paused ? 'Resume motion' : 'Pause motion'; pauseButton.setAttribute('aria-pressed', String(paused)); sync(); }
  pauseButton.addEventListener('click', togglePause);
  function theme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    wireMaterial.color.set(dark ? '#abbc97' : '#849671');
    pointMaterial.color.set(dark ? '#bccaa8' : '#81916f');
    render();
  }
  const resize = new ResizeObserver(() => { const { width, height } = container.getBoundingClientRect(); if (!width || !height) return; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); render(); });
  resize.observe(container);
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  observer.observe(container);
  motion.addEventListener('change', sync);
  compact.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('themechange', theme);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect(); resize.disconnect();
    motion.removeEventListener('change', sync);
    compact.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('themechange', theme);
    pauseButton.removeEventListener('click', togglePause);
    [...lines, sphereGeometry, pointGeometry, orbitGeometry, shellMaterial, wireMaterial, pointMaterial].forEach(resource => resource.dispose());
    renderer.dispose();
  }
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); dispose(); container.hidden = true; pauseButton.hidden = true;
    container.closest('.orb-panel').querySelector('.orb-fallback').hidden = false;
  }, { once: true });
  window.addEventListener('pagehide', event => { if (event.persisted) { cancelAnimationFrame(frame); frame = 0; } else dispose(); });
  window.addEventListener('pageshow', sync);
  theme(); sync();
}
