// 音效模块：答对人声鼓励、答错柔和提示、全对庆祝。
// 人声走独立 Audio，即时小音效走 Web Audio，两套互不干扰。
const SFX_VERSION = 1;
const sfxUrl = f => `audio/${f}.mp3?v=${SFX_VERSION}`;

// 单题鼓励，随机抽，避免连着播同一个
const PRAISE = ['sfx-yay','sfx-nice','sfx-great','sfx-goodjob','sfx-welldone'];
let lastPraise = -1;

const voice = new Audio();
voice.preload = 'auto';
let ctx = null;

// 首次用户手势里解锁，浏览器才允许出声
function ensureCtx() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}
export function unlockAudio() {
  ensureCtx();
  if (voice && voice.paused === false) return;
}

// 一个带软包络的音符，避免开头爆音
function tone(ac, freq, when, dur, type, peak) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g); g.connect(ac.destination);
  osc.start(when); osc.stop(when + dur + 0.02);
}

// 答对：随机人声鼓励
export function playCorrect() {
  let i;
  do { i = Math.floor(Math.random() * PRAISE.length); }
  while (PRAISE.length > 1 && i === lastPraise);
  lastPraise = i;
  voice.pause();
  voice.currentTime = 0;
  voice.src = sfxUrl(PRAISE[i]);
  voice.play().catch(() => {});
}

// 答错：柔和的低音，轻轻提示一下，不吓人
export function playWrong() {
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 220, t, 0.18, 'sine', 0.12);
  tone(ac, 180, t + 0.05, 0.2, 'sine', 0.08);
}

// 全对庆祝：欢快上行琶音 + 庆祝人声
export function playCelebrate() {
  const ac = ensureCtx();
  if (ac) {
    const t = ac.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((f, k) => tone(ac, f, t + k * 0.13, 0.28, 'triangle', 0.16));
    tone(ac, 1318.5, t + 0.55, 0.4, 'triangle', 0.14); // E6 收尾
  }
  voice.pause();
  voice.currentTime = 0;
  voice.src = sfxUrl('sfx-celebrate');
  voice.play().catch(() => {});
}

// 停止一切（切路由时调用，避免背后还在响）
export function stopSfx() {
  try { voice.pause(); voice.currentTime = 0; } catch {}
}
