import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const isMobile = matchMedia('(max-width: 900px)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Smooth scroll: só desktop ---------- */
let lenis = null;
if (window.Lenis && !reduced && !isMobile) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- THREE.JS leve ---------- */
const canvas = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.25 : 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060809, 0.05);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 9);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const l1 = new THREE.PointLight(0xc8ff3d, 50, 30); l1.position.set(-5, 3, 2); scene.add(l1);
const l2 = new THREE.PointLight(0xff6b4a, 36, 30); l2.position.set(5, -2, 1); scene.add(l2);

const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.7, 0.48, isMobile ? 90 : 200, isMobile ? 16 : 32),
  new THREE.MeshPhysicalMaterial({ color: 0x111417, metalness: 0.9, roughness: 0.18, clearcoat: 1, emissive: 0x1a2405, emissiveIntensity: 0.55 })
);
scene.add(knot);
const wire = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.72, 0.5, 60, 12),
  new THREE.MeshBasicMaterial({ color: 0xc8ff3d, wireframe: true, transparent: true, opacity: 0.1 })
);
scene.add(wire);

// Partículas reduzidas no mobile
const COUNT = isMobile ? 350 : 1400;
const pos = new Float32Array(COUNT * 3);
const col = new Float32Array(COUNT * 3);
const palette = [new THREE.Color(0xc8ff3d), new THREE.Color(0x7df9ff), new THREE.Color(0xfff6e9)];
for (let i = 0; i < COUNT; i++) {
  pos[i * 3] = (Math.random() - 0.5) * 22;
  pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
  pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
  const c = palette[(Math.random() * palette.length) | 0];
  col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.8 })));
const particles = scene.children[scene.children.length - 1];

let mx = 0, my = 0, tx = 0, ty = 0;
if (finePointer) addEventListener('mousemove', (e) => {
  mx = (e.clientX / innerWidth - 0.5) * 2;
  my = (e.clientY / innerHeight - 0.5) * 2;
});

const clock = new THREE.Clock();
// Lê o scroll todo frame direto da fonte certa:
// Lenis (desktop, valor animado suave) ou scroll nativo (mobile).
function currentScrollY() {
  if (lenis && typeof lenis.scroll === 'number') return lenis.scroll;
  return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
}

// Pausa o 3D quando a aba some (bateria)
let running = true;
document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) tick(); });

function tick() {
  if (!running) return;
  const t = clock.getElapsedTime();
  tx += (mx - tx) * 0.045; ty += (my - ty) * 0.045;
  const sc = Math.min(currentScrollY() / innerHeight, 4);

  knot.rotation.y = t * 0.16 + sc * 1.6;
  knot.rotation.x = Math.sin(t * 0.22) * 0.35 + ty * 0.25;
  knot.position.y = Math.sin(t * 0.55) * 0.22 - sc * 1.1;
  knot.position.x = tx * 0.5;
  wire.rotation.copy(knot.rotation);
  wire.position.copy(knot.position);
  particles.rotation.y = t * 0.018 + tx * 0.12;

  camera.position.x = tx * 0.9;
  camera.position.y = -ty * 0.6 - sc * 0.5;
  camera.position.z = 9 - Math.min(sc * 0.6, 1.8);
  camera.lookAt(0, -sc * 0.7, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
if (!reduced) tick(); else renderer.render(scene, camera);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------- Preloader: progresso real + saída cinematográfica ---------- */
const preNum = document.getElementById('preNum');
const preFill = document.getElementById('preBarFill');
const preloader = document.getElementById('preloader');
const preProgress = { v: 0 };
function renderPre() {
  preNum.textContent = String(Math.floor(preProgress.v)).padStart(2, '0');
  preFill.style.width = preProgress.v + '%';
}
// Avança suave até 90% enquanto a página carrega de verdade
const loadTween = gsap.to(preProgress, { v: 90, duration: 2.4, ease: 'power2.out', onUpdate: renderPre });

gsap.set('.hero-title .line > span', { yPercent: 110 });
let preDone = false;
function finishLoad() {
  if (preDone) return; preDone = true;
  loadTween.kill();
  gsap.to(preProgress, {
    v: 100, duration: 0.45, ease: 'power2.inOut', onUpdate: renderPre,
    onComplete: () => {
      document.body.dataset.loading = 'false';
      preloader.classList.add('done');
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .to('.hero-title .line > span', { yPercent: 0, duration: 1.2, stagger: 0.1 }, 0.35)
        .to('.hero .reveal', { opacity: 1, y: 0, duration: 0.9, stagger: 0.07, ease: 'power3.out' }, 0.55);
      ScrollTrigger.refresh();
      setTimeout(() => preloader.remove(), 1100);
    }
  });
}
// Termina quando tudo carregou (fontes, 3D e imagens), com fallback de seguranca
if (document.readyState === 'complete') setTimeout(finishLoad, 400);
else {
  addEventListener('load', () => setTimeout(finishLoad, 350));
  setTimeout(finishLoad, 5000);
}

/* ---------- Reveals ---------- */
gsap.utils.toArray('main .reveal').forEach((el) => {
  if (el.closest('.hero')) return;
  gsap.to(el, {
    opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 90%', once: true }
  });
});

/* ---------- Manifesto word reveal (só desktop; mobile mostra direto) ---------- */
const mani = document.getElementById('manifestoText');
if (!isMobile && !reduced) {
  const words = mani.textContent.split(' ');
  mani.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
  gsap.to('#manifestoText .w', {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: '#manifesto', start: 'top 78%', end: 'center 40%', scrub: 1 }
  });
}

/* ---------- Horizontal: pin só no desktop. Mobile = swipe nativo CSS ---------- */
const track = document.getElementById('hTrack');
if (!isMobile && !reduced) {
  gsap.to(track, {
    x: () => Math.min(0, -(track.scrollWidth - innerWidth + 120)),
    ease: 'none',
    scrollTrigger: {
      trigger: '.horizontal', start: 'top top',
      end: () => '+=' + Math.max(400, track.scrollWidth - innerWidth + 600),
      scrub: 1, pin: '.h-pin', invalidateOnRefresh: true
    }
  });
}

/* ---------- Contadores ---------- */
document.querySelectorAll('.count').forEach((el) => {
  const target = +el.dataset.count;
  const dec = +(el.dataset.decimal || 0);
  const obj = { v: 0 };
  ScrollTrigger.create({
    trigger: el, start: 'top 90%', once: true,
    onEnter: () => gsap.to(obj, {
      v: target, duration: 1.8, ease: 'expo.out',
      onUpdate: () => {
        el.textContent = dec
          ? (obj.v / 10).toFixed(1).replace('.', ',')
          : Math.floor(obj.v).toLocaleString('pt-BR');
      }
    })
  });
});

/* ---------- Tilt + magnetic + cursor: só pointer fino ---------- */
if (finePointer && !reduced) {
  document.querySelectorAll('.tilt').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      gsap.to(card, {
        rotateX: ((e.clientY - r.top) / r.height - 0.5) * -8,
        rotateY: ((e.clientX - r.left) / r.width - 0.5) * 8,
        transformPerspective: 800, duration: 0.4
      });
    });
    card.addEventListener('mouseleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.7, ease: 'elastic.out(1,0.5)' }));
  });
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.22, y: (e.clientY - r.top - r.height / 2) * 0.22, duration: 0.4 });
    });
    el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' }));
  });

  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  let cx = 0, cy = 0, rx = 0, ry = 0;
  addEventListener('mousemove', (e) => { cx = e.clientX; cy = e.clientY; dot.style.left = cx + 'px'; dot.style.top = cy + 'px'; });
  (function loop() { rx += (cx - rx) * 0.16; ry += (cy - ry) * 0.16; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(loop); })();
  document.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
  });
}

/* ---------- Menu + âncoras ---------- */
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => mobileMenu.classList.remove('open')));
document.getElementById('toTop').addEventListener('click', () => {
  if (lenis) lenis.scrollTo(0); else scrollTo({ top: 0, behavior: 'smooth' });
});
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length > 1 && document.querySelector(id)) {
      e.preventDefault();
      if (lenis) lenis.scrollTo(id, { offset: -76 }); else document.querySelector(id).scrollIntoView({ behavior: 'smooth' });
    }
  });
});
