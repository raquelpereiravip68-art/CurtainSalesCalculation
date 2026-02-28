document.addEventListener('DOMContentLoaded', () => {
  addRow();
  updateRowOperations();
  loadList('draft');
  loadList('history');
});

function toggleList(type) {
  const container = document.getElementById(type + 'List');
  const arrow = document.getElementById(type + 'Arrow');
  const isExpanded = container.classList.toggle('expanded');
  container.classList.toggle('collapsed', !isExpanded);
  arrow.textContent = isExpanded ? '▲' : '▼';
}

function addRow() {
  const tbody = document.getElementById('tableBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" placeholder="区域"></td>
    <td><input type="text" placeholder="型号"></td>
    <td><input type="number" step="0.01" min="0" oninput="debounceCalcRow(this)"></td>
    <td><input type="number" step="0.01" min="0" oninput="debounceCalcRow(this)"></td>
    <td><input type="number" step="0.1"  min="0.1" value="2" oninput="debounceCalcRow(this)"></td>
    <td><input type="number" step="0.01" min="0" oninput="debounceCalcRow(this)" data-manual="false"></td>
    <td><input type="number" step="0.01" min="0" oninput="debounceCalcRow(this)"></td>
    <td><input type="text" oninput="debounceCalcRow(this)" placeholder="自动或手动修改" data-is-manual="false"></td>
    <td><input type="text" placeholder="备注"></td>
    <td class="operation-cell"></td>
  `;
  tbody.appendChild(tr);
  updateRowOperations();
  calcTotal();
}

function deleteRow(btn) {
  if (document.querySelectorAll('#tableBody tr').length <= 1) return;
  btn.closest('tr').remove();
  updateRowOperations();
  calcTotal();
}

function updateRowOperations() {
  const rows = document.querySelectorAll('#tableBody tr');
  const showDel = rows.length > 1;

  rows.forEach(row => {
    row.querySelector('.operation-cell').innerHTML = `
      <button class="add-btn" onclick="addRow()">添加</button>
      ${showDel ? '<button class="del-btn" onclick="deleteRow(this)">删除</button>' : ''}
    `;
  });
}

// ──────────────── 核心计算逻辑 ────────────────
function calcRow(el) {
  const row = el.closest('tr');
  if (!row) return;

  const inputs = row.querySelectorAll('input');
  const [/*区域*/, /*型号*/, wEl, hEl, foldEl, usageEl, priceEl, subtotalEl] = inputs;

  const w    = parseFloat(wEl.value)    || 0;
  const h    = parseFloat(hEl.value)    || 0;
  const fold = parseFloat(foldEl.value) || 0;
  const p    = parseFloat(priceEl.value)|| 0;

  const isUsageChanged   = el === usageEl;
  const isDimensionInput = [wEl, hEl, foldEl].includes(el);
  const isSubtotalInput  = el === subtotalEl;

  let usageManual = usageEl.dataset.manual === 'true';

  // 用料：手动输入 → 红色；尺寸/倍数变化且非手动 → 自动算
  if (isUsageChanged) {
    if (usageEl.value.trim() === '') {
      usageManual = false;
      usageEl.dataset.manual = 'false';
      usageEl.style.color = 'black';
    //   usageEl.style.textAlign = 'center';   // 清空也居中
    } else if (!isNaN(parseFloat(usageEl.value))) {
      usageManual = true;
      usageEl.dataset.manual = 'true';
      usageEl.style.color = 'red';
    //   usageEl.style.textAlign = 'center';   // 手动输入 → 红色 + 居中
    }
  }

  if (isDimensionInput && !usageManual) {
    const usage = fold > 0 ? w * fold : w * h;
    usageEl.value = usage > 0 ? usage.toFixed(2) : '';
    usageEl.style.color = 'black';
    usageEl.dataset.manual = 'false';
  }

  // ───── 合计部分 ─────
  let val = 0;
  let displayText = subtotalEl.value.trim();
  const lower = displayText.toLowerCase();
  const isGift = ['赠送','送','免费','gift','free'].some(kw => lower.includes(kw));

  if (isGift) {
    val = 0;
    subtotalEl.value = '赠送';
    subtotalEl.dataset.isManual = 'true';
    subtotalEl.className = 'gift';
  }
  else if (isSubtotalInput) {
    // 用户主动改了合计 → 标记为手动，优先使用用户输入
    subtotalEl.dataset.isManual = 'true';
    val = parseFloat(displayText) || 0;
  }
  else {
    // 自动计算
    subtotalEl.dataset.isManual = 'false';
    const usage = parseFloat(usageEl.value) || 0;
    val = usage * p;
    subtotalEl.value = val.toFixed(2);
  }

  // 根据是否手动修改，设置样式
  if (subtotalEl.dataset.isManual === 'true') {
    subtotalEl.style.color = isGift ? '#e74c3c' : '#e74c3c';   // 手动统一红色（赠送也红）
    subtotalEl.style.fontWeight = isGift ? 'bold' : 'normal';
    // subtotalEl.style.textAlign = isGift ? 'center' : 'right';
    subtotalEl.style.textAlign = 'center'; 
  } else {
    subtotalEl.style.color = 'black';
    subtotalEl.style.fontWeight = 'normal';
    subtotalEl.style.textAlign = 'center';   // ← 自动计算 → 居中黑字
  }
  calcTotal();
}

function calcTotal() {
  let sum = 0;
  document.querySelectorAll('#tableBody tr').forEach(row => {
    const input = row.cells[7].querySelector('input');
    const txt = input.value.trim().toLowerCase();
    if (['赠送','送','免费','gift','free'].some(k => txt.includes(k))) return;
    sum += parseFloat(input.value) || 0;
  });

  document.getElementById('totalLower').textContent = '¥' + sum.toFixed(2);

  document.getElementById('totalUpper').textContent = numberToChinese(Math.floor(sum)) + '元整';
}

// 中文大写金额（整数部分，支持到亿）
function numberToChinese(n) {
  if (n === 0) return '零元整';
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units  = ['', '拾', '佰', '仟'];
  const bigUnits = ['', '万', '亿'];  // 每4位一个大单位
  let str = '';
  let num = Math.floor(n);
  let unitLevel = 0;  // 万、亿级别
  let zeroCount = 0;
  while (num > 0) {
    let part = num % 10000;  // 每4位处理一次
    if (part === 0) {
      if (str && str[0] !== '零') {
        str = '零' + str;
      }
    } else {
      let partStr = '';
      let temp = part;
      let i = 0;
      let hasNonZero = false;
      while (temp > 0) {
        let d = temp % 10;
        if (d !== 0) {
          partStr = digits[d] + units[i] + partStr;
          hasNonZero = true;
          zeroCount = 0;
        } else if (hasNonZero) {
          partStr = '零' + partStr;
        }
        temp = Math.floor(temp / 10);
        i++;
      }

      // 加上大单位（万、亿）
      if (unitLevel > 0) {
        partStr += bigUnits[unitLevel];
      }

      str = partStr + str;
    }

    num = Math.floor(num / 10000);
    unitLevel++;
  }
  // 清理连续的零
  str = str.replace(/零+/g, '零');
  str = str.replace(/零+$/, '');  // 去掉末尾零

  if (str === '') str = '零';

  return str + '元整';
}

function saveToStorage(type) {
  const date = document.getElementById('date').value;
  if (!date) return alert('请填写日期');

  const details = [];
  document.querySelectorAll('#tableBody tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    details.push({
      area:    inputs[0].value.trim(),
      model:   inputs[1].value.trim(),
      width:   inputs[2].value,
      height:  inputs[3].value,
      fold:    inputs[4].value,
      usage:   inputs[5].value,
      price:   inputs[6].value,
      subtotal:inputs[7].value,
      note:    inputs[8].value.trim()
    });
  });

  const order = {
    date,
    customer: document.getElementById('customer').value.trim() || '未命名客户',
    phone:    document.getElementById('phone').value.trim(),
    address:  document.getElementById('address').value.trim(),
    details,
    total:    document.getElementById('totalLower').textContent.replace('¥','').trim(),
    timestamp: new Date().toISOString()
  };

  let items = JSON.parse(localStorage.getItem(type + 'Orders') || '[]');
  items.push(order);
  items.sort((a,b) => new Date(b.date) - new Date(a.date));
  localStorage.setItem(type + 'Orders', JSON.stringify(items));

  alert(`已保存至${type === 'draft' ? '草稿' : '历史'}订单`);
  loadList(type);
}

function loadList(type) {
  const container = document.getElementById(type + 'List');
  container.innerHTML = '';

  const items = JSON.parse(localStorage.getItem(type + 'Orders') || '[]');
  if (items.length === 0) {
    container.innerHTML = '<div style="color:#bdc3c7;padding:10px;">暂无记录</div>';
    return;
  }

  items.forEach((order, idx) => {
    const div = document.createElement('div');
    div.className = 'order-item';
    div.innerHTML = `
      <div>${order.date} - ${order.customer}</div>
      <div>¥${order.total}</div>
      <button class="delete-btn" onclick="deleteOrder('${type}', ${idx})">删除</button>
    `;
    div.onclick = e => {
      if (e.target.tagName !== 'BUTTON') loadOrderToForm(type, idx);
    };
    container.appendChild(div);
  });
}

function deleteOrder(type, idx) {
  if (!confirm('确认删除此订单？')) return;
  let items = JSON.parse(localStorage.getItem(type + 'Orders') || '[]');
  items.splice(idx, 1);
  localStorage.setItem(type + 'Orders', JSON.stringify(items));
  loadList(type);
}

function loadOrderToForm(type, idx) {
  const items = JSON.parse(localStorage.getItem(type + 'Orders') || '[]');
  const order = items[idx];
  if (!order) return;

  document.getElementById('date').value     = order.date;
  document.getElementById('customer').value = order.customer;
  document.getElementById('phone').value    = order.phone || '';
  document.getElementById('address').value  = order.address || '';

  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  order.details.forEach(d => {
    addRow();
    const row = tbody.lastChild;
    const inputs = row.querySelectorAll('input');
    inputs[0].value = d.area;
    inputs[1].value = d.model;
    inputs[2].value = d.width;
    inputs[3].value = d.height;
    inputs[4].value = d.fold;
    inputs[5].value = d.usage;
    inputs[6].value = d.price;
    inputs[7].value = d.subtotal;
    inputs[8].value = d.note;
  });

  calcTotal();
  alert('订单已加载');
}

const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const debounceCalcRow = debounce(calcRow);

function saveDraft()  { saveToStorage('draft');  }
function saveOrder()  { saveToStorage('history'); }
