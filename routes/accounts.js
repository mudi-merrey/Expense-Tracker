const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// GET all accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new account
router.post('/', async (req, res) => {
  const account = new Account({
    name: req.body.name,
    type: req.body.type,
    balance: req.body.balance || 0
  });
  try {
    const newAccount = await account.save();
    res.status(201).json(newAccount);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE an account
router.delete('/:id', async (req, res) => {
  try {
    await Account.findByIdAndDelete(req.params.id);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset all account balances to 0
router.patch('/resetall', async (req, res) => {
  try {
    await Account.updateMany({}, { balance: 0 });
    res.json({ message: 'All balances reset' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH rename account
router.patch('/:id', async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );
    res.json(account);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH update account balance
router.patch('/:id/balance', async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { balance: req.body.balance },
      { new: true }
    );
    res.json(account);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});



module.exports = router;