import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from './CheckoutForm'; // We will create this component next
import { useLocation } from 'react-router-dom';

// Replace with your own publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const Checkout = () => {
  const location = useLocation();
  const cartTotal = location.state?.cartTotal || 0; // Fallback to 0 if not passed

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm totalAmount={cartTotal} />
    </Elements>
  );
};


export default Checkout;
