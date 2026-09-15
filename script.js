// ---------- App State ----------
let transactions = loadTransactions();
let currentInterval = 'day';

const categoryColors = { 
  Xerox: '#6C7BF0', 
  Print: '#B29BEF', 
  Laminate: '#F5B44E', 
  Others: '#F5D95E' 
};

const INTERVAL_PREFIX = { 
  day: "TODAY'S", 
  month: "THIS MONTH'S", 
  year: "THIS YEAR'S" 
};

// DOM Elements
const logPanel = document.getElementById('logPanel');
const logTitle = document.getElementById('logTitle');
const revenueVal = document.getElementById('revenueVal');
const expenseVal = document.getElementById('expenseVal');
const profitVal = document.getElementById('profitVal');
const revenueLabel = document.getElementById('revenueLabel');
const expenseLabel = document.getElementById('expenseLabel');
const profitLabel = document.getElementById('profitLabel');
const legend = document.getElementById('legend');
const intervalNavLabel = document.getElementById('intervalNavLabel');

// Monthly Target DOM
const targetProgressBar = document.getElementById('targetProgressBar');
const targetPercent = document.getElementById('targetPercent');
const targetCurrentVal = document.getElementById('targetCurrentVal');
const targetGoalVal = document.getElementById('targetGoalVal');

// Service Form & Calculator DOM
const serviceSelect = document.getElementById('serviceSelect');
const serviceQty = document.getElementById('serviceQty');
const servicePrice = document.getElementById('servicePrice');
const serviceTendered = document.getElementById('serviceTendered');
const calcTotal = document.getElementById('calcTotal');
const calcChange = document.getElementById('calcChange');

// ---------- Interval Check Helper ----------
function isInInterval(tsISO, interval) {
  const now = new Date();
  const d = new Date(tsISO);
  if (interval === 'day') return d.toDateString() === now.toDateString();
  if (interval === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  if (interval === 'year') return d.getFullYear() === now.getFullYear();
  return true;
}

// ---------- Chart Setup ----------
const ctx = document.getElementById('pieChart').getContext('2d');
const pieChart = new Chart(ctx, {
  type: 'pie',
  data: {
    labels: ['Xerox', 'Print', 'Laminate', 'Others'],
    datasets: [{ data: [1, 1, 1, 1], backgroundColor: Object.values(categoryColors), borderWidth: 0 }]
  },
  options: {
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    responsive: true,
    maintainAspectRatio: false
  }
});

// ---------- Main Calculation Engine ----------
function recalcAll() {
  const filtered = transactions.filter(t => isInInterval(t.timestamp, currentInterval));
  let totalRevenue = 0;
  let totalExpenses = 0;
  const categoryQtyTotals = { Xerox: 0, Print: 0, Laminate: 0, Others: 0 };

  // Calculate totals for active interval
  filtered.forEach(t => {
    const totalAmount = t.qty * t.unitPrice;
    if (t.type === 'service') {
      totalRevenue += totalAmount;
      categoryQtyTotals[t.category] = (categoryQtyTotals[t.category] || 0) + t.qty;
    } else {
      totalExpenses += totalAmount;
    }
  });

  // Calculate Current Month Revenue for Target Goal
  const now = new Date();
  const thisMonthRevenue = transactions
    .filter(t => {
      const d = new Date(t.timestamp);
      return t.type === 'service' && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, t) => sum + (t.qty * t.unitPrice), 0);

  // Update Progress Bar
  const monthlyGoal = loadMonthlyTarget();
  const pct = Math.min(100, Math.round((thisMonthRevenue / monthlyGoal) * 100)) || 0;
  targetProgressBar.style.width = `${pct}%`;
  targetPercent.textContent = `${pct}%`;
  targetCurrentVal.textContent = formatPeso(thisMonthRevenue);
  targetGoalVal.textContent = formatPeso(monthlyGoal);

  // Update Stat Cards
  const netProfit = totalRevenue - totalExpenses;
  const prefix = INTERVAL_PREFIX[currentInterval];
  revenueLabel.textContent = `${prefix} REVENUE`;
  expenseLabel.textContent = `${prefix} EXPENSES`;
  profitLabel.textContent = `${prefix} PROFIT`;
  revenueVal.textContent = formatPeso(totalRevenue);
  expenseVal.textContent = formatPeso(totalExpenses);
  profitVal.textContent = formatPeso(netProfit);

  if (logTitle) logTitle.textContent = `${prefix} TRANSACTIONS`;

  // Update Pie Chart & Legend
  const totalQty = Object.values(categoryQtyTotals).reduce((a, b) => a + b, 0);
  pieChart.data.datasets[0].data = totalQty === 0 ? [1, 1, 1, 1] : Object.values(categoryQtyTotals);
  pieChart.update();

  legend.innerHTML = '';
  Object.keys(categoryQtyTotals).forEach(cat => {
    const p = totalQty > 0 ? Math.round((categoryQtyTotals[cat] / totalQty) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'legend-item';
    row.innerHTML = `<span class="dot" style="background:${categoryColors[cat]}"></span>${cat} — ${p}%`;
    legend.appendChild(row);
  });

  renderLog(filtered);
}

// ---------- Render Log Function ----------
function renderLog(filteredList) {
  if (filteredList.length === 0) {
    logPanel.innerHTML = '<div class="log-empty">No transactions for this period.</div>';
    return;
  }

  logPanel.innerHTML = '';
  [...filteredList].reverse().forEach(t => {
    const total = t.qty * t.unitPrice;
    const timeStr = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const entry = document.createElement('div');
    entry.className = `log-entry ${t.type}`;
    entry.innerHTML = `
      <div class="entry-main">
        <span class="entry-badge">${t.type === 'service' ? 'SALE' : 'PURCHASE'}</span>
        <strong class="entry-name">${t.name}</strong>
        <span class="entry-time">${timeStr}</span>
      </div>
      <div class="entry-details">
        <span>${t.qty} × ${formatPeso(t.unitPrice)}</span>
        <strong class="entry-total">${formatPeso(total)}</strong>
        <button class="delete-item-btn" title="Delete" onclick="deleteTransaction('${t.id}')">✕</button>
      </div>
    `;
    logPanel.appendChild(entry);
  });
}

// ---------- Auto-Fill Price Event ----------
serviceSelect.addEventListener('change', () => {
  const selectedOpt = serviceSelect.selectedOptions[0];
  const defaultPrice = selectedOpt?.dataset.price || '';
  if (defaultPrice) {
    servicePrice.value = defaultPrice;
  }
  updateServiceCalculator();
});

// ---------- Quick Change Calculator ----------
function updateServiceCalculator() {
  const qty = parseFloat(serviceQty.value) || 0;
  const price = parseFloat(servicePrice.value) || 0;
  const tendered = parseFloat(serviceTendered.value) || 0;

  const total = qty * price;
  calcTotal.textContent = formatPeso(total);

  if (tendered > 0) {
    const change = tendered - total;
    if (change >= 0) {
      calcChange.textContent = formatPeso(change);
      calcChange.style.color = '#fff';
    } else {
      calcChange.textContent = `Short: ${formatPeso(Math.abs(change))}`;
      calcChange.style.color = '#FFD2D2';
    }
  } else {
    calcChange.textContent = formatPeso(0);
    calcChange.style.color = '#fff';
  }
}

// Real-time calculation on input change
[serviceQty, servicePrice, serviceTendered].forEach(input => {
  input.addEventListener('input', updateServiceCalculator);
});

// ---------- Add Service Submit ----------
document.getElementById('serviceForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const opt = serviceSelect.selectedOptions[0];
  const cat = opt?.dataset.cat || 'Others';
  const name = serviceSelect.value;
  const qty = parseFloat(serviceQty.value);
  const unitPrice = parseFloat(servicePrice.value);

  transactions.push({
    id: 'txn_' + Date.now() + Math.random().toString(36).substr(2, 4),
    type: 'service',
    name,
    qty,
    unitPrice,
    category: cat,
    timestamp: new Date().toISOString()
  });

  saveTransactions(transactions);
  recalcAll();

  // Reset form inputs & live calculator
  e.target.reset();
  serviceQty.value = 1;
  updateServiceCalculator();
});

// ---------- Add Purchase Submit ----------
document.getElementById('purchaseForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const select = document.getElementById('purchaseSelect');
  const name = select.value;
  const qty = parseFloat(document.getElementById('purchaseQty').value);
  const unitPrice = parseFloat(document.getElementById('purchasePrice').value);

  transactions.push({
    id: 'txn_' + Date.now() + Math.random().toString(36).substr(2, 4),
    type: 'purchase',
    name,
    qty,
    unitPrice,
    category: 'Expense',
    timestamp: new Date().toISOString()
  });

  saveTransactions(transactions);
  recalcAll();
  e.target.reset();
});

// ---------- Delete Single Transaction ----------
window.deleteTransaction = function(id) {
  if (confirm('Delete this transaction?')) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions(transactions);
    recalcAll();
  }
};

// ---------- Dropdowns ----------
const intervalDropdown = document.getElementById('intervalDropdown');
const themeDropdown = document.getElementById('themeDropdown');

document.getElementById('intervalToggle').addEventListener('click', (e) => {
  e.stopPropagation();
  intervalDropdown.classList.toggle('open');
  themeDropdown.classList.remove('open');
});

intervalDropdown.querySelectorAll('div').forEach(opt => {
  opt.addEventListener('click', () => {
    currentInterval = opt.dataset.interval;
    intervalNavLabel.textContent = opt.dataset.interval.toUpperCase();
    intervalDropdown.querySelectorAll('div').forEach(d => d.classList.remove('active'));
    opt.classList.add('active');
    intervalDropdown.classList.remove('open');
    recalcAll();
  });
});

document.getElementById('themeToggle').addEventListener('click', (e) => {
  e.stopPropagation();
  themeDropdown.classList.toggle('open');
  intervalDropdown.classList.remove('open');
});

themeDropdown.querySelectorAll('div').forEach(opt => {
  opt.addEventListener('click', () => {
    const theme = opt.dataset.theme;
    applyTheme(theme);
    saveTheme(theme);
    themeDropdown.querySelectorAll('div').forEach(d => d.classList.remove('active'));
    opt.classList.add('active');
    themeDropdown.classList.remove('open');
  });
});

document.addEventListener('click', () => {
  intervalDropdown.classList.remove('open');
  themeDropdown.classList.remove('open');
});

// ---------- Live Clock ----------
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  document.getElementById('timeNow').textContent = `${timeStr} PHT`;
  document.getElementById('dateNow').textContent = dateStr;
}
updateClock();
setInterval(updateClock, 1000 * 15);

// ---------- Init ----------
recalcAll();