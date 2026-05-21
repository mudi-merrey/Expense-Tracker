const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// GET all transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('account')
      .populate('fromAccount')
      .populate('toAccount')
      .sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new transaction
router.post('/', async (req, res) => {
  const { type, amount, category, description, account, fromAccount, toAccount, date } = req.body;

  try {
    if (type === 'Expense') {
      await Account.findByIdAndUpdate(account, { $inc: { balance: -amount } });
    } else if (type === 'Income') {
      await Account.findByIdAndUpdate(account, { $inc: { balance: amount } });
    } else if (type === 'Transfer') {
      await Account.findByIdAndUpdate(fromAccount, { $inc: { balance: -amount } });
      await Account.findByIdAndUpdate(toAccount, { $inc: { balance: amount } });
    }

    const transaction = new Transaction({
      type, amount, category, description, date,
      account: type !== 'Transfer' ? account : undefined,
      fromAccount: type === 'Transfer' ? fromAccount : undefined,
      toAccount: type === 'Transfer' ? toAccount : undefined
    });

    const newTransaction = await transaction.save();
    const populated = await newTransaction.populate(['account', 'fromAccount', 'toAccount']);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE all transactions - MUST be before /:id route
router.delete('/deleteall', async (req, res) => {
  try {
    await Transaction.deleteMany({});
    res.json({ message: 'All transactions deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// DELETE a transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (transaction.type === 'Expense') {
      await Account.findByIdAndUpdate(transaction.account, { $inc: { balance: transaction.amount } });
    } else if (transaction.type === 'Income') {
      await Account.findByIdAndUpdate(transaction.account, { $inc: { balance: -transaction.amount } });
    } else if (transaction.type === 'Transfer') {
      await Account.findByIdAndUpdate(transaction.fromAccount, { $inc: { balance: transaction.amount } });
      await Account.findByIdAndUpdate(transaction.toAccount, { $inc: { balance: -transaction.amount } });
    }

    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;