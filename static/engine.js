/* engine.js — Signage Display Engine */

async function loadState() {
  const r = await fetch('api.php?action=load');
  return r.json();
}

function makeMedia(item, fitStyle) {
  if (item.type === 'color') {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;inset:0;background:${item.color||'#000'};`;
    return d;
  }

  let el;
  if (item.type === 'video') {
    el = document.createElement('video');
    el.autoplay = true; el.loop = true; el.muted = true; el.playsInline = true;
  } else if (item.type === 'url') {
    el = document.createElement('iframe');
    el.style.border = 'none';
    el.scrolling = 'no';
  } else {
    el = document.createElement('img');
  }

  el.src = item.src;
  el.style.cssText = fitStyle;
  return el;
}

// ── Background: fullscreen, cycles with per-item timing ──

function runBackground(div, layer) {
  if (!layer.items.length) return;
  let i = 0;
  function show() {
    const item = layer.items[i];
    div.innerHTML = '';

    const fit = item.fit || 'contain'; // default contain = no unexpected zoom
    const el = makeMedia(item, `position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};`);
    div.appendChild(el);

    if (layer.items.length > 1) {
      setTimeout(() => { i = (i + 1) % layer.items.length; show(); }, (item.duration || 5) * 1000);
    }
  }
  show();
}

// ── Carousel: positioned box, cycles items inside ──

function runCarousel(div, layer) {
  if (!layer.items.length) return;

  const box = document.createElement('div');
  box.style.cssText = `position:absolute;left:${layer.x||0}px;top:${layer.y||0}px;width:${layer.w||400}px;height:${layer.h||300}px;overflow:hidden;`;
  div.appendChild(box);

  let i = 0;
  function show() {
    const item = layer.items[i];
    box.innerHTML = '';

    const el = makeMedia(item, `position:absolute;inset:0;width:100%;height:100%;object-fit:contain;`);
    box.appendChild(el);

    setTimeout(() => { i = (i + 1) % layer.items.length; show(); }, (item.duration || 5) * 1000);
  }
  show();
}

// ── Free: all items at their own positions ──

function runFree(div, layer) {
  layer.items.forEach(item => {
    const el = makeMedia(item, `position:absolute;left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;object-fit:contain;`);
    div.appendChild(el);
  });
}

// ── Main ──

async function start() {
  const state = await loadState();
  const stage = document.getElementById('stage');
  stage.innerHTML = '';

  // Scale stage to canvas resolution
  const cw = state.canvas?.w || 1920;
  const ch = state.canvas?.h || 1080;
  const scaleX = window.innerWidth  / cw;
  const scaleY = window.innerHeight / ch;
  const sc = Math.min(scaleX, scaleY);

  stage.style.width     = cw + 'px';
  stage.style.height    = ch + 'px';
  stage.style.transform = `scale(${sc})`;
  stage.style.transformOrigin = 'top left';

  state.layers.forEach((layer, z) => {
    if (layer.visible === false) return;

    const div = document.createElement('div');
    div.style.cssText = `position:absolute;inset:0;z-index:${z + 1};overflow:hidden;`;
    stage.appendChild(div);

    if      (layer.type === 'background') runBackground(div, layer);
    else if (layer.type === 'carousel')   runCarousel(div, layer);
    else                                  runFree(div, layer);
  });
}

start();
