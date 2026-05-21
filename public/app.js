const API = "http://localhost:5000/api";

// ==================
// UTILITY FUNCTIONS
// ==================

function formatMoney(amount) {
  return `RM ${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ==================
// TOGGLE FORMS
// ==================

function toggleAddAccount() {
  const form = document.getElementById("account-form");
  form.style.display = form.style.display === "none" ? "block" : "none";
}

function toggleAddTransaction() {
  const form = document.getElementById("transaction-form");
  form.style.display = form.style.display === "none" ? "block" : "none";

  // Set today's date as default
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const today = now.toISOString().slice(0, 16);
  document.getElementById("transaction-date").value = today;
}

// ==================
// HANDLE TYPE CHANGE
// ==================

function handleTypeChange() {
  const type = document.getElementById("transaction-type").value;
  const category = document.getElementById("transaction-category");
  const account = document.getElementById("transaction-account");
  const fromAccount = document.getElementById("transaction-from-account");
  const toAccount = document.getElementById("transaction-to-account");

  if (type === "Transfer") {
    category.style.display = "none";
    account.style.display = "none";
    fromAccount.style.display = "block";
    toAccount.style.display = "block";
  } else {
    category.style.display = "block";
    account.style.display = "block";
    fromAccount.style.display = "none";
    toAccount.style.display = "none";
  }
}

// ==================
// ACCOUNTS
// ==================

async function loadAccounts() {
  const res = await fetch(`${API}/accounts`);
  const accounts = await res.json();

  // Update account cards
  const list = document.getElementById("accounts-list");
  list.innerHTML = "";
  accounts.forEach((acc) => {
    const card = document.createElement("div");
    card.className = "account-card";
    card.innerHTML = `
    <button class="rename-btn" onclick="toggleEditBalance('${acc._id}', ${acc.balance})">💰 Edit Balance</button>
<div id="balance-form-${acc._id}" style="display:none; margin-top:8px;">
  <input type="number" id="balance-input-${acc._id}" value="${acc.balance}" style="margin-bottom:6px;">
  <button onclick="updateBalance('${acc._id}')">Save</button>
</div>
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
  const accountSelect = document.getElementById("transaction-account");
  const fromSelect = document.getElementById("transaction-from-account");
  const toSelect = document.getElementById("transaction-to-account");

  const options = accounts
    .map((acc) => `<option value="${acc._id}">${acc.name}</option>`)
    .join("");
  accountSelect.innerHTML = options;
  fromSelect.innerHTML = options;
  toSelect.innerHTML = options;

  return accounts;
}

async function addAccount() {
  const name = document.getElementById("account-name").value;
  const type = document.getElementById("account-type").value;
  const balance = document.getElementById("account-balance").value || 0;

  if (!name) {
    alert("Please enter an account name!");
    return;
  }

  await fetch(`${API}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type, balance }),
  });

  document.getElementById("account-name").value = "";
  document.getElementById("account-balance").value = "";
  document.getElementById("account-form").style.display = "none";

  loadAll();
}

async function deleteAccount(id) {
  if (!confirm("Delete this account? All its transactions will still exist."))
    return;
  await fetch(`${API}/accounts/${id}`, { method: "DELETE" });
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

  transactions.forEach((t) => {
    if (t.type === "Income") totalIncome += t.amount;
    if (t.type === "Expense") totalExpenses += t.amount;
  });

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  document.getElementById("total-balance").textContent =
    formatMoney(totalBalance);
  document.getElementById("total-income").textContent =
    formatMoney(totalIncome);
  document.getElementById("total-expenses").textContent =
    formatMoney(totalExpenses);

  // Render transaction list
  const list = document.getElementById("transactions-list");
  list.innerHTML = "";

  transactions.forEach((t) => {
    const li = document.createElement("li");

    let accountText = "";
    if (t.type === "Transfer") {
      accountText = `${t.fromAccount?.name} → ${t.toAccount?.name}`;
    } else {
      accountText = t.account?.name;
    }

    li.innerHTML = `
      <div class="transaction-info">
        <h4>${t.description || t.category || t.type}</h4>
        <p>${t.category ? t.category + " • " : ""}${accountText} • ${formatDate(t.date)}</p>
      </div>
      <div class="transaction-right">
        <span class="transaction-amount ${t.type.toLowerCase()}">
          ${t.type === "Expense" ? "-" : t.type === "Income" ? "+" : ""}${formatMoney(t.amount)}
        </span>
        <button onclick="deleteTransaction('${t._id}')">✕</button>
      </div>
    `;
    list.appendChild(li);
  });
}

async function addTransaction() {
  const type = document.getElementById("transaction-type").value;
  const amount = document.getElementById("transaction-amount").value;
  const description = document.getElementById("transaction-description").value;
  const date = document.getElementById("transaction-date").value;
  const category = document.getElementById("transaction-category").value;
  const account = document.getElementById("transaction-account").value;
  const fromAccount = document.getElementById("transaction-from-account").value;
  const toAccount = document.getElementById("transaction-to-account").value;

  if (!amount) {
    alert("Please enter an amount!");
    return;
  }

  const body = { type, amount, description, date };

  if (type === "Transfer") {
    body.fromAccount = fromAccount;
    body.toAccount = toAccount;
  } else {
    body.category = category;
    body.account = account;
  }

  await fetch(`${API}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  document.getElementById("transaction-amount").value = "";
  document.getElementById("transaction-description").value = "";
  document.getElementById("transaction-date").value = "";
  document.getElementById("transaction-form").style.display = "none";

  loadAll();
}

async function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;
  await fetch(`${API}/transactions/${id}`, { method: "DELETE" });
  loadAll();
}

function toggleRename(id) {
  const form = document.getElementById(`rename-form-${id}`);
  form.style.display = form.style.display === "none" ? "block" : "none";
}

async function renameAccount(id) {
  const newName = document.getElementById(`rename-input-${id}`).value;

  if (!newName) {
    alert("Please enter a name!");
    return;
  }

  await fetch(`${API}/accounts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
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

// ==================
// IMPORT CSV
// ==================

function toggleImport() {
  const form = document.getElementById("import-form");
  form.style.display = form.style.display === "none" ? "block" : "none";
}

async function importCSV() {
  const fileInput = document.getElementById("csvFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a CSV file!");
    return;
  }

    const text = await file.text();

  // Smart line splitter that handles newlines inside quoted fields
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current.trim()) lines.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) lines.push(current.trim());

  // Get accounts from DB to match by name
  const res = await fetch(`${API}/accounts`);
  const accounts = await res.json();
  const findAccount = (name) =>
    accounts.find((a) => a.name.toLowerCase() === name.toLowerCase());

  // Show progress bar
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const progressDetail = document.getElementById("progress-detail");
  progressContainer.style.display = "block";

  let imported = 0;
  let skipped = 0;
  let errors = [];
  const total = lines.length - 1; // minus header row

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      skipped++;
      continue;
    }

    // Update progress bar
    const percent = Math.round((i / total) * 100);
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
    progressDetail.textContent = `${imported} imported • ${skipped} skipped`;

    // Parse CSV line handling quoted fields properly
    const cols = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim());

    if (cols.length < 6) {
      errors.push(`Row ${i}: bad format - "${line.substring(0, 50)}"`);
      skipped++;
      continue;
    }

    const clean = cols.map((c) => c.trim().replace(/^"|"$/g, "").trim());
    const timeStr = clean[0];
    const typeStr = clean[1];
    const amount = parseFloat(clean[2]);
    const category = clean[3];
    const accountStr = clean[4];
    const notes = clean[5] || "";

    if (isNaN(amount)) {
      skipped++;
      continue;
    }

    let type;
    if (typeStr === "(-) Expense") type = "Expense";
    else if (typeStr === "(+) Income") type = "Income";
    else if (typeStr === "(*) Transfer") type = "Transfer";
    else {
      skipped++;
      continue;
    }

    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      skipped++;
      continue;
    }

    let body = { type, amount, date, description: notes };

    if (type === "Transfer") {
      const parts = accountStr.split("->");
      if (parts.length !== 2) {
        skipped++;
        continue;
      }
      const fromAcc = findAccount(parts[0].trim());
      const toAcc = findAccount(parts[1].trim());
      if (!fromAcc || !toAcc) {
        errors.push(
          `Row ${i}: accounts "${parts[0]}" or "${parts[1]}" not found`,
        );
        skipped++;
        continue;
      }
      body.fromAccount = fromAcc._id;
      body.toAccount = toAcc._id;
    } else {
      const acc = findAccount(accountStr);
      if (!acc) {
        errors.push(`Row ${i}: account "${accountStr}" not found`);
        skipped++;
        continue;
      }
      body.account = acc._id;
      body.category = category;
    }

    try {
      const r = await fetch(`${API}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) imported++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  // Final update
  progressBar.style.width = "100%";
  progressText.textContent = "100%";
  progressDetail.textContent = `${imported} imported • ${skipped} skipped`;

  let msg = `Import complete!\n✅ Imported: ${imported}\n⏭️ Skipped: ${skipped}`;
  if (errors.length > 0)
    msg += `\n\nIssues:\n` + errors.slice(0, 10).join("\n");
  alert(msg);

  progressContainer.style.display = "none";
  document.getElementById("import-form").style.display = "none";
  loadAll();
}

async function deleteAllTransactions() {
  if (
    !confirm(
      "Are you sure? This will delete ALL transactions and cannot be undone!",
    )
  )
    return;
  await fetch(`${API}/transactions/deleteall`, { method: "DELETE" });
  await fetch(`${API}/accounts/resetall`, { method: "PATCH" });
  loadAll();
}

function toggleEditBalance(id, currentBalance) {
  const form = document.getElementById(`balance-form-${id}`);
  form.style.display = form.style.display === "none" ? "block" : "none";
}

async function updateBalance(id) {
  const newBalance = document.getElementById(`balance-input-${id}`).value;
  await fetch(`${API}/accounts/${id}/balance`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ balance: newBalance }),
  });
  loadAll();
}

// Run on page load
loadAll();
