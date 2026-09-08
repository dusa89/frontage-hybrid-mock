import {
  CanvasTexture,
  LinearFilter,
  Mesh,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from 'three';
import { fragmentShader, vertexShader } from './asphalt-shaders';
import { ReflectionRegistry } from './reflection-registry';

type DeviceNavigator = Navigator & { deviceMemory?: number };

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const memory = (navigator as DeviceNavigator).deviceMemory ?? 8;
const lowPower = coarse || memory <= 4;

function fallback() {
  root.classList.remove('wet-asphalt-live');
  root.classList.add('wet-asphalt-fallback');
}

function mount() {
  // Reduced motion: static CSS asphalt only — no WebGL, no scroll road drift.
  if (!document.body || !('WebGLRenderingContext' in window) || reduced) {
    fallback();
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'wet-asphalt-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  if (lowPower) {
    document.querySelectorAll<HTMLElement>('[data-reflect="text"]').forEach((element) => {
      element.dataset.reflectStrength = '0.16';
    });
  }

  const registry = new ReflectionRegistry();
  registry.resize(innerWidth, innerHeight, lowPower ? 0.36 : 0.5);

  let lightTexture = new CanvasTexture(registry.canvas);
  lightTexture.colorSpace = SRGBColorSpace;
  lightTexture.minFilter = LinearFilter;
  lightTexture.magFilter = LinearFilter;
  lightTexture.generateMipmaps = false;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      // Headed proofs / canvas.drawImage need a readable buffer.
      preserveDrawingBuffer: true,
      powerPreference: lowPower ? 'default' : 'high-performance',
    });
  } catch {
    canvas.remove();
    fallback();
    return;
  }

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x0b1018, 1);

  const uniforms = {
    uLightMap: { value: lightTexture },
    uResolution: { value: new Vector2(1, 1) },
    uPointer: { value: new Vector2(0.5, 0.5) },
    uTime: { value: 0 },
    uRoadOffset: { value: 0 },
    uPointerStrength: { value: 0 },
    uReflectionStrength: { value: lowPower ? 1.2 : 1.65 },
    uQuality: { value: lowPower ? 0 : 1 },
    uDebug: {
      value: new URLSearchParams(location.search).get('wetdebug') === '1' ? 1 : 0,
    },
  };

  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  let raf = 0;
  let timeoutHandle = 0;
  let destroyed = false;
  let lastFrameTime = performance.now();
  let lastScrollY = window.scrollY;
  let targetRoadOffset = 0;
  let roadOffset = 0;
  let mapDirty = true;
  let settleFrames = 8;

  const paintMap = () => {
    if (!mapDirty) return;
    registry.paint();
    lightTexture.needsUpdate = true;
    mapDirty = false;
  };

  const render = (time: number) => {
    raf = 0;
    timeoutHandle = 0;
    if (destroyed || document.hidden) return;

    const delta = Math.min(50, Math.max(0, time - lastFrameTime));
    lastFrameTime = time;
    const easing = 1 - Math.pow(0.0007, delta / 1000);
    roadOffset += (targetRoadOffset - roadOffset) * Math.max(0.08, easing);
    uniforms.uRoadOffset.value = reduced ? 0 : roadOffset;
    uniforms.uTime.value = time * 0.001;
    uniforms.uPointerStrength.value *= reduced ? 0 : 0.93;

    paintMap();
    renderer.render(scene, camera);

    const moving = Math.abs(targetRoadOffset - roadOffset) > 0.00008;
    const rippling = uniforms.uPointerStrength.value > 0.012;
    if (moving || rippling || settleFrames > 0) {
      settleFrames -= 1;
      schedule();
    }
  };

  // rAF can be suppressed under automation / background tabs.
  const schedule = () => {
    if (destroyed || document.hidden) return;
    if (!raf) raf = requestAnimationFrame(render);
    if (!timeoutHandle) {
      timeoutHandle = window.setTimeout(() => {
        if (destroyed || document.hidden) return;
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        render(performance.now());
      }, 32);
    }
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.25);
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    uniforms.uResolution.value.set(
      Math.round(innerWidth * dpr),
      Math.round(innerHeight * dpr),
    );

    if (registry.resize(innerWidth, innerHeight, lowPower ? 0.36 : 0.5)) {
      lightTexture.dispose();
      lightTexture = new CanvasTexture(registry.canvas);
      lightTexture.colorSpace = SRGBColorSpace;
      lightTexture.minFilter = LinearFilter;
      lightTexture.magFilter = LinearFilter;
      lightTexture.generateMipmaps = false;
      uniforms.uLightMap.value = lightTexture;
    }

    mapDirty = true;
    settleFrames = 4;
    // Sync first paint — do not wait for rAF after resize/mount.
    paintMap();
    renderer.render(scene, camera);
    schedule();
  };

  const onScroll = () => {
    const nextScrollY = window.scrollY;
    if (!reduced) targetRoadOffset += (nextScrollY - lastScrollY) * 0.00042;
    lastScrollY = nextScrollY;
    mapDirty = true;
    settleFrames = 4;
    schedule();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (coarse || reduced) return;
    uniforms.uPointer.value.set(event.clientX / innerWidth, event.clientY / innerHeight);
    uniforms.uPointerStrength.value = 1;
    settleFrames = 2;
    schedule();
  };

  const onGeometryChange = () => {
    mapDirty = true;
    settleFrames = 3;
    schedule();
  };

  const onVisibilityChange = () => {
    if (!document.hidden) {
      lastFrameTime = performance.now();
      mapDirty = true;
      settleFrames = 3;
      schedule();
    }
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(timeoutHandle);
    removeEventListener('resize', resize);
    removeEventListener('scroll', onScroll);
    removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('toggle', onGeometryChange, true);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    geometry.dispose();
    material.dispose();
    lightTexture.dispose();
    renderer.dispose();
  };

  const onContextLost = (event: Event) => {
    event.preventDefault();
    destroy();
    canvas.remove();
    fallback();
  };

  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('toggle', onGeometryChange, true);
  document.addEventListener('visibilitychange', onVisibilityChange);
  addEventListener('pagehide', destroy, { once: true });
  canvas.addEventListener('webglcontextlost', onContextLost);

  root.classList.remove('wet-asphalt-fallback');
  root.classList.add('wet-asphalt-live');
  resize();

  document.fonts?.ready.then(() => {
    mapDirty = true;
    settleFrames = 3;
    paintMap();
    renderer.render(scene, camera);
    schedule();
  });
}

function start() {
  try {
    mount();
  } catch (error) {
    console.info('[frontage-wet-asphalt] static fallback', error);
    fallback();
  }
}

// setTimeout — not rAF — so mount still runs when automation suppresses frames.
setTimeout(start, 0);
