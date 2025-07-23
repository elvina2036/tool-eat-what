let foods = [];
let categories = [];
let meals = [];
let tags = [];
const maps = { category: new Map(), meal: new Map(), tag: new Map() };
let currentMeal = 'breakfast';
let excludedFoods = [];
let excludeChoices;

// 實用 CSV to JSON 小工具
function csvToJson(csv) {
  const lines = csv.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    // 只簡單處理純文字/數值，有逗號的欄位請預先在 sheet 內加 "" 包裹
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
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
  [categories, meals, tags, foods] = await Promise.all([
    fetch(SHEET_URL('categories')).then(r => r.text()).then(csvToJson),
    fetch('resource/meals.json').then(res => res.json()),
    fetch(SHEET_URL('tags')).then(r => r.text()).then(csvToJson),
    fetch(SHEET_URL('foods')).then(r => r.text()).then(csvToJson)
  ]);
  // foods: meals, tags 都用逗號分隔，需轉陣列
  foods = foods.map((f, idx) => ({
    ...f,
    idx,
    meals: (f.meals || '').split(',').map(s => s.trim()).filter(Boolean),
    tags: (f.tags || '').split(',').map(s => s.trim()).filter(Boolean)
  }));
  categories.forEach(c => maps.category.set(c.id, c));
  meals.forEach(m => maps.meal.set(m.id, m));
  tags.forEach(t => maps.tag.set(t.id, t));
}

function getFoodsByMeal(mealId) {
  return foods.filter(f => f.meals.includes(mealId));
}

function renderMealTabs() {
  const nav = document.getElementById('meal-tabs');
  nav.innerHTML = '';
  meals.forEach(meal => {
    const btn = document.createElement('button');
    btn.className = 'tab' + (meal.id === currentMeal ? ' active' : '');
    btn.textContent = `${meal.emoji} ${meal.name}`;
    btn.setAttribute('data-meal', meal.id);
    btn.onclick = () => {
      if (meal.id !== currentMeal) {
        currentMeal = meal.id;
        excludedFoods = [];
        renderMealTabs();
        renderExcludeSelect(currentMeal);
        document.getElementById('result').innerHTML = '';
      }
    };
    nav.appendChild(btn);
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
  const cat = maps.category.get(pick.category);
  const tagNames = pick.tags.map(id => maps.tag.get(id)?.name || id).join("、");
  resultDiv.innerHTML = `
    <span class="emoji">${maps.meal.get(meal)?.emoji || ''}</span>
    <strong>${maps.meal.get(meal)?.name || ''}建議：</strong>
    <span>${pick.name}</span>
    <div class="pick-info">
      分類：${cat?.icon || ''} ${cat?.name || pick.category}<br>
      標籤：${tagNames}
    </div>
    <img src="${pick.image}" alt="${pick.name}" class="pick-img">
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
