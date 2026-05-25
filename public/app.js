const API = "http://localhost:5000/api";
const now = new Date();
let currentMonth = now.getMonth() + 1;
let currentYear = now.getFullYear();
let filterType = "";
let filterCategory = "";
let filterAccount = "";
let categoryChart = null;
let monthlyChart = null;

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

  const filterAccountSelect = document.getElementById("filter-account");
  filterAccountSelect.innerHTML =
    '<option value="">All Accounts</option>' + options;

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
  let url = `${API}/transactions?month=${currentMonth}&year=${currentYear}`;
  if (filterType) url += `&type=${filterType}`;
  if (filterCategory) url += `&category=${filterCategory}`;
  if (filterAccount) url += `&account=${filterAccount}`;
  const res = await fetch(url);
  const transactions = await res.json();

  // Update summary for current month
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

    const accountId = t.account?._id || "";
    const fromAccountId = t.fromAccount?._id || "";
    const toAccountId = t.toAccount?._id || "";
    const dateValue = new Date(t.date).toISOString().slice(0, 16);

    li.innerHTML = `
      <div class="transaction-info">
        <h4>${t.description || t.category || t.type}</h4>
        <p>${t.category ? t.category + " • " : ""}${accountText} • ${formatDate(t.date)}</p>
      </div>
      <div class="transaction-right">
        <span class="transaction-amount ${t.type.toLowerCase()}">
          ${t.type === "Expense" ? "-" : t.type === "Income" ? "+" : ""}${formatMoney(t.amount)}
        </span>
        <button onclick="toggleEditTransaction('${t._id}')">✏️</button>
        <button onclick="deleteTransaction('${t._id}')">✕</button>
      </div>
      <div id="edit-form-${t._id}" style="display:none; width:100%; margin-top:10px;">
        <select id="edit-type-${t._id}" onchange="handleEditTypeChange('${t._id}')">
          <option value="Expense" ${t.type === "Expense" ? "selected" : ""}>Expense</option>
          <option value="Income" ${t.type === "Income" ? "selected" : ""}>Income</option>
          <option value="Transfer" ${t.type === "Transfer" ? "selected" : ""}>Transfer</option>
        </select>
        <input type="number" id="edit-amount-${t._id}" value="${t.amount}">
        <input type="text" id="edit-description-${t._id}" value="${t.description || ""}">
        <input type="datetime-local" id="edit-date-${t._id}" value="${dateValue}">
        <select id="edit-category-${t._id}" style="${t.type === "Transfer" ? "display:none" : ""}">
          ${[
            "Food",
            "Transport",
            "Entertainment",
            "Shopping",
            "Health",
            "Education",
            "Salary",
            "Other",
          ]
            .map(
              (c) =>
                `<option value="${c}" ${t.category === c ? "selected" : ""}>${c}</option>`,
            )
            .join("")}
        </select>
        <select id="edit-account-${t._id}" style="${t.type === "Transfer" ? "display:none" : ""}">
          ${accounts.map((a) => `<option value="${a._id}" ${a._id == accountId ? "selected" : ""}>${a.name}</option>`).join("")}
        </select>
        <select id="edit-from-${t._id}" style="${t.type !== "Transfer" ? "display:none" : ""}">
          ${accounts.map((a) => `<option value="${a._id}" ${a._id == fromAccountId ? "selected" : ""}>${a.name}</option>`).join("")}
        </select>
        <select id="edit-to-${t._id}" style="${t.type !== "Transfer" ? "display:none" : ""}">
          ${accounts.map((a) => `<option value="${a._id}" ${a._id == toAccountId ? "selected" : ""}>${a.name}</option>`).join("")}
        </select>
        <div style="display:flex; gap:8px; margin-top:5px;">
          <button onclick="saveEditTransaction('${t._id}')" style="background:#10b981;">Save</button>
          <button onclick="toggleEditTransaction('${t._id}')" style="background:#888;">Cancel</button>
        </div>
      </div>
    `;
    list.appendChild(li);
  });

  // Render month navigation
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const pagination = document.getElementById("pagination");
  pagination.innerHTML = `
    <button onclick="changeMonth(-1)">← Prev</button>
    <span>${monthNames[currentMonth - 1]} ${currentYear}</span>
    <button onclick="changeMonth(1)">Next →</button>
  `;
}

function changeMonth(direction) {
  currentMonth += direction;
  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear++;
  }
  if (currentMonth < 1) {
    currentMonth = 12;
    currentYear--;
  }
  loadAll();
}

function changePage(direction) {
  currentPage += direction;
  loadAll();
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
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current.trim()) lines.push(current.trim());
      current = "";
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
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
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

// ==================
// EVERYTHING ELSE
// ==================

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

function applyFilters() {
  filterType = document.getElementById("filter-type").value;
  filterCategory = document.getElementById("filter-category").value;
  filterAccount = document.getElementById("filter-account").value;
  loadAll();
}

function clearFilters() {
  filterType = "";
  filterCategory = "";
  filterAccount = "";
  document.getElementById("filter-type").value = "";
  document.getElementById("filter-category").value = "";
  document.getElementById("filter-account").value = "";
  loadAll();
}

function toggleEditTransaction(id) {
  const form = document.getElementById(`edit-form-${id}`);
  form.style.display = form.style.display === "none" ? "block" : "none";
}

function handleEditTypeChange(id) {
  const type = document.getElementById(`edit-type-${id}`).value;
  document.getElementById(`edit-category-${id}`).style.display =
    type === "Transfer" ? "none" : "block";
  document.getElementById(`edit-account-${id}`).style.display =
    type === "Transfer" ? "none" : "block";
  document.getElementById(`edit-from-${id}`).style.display =
    type === "Transfer" ? "block" : "none";
  document.getElementById(`edit-to-${id}`).style.display =
    type === "Transfer" ? "block" : "none";
}

async function saveEditTransaction(id) {
  const type = document.getElementById(`edit-type-${id}`).value;
  const amount = document.getElementById(`edit-amount-${id}`).value;
  const description = document.getElementById(`edit-description-${id}`).value;
  const date = document.getElementById(`edit-date-${id}`).value;
  const category = document.getElementById(`edit-category-${id}`).value;
  const account = document.getElementById(`edit-account-${id}`).value;
  const fromAccount = document.getElementById(`edit-from-${id}`).value;
  const toAccount = document.getElementById(`edit-to-${id}`).value;

  const body = { type, amount, description, date };
  if (type === "Transfer") {
    body.fromAccount = fromAccount;
    body.toAccount = toAccount;
  } else {
    body.category = category;
    body.account = account;
  }

  await fetch(`${API}/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

loadAll();
}

// ==================
// CHARTS
// ==================

async function loadCharts() {
  // Fetch current month transactions for category pie chart
  const res1 = await fetch(
    `${API}/transactions?month=${currentMonth}&year=${currentYear}`,
  );
  const transactions = await res1.json();

  // Build category data
  const categoryTotals = {};
  transactions.forEach((t) => {
    if (t.type === "Expense") {
      categoryTotals[t.category] =
        (categoryTotals[t.category] || 0) + t.amount;
    }
  });

  const categoryLabels = Object.keys(categoryTotals);
  const categoryData = Object.values(categoryTotals);
  const colors = [
    "#4f46e5",
    "#10b981",
    "#ef4444",
    "#f59e0b",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
  ];

  // Destroy old chart if exists
  if (categoryChart) categoryChart.destroy();

  const ctx1 = document.getElementById("category-chart").getContext("2d");
  categoryChart = new Chart(ctx1, {
    type: "doughnut",
    data: {
      labels: categoryLabels,
      datasets: [
        {
          data: categoryData,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 15, font: { size: 12 } },
        },
      },
    },
  });

  // Fetch last 6 months for bar chart
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const labels = [];
  const incomeData = [];
  const expenseData = [];

  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }

    const res2 = await fetch(`${API}/transactions?month=${m}&year=${y}`);
    const monthTransactions = await res2.json();

    let income = 0;
    let expenses = 0;
    monthTransactions.forEach((t) => {
      if (t.type === "Income") income += t.amount;
      if (t.type === "Expense") expenses += t.amount;
    });

    labels.push(`${monthNames[m - 1]} ${y}`);
    incomeData.push(income);
    expenseData.push(expenses);
  }

  // Destroy old chart if exists
  if (monthlyChart) monthlyChart.destroy();

  const ctx2 = document.getElementById("monthly-chart").getContext("2d");
  monthlyChart = new Chart(ctx2, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          backgroundColor: "#10b981",
          borderRadius: 6,
        },
        {
          label: "Expenses",
          data: expenseData,
          backgroundColor: "#ef4444",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `RM ${value}`,
          },
        },
      },
    },
  });
}

// ==================
// LOAD EVERYTHING
// ==================

async function loadAll() {
  const accounts = await loadAccounts();
  await loadTransactions(accounts);
  await loadCharts();
}

// Run on page load
loadAll();
