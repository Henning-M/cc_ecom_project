import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/actions'; // Import Redux action
import { useNavigate } from 'react-router-dom';
import '../styles/profile.css';

const Profile = () => {
  const user = useSelector((state) => state.user.user); // Get user from Redux state
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/api/logout', { method: 'POST' });
      dispatch(logout()); // Dispatch logout action
      navigate('/login');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    if (user) {
      const fetchOrders = async () => {
        try {
          const response = await fetch(`http://localhost:3000/api/orders/${user.id}`);
          if (response.ok) {
            const data = await response.json();
            setOrders(data);
          } else {
            console.error('Failed to fetch orders.');
          }
          setLoading(false);
        } catch (error) {
          console.error('Error fetching orders:', error);
          setLoading(false);
        }
      };

      fetchOrders();
    }
  }, [user]);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="profile-container">
      <h2>Welcome, {user?.username}</h2>
      <button className="logout-button" onClick={handleLogout}>
        Logout
      </button>

      <div className="orders-section">
        <h3>Your Orders</h3>
        {orders.length > 0 ? (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order Date</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{new Date(order.order_date).toLocaleDateString()}</td>
                  <td>${order.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No orders found.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;