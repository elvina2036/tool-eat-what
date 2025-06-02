let foods = [];
let categories = [];
let meals = [];
let tags = [];
const maps = { category: new Map(), meal: new Map(), tag: new Map() };
let currentMeal = 'breakfast';
let excludedFoods = [];

async function loadAllData() {
  [categories, meals, tags, foods] = await Promise.all([
    fetch('resource/categories.json').then(res => res.json()),
    fetch('resource/meals.json').then(res => res.json()),
    fetch('resource/tags.json').then(res => res.json()),
    fetch('resource/foods.json').then(res => res.json())
  ]);
  categories.forEach(c => maps.category.set(c.id, c));
  meals.forEach(m => maps.meal.set(m.id, m));
  tags.forEach(t => maps.tag.set(t.id, t));
  foods = foods.map((f, idx) => ({ ...f, idx }));
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
        renderAutocomplete(currentMeal);
        document.getElementById('result').innerHTML = '';
      }
    };
    nav.appendChild(btn);
  });
}

function renderAutocomplete(meal) {
  const available = getFoodsByMeal(meal);
  const inputDiv = document.getElementById('autocomplete-input');
  const tagDiv = document.getElementById('excluded-tags');
  inputDiv.value = '';
  tagDiv.innerHTML = '';
  excludedFoods.forEach(idx => {
    const item = available.find(f => f.idx === idx);
    if (!item) return;
    const tag = document.createElement('span');
    tag.className = 'ex-tag';
    tag.innerText = item.name;
    const delBtn = document.createElement('button');
    delBtn.innerText = '✕';
    delBtn.onclick = () => {
      excludedFoods = excludedFoods.filter(id => id !== idx);
      renderAutocomplete(meal);
    };
    tag.appendChild(delBtn);
    tagDiv.appendChild(tag);
  });

  let datalist = document.getElementById('foods-datalist');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'foods-datalist';
    document.body.appendChild(datalist);
  }
  datalist.innerHTML = '';
  available
    .filter(f => !excludedFoods.includes(f.idx))
    .forEach(f => {
      const option = document.createElement('option');
      option.value = f.name;
      datalist.appendChild(option);
    });
  inputDiv.setAttribute('list', 'foods-datalist');
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
  renderAutocomplete(currentMeal);

  document.getElementById('autocomplete-input').addEventListener('change', e => {
    const val = e.target.value.trim();
    const available = getFoodsByMeal(currentMeal);
    const match = available.find(f => f.name === val && !excludedFoods.includes(f.idx));
    if (match) {
      excludedFoods.push(match.idx);
      e.target.value = '';
      renderAutocomplete(currentMeal);
    }
  });

  document.getElementById('random-btn').addEventListener('click', () => {
    showResult(currentMeal);
  });
});
