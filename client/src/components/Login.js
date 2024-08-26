import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../redux/actions'; // Import Redux action
import '../styles/login.css'; // Updated import path for the CSS file

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
          const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Important to include credentials (cookies)
            body: JSON.stringify({ username, password }),
          });

          const result = await response.json();
          if (response.ok) {
            dispatch(loginSuccess(result.user)); // Dispatch Redux action with user data

            // Check if the user already has a cart
      const cartResponse = await fetch(`http://localhost:3000/api/carts/${result.user.id}`);
      if (cartResponse.ok) {
        const cartData = await cartResponse.json();
        if (cartData.length === 0) {
          // No cart found, create one
          const createCartResponse = await fetch('http://localhost:3000/api/carts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: result.user.id }),
          });

          if (!createCartResponse.ok) {
            console.error('Failed to create cart.');
            alert('Error creating cart.');
          }
        }
      } else {
        console.error('Failed to fetch cart.');
        alert('Error fetching cart.');
      }

            navigate('/profile'); // Redirect to profile page
          } else {
            alert(result.message || 'Login failed'); // Show error message from server
          }
        } catch (error) {
          console.error('Error:', error);
          alert('Error occurred during login'); // Show general error message
        }
      };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account? <a href="/register">Register here</a>
      </p>
    </div>
  );
};

export default Login;