import React from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/checkoutconfirmation.css';

const CheckoutConfirmation = () => {
  const location = useLocation();
  const { paymentStatus } = location.state || {};

  return (
    <div className="confirmation-container">
      <h2>{paymentStatus === 'succeeded' ? 'Thank You for Your Purchase!' : 'Sorry, something went wrong.'}</h2>
      <p>Your payment was {paymentStatus === 'succeeded' ? 'successful. We appreciate your business!' : 'unsuccessful. Please contact customer service.'}</p>
    </div>
  );
};

export default CheckoutConfirmation;