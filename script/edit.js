// 請將這一行換成你自己的 Apps Script Web App API 網址
const API_URL = "https://script.google.com/macros/s/AKfycbz7dLKiL4IQoq-pQOu20xSxAkH3q4mb1kOTGrWRH0nsRQBtDurmRaVnLr4HtCb48oBh/exec";

let foodsData = [];
let sortField = null;
let sortAsc = true;

async function loadFoods() {
  let res = await fetch(API_URL);
  let data = await res.json();
  foodsData = data;
  renderTable();
}

// 新增餐點
document.getElementById('addForm').onsubmit = async (e) => {
  e.preventDefault();
  let obj = {
    name: document.getElementById('name').value.trim(),
    meals: document.getElementById('meals').value.trim(),
    image: document.getElementById('image').value.trim(),
    tags: document.getElementById('tags').value.trim()
  };
  let res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(obj),
    headers: { 'Content-Type': 'application/json' }
  });
  let result = await res.json();
  document.getElementById('msg').textContent = result.result === "success" ? "新增成功！" : "新增失敗";
  setTimeout(()=>document.getElementById('msg').textContent="", 1800);
  loadFoods();
}

function renderTable() {
  const tb = document.querySelector('#foodsTable tbody');
  tb.innerHTML = '';
  // 排序
  let showData = [...foodsData];
  if (sortField) {
    showData.sort((a, b) => {
      let v1 = a[sortField] ? a[sortField].toLowerCase() : "";
      let v2 = b[sortField] ? b[sortField].toLowerCase() : "";
      return (v1 > v2 ? 1 : (v1 < v2 ? -1 : 0)) * (sortAsc ? 1 : -1);
    });
  }
  showData.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" value="${item.name}" class="name"></td>
      <td><input type="text" value="${item.meals}" class="meals"></td>
      <td><input type="text" value="${item.image}" class="image"></td>
      <td><input type="text" value="${item.tags}" class="tags"></td>
      <td class="row-actions">
        <button class="update">更新</button>
        <button class="delete">刪除</button>
      </td>
    `;
    // 更新
    tr.querySelector('.update').onclick = async () => {
      let obj = {
        name: tr.querySelector('.name').value.trim(),
        meals: tr.querySelector('.meals').value.trim(),
        image: tr.querySelector('.image').value.trim(),
        tags: tr.querySelector('.tags').value.trim()
      };
      let res = await fetch(API_URL, {
        method: 'PUT',
        body: JSON.stringify(obj),
        headers: { 'Content-Type': 'application/json' }
      });
      let result = await res.json();
      alert(result.result === "updated" ? "已更新" : "更新失敗");
      loadFoods();
    }
    // 刪除
    tr.querySelector('.delete').onclick = async () => {
      if (!confirm("確定要刪除嗎？")) return;
      let url = API_URL + "?name=" + encodeURIComponent(item.name);
      let res = await fetch(url, { method: 'DELETE' });
      let result = await res.json();
      alert(result.result === "deleted" ? "已刪除" : "刪除失敗");
      loadFoods();
    }
    tb.appendChild(tr);
  });
}

// 支援點欄位排序
document.querySelectorAll('#foodsTable th[data-sort]').forEach(th => {
  th.addEventListener('click', function() {
    let field = th.getAttribute('data-sort');
    if (sortField === field) sortAsc = !sortAsc;
    else { sortField = field; sortAsc = true; }
    renderTable();
  });
});

loadFoods();
