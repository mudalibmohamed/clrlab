
/* -----------------------
   Color parsing helpers
   - Accepts hex, 3/6-digit, with or without '#'
   - rgb(), rgba(), hsl(), hsla() (browser will normalize via tmp element)
   - Named colors (like 'white' or 'rebeccapurple')
   Uses a hidden element to let the browser resolve the color string into computed RGB.
   -----------------------*/
const tmpEl = document.createElement('div');
tmpEl.style.display = 'none';
document.body.appendChild(tmpEl);

function parseToRgbArray(input){
  if(!input) return null;
  const s = String(input).trim();
  // Quick hex-handling: allow 'fff' or '#fff' or '#ffffff' or 'ffffff'
  const hexMatch = s.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if(hexMatch){
    let hex = hexMatch[1];
    if(hex.length === 3) hex = hex.split('').map(ch => ch+ch).join('');
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    return [r,g,b];
  }

  // Otherwise, let the browser parse it: set color on element and get computed style
  tmpEl.style.color = '';
  tmpEl.style.color = s;
  const cs = getComputedStyle(tmpEl).color;
  // cs is like "rgb(255, 0, 0)" or "rgba(255, 0, 0, 1)"
  if(!cs || !cs.startsWith('rgb')) return null;
  const parts = cs.replace(/rgba?\(|\)|\s/g,'').split(',');
  const r = Number(parts[0]); const g = Number(parts[1]); const b = Number(parts[2]);
  if(Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) return [r,g,b];
  return null;
}

/* -----------------------
   Luminance & contrast (WCAG)
   -----------------------*/
function srgbToLinearChannel(c){
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function relativeLuminance([r,g,b]){
  const R = srgbToLinearChannel(r);
  const G = srgbToLinearChannel(g);
  const B = srgbToLinearChannel(b);
  return 0.2126*R + 0.7152*G + 0.0722*B;
}
function contrastRatio(rgbA, rgbB){
  // rgb arrays of ints
  const L1 = relativeLuminance(rgbA);
  const L2 = relativeLuminance(rgbB);
  const lighter = Math.max(L1,L2);
  const darker = Math.min(L1,L2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Number((Math.round(ratio * 100) / 100).toFixed(2)); // 2 decimals numeric
}

/* -----------------------
   Mapping ratio -> percent & friendly label
   - percent: linear map between 1:1 -> 0% and 21:1 -> 100%
   - friendly: thresholds derived for quick guidance
   -----------------------*/
function ratioToPercent(ratio){
  const minR = 1; const maxR = 21;
  const p = Math.round( clamp((ratio - minR) / (maxR - minR) * 100, 0, 100) );
  return p;
}
function clamp(v,min,max){ return Math.min(Math.max(v,min),max); }

function percentToLabel(p){
  if(p >= 85) return {label:'Excellent', cls:'excellent', explain:'Great contrast — very readable.'};
  if(p >= 65) return {label:'Good', cls:'good', explain:'Good contrast for most use cases.'};
  if(p >= 45) return {label:'Fair', cls:'fair', explain:'May be usable, check sizes and context.'};
  if(p >= 25) return {label:'Poor', cls:'poor', explain:'Low contrast — avoid for small text.'};
  return {label:'Terrible', cls:'poor', explain:'Unreadable for most users.'};
}

/* -----------------------
   DOM refs & defaults
   -----------------------*/
const fgInput = document.getElementById('fg-input');
const bgInput = document.getElementById('bg-input');
const fgColorPicker = document.getElementById('fg-color');
const bgColorPicker = document.getElementById('bg-color');

const previewBlock = document.getElementById('previewBlock');
const previewText = document.getElementById('previewText');

const ratioText = document.getElementById('ratioText');
const percentFriendly = document.getElementById('percentFriendly');
const percentLabel = document.getElementById('percentLabel');
const friendlyExplainer = document.getElementById('friendlyExplainer');
const barFill = document.getElementById('barFill');

const aaNormal = document.getElementById('aaNormal');
const aaLarge = document.getElementById('aaLarge');
const aaaNormal = document.getElementById('aaaNormal');
const aaaLarge = document.getElementById('aaaLarge');

const swapBtn = document.getElementById('swapBtn');
const resetBtn = document.getElementById('resetBtn');

const DEFAULTS = { fg: '#0F172A', bg: '#FFFFFF' };

/* -----------------------
   Main update flow
   - As you type, we'll attempt to parse each input immediately.
   - If parsing succeeds, we update the preview (that color role updates).
   - Contrast calculation only runs when both sides have a valid parsed RGB.
   - This gives instant feedback while typing and updates results as soon as possible.
   -----------------------*/
function applyColorRole(role, parsedRgb, originalInputNormalized){
  // role = 'fg' or 'bg'
  if(role === 'fg'){
    // set preview text color
    if(parsedRgb){ previewText.style.color = rgbArrayToCss(parsedRgb); fgColorPicker.value = rgbToHex(parsedRgb); }
    else { /* leave existing until valid */ }
  } else {
    if(parsedRgb){ previewBlock.style.background = rgbArrayToCss(parsedRgb); bgColorPicker.value = rgbToHex(parsedRgb); }
    else { /* leave existing */ }
  }
}

function rgbArrayToCss(arr){ return `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`; }
function rgbToHex([r,g,b]){ return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase(); }

function updateAll(){
  // parse inputs
  const fgRaw = fgInput.value.trim();
  const bgRaw = bgInput.value.trim();

  const fgParsed = parseToRgbArray(fgRaw) || null;
  const bgParsed = parseToRgbArray(bgRaw) || null;

  // if user typed nothing, show default values
  if(!fgRaw && !fgParsed) { // ensure picker's value matches current preview if empty
    // don't force change while typing; but initialize on first load
  }
  // Apply role updates immediately when parse is successful
  if(fgParsed) applyColorRole('fg', fgParsed, fgRaw);
  if(bgParsed) applyColorRole('bg', bgParsed, bgRaw);

  // Update text of color inputs when user picks via color pickers (keeps them in sync)
  // But don't override user's partial typing unless the picker changed (handled separately)

  // Calculate contrast only if both parsed
  if(fgParsed && bgParsed){
    const ratio = contrastRatio(fgParsed, bgParsed); // numeric
    const percent = ratioToPercent(ratio);
    const friendly = percentToLabel(percent);

    ratioText.textContent = `${ratio}:1`;
    percentFriendly.textContent = `${percent}% — ${friendly.label}`;
    percentFriendly.className = 'friendly ' + friendly.cls;
    percentLabel.textContent = `${percent}%`;
    barFill.style.width = `${percent}%`;
    friendlyExplainer.textContent = `${friendly.explain} (WCAG ${ratio}:1)`;

    // WCAG checks
    aaNormal.textContent = (ratio >= 4.5) ? 'Pass ✓' : 'Fail ✗';
    aaLarge.textContent = (ratio >= 3) ? 'Pass ✓' : 'Fail ✗';
    aaaNormal.textContent = (ratio >= 7) ? 'Pass ✓' : 'Fail ✗';
    aaaLarge.textContent = (ratio >= 4.5) ? 'Pass ✓' : 'Fail ✗';

  } else {
    // Not both valid yet — show placeholder cues but still reflect whatever we can
    ratioText.textContent = '—';
    percentFriendly.textContent = '—';
    percentFriendly.className = 'friendly';
    percentLabel.textContent = '—';
    barFill.style.width = '0%';
    friendlyExplainer.textContent = 'Enter colors to see results.';
    aaNormal.textContent = '—'; aaLarge.textContent = '—'; aaaNormal.textContent = '—'; aaaLarge.textContent = '—';
  }
}

/* -----------------------
   Keep color pickers & text inputs synchronized
   - Changing the color picker writes a hex into the text input and updates immediately
   - Typing an acceptable value updates the color picker value (when parsing yields RGB).
   -----------------------*/
fgColorPicker.addEventListener('input', (e)=>{
  const hex = e.target.value.toUpperCase();
  fgInput.value = hex;
  updateAll();
});
bgColorPicker.addEventListener('input', (e)=>{
  const hex = e.target.value.toUpperCase();
  bgInput.value = hex;
  updateAll();
});

fgInput.addEventListener('input', updateAll);
bgInput.addEventListener('input', updateAll);

/* swap & reset */
swapBtn.addEventListener('click', ()=>{
  const t = fgInput.value; fgInput.value = bgInput.value; bgInput.value = t;
  // also swap preview styles
  const prevColor = previewText.style.color; previewText.style.color = previewBlock.style.background; previewBlock.style.background = prevColor;
  // sync pickers if possible
  try{ fgColorPicker.value = rgbToHex(parseToRgbArray(fgInput.value) || parseToRgbArray(rgbCssToArray(previewText.style.color))); }catch(e){}
  try{ bgColorPicker.value = rgbToHex(parseToRgbArray(bgInput.value) || parseToRgbArray(rgbCssToArray(previewBlock.style.background))); }catch(e){}
  updateAll();
});
resetBtn.addEventListener('click', ()=>{
  fgInput.value = DEFAULTS.fg; bgInput.value = DEFAULTS.bg;
  fgColorPicker.value = DEFAULTS.fg; bgColorPicker.value = DEFAULTS.bg;
  // apply immediately
  const f = parseToRgbArray(DEFAULTS.fg); const b = parseToRgbArray(DEFAULTS.bg);
  previewText.style.color = rgbArrayToCss(f); previewBlock.style.background = rgbArrayToCss(b);
  updateAll();
});

/* helper: if previewText.style.color is a CSS rgb string, parse it back to array */
function rgbCssToArray(css){
  if(!css) return null;
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if(!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/* initialize with defaults */
(function init(){
  fgInput.value = DEFAULTS.fg;
  bgInput.value = DEFAULTS.bg;
  fgColorPicker.value = DEFAULTS.fg;
  bgColorPicker.value = DEFAULTS.bg;
  // apply defaults to preview
  const f = parseToRgbArray(DEFAULTS.fg); const b = parseToRgbArray(DEFAULTS.bg);
  previewText.style.color = rgbArrayToCss(f); previewBlock.style.background = rgbArrayToCss(b);
  updateAll();
})();
