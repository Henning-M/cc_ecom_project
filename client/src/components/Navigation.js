import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../redux/actions'; // Import the Redux logout action
import '../styles/navigation.css'; // Updated import path for the CSS file

const Navigation = () => {
  const user = useSelector((state) => state.user.user); // Get user from Redux state
  const dispatch = useDispatch(); // Get the dispatch function from Redux
  const navigate = useNavigate(); // Get navigate function from react-router-dom

  const handleLogout = async () => {
    try {
      // Call the backend to destroy the session
      await fetch('http://localhost:3000/api/logout', {
        method: 'POST',
        credentials: 'include', // Important to include credentials (cookies)
      });

      // Dispatch the Redux logout action
      dispatch(logout());
      
      // Redirect to login page after logout
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error occurred during logout');
    }
  };

  return (
    <nav className="navigation">
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/products">Products</Link></li>
        {user ? (
          <>
            <li><Link to="/profile">Profile</Link></li>
            <li><Link to="/cart">Cart</Link></li>
            <li><button className="logout-button" onClick={handleLogout}>Logout</button></li>
          </>
        ) : (
          <>
            <li><Link to="/register">Register</Link></li>
            <li><Link to="/login">Login</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navigation;
