const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected!');
    app.listen(5000, () => console.log('Server running on port 5000'));
  })
  .catch(err => console.log(err));