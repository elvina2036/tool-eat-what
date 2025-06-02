let foodList = []; // 全部食物資料
const mealNames = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐" };
const mealEmojis = { breakfast: "🍳", lunch: "🍱", dinner: "🍜" };
const foodsPath = "resource/foods.json";
let currentMeal = "breakfast";

// 載入 JSON
async function loadFoods() {
  const resp = await fetch(foodsPath);
  foodList = await resp.json();
  // 給每個食物一個索引（for 勾選用）
  foodList = foodList.map((food, idx) => ({ ...food, idx }));
}

// 選出可用食物
function getAvailableFoods(meal) {
  return foodList.filter(item => item.meals.includes(meal));
}

// 產生勾選選單
function renderChoices(meal) {
  const choicesDiv = document.getElementById('choices-list');
  choicesDiv.innerHTML = '';
  const available = getAvailableFoods(meal);
  available.forEach(item => {
    const label = document.createElement('label');
    label.className = 'choice-label';
    label.innerHTML = `<input type="checkbox" value="${item.idx}"> ${item.name}`;
    choicesDiv.appendChild(label);
  });
}

// 取得沒被勾掉的食物
function getUncheckedFoodList(meal) {
  const checked = Array.from(document.querySelectorAll('#choices-list input[type=checkbox]:checked'))
    .map(cb => Number(cb.value));
  return getAvailableFoods(meal).filter(item => !checked.includes(item.idx));
}

// 顯示結果
function showResult(meal) {
  const resultDiv = document.getElementById('result');
  const options = getUncheckedFoodList(meal);
  if (options.length === 0) {
    resultDiv.innerHTML = "你是不是太挑食啦？沒東西剩下可以選了！🥲";
    return;
  }
  const pick = options[Math.floor(Math.random() * options.length)];
  resultDiv.innerHTML = `<span class="emoji">${mealEmojis[meal]}</span> ${mealNames[meal]}建議：<span>${pick.name}</span>`;
}

// Tab 切換
function setActiveTab(tabElem) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  tabElem.classList.add('active');
}

// 主程式啟動
document.addEventListener('DOMContentLoaded', async () => {
  await loadFoods();

  renderChoices(currentMeal);

  // Tab 切換
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', e => {
      const meal = tab.getAttribute('data-meal');
      if (meal !== currentMeal) {
        currentMeal = meal;
        setActiveTab(tab);
        renderChoices(currentMeal);
        document.getElementById('result').innerHTML = '';
      }
    });
  });

  // 隨機決定
  document.getElementById('random-btn').addEventListener('click', () => {
    showResult(currentMeal);
  });
});
