import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import axios from 'axios';
import { useSelector } from 'react-redux';
import '../styles/checkout.css'; // You might want to style the form similarly to Cart.js

const CheckoutForm = ({ totalAmount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [totalSum, setTotalSum] = useState(0);
  const [cartId, setCartId] = useState(null); // Store cartId for deletion
  const user = useSelector((state) => state.user.user); // Access user from Redux

  useEffect(() => {
    const fetchCartData = async () => {
      if (user) {
        try {
          const cartResponse = await fetch(`http://localhost:3000/api/carts/${user.id}`);
          const cartData = await cartResponse.json();
          const cartId = cartData[0]?.id;

          setCartId(cartId); // Set the cartId for deletion later

          if (cartId) {
            const cartItemsResponse = await fetch(`http://localhost:3000/api/cartitems/${cartId}`);
            const cartItemsData = await cartItemsResponse.json();

            const productDetailsPromises = cartItemsData.map(async (item) => {
              const productResponse = await fetch(`http://localhost:3000/api/products/${item.product_id}`);
              const productData = await productResponse.json();
              return {
                ...item,
                name: productData.name,
                price: productData.price,
              };
            });

            const detailedCartItems = await Promise.all(productDetailsPromises);
            setCartItems(detailedCartItems);

            const total = detailedCartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
            setTotalSum(total);
          }
        } catch (err) {
          console.error('Error fetching cart data:', err);
        }
      }
    };

    fetchCartData();
  }, [user]);


  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });

    if (paymentMethodError) {
      console.log('[paymentMethodError]', paymentMethodError);
      setIsProcessing(false);
      return;
    }

    try {
      const { data } = await axios.post('http://localhost:3000/api/create-payment-intent', {
        amount: Math.round(totalAmount * 100), // Convert dollars to cents
        paymentMethodId: paymentMethod.id,
      });

      const { clientSecret } = data;

      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod.id,
      });

      if (confirmError) {
        console.error('Payment confirmation error:', confirmError);
        alert('Payment failed.');
        navigate('/confirmation', { state: { paymentStatus: 'failed' } });
      } else {
        const orderData = {
          userId: user.id,
          cartItems: cartItems,
          totalAmount: totalSum,
        };

        await axios.post('http://localhost:3000/api/orders', orderData);  // Creating the order

        if (cartId) {
          await axios.delete(`http://localhost:3000/api/carts/${cartId}`);  // Deleting the cart
          await axios.post('http://localhost:3000/api/carts', {             // Create a new cart for the user after deletion
            userId: user.id,
          });
        }

        alert('Payment successful!');
        navigate('/confirmation', { state: { paymentStatus: 'succeeded' } });
      }

    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed.');
      navigate('/confirmation'); // Redirect to confirmation page with failure status
    }

    setIsProcessing(false);
  };

  return (
    <div className="checkout-container">
      <h2>Order Summary</h2>
      <table className="checkout-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {cartItems.length > 0 ? (
            <>
              {cartItems.map((item) => (
                <tr key={item.product_id}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>${item.price}</td>
                  <td>${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                <td style={{ fontWeight: 'bold' }}>${totalSum.toFixed(2)}</td>
              </tr>
            </>
          ) : (
            <tr>
              <td colSpan="4">Your cart is empty.</td>
            </tr>
          )}
        </tbody>
      </table>
      <form onSubmit={handleSubmit}>
        <CardElement />
        <button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </button>
      </form>
    </div>
  );
};


export default CheckoutForm;