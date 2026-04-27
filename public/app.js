const API = 'http://localhost:5000/api';

// ==================
// UTILITY FUNCTIONS
// ==================

function formatMoney(amount) {
  return `RM ${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-MY', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// ==================
// TOGGLE FORMS
// ==================

function toggleAddAccount() {
  const form = document.getElementById('account-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function toggleAddTransaction() {
  const form = document.getElementById('transaction-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';

  // Set today's date as default
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const today = now.toISOString().slice(0, 16);
  document.getElementById('transaction-date').value = today;
}

// ==================
// HANDLE TYPE CHANGE
// ==================

function handleTypeChange() {
  const type = document.getElementById('transaction-type').value;
  const category = document.getElementById('transaction-category');
  const account = document.getElementById('transaction-account');
  const fromAccount = document.getElementById('transaction-from-account');
  const toAccount = document.getElementById('transaction-to-account');

  if (type === 'Transfer') {
    category.style.display = 'none';
    account.style.display = 'none';
    fromAccount.style.display = 'block';
    toAccount.style.display = 'block';
  } else {
    category.style.display = 'block';
    account.style.display = 'block';
    fromAccount.style.display = 'none';
    toAccount.style.display = 'none';
  }
}

// ==================
// ACCOUNTS
// ==================

async function loadAccounts() {
  const res = await fetch(`${API}/accounts`);
  const accounts = await res.json();

  // Update account cards
  const list = document.getElementById('accounts-list');
  list.innerHTML = '';
  accounts.forEach(acc => {
    const card = document.createElement('div');
    card.className = 'account-card';
    card.innerHTML = `
      <button class="delete-btn" onclick="deleteAccount('${acc._id}')">✕</button>
      <h4 id="name-${acc._id}">${acc.name}</h4>
      <p>${acc.type}</p>
      <span class="balance">${formatMoney(acc.balance)}</span>
      <div id="rename-form-${acc._id}" style="display:none; margin-top:8px;">
        <input type="text" id="rename-input-${acc._id}" value="${acc.name}" style="margin-bottom:6px;">
        <button onclick="renameAccount('${acc._id}')">Save</button>
      </div>
      <button class="rename-btn" onclick="toggleRename('${acc._id}')">✏️ Rename</button>
    `;
    list.appendChild(card);
  });

  // Fill account dropdowns in transaction form
  const accountSelect = document.getElementById('transaction-account');
  const fromSelect = document.getElementById('transaction-from-account');
  const toSelect = document.getElementById('transaction-to-account');

  const options = accounts.map(acc => `<option value="${acc._id}">${acc.name}</option>`).join('');
  accountSelect.innerHTML = options;
  fromSelect.innerHTML = options;
  toSelect.innerHTML = options;

  return accounts;
}

async function addAccount() {
  const name = document.getElementById('account-name').value;
  const type = document.getElementById('account-type').value;
  const balance = document.getElementById('account-balance').value || 0;

  if (!name) {
    alert('Please enter an account name!');
    return;
  }

  await fetch(`${API}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type, balance })
  });

  document.getElementById('account-name').value = '';
  document.getElementById('account-balance').value = '';
  document.getElementById('account-form').style.display = 'none';

  loadAll();
}

async function deleteAccount(id) {
  if (!confirm('Delete this account? All its transactions will still exist.')) return;
  await fetch(`${API}/accounts/${id}`, { method: 'DELETE' });
  loadAll();
}

// ==================
// TRANSACTIONS
// ==================

async function loadTransactions(accounts) {
  const res = await fetch(`${API}/transactions`);
  const transactions = await res.json();

  // Update summary
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(t => {
    if (t.type === 'Income') totalIncome += t.amount;
    if (t.type === 'Expense') totalExpenses += t.amount;
  });

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  document.getElementById('total-balance').textContent = formatMoney(totalBalance);
  document.getElementById('total-income').textContent = formatMoney(totalIncome);
  document.getElementById('total-expenses').textContent = formatMoney(totalExpenses);

  // Render transaction list
  const list = document.getElementById('transactions-list');
  list.innerHTML = '';

  transactions.forEach(t => {
    const li = document.createElement('li');

    let accountText = '';
    if (t.type === 'Transfer') {
      accountText = `${t.fromAccount?.name} → ${t.toAccount?.name}`;
    } else {
      accountText = t.account?.name;
    }

    li.innerHTML = `
      <div class="transaction-info">
        <h4>${t.description || t.category || t.type}</h4>
        <p>${t.category ? t.category + ' • ' : ''}${accountText} • ${formatDate(t.date)}</p>
      </div>
      <div class="transaction-right">
        <span class="transaction-amount ${t.type.toLowerCase()}">
          ${t.type === 'Expense' ? '-' : t.type === 'Income' ? '+' : ''}${formatMoney(t.amount)}
        </span>
        <button onclick="deleteTransaction('${t._id}')">✕</button>
      </div>
    `;
    list.appendChild(li);
  });
}

async function addTransaction() {
  const type = document.getElementById('transaction-type').value;
  const amount = document.getElementById('transaction-amount').value;
  const description = document.getElementById('transaction-description').value;
  const date = document.getElementById('transaction-date').value;
  const category = document.getElementById('transaction-category').value;
  const account = document.getElementById('transaction-account').value;
  const fromAccount = document.getElementById('transaction-from-account').value;
  const toAccount = document.getElementById('transaction-to-account').value;

  if (!amount) {
    alert('Please enter an amount!');
    return;
  }

  const body = { type, amount, description, date };

  if (type === 'Transfer') {
    body.fromAccount = fromAccount;
    body.toAccount = toAccount;
  } else {
    body.category = category;
    body.account = account;
  }

  await fetch(`${API}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  document.getElementById('transaction-amount').value = '';
  document.getElementById('transaction-description').value = '';
  document.getElementById('transaction-date').value = '';
  document.getElementById('transaction-form').style.display = 'none';

  loadAll();
}

async function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  await fetch(`${API}/transactions/${id}`, { method: 'DELETE' });
  loadAll();
}

function toggleRename(id) {
  const form = document.getElementById(`rename-form-${id}`);
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function renameAccount(id) {
  const newName = document.getElementById(`rename-input-${id}`).value;

  if (!newName) {
    alert('Please enter a name!');
    return;
  }

  await fetch(`${API}/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName })
  });

  loadAll();
}

// ==================
// LOAD EVERYTHING
// ==================

async function loadAll() {
  const accounts = await loadAccounts();
  await loadTransactions(accounts);
}

// Run on page load
loadAll();