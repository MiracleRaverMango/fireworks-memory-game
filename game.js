// ================= Setup =================
const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
let W, H;
function resize(){ W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
addEventListener('resize', resize); resize();

// Detect touch (for hit radius & tap responsiveness)
const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ================= Utilities =================
const wait = (ms)=>new Promise(r=>setTimeout(r, ms));
const rand = (a,b)=>Math.random()*(b-a)+a;

// Toast
const toastEl = document.getElementById('toast');
function toast(msg, ms=1200){
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>toastEl.classList.remove('show'), ms);
}

// Optional tones (Web Audio API) + toggle (M)
let ac = null;
function ensureAudio(){ if(!ac) ac = new (window.AudioContext||window.webkitAudioContext)(); }
const NOTES = [261.63, 329.63, 392.00, 493.88]; // C4 E4 G4 B4
let AUDIO_ON = true;
function playTone(i, dur=0.18){
  if (!AUDIO_ON) return;
  try{
    ensureAudio();
    if (ac.state === 'suspended') ac.resume().catch(()=>{});
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = NOTES[i % NOTES.length];
    o.connect(g); g.connect(ac.destination);
    const now = ac.currentTime;
    g.gain.value = 0.0001;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.stop(now + dur + 0.02);
  }catch(e){}
}

// Light haptics (mobile)
function buzz(pattern=20){
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator){
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) navigator.vibrate(pattern);
  }
}

// ================= Effects (fireworks + confetti) =================
const effects = []; // {x,y,age,life,type,base,vx,vy}
function addBurst(x,y, color='rgba(255,220,160,') {
  effects.push({x,y,age:0,life:600,type:'pulse',base:color});
  for(let i=0;i<24;i++){
    const ang = Math.random()*Math.PI*2;
    const spd = rand(1.4,3.2);
    effects.push({x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,age:0,life:700+Math.random()*500,type:'spark',base:color});
  }
}
function confettiBurst(x, y, n = 80){
  for (let i=0;i<n;i++){
    const ang = Math.random()*Math.PI*2;
    const spd = rand(2.0, 4.0);
    const hue = (Math.random()*360)|0;
    effects.push({
      x, y,
      vx: Math.cos(ang)*spd,
      vy: Math.sin(ang)*spd - rand(0,0.8),
      age:0, life: 700 + Math.random()*600,
      type:'confetti',
      base: `hsla(${hue},95%,60%,`
    });
  }
}
function drawEffects(dt){
  for(let i=effects.length-1;i>=0;i--){
    const e = effects[i];
    e.age += dt;
    const t = Math.max(0, 1 - e.age/e.life);

    if(e.type==='pulse'){
      const r = (1 - t) * 60 + 20;
      ctx.beginPath();
      ctx.fillStyle = e.base + (0.18*t) + ')';
      ctx.arc(e.x, e.y, r, 0, Math.PI*2);
      ctx.fill();
    } else if(e.type==='spark'){
      e.vx *= 0.985; e.vy = e.vy*0.985 + 0.03;
      e.x += e.vx; e.y += e.vy;
      ctx.beginPath();
      ctx.fillStyle = e.base + (0.85*t) + ')';
      ctx.arc(e.x, e.y, 1.8 + 1.2*t, 0, Math.PI*2);
      ctx.fill();
    } else if (e.type === 'confetti'){
      e.vx *= 0.988; e.vy = e.vy*0.988 + 0.045;
      e.x += e.vx; e.y += e.vy;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.age * 0.01);
      ctx.fillStyle = e.base + (0.9 * t) + ')';
      const s = 2 + 2.5*t;
      ctx.fillRect(-s/2, -s/2, s, s);
      ctx.restore();
    }

    if(e.age >= e.life) effects.splice(i,1);
  }
}

// Big finale choreo
function bigFinaleChaos(){
  for (let i=0;i<5;i++){
    setTimeout(()=>addBurst(W*0.5, H*0.4, 'rgba(255,240,200,'), i*120);
  }
  for (let i=0;i<6;i++){
    setTimeout(()=>{
      addBurst(rand(40,W-40), rand(40,H*0.6), 'rgba(255,230,160,');
      addBurst(rand(40,W-40), rand(40,H*0.6), 'rgba(200,220,255,');
    }, i*180);
  }
  for (let i=0;i<8;i++){
    setTimeout(()=>confettiBurst(rand(80,W-80), rand(H*0.15, H*0.5), 160), 200 + i*140);
  }
  for (let i=0;i<=10;i++){
    const x = (i/10) * W;
    setTimeout(()=>addBurst(x, H*0.25 + rand(-30,30), 'rgba(235,200,255,'), 1400 + i*120);
  }
}

// ================= Backdrop =================
function drawBackdrop(){
  const cx = W*0.5, cy = H*0.42;
  const g = ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*0.45);
  g.addColorStop(0,'rgba(255,220,160,0.06)');
  g.addColorStop(0.4,'rgba(160,120,200,0.04)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation = 'source-over';
}

// ================= Difficulty & Hints =================
// 'assist' | 'normal' | 'hard'
let DIFF = 'assist';  // default
function currentTol(){
  switch (DIFF) {
    case 'assist': {
      const start = 64, end = 52;                // big → medium
      const t = Math.min(1, (round-1)/9);
      return start + (end - start) * t;
    }
    case 'normal': {
      const base = 56, min = 50;                 // forgiving, no big hints
      const t = Math.min(1, (round-1)/9);
      return base + (min - base) * t;
    }
    case 'hard': {
      return 44;                                  // tight
    }
  }
}

// Hint rings (Assist big pulse, Normal small faint, Hard none)
function drawHints(nowMs){
  if (phase !== 'input') return;
  const tol = currentTol();

  for (let i = inputIndex; i < sequence.length; i++){
    const s = sequence[i];

    if (DIFF === 'assist'){
      const wobble = Math.sin((nowMs/1000 + i*0.18) * 3) * 6;
      const r = tol + 6 + wobble;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,240,200,0.25)';
      ctx.lineWidth = 2;
      ctx.arc(s.x, s.y, r, 0, Math.PI*2);
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,240,200,0.12)';
      ctx.lineWidth = 1;
      ctx.arc(s.x, s.y, Math.max(18, tol*0.6 + wobble*0.3), 0, Math.PI*2);
      ctx.stroke();

    } else if (DIFF === 'normal'){
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,240,200,0.15)';
      ctx.lineWidth = 1;
      ctx.arc(s.x, s.y, tol * 0.6, 0, Math.PI*2);
      ctx.stroke();
    }
  }
}

// ================= Hard-mode helpers =================
let hardGrace = 0;            // adaptive tolerance: grows on miss, shrinks on success
let hardBlinkCount = 0;       // limited faint blinks per round
let lastActionTs = performance.now(); // updated on pointer + key + replay

function drawHardBlink(nowMs){
  if (phase !== 'input' || DIFF !== 'hard') return;
  if (!sequence[inputIndex]) return;

  // Only after a stumble (grace>0) or replay used
  if (hardGrace <= 0 && !replayUsed) return;

  // Only if idle for a bit
  if (nowMs - lastActionTs < 2400) return;

  // Cap blinks per round
  if (hardBlinkCount >= 2) return;

  // Very brief & not perfectly predictable
  const cycle = 3200;
  const windowMs = 90;
  if ((nowMs % cycle) > windowMs) return;
  if (Math.random() > 0.6) return;

  hardBlinkCount++;
  const s = sequence[inputIndex];
  ctx.beginPath();
  ctx.fillStyle = 'rgba(255,240,220,0.08)';
  ctx.arc(s.x, s.y, 6, 0, Math.PI*2);
  ctx.fill();
}

// ================= HUD / Replay UI / Overlays =================
const hudRound = document.getElementById('hudRound');
const replayBtn = document.getElementById('replayBtn');
const instructionsOverlay = document.getElementById('instructionsOverlay');
const closeInstructions = document.getElementById('closeInstructions');
const victoryModal = document.getElementById('victoryModal');
const playAgainBtn = document.getElementById('playAgainBtn');

let replayUsed = false;
let ENDLESS_ON = false;   // E toggle
let ENDLESS_LOCK = false; // once true, treat rounds ≥10 as Endless forever (until reload)
let DAILY_ON = false;     // ?daily=1 or D toggle
let hasStarted = false;   // prevents double-start
let pendingStart = false; // intro clicked → waiting for "Got it"

// Endless best (simple, separate storage)
const LS_ENDLESS_KEY = 'fw_endless_best_v1';
function loadEndlessBest(){ try { return Number(localStorage.getItem(LS_ENDLESS_KEY)) || 0; } catch { return 0; } }
function saveEndlessBest(v){ try { localStorage.setItem(LS_ENDLESS_KEY, String(v)); } catch {} }
let ENDLESS_BEST = loadEndlessBest();

// HUD helpers
function updateHUD(){
  if (!hudRound) return;
  const modeLabel = (DIFF === 'assist') ? '• Assist'
                  : (DIFF === 'normal') ? '• Normal'
                  : '• Hard';
  const audioIcon = AUDIO_ON ? '🔊' : '🔇';
  const endlessLabel = ENDLESS_ON ? ` • ∞ Best ${ENDLESS_BEST||0}` : '';
  const flags = `${ENDLESS_ON ? ' • ∞ Endless' : ''}${DAILY_ON ? ' • Daily' : ''}`;
  hudRound.textContent = `Round ${Math.min(round,10)}/10 ${modeLabel}${flags}${endlessLabel} ${audioIcon}`;
}
function updateReplayUI(){
  if (!replayBtn) return;
  if (DIFF === 'hard'){
    replayBtn.classList.add('hidden');
    return;
  } else {
    replayBtn.classList.remove('hidden');
  }
  if (DIFF === 'assist'){
    replayBtn.disabled = false;
    replayBtn.title = "Replay sequence";
  } else if (DIFF === 'normal'){
    replayBtn.disabled = !!replayUsed;
    replayBtn.title = replayUsed ? "1 replay per round on Normal" : "Replay (1 per round)";
  }
}

// Keyboard shortcuts
window.addEventListener('keydown', (e)=>{
  const k = e.key.toLowerCase();
  lastActionTs = performance.now(); // any key counts as activity

  // === DEV: force Endless milestone finale with Shift+F ===
if (e.shiftKey && k === 'f'){
  ENDLESS_ON = true;              // ensure Endless is on
  // jump to the next multiple of 10 (so 10, 20, 30, …)
  const nextMilestone = Math.max(10, Math.ceil(round / 10) * 10);
  round = nextMilestone;
  toast(`(DEV) Forcing Endless Finale @ ${round}`, 1000);
  // trigger the normal win flow (async is fine to call)
  winRound();
  return; // stop other shortcuts from firing
}

  if (k === 'i'){
    if (instructionsOverlay) instructionsOverlay.classList.toggle('hidden');
    return;
  }
  if (k === 'a'){
    DIFF = (DIFF === 'assist') ? 'normal' : (DIFF === 'normal') ? 'hard' : 'assist';
    const msg = (DIFF === 'assist') ? "Assist Mode (hints + big target)"
             : (DIFF === 'normal') ? "Normal Mode (forgiving target)"
             : "Hard Mode (tight target)";
    toast(msg);
    updateHUD(); updateReplayUI();
    return;
  }
  if (k === 'm'){
    AUDIO_ON = !AUDIO_ON;
    toast(AUDIO_ON ? "Audio ON 🔊" : "Audio OFF 🔇");
    updateHUD();
    return;
  }
  if (k === 'e'){
  ENDLESS_ON = !ENDLESS_ON;
  if (ENDLESS_ON) ENDLESS_LOCK = true; // lock once enabled
  toast(ENDLESS_ON ? "Endless Mode ON ∞" : "Endless Mode OFF");
  updateHUD();
  return;
}

  if (k === 'd'){
    DAILY_ON = !DAILY_ON;
    resetDailyRng();
    toast(DAILY_ON ? "Daily Challenge ON 📅" : "Daily Challenge OFF");
    updateHUD();
    return;
  }
});
window.addEventListener('mousemove', () => { lastActionTs = performance.now(); }, { passive: true });

// ================= Daily Challenge RNG =================
function mulberry32(seed){
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
let seededRand = null;
function todaySeedInt(){
  const d = new Date();
  const y = d.getUTCFullYear(), m = d.getUTCMonth()+1, day = d.getUTCDate();
  return (y*10000 + m*100 + day) | 0;
}
function resetDailyRng(){ seededRand = DAILY_ON ? mulberry32(todaySeedInt()) : null; }
const urlParams = new URLSearchParams(location.search);
DAILY_ON = urlParams.get('daily') === '1';
resetDailyRng();
function rng(){ return seededRand ? seededRand() : Math.random(); }

// ================= Game State =================
let phase = 'idle';            // idle | showing | input | win | lose | victory
let round = 1;
let sequence = [];             // [{x,y,noteIndex}]
let inputIndex = 0;

// Random point uses rng() (daily or normal)
// Compute a reasonable min distance based on difficulty + current round tolerance
function minTargetDistance(){
  const tol = currentTol(); // your hit radius baseline varies by DIFF/round
  // Allow some overlap, but keep centers apart.
  // Assist: widest spacing, Normal: medium, Hard: smallest.
  const factor = (DIFF === 'assist') ? 1.4 : (DIFF === 'normal') ? 1.2 : 1.0;
  return tol * factor * 2 * 0.85; // ~85% of two radii, so "Venn-ish" but not stacked
}

// Try to place a point at least minDist away from all existing points
function randomPointSeparated(existing = [], minDist = minTargetDistance()){
  const m = 80;
  const bottomSafeZone = 120;   // if you added the no-spawn zone
  const maxTries = 80;
  let tries = 0;

  while (tries < maxTries){
    // ⬇️ use rng() instead of Math.random()
    const x = rng() * (W - m*2) + m;
    const y = rng() * (H - m - bottomSafeZone) + m;

    let ok = true;
    for (let i = 0; i < existing.length; i++){
      const dx = x - existing[i].x;
      const dy = y - existing[i].y;
      if ((dx*dx + dy*dy) < (minDist * minDist)){ ok = false; break; }
    }
    if (ok) {
      return { x, y, noteIndex: Math.floor(rng()*4) }; // ⬅️ use rng() here too
    }
    tries++;
  }

  // Relax / fallback still use rng()
  if (minDist > 30) return randomPointSeparated(existing, minDist * 0.9);

  const x = rng() * (W - m*2) + m;
  const y = rng() * (H - m - bottomSafeZone) + m;
  return { x, y, noteIndex: Math.floor(rng()*4) };
}



// Hit test with difficulty + adaptive hard + larger on touch
function isHit(px, py, step){
  const baseTol = (DIFF === 'hard')
    ? currentTol() * (1 + Math.min(0.12, hardGrace * 0.04))
    : currentTol();

  const tol = IS_TOUCH ? baseTol * 1.2 : baseTol;
  const dx = px - step.x, dy = py - step.y;
  return (dx*dx + dy*dy) <= tol*tol;
}

// Highlight a step
function highlightStep(step){
  addBurst(step.x, step.y, 'rgba(255,200,120,');
  playTone(step.noteIndex);
}

// ================= Round Flow =================
async function winRound(){
  phase = 'win';
  toast(`Round ${round} complete!`);
  buzz(90);

  // small celebration
  for (let i = 0; i < 3; i++){
    setTimeout(() => addBurst(
      rand(W * 0.3, W * 0.7),
      rand(H * 0.2, H * 0.5),
      'rgba(255,220,200,'
    ), i * 160);
  }
  await wait(700);

  const endlessActive = ENDLESS_ON || ENDLESS_LOCK;

  // ---- Rounds >= 10
  if (round >= 10){
    if (endlessActive){
      // Milestones: 10, 20, 30, ...
      if (round % 10 === 0){
        buzz([120, 60, 120]);
        bigFinaleChaos();
        await wait(3500);
        toast(`🎉 Endless Milestone: ${round}! 🎉`, 2000);
      }

      // Advance and keep going
      round++;

      // Update Endless best
      if (round > ENDLESS_BEST){
        ENDLESS_BEST = round;
        saveEndlessBest(ENDLESS_BEST);
        toast(`New Endless Best: ${ENDLESS_BEST}`);
      }

      replayUsed = false;
      updateHUD(); updateReplayUI();
      sequence.push(randomPointSeparated(sequence));
      await wait(300);
      playSequence();
      return;

    } else {
      // Normal mode: single grand finale + modal
      return victory();
    }
  }

  // ---- Rounds < 10
  round++;
  replayUsed = false;
  updateHUD(); updateReplayUI();
  sequence.push(randomPointSeparated(sequence));
  await wait(300);
  playSequence();
}


async function loseRound(){
  buzz(60);
  phase = 'lose';
  toast('Wrong! Try again');
  effects.push({x:W/2,y:H/2,age:0,life:250,type:'pulse',base:'rgba(255,80,80,'});
  if (DIFF === 'hard') hardGrace = Math.min(3, hardGrace + 1); // grow grace slightly
  await wait(500);
  inputIndex = 0;
  replayUsed = false;
  hardBlinkCount = 0;
  updateReplayUI();
  playSequence();
}

async function victory(){
  phase = 'victory';
  buzz([120,60,120]);
  bigFinaleChaos();
  await wait(3500);
  if (victoryModal) victoryModal.classList.remove('hidden');
}

function resetGame(){
  round = 1;
  sequence = [];
  phase = 'idle';
  replayUsed = false;
  hardGrace = 0;
  hardBlinkCount = 0;
  if (document.getElementById('intro')) document.getElementById('intro').classList.remove('hidden');
  updateHUD();
  updateReplayUI();
}

function startRound(r=1){
  round = r;
  sequence = [randomPointSeparated([])];
  replayUsed = false;
  hardGrace = 0;
  hardBlinkCount = 0;
  updateHUD();
  updateReplayUI();
  playSequence();
}
function startNewGameImmediate(){
  // skip intro/instructions flow
  if (typeof hasStarted !== 'undefined') hasStarted = true;
  if (typeof pendingStart !== 'undefined') pendingStart = false;

  const introEl = document.getElementById('intro');
  if (introEl) introEl.classList.add('hidden');
  if (typeof instructionsOverlay !== 'undefined' && instructionsOverlay){
    instructionsOverlay.classList.add('hidden');
  }

  // hard reset core state
  round = 1;
  sequence = [];
  phase = 'idle';
  replayUsed = false;
  if (typeof hardGrace !== 'undefined') hardGrace = 0;
  if (typeof hardBlinkCount !== 'undefined') hardBlinkCount = 0;

  updateHUD(); 
  updateReplayUI();

  // seed first target and begin
  sequence = [ (typeof randomPointSeparated === 'function')
                ? randomPointSeparated([])
                : randomPoint() ];

  // WebAudio can be suspended; resume on this user gesture
  try { if (typeof ac !== 'undefined' && ac && ac.state === 'suspended') ac.resume(); } catch(e){}

  playSequence(); // show + sound now
}

// Stronger speed ramp + small cushion on Hard + keeps ramping in Endless
function timingsForRound(){
  let show = Math.max(280, 600 - (round-1)*34);
  let gap  = Math.max(120, 220 - (round-1)*12);
  if (DIFF === 'hard'){ show += 40; gap += 20; }
  if (ENDLESS_ON && round > 10){
    const over = round - 10;
    show = Math.max(220, show - over * 10);
    gap  = Math.max(100, gap - over * 5);
  }
  return { show, gap };
}

// Show the sequence for the current round
async function playSequence(){
  phase = 'showing';
  inputIndex = 0;
  const t = timingsForRound();
  toast(ENDLESS_ON ? `Round ${round} ∞` : `Round ${round}`);
  await wait(300);
  for(const step of sequence){
    highlightStep(step);
    await wait(t.show);
    await wait(t.gap);
  }
  phase = 'input';
}

// ================= Input (pointerdown for snappy taps) =================
canvas.addEventListener('pointerdown', (e)=>{
  lastActionTs = performance.now();
  if(phase !== 'input') return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const expected = sequence[inputIndex];
  if(isHit(x,y, expected)){
    // correct
    addBurst(expected.x, expected.y, 'rgba(200,220,255,');
    playTone(expected.noteIndex);
    buzz(15);
    if (DIFF === 'hard') hardGrace = Math.max(0, hardGrace - 0.5); // shrink grace on success
    inputIndex++;
    if(inputIndex === sequence.length){
      winRound();
    }
  } else {
    loseRound();
  }
});

// ================= UI wiring =================
// Start flow: Click intro → show instructions; "Got it" → start round 1
const intro = document.getElementById('intro');
if (intro){
  intro.addEventListener('click', ()=>{
    intro.classList.add('hidden');
    if (instructionsOverlay) instructionsOverlay.classList.remove('hidden');
    pendingStart = true;
  });
}
if (closeInstructions){
  closeInstructions.addEventListener('click', ()=>{
    instructionsOverlay.classList.add('hidden');
    if (pendingStart && !hasStarted){
      hasStarted = true;
      pendingStart = false;
      startRound(1);
    }
  });
}

// Victory modal replay
if (playAgainBtn){
  playAgainBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    if (victoryModal) victoryModal.classList.add('hidden');
    startNewGameImmediate();   // ← immediate restart
  });
}

// Replay button (Assist: unlimited; Normal: 1/round; Hard: hidden)
if (replayBtn){
  replayBtn.addEventListener('click', ()=>{
    lastActionTs = performance.now();
    if (phase !== 'input') return;

    if (DIFF === 'normal'){
      if (replayUsed){
        toast("Replay already used this round");
        return;
      }
      replayUsed = true;
      updateReplayUI();
    }
    toast("Replaying sequence…");
    playSequence();
  });
}
// ===== Mobile hamburger menu wiring =====
const menuWrap = document.getElementById('mobileMenuWrap');
const menuToggle = document.getElementById('menuToggle');
const menuPanel = document.getElementById('mobileMenu');

if (menuWrap && menuToggle && menuPanel){
  const bDiff    = document.getElementById('btnDiff');
  const bMute    = document.getElementById('btnMute');
  const bReplay  = document.getElementById('btnReplay');
  const bEndless = document.getElementById('btnEndless');
  const bDaily   = document.getElementById('btnDaily');
  const bInfo    = document.getElementById('btnInfo');
  const bFeedback = document.getElementById('btnFeedback');

  function refreshHamburger(){
    if (bDiff){
      bDiff.textContent = (DIFF === 'assist') ? 'Mode: Assist'
                        : (DIFF === 'normal') ? 'Mode: Normal'
                        : 'Mode: Hard';
    }
    if (bMute){
      bMute.textContent = AUDIO_ON ? '🔊 Sound: On' : '🔇 Sound: Off';
    }
    if (bEndless){
      bEndless.style.background = ENDLESS_ON ? 'rgba(0,255,180,0.25)' : 'rgba(255,255,255,0.16)';
    }
    if (bDaily){
      bDaily.style.background = DAILY_ON ? 'rgba(255,220,80,0.28)' : 'rgba(255,255,255,0.16)';
    }
  }
    if (bFeedback) {
  bFeedback.addEventListener('click', ()=>{
    // Option A: Link to GitHub Issues
    window.open("https://github.com/MiracleRaverMango/fireworks-memory-game/issues", "_blank");

    // Option B (alternate): Google Form
    // window.open("https://forms.gle/your-form-id", "_blank");

    toast("Opening feedback form…");
  });
}

  function openMenu(){
    menuPanel.classList.add('open');
    menuPanel.setAttribute('aria-hidden', 'false');
  }
  function closeMenu(){
    menuPanel.classList.remove('open');
    menuPanel.setAttribute('aria-hidden', 'true');
  }
  function toggleMenu(){
    if (menuPanel.classList.contains('open')) closeMenu(); else openMenu();
  }

  menuToggle.addEventListener('click', (e)=>{
    e.stopPropagation();
    toggleMenu();
  });

  // Close on outside click / ESC / resize to desktop
  window.addEventListener('click', (e)=>{
    if (!menuPanel.classList.contains('open')) return;
    if (!menuWrap.contains(e.target)) closeMenu();
  });
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape') closeMenu();
  });
  window.addEventListener('resize', ()=>{
    if (window.innerWidth > 900) closeMenu();
  });

  // Button actions (same logic as keyboard shortcuts / replay button)
  if (bDiff) bDiff.addEventListener('click', ()=>{
    DIFF = (DIFF === 'assist') ? 'normal' : (DIFF === 'normal') ? 'hard' : 'assist';
    const msg = (DIFF === 'assist') ? "Assist Mode (hints + big target)"
             : (DIFF === 'normal') ? "Normal Mode (forgiving target)"
             : "Hard Mode (tight target)";
    toast(msg);
    updateHUD(); updateReplayUI(); refreshHamburger();
    closeMenu();
  });

  if (bMute) bMute.addEventListener('click', ()=>{
    AUDIO_ON = !AUDIO_ON;
    toast(AUDIO_ON ? "Audio ON 🔊" : "Audio OFF 🔇");
    updateHUD(); refreshHamburger();
    closeMenu();
  });

  if (bReplay) bReplay.addEventListener('click', ()=>{
    // delegate to existing replayBtn if present
    if (typeof replayBtn !== 'undefined' && replayBtn){
      replayBtn.click();
    } else {
      if (phase !== 'input') return;
      if (DIFF === 'normal'){
        if (replayUsed){ toast("Replay already used this round"); return; }
        replayUsed = true; updateReplayUI();
      }
      toast("Replaying sequence…"); playSequence();
    }
    closeMenu();
  });

  if (bEndless) bEndless.addEventListener('click', ()=>{
    ENDLESS_ON = !ENDLESS_ON;
    if (typeof ENDLESS_LOCK !== 'undefined' && ENDLESS_ON) ENDLESS_LOCK = true; // optional lock
    toast(ENDLESS_ON ? "Endless Mode ON ∞" : "Endless Mode OFF");
    updateHUD(); refreshHamburger();
    closeMenu();
  });

  if (bDaily) bDaily.addEventListener('click', ()=>{
    DAILY_ON = !DAILY_ON;
    resetDailyRng();
    toast(DAILY_ON ? "Daily Challenge ON 📅" : "Daily Challenge OFF");
    updateHUD(); refreshHamburger();
    closeMenu();
  });

  if (bInfo) bInfo.addEventListener('click', ()=>{
    if (typeof instructionsOverlay !== 'undefined' && instructionsOverlay){
      instructionsOverlay.classList.toggle('hidden');
    } else {
      toast("Instructions overlay not found", 1200);
    }
    closeMenu();
  });

  // Initial sync
  refreshHamburger();
}


// ================= Main loop =================
let last = performance.now();
function loop(now){
  const dt = now - last; last = now;
  ctx.clearRect(0,0,W,H);
  drawBackdrop();
  drawHints(now);
  drawHardBlink(now);
  drawEffects(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Initialize HUD/UI once
updateHUD();
updateReplayUI();

// Optional quick tips
toast("Tips: A = difficulty • M = audio • E = endless • D = daily • I = instructions", 2200);
