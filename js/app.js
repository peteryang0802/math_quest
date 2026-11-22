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
const LAST_KEY = 'math-quest-last';
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

// 讲解块（答对 / 订正后看）
function explainHTML(q){
  return `<div class="explain-box">
    <span class="explain-label">📝 为什么</span>
    <p class="explain-text">${esc(q.explain)}</p>
  </div>`;
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
      <div class="hint-zone" id="hint-zone">
        <button class="btn-hint" id="hint-btn">💡 卡住了？点我看提示</button>
        <div class="hint-box hidden" id="hint-box">${esc(q.hint)}</div>
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
  document.getElementById('hint-btn').addEventListener('click', () => {
    const box = document.getElementById('hint-box');
    const nowHidden = box.classList.toggle('hidden');
    document.getElementById('hint-btn').textContent =
      nowHidden ? '💡 卡住了？点我看提示' : '💡 提示（先自己想，别急着选）';
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
    document.getElementById('hint-zone').classList.add('hidden');
    const fb = document.getElementById('feedback');
    fb.className = 'feedback ok';
    const head = st.status === 'first' ? '答对了，真棒！' : '订正后答对了，看看为什么';
    fb.innerHTML = `<div class="fb-head">${head}</div>${explainHTML(q)}`;
    playCorrect();
    persist();
    document.getElementById('q-actions').classList.remove('hidden');
  } else {
    st.wrongPicks.push(k);
    const b = app.querySelectorAll('#options .opt')[k];
    if (b){ b.classList.add('wrong'); b.disabled = true; }
    const fb = document.getElementById('feedback');
    fb.className = 'feedback no';
    fb.textContent = '再想想看，也可以点上面的提示';
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
  document.getElementById('hint-zone').classList.add('hidden');
  const fb = document.getElementById('feedback');
  fb.className = 'feedback ok';
  const head = st.status === 'first' ? '答对了，真棒！' : '订正后答对了，看看为什么';
  fb.innerHTML = `<div class="fb-head">${head}</div>${explainHTML(q)}`;
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

  // 记下本次逐题结果，供结算页做错题回顾
  lsSet(LAST_KEY, {
    levelId: run.level.id,
    timeUp: timeUp,
    states: run.states.map(s => ({
      status:s.status,
      wrongPicks:s.wrongPicks || [],
      finalPick:s.finalPick
    }))
  });

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

// 错题回顾：把没一次答对的题列出来，讲清楚
function reviewHTML(level, last){
  const items = last.states.map((s, i) => {
    if (s.status === 'first') return null;
    const q = level.questions[i];
    let yourText, yourCls;
    if (s.finalPick != null){
      yourText = KEYS[s.finalPick] + '. ' + q.options[s.finalPick].t;
      yourCls = 'rv-corrected';
    } else if (s.wrongPicks && s.wrongPicks.length){
      const k = s.wrongPicks[s.wrongPicks.length - 1];
      yourText = KEYS[k] + '. ' + q.options[k].t;
      yourCls = 'rv-wrong';
    } else {
      yourText = '这题没来得及做';
      yourCls = 'rv-blank';
    }
    const correctText = KEYS[q.answer] + '. ' + q.options[q.answer].t;
    return `<div class="review-item">
      <div class="rv-no">第 ${i + 1} 题 · ${esc(q.point)}</div>
      <div class="rv-stem">${esc(q.stem)}</div>
      <div class="rv-row ${yourCls}"><span>你的选择</span><b>${esc(yourText)}</b></div>
      <div class="rv-row rv-answer"><span>正确答案</span><b>${esc(correctText)}</b></div>
      <div class="rv-explain">${esc(q.explain)}</div>
    </div>`;
  }).filter(Boolean);

  if (!items.length) return '';
  return `<div class="review">
    <h3 class="review-title">📖 错题回顾（${items.length} 题，看懂再走）</h3>
    ${items.join('')}
  </div>`;
}

function renderResult(i){
  if (i < 0){ location.hash = '#/home'; return; }
  const level = LEVELS[i];
  const best = loadBest()[level.id];
  if (!best){ location.hash = '#/home'; return; }
  const rate = Math.round(best.score / 30 * 100);
  const last = lsGet(LAST_KEY);
  const review = (last && last.levelId === level.id) ? reviewHTML(level, last) : '';
  const timeUpNote = (last && last.levelId === level.id && last.timeUp)
    ? '<p class="timeup-note">时间到啦，没做完的题我们一起看看</p>' : '';
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
        ${timeUpNote}
      </div>
      ${review}
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
      <div class="section-label">动手玩 · 把相等关系看明白</div>
      <a class="lab-entry" href="equation_lab/index.html">
        <span class="lab-ico">⚖️</span>
        <span class="lab-meta">
          <span class="lab-name">相等关系实验室</span>
          <span class="lab-desc">11 道应用题，拖一拖滑块，看两边怎么变得一样多</span>
        </span>
        <span class="lab-arrow">›</span>
      </a>
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
