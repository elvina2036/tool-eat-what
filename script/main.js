let foods = [];
let meals = [];
let tags = [];
const maps = { meal: new Map(), tag: new Map() };
let currentMeal = 'breakfast';
let excludedFoods = [];
let excludeChoices;

// 實用 CSV to JSON 小工具
function csvToJson(csv) {
  const lines = csv.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    // 只簡單處理純文字/數值，有逗號的欄位請預先在 sheet 內加 "" 包裹
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] ?? '');
    return obj;
  });
}

const SHEET_ID = '1-Ga2cZzG-_L5vzDajcR4xuYEg5lvyuvxsfEqCB_5dGM'; // 換成你自己的
const SHEET_URL = (tab) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${tab}`;

async function loadAllData() {
  // meals 仍可本地 json 或同樣放 Sheet
  [meals, tags, foods] = await Promise.all([
    fetch('resource/meals.json').then(res => res.json()),
    fetch(SHEET_URL('tags')).then(r => r.text()).then(csvToJson),
    fetch(SHEET_URL('foods')).then(r => r.text()).then(csvToJson)
  ]);
  // foods: meals, tags 都用逗號分隔，需轉陣列
  foods = foods.map((f, idx) => ({
    ...f,
    idx,
    meals: (f.meals || '').split(';').map(s => s.trim()).filter(Boolean),
    tags: (f.tags || '').split(';').map(s => s.trim()).filter(Boolean)
  }));
  meals.forEach(m => maps.meal.set(m.id, m));
  tags.forEach(t => maps.tag.set(t.id, t));
}

function getFoodsByMeal(mealId) {
  return foods.filter(f => f.meals.includes(mealId));
}

function renderMealTabs() {
  // 渲染
  const nav = document.querySelector('.meals-nav');
  nav.innerHTML = meals.map(m =>
    `<button class="meals-nav-btn" data-meal="${m.id}">
      <span class="emoji">${m.emoji}</span>
      <span class="meal-name">${m.name}</span>
    </button>`
  ).join('');

  // 綁定點擊事件與 active 狀態
  const navBtns = nav.querySelectorAll('.meals-nav-btn');
  navBtns.forEach((btn, idx) => {
    btn.addEventListener('click', function() {
      navBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const meal = this.getAttribute('data-meal');
      showResult(meal); // 你的切換邏輯
      // nav.scrollLeft = btn.offsetLeft - nav.offsetWidth / 2 + btn.offsetWidth / 2; // 可選: 點擊自動居中
    });
    if(idx === 0) btn.classList.add('active');
  });
}

function renderExcludeSelect(meal) {
  const available = getFoodsByMeal(meal);
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
    placeholderValue: '點擊或輸入關鍵字選擇要排除的食物…',
    noResultsText: '沒有找到這個食物',
    searchResultLimit: 12,
    shouldSort: false
  });
  // 預設排除
  excludeChoices.setValue([]);
  excludedFoods = [];
  select.addEventListener('change', () => {
    excludedFoods = Array.from(select.selectedOptions).map(o => Number(o.value));
  });
}

function showResult(meal) {
  const resultDiv = document.getElementById('result');
  const options = getFoodsByMeal(meal).filter(item => !excludedFoods.includes(item.idx));
  if (options.length === 0) {
    resultDiv.innerHTML = "你是不是太挑食啦？沒東西剩下可以選了！🥲";
    return;
  }
  const pick = options[Math.floor(Math.random() * options.length)];
  const tagNames = pick.tags.map(id => maps.tag.get(id)?.name || id).join("、");
  resultDiv.innerHTML = `
    <span class="emoji">${maps.meal.get(meal)?.emoji || ''}</span>
    <strong>${maps.meal.get(meal)?.name || ''}建議：</strong>
    <span>${pick.name}</span>
    <div class="pick-info">
      標籤：${tagNames}
    </div>
    ${pick.image ? `<img src="${pick.image}" alt="${pick.name}" class="pick-img">` : ''}
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  renderMealTabs();
  renderExcludeSelect(currentMeal);

  document.getElementById('random-btn').addEventListener('click', () => {
    showResult(currentMeal);
  });
});
