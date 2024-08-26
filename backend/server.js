const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('./db');
const bcrypt = require('bcryptjs');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = 3000;
const cors = require('cors');

app.use(express.json());

// Initialize Passport
require('./passport-config'); // Import Passport configuration

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

// Initialize Passport and restore session state
app.use(passport.initialize());
app.use(passport.session());


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
    req.login(newUser, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Login failed after registration' });
      }
      res.status(201).json({ message: 'User registered and logged in successfully', user: newUser });
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN ROUTE
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.status(200).json({ 
    message: 'Login successful',
    user: req.user // User details from Passport
  });
});

// LOGOUT ROUTE
app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Session destruction failed' });
      }
      res.clearCookie('connect.sid'); // Clear the session cookie
      res.status(200).json({ message: 'Logout successful' });
    });
  });
});

// PROFILE ROUTE
app.get('/api/profile', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ username: req.user.username });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// PRODUCTS ROUTE
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, price, img_url, description FROM products');
    const products = result.rows.map(product => ({
      ...product,
      price: parseFloat(product.price) // Ensure price is numeric
    }));
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PRODUCT DETAILS ROUTE
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Query to fetch data from both products and productdetails tables
    const productQuery = `
      SELECT p.id, p.name, p.price, p.img_url, p.description, pd.description_long, pd.img1
      FROM products p
      LEFT JOIN productdetails pd ON p.id = pd.product_id
      WHERE p.id = $1
    `;

    const productResult = await pool.query(productQuery, [id]);

    if (productResult.rows.length > 0) {
      const productData = {
        ...productResult.rows[0],
        price: parseFloat(productResult.rows[0].price), // Ensure price is numeric
      };
      res.json(productData);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET CART FOR USER
app.get('/api/carts/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
    res.json(result.rows); // Send cart records to the client
  } catch (error) {
    console.error('Error fetching carts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE CART ROUTE
app.post('/api/carts', async (req, res) => {
  const { userId } = req.body; // Get the userId from the request body
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    // Insert a new cart into the carts table
    const result = await pool.query(
      'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
      [userId]
    );
    const newCartId = result.rows[0].id;
    res.status(201).json({ cartId: newCartId });
  } catch (error) {
    console.error('Error creating cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE CART ROUTE
app.delete('/api/carts/:cartId', async (req, res) => {
  const { cartId } = req.params;

  try {
    // Delete the cart with the specified ID
    await pool.query('DELETE FROM carts WHERE id = $1', [cartId]);

    res.status(200).json({ message: 'Cart deleted successfully' });
  } catch (error) {
    console.error('Error deleting cart:', error);
    res.status(500).json({ error: 'Failed to delete cart' });
  }
});


//POST to add product to cart (q=1) or increment quantity (q+=1)
app.post('/api/cartitems', async (req, res) => {
  const { cartId, productId, action } = req.body;

  if (!cartId || !productId) {
    return res.status(400).json({ message: 'Cart ID and Product ID are required' });
  }

  try {
    // Check if the product is already in the cart
    const cartItemResult = await pool.query(
      'SELECT quantity FROM cartitems WHERE cart_id = $1 AND product_id = $2',
      [cartId, productId]
    );

    if (cartItemResult.rows.length > 0) {
      // Retrieve the current quantity
      let newQuantity = cartItemResult.rows[0].quantity;

      // Adjust the quantity based on the action
      if (action === 'increment') {
        newQuantity += 1;
      } else if (action === 'decrement') {
        newQuantity -= 1;
        // Ensure quantity does not drop below 1
        if (newQuantity < 1) {
          return res.status(400).json({ message: 'Quantity cannot be less than 1' });
        }
      }

      await pool.query(
        'UPDATE cartitems SET quantity = $1 WHERE cart_id = $2 AND product_id = $3',
        [newQuantity, cartId, productId]
      );

      res.json({ message: 'Product quantity updated in cart', quantity: newQuantity });
    } else {
      // If the product is not in the cart and action is increment, add it with quantity = 1
      if (action === 'increment') {
        await pool.query(
          'INSERT INTO cartitems (cart_id, product_id, quantity) VALUES ($1, $2, $3)',
          [cartId, productId, 1]
        );
        res.json({ message: 'Product added to cart with quantity 1' });
      } else {
        // Prevent decrementing a non-existent item
        return res.status(400).json({ message: 'Product not found in cart' });
      }
    }
  } catch (error) {
    console.error('Error handling cart item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a specific product from the cart
app.delete('/api/cartitems/:cartId/:productId', async (req, res) => {
  const { cartId, productId } = req.params;

  try {
    // Delete the cart item with the specified cart ID and product ID
    await pool.query('DELETE FROM cartitems WHERE cart_id = $1 AND product_id = $2', [cartId, productId]);

    res.status(200).json({ message: 'Product removed from cart successfully' });
  } catch (error) {
    console.error('Error removing product from cart:', error);
    res.status(500).json({ error: 'Failed to remove product from cart' });
  }
});


// GET /api/cartitems/:cartId
app.get('/api/cartitems/:cartId', async (req, res) => {
  const { cartId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM cartitems WHERE cart_id = $1', [cartId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// GET /api/products/:productId
app.get('/api/products/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
    const result = await pool.query('SELECT name, price FROM products WHERE id = $1', [productId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// STRIPE PAYMENTS
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body; // The amount in cents, passed from the client

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents (e.g., 1000 for $10.00)
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true, // This enables automatic payment method handling
      },
      // return_url: 'http://localhost:3001/confirmation' // Add return_url
    });

    // Send the clientSecret to the frontend
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  const { userId, cartItems, totalAmount } = req.body;

  if (!userId || !cartItems || cartItems.length === 0 || totalAmount <= 0) {
    return res.status(400).json({ message: 'Invalid order data.' });
  }

  try {
    // Step 1: Create a new order in the orders table
    const orderResult = await pool.query(
      'INSERT INTO orders (user_id, total, order_date) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id',
      [userId, totalAmount]
    );

    const orderId = orderResult.rows[0].id;

    // Step 2: Insert each item into the orderitems table
    const orderItemQueries = cartItems.map((item) => {
      return pool.query(
        'INSERT INTO orderitems (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.product_id, item.quantity, item.price]
      );
    });

    await Promise.all(orderItemQueries);

    res.status(201).json({ message: 'Order created successfully.' });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error while creating order.' });
  }
});


// GET ORDERS FOR USER
app.get('/api/orders/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, total::numeric::float8 AS total, order_date
       FROM orders
       WHERE user_id = $1
       ORDER BY order_date DESC`, // Order by date, most recent first
      [userId]
    );
    res.json(result.rows); // Send order records to the client
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});