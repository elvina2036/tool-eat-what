let foods = [];
let meals = [];
let tags = [];
const maps = { meal: new Map(), tag: new Map() };
let currentMeal = 'breakfast';
let selectedTags = [];
let excludedFoods = [];
let excludeChoices;

// ── CSV → JSON ────────────────────────────────
function csvToJson(csv) {
  const lines = csv.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] ?? '');
    return obj;
  });
}

const SHEET_ID = '1-Ga2cZzG-_L5vzDajcR4xuYEg5lvyuvxsfEqCB_5dGM';
const SHEET_URL = (tab) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${tab}`;

async function loadAllData() {
  [meals, tags, foods] = await Promise.all([
    fetch('resource/meals.json').then(res => res.json()),
    fetch(SHEET_URL('tags')).then(r => r.text()).then(csvToJson),
    fetch(SHEET_URL('foods')).then(r => r.text()).then(csvToJson)
  ]);
  foods = foods.map((f, idx) => ({
    ...f, idx,
    meals: (f.meals || '').split(';').map(s => s.trim().toLowerCase()).filter(Boolean),
    tags:  (f.tags  || '').split(';').map(s => s.trim().toLowerCase()).filter(Boolean)
  }));
  meals.forEach(m => maps.meal.set(m.id.toLowerCase(), m));
  tags.forEach(t  => maps.tag.set(t.id.toLowerCase(), t));
}

function getFoodsByMeal(mealId) {
  return foods.filter(f => f.meals.includes(mealId));
}

// ── Render meal tabs ──────────────────────────
function renderMealTabs() {
  const nav = document.querySelector('.meals-nav');
  nav.innerHTML = meals.map(m =>
    `<button class="meals-nav-btn" data-meal="${m.id}">
      <span class="emoji">${m.emoji}</span>
      <span class="meal-name">${m.name}</span>
    </button>`
  ).join('');

  const navBtns = nav.querySelectorAll('.meals-nav-btn');
  navBtns.forEach((btn, idx) => {
    btn.addEventListener('click', function () {
      navBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentMeal = this.getAttribute('data-meal');
      selectedTags = [];
      clearResult();
      renderTagChips();
      renderExcludeSelect(currentMeal);
    });
    if (idx === 0) btn.classList.add('active');
  });
}

// ── Render tag chips ──────────────────────────
function renderTagChips() {
  const tagNav = document.querySelector('.tags-nav');
  const tagsSet = new Set(
    foods.filter(f => f.meals.includes(currentMeal)).flatMap(f => f.tags)
  );
  const tagsArr = Array.from(tagsSet).sort();
  tagNav.innerHTML = tagsArr.map(t =>
    `<button class="tag-chip${selectedTags.includes(t) ? ' active' : ''}" data-tag="${t}">${maps.tag.get(t)?.name || t}</button>`
  ).join('');

  tagNav.querySelectorAll('.tag-chip').forEach(btn => {
    btn.addEventListener('click', function () {
      const tag = this.dataset.tag;
      if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(tg => tg !== tag);
        this.classList.remove('active');
      } else {
        selectedTags.push(tag);
        this.classList.add('active');
      }
      clearResult();
      renderExcludeSelect(currentMeal);
    });
  });
}

// ── Render exclude select ─────────────────────
function renderExcludeSelect(meal) {
  let available = getFoodsByMeal(meal);
  if (selectedTags.length > 0) {
    available = available.filter(f =>
      selectedTags.every(tag => f.tags.includes(tag))
    );
  }
  const select = document.getElementById('exclude-select');
  select.innerHTML = '';
  available.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.idx;
    opt.text = f.name;
    select.appendChild(opt);
  });
  if (excludeChoices) excludeChoices.destroy();
  excludeChoices = new Choices(select, {
    removeItemButton: true,
    placeholderValue: '輸入關鍵字排除食物…',
    noResultsText: '沒有找到這個食物',
    searchResultLimit: 12,
    shouldSort: false
  });
  excludeChoices.setValue([]);
  excludedFoods = [];
  select.addEventListener('change', () => {
    excludedFoods = Array.from(select.selectedOptions).map(o => Number(o.value));
  });
}

// ── Helpers ───────────────────────────────────
function clearResult() {
  const resultDiv = document.getElementById('result');
  const actionsDiv = document.getElementById('result-actions');
  resultDiv.innerHTML = '';
  resultDiv.classList.remove('is-rolling', 'is-revealed');
  actionsDiv.style.display = 'none';
}

function getOptions(meal) {
  let options = getFoodsByMeal(meal).filter(item => !excludedFoods.includes(item.idx));
  if (selectedTags.length > 0) {
    options = options.filter(o => selectedTags.every(t => o.tags.includes(t)));
  }
  return options;
}

// ── Particle burst ────────────────────────────
function spawnParticles(container) {
  const colors = ['#a855f7', '#e879f9', '#818cf8', '#f472b6', '#c084fc', '#fbbf24'];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (i / count) * 360 + Math.random() * 15;
    const dist  = 55 + Math.random() * 50;
    const tx    = Math.cos(angle * Math.PI / 180) * dist;
    const ty    = Math.sin(angle * Math.PI / 180) * dist - 15;
    const size  = 5 + Math.random() * 5;
    p.style.cssText = `
      --tx: ${tx}px; --ty: ${ty}px;
      background: ${colors[i % colors.length]};
      width: ${size}px; height: ${size}px;
      left: 50%; top: 20%;
      animation-delay: ${Math.random() * 80}ms;
      animation-duration: ${700 + Math.random() * 300}ms;
    `;
    container.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }
}

// ── Reveal final result ───────────────────────
function revealResult(pick, meal, resultDiv) {
  resultDiv.classList.remove('is-rolling');

  const tagNames = pick.tags
    .map(id => maps.tag.get(id)?.name || id)
    .join('、');

  resultDiv.innerHTML = `
    <div class="result-inner">
      <div class="result-label">${maps.meal.get(meal)?.emoji || ''} ${maps.meal.get(meal)?.name || ''}建議</div>
      <div class="result-name">${pick.name}</div>
      ${tagNames ? `<div class="pick-info">🏷️ ${tagNames}</div>` : ''}
      ${pick.image ? `<img src="${pick.image}" alt="${pick.name}" class="pick-img">` : ''}
    </div>
  `;

  spawnParticles(resultDiv);
}

// ── Slot machine animation ────────────────────
function showResultAnimated(meal) {
  const btn       = document.getElementById('random-btn');
  const resultDiv = document.getElementById('result');
  const actionsDiv = document.getElementById('result-actions');
  const btnText   = btn.querySelector('.btn-text');

  const options = getOptions(meal);
  if (options.length === 0) {
    resultDiv.classList.remove('is-rolling');
    resultDiv.innerHTML = '<div class="result-empty">你是不是太挑食啦？沒東西剩下可以選了！🥲</div>';
    actionsDiv.style.display = 'none';
    return;
  }

  // Pre-determine final pick
  const finalPick = options[Math.floor(Math.random() * options.length)];

  // Button → rolling state
  btn.disabled = true;
  btn.classList.add('is-rolling');
  btnText.textContent = '抽籤中…';
  actionsDiv.style.display = 'none';
  resultDiv.classList.add('is-rolling');
  resultDiv.innerHTML = '';

  // Slot machine: delays between each name flip (ms), starts fast, slows down
  const delays = [55, 55, 60, 68, 80, 100, 130, 170, 225, 300, 420, 580];
  let step = 0;

  function flip() {
    if (step < delays.length) {
      const r = options[Math.floor(Math.random() * options.length)];
      resultDiv.innerHTML = `<div class="slot-item">${r.name}</div>`;
      setTimeout(flip, delays[step++]);
    } else {
      // Final reveal
      revealResult(finalPick, meal, resultDiv);
      btn.disabled = false;
      btn.classList.remove('is-rolling');
      btnText.textContent = '隨機決定';
      actionsDiv.style.display = '';
    }
  }

  flip();
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Hide result-actions initially
  document.getElementById('result-actions').style.display = 'none';

  await loadAllData();
  renderMealTabs();
  renderTagChips();
  renderExcludeSelect(currentMeal);

  document.getElementById('random-btn').addEventListener('click', () => {
    showResultAnimated(currentMeal);
  });

  document.getElementById('again-btn').addEventListener('click', () => {
    showResultAnimated(currentMeal);
  });
});
