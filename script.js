// 页面加载完成后执行初始化
document.addEventListener('DOMContentLoaded', () => {
    addRow();               // 添加一行空白表格
    updateRowOperations();  // 更新操作列按钮（添加/删除）
    // 自动加载已保存的草稿订单和历史订单
    loadList('draft');
    loadList('history');
});

// 展开/收起草稿或历史订单列表
function toggleList(type) {
    const container = document.getElementById(type + 'List');      // 获取列表容器
    const arrow = document.getElementById(type + 'Arrow');         // 获取箭头元素
    const isExpanded = container.classList.toggle('expanded');     // 切换展开状态
    container.classList.toggle('collapsed', !isExpanded);          // 同步收起类
    arrow.textContent = isExpanded ? '▲' : '▼';                    // 切换箭头方向
}

// 添加一行空白表格行
function addRow() {
    const tbody = document.getElementById('tableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
    <td><input type="text" placeholder="区域"></td>
    <td><input type="text" placeholder="型号"></td>
    <td><input type="number" step="0.01" min="0" oninput="debounceCalcRow(this)"></td>
    <td><input type="number" step="0.01" min="0" oninput="debounceCalcRow(this)"></td>
    <td><input type="number" step="0.1" min="0.1" value="2" oninput="debounceCalcRow(this)"></td>
    <td><input type="number" step="0.01" min="0" oninput="debounceCalcRow(this)" data-manual="false" style="color: black;" placeholder="自动计算或手动"></td>
    <td><input type="number" step="0.01" min="0" oninput="debounceCalcRow(this)"></td>
    <td style="text-align: center;"><input type="text" oninput="debounceCalcRow(this)" placeholder="自动或输入'赠送'" style="text-align: center; width: 100%; box-sizing: border-box;"></td>

    <td><input type="text" placeholder="备注"></td>
    <td class="operation-cell"></td>
`;
    tbody.appendChild(tr);
    updateRowOperations();   // 刷新操作按钮
    calcTotal();             // 重新计算总金额
}

// 删除当前行（至少保留一行）
function deleteRow(btn) {
    if (document.querySelectorAll('#tableBody tr').length <= 1) return;
    btn.closest('tr').remove();
    updateRowOperations();
    calcTotal();
}

// 更新每行的操作列：显示“添加”按钮，大于1行时显示“删除”
function updateRowOperations() {
    const rows = document.querySelectorAll('#tableBody tr');
    const count = rows.length;

    rows.forEach(row => {
        const cell = row.querySelector('.operation-cell');
        cell.innerHTML = `
            <button class="add-btn" onclick="addRow()">添加</button>
            ${count > 1 ? '<button class="del-btn" onclick="deleteRow(this)">删除</button>' : ''}
        `;
    });
}

// 单行计算：用料(m/m²) 自动计算 + 支持手动输入
function calcRow(el) {
    const row = el.closest('tr');
    if (!row) return;

    // 获取输入元素（假设你还没加赠送列，cells 索引保持原样）
    const widthInput    = row.cells[2].querySelector('input');
    const heightInput   = row.cells[3].querySelector('input');
    const foldInput     = row.cells[4].querySelector('input');
    const usageInput    = row.cells[5].querySelector('input');
    const priceInput    = row.cells[6].querySelector('input');
    const subtotalInput = row.cells[7].querySelector('input');  // 现在是可编辑的 text

    const w    = parseFloat(widthInput.value)  || 0;
    const h    = parseFloat(heightInput.value) || 0;
    const fold = parseFloat(foldInput.value)   || 0;
    const p    = parseFloat(priceInput.value)  || 0;

    const isUsageInput     = (el === usageInput);
    const isDimensionInput = [widthInput, heightInput, foldInput].includes(el);
    const isSubtotalInput  = (el === subtotalInput);  // 新增：用户直接改合计

    let isManual = usageInput.dataset.manual === "true";

    // ──────────────── 用料的自动/手动逻辑（保持不变） ────────────────
    if (isUsageInput) {
        if (usageInput.value.trim() === '') {
            isManual = false;
            usageInput.dataset.manual = "false";
            usageInput.style.color = "black";
            if (w > 0 && h > 0) {
                let usage = (fold > 0) ? w * fold : w * h;
                usageInput.value = usage.toFixed(2);
            }
        } else if (!isNaN(parseFloat(usageInput.value))) {
            isManual = true;
            usageInput.dataset.manual = "true";
            usageInput.style.color = "red";
        }
    }

    if (isDimensionInput && !isManual) {
        if (w > 0 && h > 0) {
            let usage = (fold > 0) ? w * fold : w * h;
            usageInput.value = usage.toFixed(2);
            usageInput.style.color = "black";
            usageInput.dataset.manual = "false";
        }
    }

    // ──────────────── 处理合计 ────────────────
    let displayValue = subtotalInput.value.trim();
    let numericValue = 0;
    let isGift = false;

    // 判断是否为“赠送”（不区分大小写，支持“赠送”、“送”、“免费”等常见写法，可自行调整）
    const giftKeywords = ['赠送', '送', '免费', 'gift', 'free'];
    const lowerDisplay = displayValue.toLowerCase();

    if (giftKeywords.some(kw => lowerDisplay.includes(kw))) {
        isGift = true;
        numericValue = 0;
        subtotalInput.value = '赠送';           // 统一显示为“赠送”
        subtotalInput.style.color = "#e74c3c";  // 红色
        subtotalInput.style.fontWeight = "bold"; // 只在赠送时加粗
        subtotalInput.style.textAlign = "center"; // 强制居中
    } else {
        // 尝试解析成数字
        numericValue = parseFloat(displayValue) || 0;

        if (!isNaN(numericValue) && displayValue !== '') {
            // 是有效数字 → 正常显示（右对齐，普通粗细）
            subtotalInput.style.color = "black";
            subtotalInput.style.fontWeight = "normal";  // 改回正常粗细
            subtotalInput.style.textAlign = "right";    // 金额右对齐
        } else {
            // 无效内容 → 灰色，居中
            numericValue = 0;
            subtotalInput.style.color = "#7f8c8d";
            subtotalInput.style.fontWeight = "normal";
            subtotalInput.style.textAlign = "center";
        }
    }

    // 如果不是用户直接修改合计 且 不是赠送状态 → 自动计算并填入
    if (!isSubtotalInput && !isGift) {
        const usageNum = parseFloat(usageInput.value) || 0;
        numericValue = usageNum * p;
        subtotalInput.value = numericValue.toFixed(2);
        subtotalInput.style.color = "black";
        subtotalInput.style.fontWeight = "normal";
        subtotalInput.style.textAlign = "right";
    }

    // 更新总金额（使用 numericValue）
    calcTotal();
}

// 计算所有行的合计金额，并显示大小写金额
function calcTotal() {
    let sum = 0;
    document.querySelectorAll('#tableBody tr').forEach(row => {
        const subtotalInput = row.cells[7].querySelector('input');
        if (!subtotalInput) return;

        const display = subtotalInput.value.trim().toLowerCase();
        const giftKeywords = ['赠送', '送', '免费', 'gift', 'free'];

        // 如果是赠送相关文字 → 贡献 0
        if (giftKeywords.some(kw => display.includes(kw))) {
            return;
        }

        // 否则尝试取数字值
        const val = parseFloat(subtotalInput.value) || 0;
        sum += val;
    });

    document.getElementById('totalLower').textContent = '¥' + sum.toFixed(2);
    document.getElementById('totalUpper').textContent = numberToChinese(Math.floor(sum)) + '元整';
}

// 数字转中文大写金额（仅支持整数部分）
function numberToChinese(num) {
    if (num === 0) return '零';
    const digits = ['零','壹','贰','叁','肆','伍','陆','柒','捌','玖'];
    const units = ['','拾','佰','仟'];
    let str = '';
    let i = 0;
    while (num > 0) {
        let d = num % 10;
        if (d) str = digits[d] + units[i] + str;
        else if (str && str[0] !== '零') str = '零' + str;
        num = Math.floor(num / 10);
        i++;
    }
    return str.replace(/零+$/, '零');
}

// 保存订单（草稿或正式订单）
function saveToStorage(type) {
    const date = document.getElementById('date').value;
    if (!date) return alert('请填写日期');

    const details = [];
    document.querySelectorAll('#tableBody tr').forEach(row => {
        details.push({
            area: row.cells[0].querySelector('input').value.trim(),
            model: row.cells[1].querySelector('input').value.trim(),
            width: row.cells[2].querySelector('input').value,
            height: row.cells[3].querySelector('input').value,
            fold: row.cells[4].querySelector('input').value,
            usage: row.cells[5].querySelector('input').value,
            price: row.cells[6].querySelector('input').value,
            subtotal: row.cells[7].querySelector('input').value,
            note: row.cells[8].querySelector('input').value.trim()
        });
    });

    const order = {
        date,
        customer: document.getElementById('customer').value.trim() || '未命名客户',
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        details,
        total: document.getElementById('totalLower').textContent.replace('¥','').trim(),
        timestamp: new Date().toISOString()
    };

    let items = JSON.parse(localStorage.getItem(type + 'Orders') || '[]');
    items.push(order);
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem(type + 'Orders', JSON.stringify(items));

    alert(`已保存至${type === 'draft' ? '草稿' : '历史'}订单！`);

    // 刷新对应列表
    loadList(type);
}

// 加载草稿或历史订单列表
function loadList(type) {
    const container = document.getElementById(type + 'List');
    if (!container) return;

    container.innerHTML = '';
    const items = JSON.parse(localStorage.getItem(type + 'Orders') || '[]');

    if (items.length === 0) {
        container.innerHTML = '<div style="color:#bdc3c7; padding:10px;">暂无记录</div>';
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
        div.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') loadOrderToForm(type, idx);
        };
        container.appendChild(div);
    });
}

// 删除指定订单
function deleteOrder(type, index) {
    if (!confirm('确认删除此订单？')) return;

    let items = JSON.parse(localStorage.getItem(type + 'Orders') || '[]');
    items.splice(index, 1);
    localStorage.setItem(type + 'Orders', JSON.stringify(items));

    loadList(type);  // 刷新列表
}

// 将订单数据加载回主表单（用于编辑）
function loadOrderToForm(type, index) {
    const items = JSON.parse(localStorage.getItem(type + 'Orders') || '[]');
    const order = items[index];
    if (!order) return;

    document.getElementById('date').value = order.date;
    document.getElementById('customer').value = order.customer;
    document.getElementById('phone').value = order.phone || '';
    document.getElementById('address').value = order.address || '';

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    order.details.forEach(d => {
        addRow();
        const row = tbody.lastChild;
        row.cells[0].querySelector('input').value = d.area;
        row.cells[1].querySelector('input').value = d.model;
        row.cells[2].querySelector('input').value = d.width;
        row.cells[3].querySelector('input').value = d.height;
        row.cells[4].querySelector('input').value = d.fold;
        row.cells[5].querySelector('input').value = d.usage;
        row.cells[6].querySelector('input').value = d.price;
        row.cells[7].querySelector('input').value = d.subtotal;
        row.cells[8].querySelector('input').value = d.note;
    });

    calcTotal();
    alert('订单已加载');
}

// 快捷调用保存函数
function saveDraft() { saveToStorage('draft'); }
function saveOrder() { saveToStorage('history'); }

// 防抖函数：延迟执行，防止输入过程中频繁计算（300ms 延迟）
function debounce(fn, delay = 300) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// 包装 calcRow 函数，使用防抖
const debounceCalcRow = debounce(calcRow);