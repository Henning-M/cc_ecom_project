import React, {useEffect, useState} from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import '../styles/cart.css';

const Cart = () => {
  const user = useSelector((state) => state.user.user); // Accessing user from Redux
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [totalSum, setTotalSum] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCartData = async () => {
      if (user) {
        try {
          // Step a: Fetch cart ID using the user ID
          const cartResponse = await fetch(`http://localhost:3000/api/carts/${user.id}`);
          if (!cartResponse.ok) {
            throw new Error('Failed to fetch cart.');
          }
          const cartData = await cartResponse.json();
          const cartId = cartData[0]?.id; // Assuming there's only one cart per user

          if (cartId) {
            // Step b: Fetch cart items using the cart ID
            const cartItemsResponse = await fetch(`http://localhost:3000/api/cartitems/${cartId}`);
            if (!cartItemsResponse.ok) {
              throw new Error('Failed to fetch cart items.');
            }
            const cartItemsData = await cartItemsResponse.json();

            // Step c: Fetch product details using the product IDs
            const productDetailsPromises = cartItemsData.map(async (item) => {
              const productResponse = await fetch(`http://localhost:3000/api/products/${item.product_id}`);
              if (!productResponse.ok) {
                throw new Error('Failed to fetch product details.');
              }
              const productData = await productResponse.json();
              return {
                ...item,
                name: productData.name,
                price: productData.price,
              };
            });

            const detailedCartItems = await Promise.all(productDetailsPromises);
            setCartItems(detailedCartItems);

            // Step d: Calculate the total sum of all items
            const total = detailedCartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
            setTotalSum(total);
          } else {
            setError('No cart found.');
          }
        } catch (err) {
          console.error('Error fetching cart data:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCartData();
  }, [user]);


  const updateQuantity = async (productId, action) => {
    try {
      const cartId = cartItems[0]?.cart_id; // Assuming cart ID is the same for all items
      if (!cartId) return;
  
      // If the quantity is 1 and the action is 'decrement', remove the item from the cart
      const currentItem = cartItems.find((item) => item.product_id === productId);
      if (currentItem.quantity === 1 && action === 'decrement') {
        const response = await fetch(`http://localhost:3000/api/cartitems/${cartId}/${productId}`, {
          method: 'DELETE',
        });
  
        if (!response.ok) {
          throw new Error('Failed to remove product from cart.');
        }
  
        // Update the cart items in the UI by removing the product
        setCartItems((prevItems) => prevItems.filter((item) => item.product_id !== productId));
      } else {
        // Otherwise, update the quantity as usual
        const response = await fetch('http://localhost:3000/api/cartitems', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId, productId, action }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to update cart item quantity.');
        }
  
        const data = await response.json();
  
        // Update the cart item quantities in the UI
        setCartItems((prevItems) =>
          prevItems.map((item) =>
            item.product_id === productId ? { ...item, quantity: data.quantity } : item
          )
        );
      }
  
      // Recalculate the total sum
      const updatedTotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
      setTotalSum(updatedTotal);
  
    } catch (err) {
      console.error('Error updating cart item quantity:', err);
      setError(err.message);
    }
  };
  

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="cart-container">
      <h2>Your Cart</h2>
      <table className="cart-table">
        <thead>
          <tr>
            <th>Product</th>
            <th colSpan="2">Quantity</th>
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
                  <td className="quantity-cell">
                    <span className="quantity">{item.quantity}</span>
                  </td>
                  <td className="button-cell">
                    <button
                      className={`quantity-button ${item.quantity === 1 ? 'remove-button' : ''}`}
                      onClick={() => updateQuantity(item.product_id, 'decrement')}
                    >
                      {item.quantity === 1 ? 'x' : '-'}
                    </button>
                    <button
                      className="quantity-button"
                      onClick={() => updateQuantity(item.product_id, 'increment')}
                    >
                      +
                    </button>
                  </td>
                  <td>${item.price}</td>
                  <td>${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                <td style={{ fontWeight: 'bold' }}>${totalSum.toFixed(2)}</td>
              </tr>
            </>
          ) : (
            <tr>
              <td colSpan="5">Your cart is empty.</td>
            </tr>
          )}
        </tbody>
      </table>
      <button
        className="checkout-button"
        onClick={() => navigate('/checkout', { state: { cartTotal: totalSum } })}
        >Checkout
      </button>
    </div>
  ); 


};


export default Cart;
