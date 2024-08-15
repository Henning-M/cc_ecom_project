const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const app = express();
const port = 3000;

const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3001', // Specify your frontend's URL
  credentials: true // Allow credentials (cookies) to be sent
}));

app.use(bodyParser.json());

// Set up session middleware
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Change to true if using HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// REGISTER ROUTE
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    const newUser = result.rows[0];

    // Automatically log in the user after registration
    req.session.userId = newUser.id;
    req.session.username = newUser.username;

    res.status(201).json({ message: 'User registered and logged in successfully', user: newUser });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// LOGIN ROUTE
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Store user ID and username in session
    req.session.userId = user.id;
    req.session.username = user.username;

    console.log('Session after login:', req.session);

    // Respond with user data
    res.status(200).json({ 
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// LOGOUT ROUTE
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.status(200).json({ message: 'Logout successful' });
  });
});

// PROFILE ROUTE
app.get('/api/profile', (req, res) => {
  console.log('Session:', req.session);
  if (req.session.username) {
    res.json({ username: req.session.username });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});