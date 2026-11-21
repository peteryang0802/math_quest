// 数学闯关：3 关 × 10 题，整关倒计时，每题 3 分，三关最佳累计 90 分给小红花。
import { level1 } from './data/level1.js';
import { level2 } from './data/level2.js';
import { level3 } from './data/level3.js';
import { playCorrect, playWrong, unlockAudio } from './sfx.js?v=1';
import { showCelebration } from './celebrate.js?v=1';

const LEVELS = [level1, level2, level3];
const BEST_KEY = 'math-quest-best';
const PROG_KEY = 'math-quest-progress';
const FLOWER_KEY = 'math-quest-flower';
const KEYS = ['A', 'B', 'C', 'D'];

const app = document.getElementById('app');

// ---------- 存储 ----------
function lsGet(k){ try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
function lsRemove(k){ try { localStorage.removeItem(k); } catch {} }

function loadBest(){ return lsGet(BEST_KEY) || {}; }
function hasFlower(){ return lsGet(FLOWER_KEY) === true; }
function totalScore(){
  const best = loadBest();
  return LEVELS.reduce((sum, l) => sum + ((best[l.id] && best[l.id].score) || 0), 0);
}

function esc(s){
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function fmtTime(sec){
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ---------- 运行状态 ----------
let run = null;
let countdownId = null;

function newState(){ return { status:null, wrongPicks:[], finalPick:null }; }
function cur(){ return run.qs[run.index]; }
function cst(){ return run.states[run.index]; }

function stopCountdown(){
  if (countdownId){ clearInterval(countdownId); countdownId = null; }
}

function persist(){
  if (!run) return;
  lsSet(PROG_KEY, {
    levelId: run.level.id,
    index: run.index,
    timeLeft: run.timeLeft,
    states: run.states,
    updatedAt: Date.now()
  });
}

// ---------- 开始 / 恢复 ----------
function beginRun(i){
  if (i < 0){ location.hash = '#/home'; return; }
  const level = LEVELS[i];
  const prog = lsGet(PROG_KEY);
  let states, index, timeLeft;
  if (prog && prog.levelId === level.id){
    states = prog.states.map(s => ({ ...s, wrongPicks:s.wrongPicks || [] }));
    index = Math.min(prog.index, level.questions.length - 1);
    timeLeft = typeof prog.timeLeft === 'number' ? prog.timeLeft : level.duration;
  } else {
    states = level.questions.map(() => newState());
    index = 0;
    timeLeft = level.duration;
  }
  run = { level, qs:level.questions, states, index, timeLeft };
  document.documentElement.style.setProperty('--c', level.color);
  renderQuestion();
  startCountdown();
}

function startCountdown(){
  stopCountdown();
  updateTimer();
  countdownId = setInterval(() => {
    run.timeLeft -= 1;
    if (run.timeLeft <= 0){
      run.timeLeft = 0;
      updateTimer();
      finishRun(true);
      return;
    }
    updateTimer();
    persist();
  }, 1000);
}

function updateTimer(){
  const el = document.getElementById('timer');
  if (el){
    el.textContent = fmtTime(run.timeLeft);
    el.classList.toggle('urgent', run.timeLeft <= 60);
  }
}

// ---------- 渲染题目 ----------
function renderQuestion(){
  const q = cur();
  const st = cst();
  const total = run.qs.length;
  const pct = Math.round(run.index / total * 100);
  app.innerHTML = `
    <div class="play">
      <div class="play-top">
        <button class="btn-back" id="btn-back" aria-label="返回">‹</button>
        <div class="progress-wrap">
          <div class="progress-label">
            <span>${esc(run.level.name)}</span>
            <span>第 ${run.index + 1} / ${total} 题</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="timer" id="timer">${fmtTime(run.timeLeft)}</div>
      </div>
      <div class="q-stage">
        <div class="stem">${esc(q.stem)}</div>
      </div>
      <div class="options" id="options">
        ${q.options.map((o,k) => `
          <button class="opt" data-k="${k}">
            <span class="key">${KEYS[k]}</span><span class="opt-t">${esc(o.t)}</span>
          </button>`).join('')}
      </div>
      <div class="feedback" id="feedback"></div>
      <div class="q-actions hidden" id="q-actions">
        <button class="btn-primary" id="next-btn">
          ${run.index === total - 1 ? '查看结果 ›' : '下一题 ›'}
        </button>
      </div>
    </div>`;

  document.getElementById('btn-back').addEventListener('click', () => {
    persist();
    location.hash = '#/home';
  });
  app.querySelectorAll('.opt').forEach(b =>
    b.addEventListener('click', () => choose(+b.dataset.k)));
  document.getElementById('next-btn').addEventListener('click', goNext);

  if (st.status) restoreAnswered();
}

function choose(k){
  const st = cst();
  if (st.status) return;
  const q = cur();
  if (k === q.answer){
    st.status = st.wrongPicks.length ? 'corrected' : 'first';
    st.finalPick = k;
    lockOptions(k, q.answer);
    const fb = document.getElementById('feedback');
    fb.className = 'feedback ok';
    fb.textContent = st.status === 'first' ? '答对了，真棒！' : '订正后答对了';
    playCorrect();
    persist();
    document.getElementById('q-actions').classList.remove('hidden');
  } else {
    st.wrongPicks.push(k);
    const b = app.querySelectorAll('#options .opt')[k];
    if (b){ b.classList.add('wrong'); b.disabled = true; }
    const fb = document.getElementById('feedback');
    fb.className = 'feedback no';
    fb.textContent = '再想想看';
    playWrong();
    persist();
  }
}

function lockOptions(picked, answer){
  app.querySelectorAll('#options .opt').forEach((b,k) => {
    b.disabled = true;
    b.classList.add('locked');
    if (k === answer) b.classList.add('correct');
    else if (k === picked) b.classList.add('wrong');
  });
}

function restoreAnswered(){
  const q = cur();
  const st = cst();
  (st.wrongPicks || []).forEach(k => {
    const b = app.querySelectorAll('#options .opt')[k];
    if (b){ b.classList.add('wrong'); b.disabled = true; }
  });
  lockOptions(st.finalPick != null ? st.finalPick : q.answer, q.answer);
  const fb = document.getElementById('feedback');
  fb.className = 'feedback ok';
  fb.textContent = st.status === 'first' ? '答对了，真棒！' : '订正后答对了';
  document.getElementById('q-actions').classList.remove('hidden');
}

function goNext(){
  if (run.index < run.qs.length - 1){
    run.index += 1;
    persist();
    renderQuestion();
  } else {
    finishRun(false);
  }
}

// ---------- 结算 ----------
function finishRun(timeUp){
  stopCountdown();
  const counts = { first:0, corrected:0, blank:0 };
  run.states.forEach(s => {
    if (s.status === 'first') counts.first += 1;
    else if (s.status === 'corrected') counts.corrected += 1;
    else counts.blank += 1;
  });
  const total = run.qs.length;
  const right = counts.first + counts.corrected;
  const score = right * 3;

  const best = loadBest();
  const prev = best[run.level.id];
  if (!prev || score > prev.score){
    best[run.level.id] = { score, first:counts.first, total };
    lsSet(BEST_KEY, best);
  }
  lsRemove(PROG_KEY);

  // 三关最佳累计满 90，且还没拿过花，就给小红花
  const grand = totalScore();
  if (grand === 90 && !hasFlower()){
    lsSet(FLOWER_KEY, true);
    showCelebration();
  }

  const id = run.level.id;
  run = null;
  location.hash = '#/result/' + id;
}

function renderResult(i){
  if (i < 0){ location.hash = '#/home'; return; }
  const level = LEVELS[i];
  const best = loadBest()[level.id];
  if (!best){ location.hash = '#/home'; return; }
  const rate = Math.round(best.score / 30 * 100);
  app.innerHTML = `
    <div class="result">
      <div class="result-card" style="--c:${level.color}">
        <div class="score-ring" style="--p:${rate}">
          <div class="inner">
            <div class="num">${best.score}</div>
            <div class="unit">/ 30 分</div>
          </div>
        </div>
        <h2>${best.score === 30 ? '这一关满分，太厉害啦' : '继续加油，争取满分'}</h2>
        <p class="result-note">一次答对 ${best.first} / ${best.total} 题，每题 3 分</p>
      </div>
      <div class="result-actions">
        <button class="btn-primary" style="--c:${level.color}" id="retry">再闯一次</button>
        <button class="btn-ghost" id="home">返回首页</button>
      </div>
    </div>`;
  document.getElementById('retry').addEventListener('click', () => location.hash = '#/play/' + level.id);
  document.getElementById('home').addEventListener('click', () => location.hash = '#/home');
}

// ---------- 首页 ----------
function renderHome(){
  stopCountdown();
  const best = loadBest();
  const grand = totalScore();
  const flower = hasFlower();
  app.innerHTML = `
    <div class="home">
      <div class="home-head">
        <h1>数学闯关</h1>
        <p>初一上 · 字母表示数与一元一次方程</p>
      </div>
      <div class="honor ${flower ? 'on' : ''}">
        ${flower
          ? '<span class="honor-flower">🏵️</span><span class="honor-text">已获得小红花，真棒！</span>'
          : `<span class="honor-flower gray">🏵️</span>
             <span class="honor-text">小红花进度：<b>${grand}</b> / 90 分</span>`}
      </div>
      <div class="section-label">选择关卡（每关 10 题，限时，满分 30 分）</div>
      <div class="level-grid">
        ${LEVELS.map((l, i) => {
          const b = best[l.id];
          return `
          <button class="level-card" data-i="${i}" style="--c:${l.color}">
            <span class="level-badge">${l.emoji}</span>
            <span class="level-meta">
              <span class="name">${esc(l.name)}</span>
              <span class="desc">限时 ${fmtTime(l.duration)} · 10 题</span>
              <span class="best">${b ? `最佳 ${b.score} / 30 分` : '还没闯过'}</span>
            </span>
            <span class="level-arrow">›</span>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  app.querySelectorAll('.level-card').forEach(c =>
    c.addEventListener('click', () => location.hash = '#/play/' + LEVELS[+c.dataset.i].id));
}

// ---------- 路由 ----------
function router(){
  stopCountdown();
  const parts = (location.hash || '#/home').split('/');
  if (parts[1] === 'play') beginRun(LEVELS.findIndex(l => l.id === parts[2]));
  else if (parts[1] === 'result') renderResult(LEVELS.findIndex(l => l.id === parts[2]));
  else renderHome();
}
window.addEventListener('hashchange', router);

// 首次手势解锁音频
document.addEventListener('pointerdown', () => unlockAudio(), { once:false });
document.addEventListener('keydown', () => unlockAudio());

location.hash = location.hash || '#/home';
router();
