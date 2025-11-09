/* Palette Studio — main logic
   Features:
   - Harmony-based generation (random, analogous, complementary, triadic, tetradic, monochrome)
   - Click icons: copy, lock, info, shades (modal)
   - Spacebar triggers generate (unless focus in input)
   - Single export modal (PNG/JSON/TXT)
*/

const EL = {
  palette: document.getElementById('palette'),
  harmony: document.getElementById('harmony'),
  count: document.getElementById('count'),
  generateBtn: document.getElementById('generateBtn'),
  exportBtn: document.getElementById('exportBtn'),
  shadesModal: document.getElementById('shadesModal'),
  shadesContent: document.getElementById('shadesContent'),
  infoModal: document.getElementById('infoModal'),
  infoContent: document.getElementById('infoContent'),
  exportModal: document.getElementById('exportModal'),
  doExport: document.getElementById('doExport'),
  copyShadesBtn: document.getElementById('copyShadesBtn')
};

let state = {
  colors: [], // each {hex,h,s,l,locked}
  count: Number(EL.count.value) || 5,
  harmony: EL.harmony.value
};

/* ---------- color helpers ---------- */
function clamp(v,a,b){return Math.min(Math.max(v,a),b)}
function hslToRgb(h,s,l){
  s/=100; l/=100;
  const c=(1-Math.abs(2*l-1))*s; const hh=h/60; const x=c*(1-Math.abs((hh%2)-1));
  let r1=0,g1=0,b1=0;
  if(hh>=0 && hh<1){r1=c;g1=x;b1=0}
  else if(hh<2){r1=x;g1=c;b1=0}
  else if(hh<3){r1=0;g1=c;b1=x}
  else if(hh<4){r1=0;g1=x;b1=c}
  else if(hh<5){r1=x;g1=0;b1=c}
  else {r1=c;g1=0;b1=x}
  const m=l-c/2; const r=Math.round((r1+m)*255); const g=Math.round((g1+m)*255); const b=Math.round((b1+m)*255);
  return [r,g,b];
}
function rgbToHex([r,g,b]){return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()}
function hexToRgb(hex){
  const c = hex.replace('#','');
  return c.length===3 ? c.split('').map(ch=>parseInt(ch+ch,16)) : [parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)];
}
function rgbToHsl([r,g,b]){
  r/=255; g/=255; b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0, s=0, l=(max+min)/2;
  if(max!==min){ const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min); switch(max){case r:h=(g-b)/d + (g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;} h*=60;}
  return [Math.round(h), Math.round(s*100), Math.round(l*100)];
}
function bestTextColor(hex){
  const [r,g,b]=hexToRgb(hex);
  const Rs=r/255, Gs=g/255, Bs=b/255;
  const R = Rs<=0.03928?Rs/12.92:Math.pow((Rs+0.055)/1.055,2.4);
  const G = Gs<=0.03928?Gs/12.92:Math.pow((Gs+0.055)/1.055,2.4);
  const B = Bs<=0.03928?Bs/12.92:Math.pow((Bs+0.055)/1.055,2.4);
  const L = 0.2126*R + 0.7152*G + 0.0722*B;
  const contrastWhite = (1.05)/(L+0.05);
  const contrastBlack = (L+0.05)/0.05;
  return contrastWhite >= contrastBlack ? '#FFFFFF' : '#111827';
}

/* ---------- harmony offsets ---------- */
function harmonyOffsets(mode,count,baseHue){
  const offsets=[];
  if(mode==='random'){ for(let i=0;i<count;i++) offsets.push(Math.round(Math.random()*360)); return offsets; }
  if(mode==='monochrome'){ for(let i=0;i<count;i++) offsets.push(baseHue); return offsets; }
  if(mode==='analogous'){
    const span=30; const step=span/Math.max(1,count-1); const start=(baseHue - span/2 + 360)%360;
    for(let i=0;i<count;i++) offsets.push(Math.round((start + step*i)%360)); return offsets;
  }
  if(mode==='complementary'){
    for(let i=0;i<count;i++){ const t=(i%2===0)?baseHue:(baseHue+180); offsets.push(Math.round((t + (i*6))%360)); } return offsets;
  }
  if(mode==='triadic' || mode==='tetradic'){
    const div = mode==='triadic'?3:4;
    for(let i=0;i<count;i++) offsets.push(Math.round((baseHue + (360/div)*(i%div))%360)); return offsets;
  }
  // fallback distribute
  for(let i=0;i<count;i++) offsets.push(Math.round((baseHue + (i*(360/count)))%360));
  return offsets;
}

/* ---------- generate palette ---------- */
function generatePalette(count=5, harmony='analogous'){
  const baseHue = Math.floor(Math.random()*360);
  const offsets = harmonyOffsets(harmony, count, baseHue);
  return offsets.map((h, i) => {
    let s = clamp(50 + Math.round((Math.random()-0.5)*18) + (i - count/2)*3, 30, 78);
    let l = clamp(50 + Math.round((Math.random()-0.5)*14) + (i - count/2)*2, 25, 75);
    const rgb = hslToRgb(h,s,l);
    return { hex: rgbToHex(rgb), h, s, l, locked:false };
  });
}

/* ---------- shades (tints & tones) ---------- */
function generateShades(color, steps=9){
  // produce from darker -> lighter
  const out=[];
  const base = {h: color.h, s: color.s, l: color.l};
  const minL = clamp(base.l - 40, 6, 90);
  const maxL = clamp(base.l + 40, 10, 95);
  for(let i=0;i<steps;i++){
    const t = i/(steps-1);
    const Li = Math.round(minL + (maxL - minL)*t);
    const rgb = hslToRgb(base.h, base.s, Li);
    out.push({hex: rgbToHex(rgb), h: base.h, s: base.s, l: Li});
  }
  return out;
}

/* ---------- render ---------- */
function render(){
  EL.palette.innerHTML = '';
  state.count = Number(EL.count.value) || state.colors.length || 5;
  state.harmony = EL.harmony.value;

  // ensure size
  if(state.colors.length < state.count){
    const added = generatePalette(state.count - state.colors.length, state.harmony);
    state.colors = state.colors.concat(added);
  } else if(state.colors.length > state.count){
    state.colors = state.colors.slice(0, state.count);
  }

  state.colors.forEach((c, idx) => {
    const sw = document.createElement('div'); sw.className = 'swatch';
    const colorArea = document.createElement('div'); colorArea.className = 'color-area'; colorArea.style.background = c.hex;
    const sampleLabel = document.createElement('div'); sampleLabel.className = 'color-sample'; sampleLabel.textContent = 'Aa'; sampleLabel.style.color = bestTextColor(c.hex);
    colorArea.appendChild(sampleLabel);

    const meta = document.createElement('div'); meta.className = 'meta';
    const hexEl = document.createElement('div'); hexEl.className = 'hex'; hexEl.textContent = c.hex;
    hexEl.title = 'Copy hex';
    const actions = document.createElement('div'); actions.className = 'actions';

    // icons
    const copyBtn = document.createElement('button'); copyBtn.className = 'icon'; copyBtn.title='Copy hex'; copyBtn.textContent = '⧉';
    const lockBtn = document.createElement('button'); lockBtn.className = 'icon lock-btn'; lockBtn.title='Lock'; lockBtn.textContent = c.locked ? '🔒' : '🔓'; if(c.locked) lockBtn.classList.add('locked');
    const infoBtn = document.createElement('button'); infoBtn.className = 'icon'; infoBtn.title='Info'; infoBtn.textContent = 'i';
    const shadesBtn = document.createElement('button'); shadesBtn.className = 'icon'; shadesBtn.title='Shades'; shadesBtn.textContent = '▤';

    actions.append(copyBtn, lockBtn, infoBtn, shadesBtn);
    meta.append(hexEl, actions);
    sw.append(colorArea, meta);
    EL.palette.appendChild(sw);

    // events
    copyBtn.addEventListener('click', ()=>{ copyToClipboard(c.hex); flash(hexEl); });
    hexEl.addEventListener('click', ()=>{ copyToClipboard(c.hex); flash(hexEl); });
    colorArea.addEventListener('click', ()=>{ copyToClipboard(c.hex); flash(colorArea); });

    lockBtn.addEventListener('click', ()=>{
      c.locked = !c.locked;
      lockBtn.textContent = c.locked ? '🔒' : '🔓';
      lockBtn.classList.toggle('locked', c.locked);
    });

    infoBtn.addEventListener('click', ()=>{
      openInfoModal(c);
    });

    shadesBtn.addEventListener('click', ()=>{
      openShadesModal(c);
    });
  });
}

/* ---------- regenerate honoring locks ---------- */
function regenerate(){
  const count = Number(EL.count.value) || 5;
  // ensure array length
  if(state.colors.length === 0){
    state.colors = generatePalette(count, state.harmony);
    render(); return;
  }
  if(state.colors.length < count){
    const extra = generatePalette(count - state.colors.length, state.harmony);
    state.colors = state.colors.concat(extra);
  } else if(state.colors.length > count){
    state.colors = state.colors.slice(0,count);
  }

  // create new set for unlocked
  const baseHue = Math.floor(Math.random()*360);
  const offsets = harmonyOffsets(state.harmony, count, baseHue);
  state.colors = state.colors.map((c,i) => {
    if(c.locked) return c;
    const h = offsets[i] ?? Math.floor(Math.random()*360);
    const s = clamp(50 + Math.round((Math.random()-0.5)*18) + (i - count/2)*3, 30, 78);
    const l = clamp(50 + Math.round((Math.random()-0.5)*14) + (i - count/2)*2, 25, 75);
    const rgb = hslToRgb(h,s,l);
    return { hex: rgbToHex(rgb), h, s, l, locked:false };
  });
  render();
}

/* ---------- modals ---------- */
function openShadesModal(color){
  EL.shadesContent.innerHTML = '';
  const shades = generateShades(color, 9);
  shades.forEach(s => {
    const card = document.createElement('div'); card.className='shade-card';
    const preview = document.createElement('div'); preview.className='shade-preview'; preview.style.background = s.hex; preview.style.color = bestTextColor(s.hex); preview.textContent = s.hex;
    const hex = document.createElement('div'); hex.className='shade-hex'; hex.textContent = s.hex;
    card.append(preview, hex);
    preview.addEventListener('click', ()=>{ copyToClipboard(s.hex); flash(preview); });
    hex.addEventListener('click', ()=>{ copyToClipboard(s.hex); flash(hex); });
    EL.shadesContent.appendChild(card);
  });
  EL.shadesModal.setAttribute('aria-hidden','false');
  EL.copyShadesBtn.onclick = ()=>{ copyToClipboard(shades.map(s=>s.hex).join('\n')); flash(EL.shadesContent); };
}
function closeModal(modal){ modal.setAttribute('aria-hidden','true'); }
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', (e)=>{
  const modal = e.target.closest('.modal'); if(modal) closeModal(modal);
}));

function openInfoModal(color){
  EL.infoContent.innerHTML = '';
  const rgb = hexToRgb(color.hex);
  const hsl = [color.h, color.s, color.l];
  EL.infoContent.innerHTML = `
    <div><strong>HEX:</strong> <code>${color.hex}</code></div>
    <div><strong>RGB:</strong> <code>rgb(${rgb.join(', ')})</code></div>
    <div><strong>HSL:</strong> <code>hsl(${hsl.join(', ')})</code></div>
    <div style="margin-top:8px;color:var(--muted)">Click any value to copy.</div>
  `;
  // enable click-to-copy
  EL.infoContent.querySelectorAll('code').forEach(node=>{
    node.style.cursor = 'pointer';
    node.addEventListener('click', ()=>{ copyToClipboard(node.textContent); flash(node); });
  });
  EL.infoModal.setAttribute('aria-hidden','false');
}

/* ---------- export ---------- */
function openExportModal(){ EL.exportModal.setAttribute('aria-hidden','false'); }
function doExportAction(){
  const type = document.querySelector('input[name="exportType"]:checked').value;
  const hexes = state.colors.map(c=>c.hex);
  if(type === 'json'){ const blob = new Blob([JSON.stringify(hexes,null,2)],{type:'application/json'}); downloadBlob(blob,'palette.json'); }
  else if(type === 'txt'){ const blob = new Blob([hexes.join('\n')],{type:'text/plain'}); downloadBlob(blob,'palette.txt'); }
  else { // png
    exportPNG(hexes);
  }
  closeModal(EL.exportModal);
}

function exportPNG(hexes){
  const cols = hexes.length; const w = Math.max(640, cols*220); const h = 240;
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d');
  const stripe = w/cols;
  hexes.forEach((hex,i)=>{
    ctx.fillStyle = hex; ctx.fillRect(i*stripe, 0, Math.ceil(stripe), h);
    ctx.font = '18px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle = bestTextColor(hex); ctx.fillText(hex, i*stripe + stripe/2, h/2);
  });
  canvas.toBlob(blob => { if(!blob) return; downloadBlob(blob,'palette.png'); });
}

function downloadBlob(blob, name){
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/* ---------- utilities ---------- */
function copyToClipboard(text){ if(!text) return; navigator.clipboard?.writeText(text).catch(()=>{}); }
function flash(el){ if(!el) return; const old = el.style.boxShadow; el.style.boxShadow='0 10px 30px rgba(79,70,229,0.12)'; setTimeout(()=>el.style.boxShadow=old,450); }

/* ---------- keyboard: spacebar generate ---------- */
window.addEventListener('keydown', (e)=>{
  // do not trigger while typing in input or when focus in modal inputs
  const active = document.activeElement;
  const inInput = active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.isContentEditable);
  if(e.code === 'Space' && !inInput){
    e.preventDefault();
    regenerate();
  }
  // ESC to close modals
  if(e.key === 'Escape'){
    document.querySelectorAll('.modal[aria-hidden="false"]').forEach(m=>closeModal(m));
  }
});

/* ---------- bind buttons ---------- */
EL.generateBtn.addEventListener('click', regenerate);
EL.exportBtn.addEventListener('click', openExportModal);
EL.doExport.addEventListener('click', doExportAction);

/* close modals when clicking overlay */
document.querySelectorAll('.modal').forEach(mod => {
  mod.addEventListener('click', (ev)=>{
    if(ev.target === mod) closeModal(mod);
  });
});

/* ---------- init ---------- */
(function init(){
  state.colors = generatePalette(state.count, state.harmony);
  render();
})();
