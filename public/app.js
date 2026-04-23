const API_URL = 'http://localhost:5000/api/expenses';

// Load all expenses when page opens
async function loadExpenses() {
  const response = await fetch(API_URL);
  const expenses = await response.json();

  const list = document.getElementById('expense-list');
  list.innerHTML = '';

  let total = 0;

  expenses.forEach(expense => {
    total += expense.amount;

    const li = document.createElement('li');
    li.innerHTML = `
      <span>${expense.description} - RM ${expense.amount} (${expense.category})</span>
      <button onclick="deleteExpense('${expense._id}')">Delete</button>
    `;
    list.appendChild(li);
  });

  document.getElementById('total').textContent = `RM ${total.toFixed(2)}`;
}

// Add a new expense
async function addExpense() {
  const description = document.getElementById('description').value;
  const amount = document.getElementById('amount').value;
  const category = document.getElementById('category').value;

  if (!description || !amount) {
    alert('Please fill in all fields!');
    return;
  }

  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, amount, category })
  });

  document.getElementById('description').value = '';
  document.getElementById('amount').value = '';

  loadExpenses();
}

// Delete an expense
async function deleteExpense(id) {
  await fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  });

  loadExpenses();
}

// Load expenses on page load
loadExpenses();