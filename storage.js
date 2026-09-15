// ---------- Shared Storage Helpers ----------
const STORAGE_KEYS = {
  TRANSACTIONS: 'printfinance_transactions',
  THEME: 'printfinance_theme',
  MONTHLY_TARGET: 'printfinance_monthly_target'
};

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load transactions:', e);
    return [];
  }
}

function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save transactions:', e);
  }
}

function clearTransactions() {
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
}

function loadTheme() {
  return localStorage.getItem(STORAGE_KEYS.THEME) || 'original';
}

function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// Monthly Target Helpers (Defaults to ₱30,000 if not set)
function loadMonthlyTarget() {
  const saved = localStorage.getItem(STORAGE_KEYS.MONTHLY_TARGET);
  return saved ? parseFloat(saved) : 30000;
}

function saveMonthlyTarget(val) {
  localStorage.setItem(STORAGE_KEYS.MONTHLY_TARGET, val);
}

// Format numbers as Philippine Peso
function formatPeso(num) {
  return '₱ ' + (Number(num) || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Apply saved theme immediately
applyTheme(loadTheme());