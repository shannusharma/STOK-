const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Sannu@1234',  // Your PostgreSQL password
  database: 'USER_MANAGEMENT'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ PostgreSQL Connected!');
    release();
  }
});

// SIGNUP ENDPOINT
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password, fullName } = req.body;
  
  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    const result = await pool.query(
      'INSERT INTO users (username, email, hashed_password, full_name) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, full_name',
      [username, email, hashedPassword, fullName]
    );
    
    const user = result.rows[0];
    
    // Create token
    const token = jwt.sign({ id: user.user_id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name
      }
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN ENDPOINT
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.hashed_password);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Create token
    const token = jwt.sign({ id: user.user_id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ROOT ENDPOINT - Test if server is running
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Stock API',
    status: 'Server is running',
    endpoints: {
      signup: 'POST /api/auth/signup',
      login: 'POST /api/auth/login'
    }
  });
});

// Start server
app.listen(5000, () => {
  console.log('🚀 Server running on http://localhost:5000');
});