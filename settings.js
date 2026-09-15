const themeGrid = document.getElementById('themeGrid');
const targetInput = document.getElementById('targetInput');

// Load existing target into the input field
targetInput.value = loadMonthlyTarget();

// Save new target
document.getElementById('saveTargetBtn').addEventListener('click', () => {
  const val = parseFloat(targetInput.value);
  if (!val || val <= 0) {
    alert('Please enter a valid target amount.');
    return;
  }
  saveMonthlyTarget(val);
  alert('Monthly Sales Goal updated to ₱ ' + val.toLocaleString());
});

// Theme switcher logic
function markSelectedTheme() {
  const current = loadTheme();
  themeGrid.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.theme === current);
  });
}

themeGrid.querySelectorAll('.theme-option').forEach(opt => {
  opt.addEventListener('click', () => {
    const theme = opt.dataset.theme;
    applyTheme(theme);
    saveTheme(theme);
    markSelectedTheme();
  });
});

// CSV Export
document.getElementById('exportDataBtn').addEventListener('click', () => {
  const data = loadTransactions();
  if (data.length === 0) {
    alert('No transactions to export.');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,ID,Type,Name,Category,Quantity,UnitPrice,Total,Timestamp\n';
  data.forEach(t => {
    const total = (t.qty * t.unitPrice).toFixed(2);
    csvContent += `"${t.id}","${t.type}","${t.name}","${t.category || ''}",${t.qty},${t.unitPrice},${total},"${t.timestamp}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `printfinance_records_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Clear Data
document.getElementById('clearDataBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to permanently delete all transactions?')) {
    clearTransactions();
    alert('All records have been cleared.');
  }
});

markSelectedTheme();