import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import '../styles/productdetails.css';

const ProductDetails = () => {
  const { id } = useParams(); // Get the product ID from the URL
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state) => state.user.user); // Access user from Redux state
  const navigate = useNavigate(); // Initialize navigate function for routing

  useEffect(() => {
    // Fetch the product details from the backend
    const fetchProductDetails = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/products/${id}`);
        if (response.ok) {
          const data = await response.json();
          data.price = parseFloat(data.price);  // Convert the price to a number if it's not already
          setProduct(data);
          setLoading(false);
        } else {
          console.error('Failed to fetch product details.');
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
      }
    };

    fetchProductDetails();
  }, [id]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!product) {
    return <p>Product not found.</p>;
  }

  // Ensure price is properly formatted
  const formattedPrice = isNaN(product.price) ? 'N/A' : product.price.toFixed(2);

  // Handle "Add to Cart" button click
  const handleAddToCart = async () => {
    if (user) {
      try {
        // Fetch cart
        const cartResponse = await fetch(`http://localhost:3000/api/carts/${user.id}`);
        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          if (cartData.length > 0) {
            const cartId = cartData[0].id;

          // Add or increment product in the cart
          const addItemResponse = await fetch('http://localhost:3000/api/cartitems', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cartId, productId: id, action: 'increment' }), // Include the action
          });

          if (addItemResponse.ok) {
            alert('Product added to the cart');
          } else {
            console.error('Failed to add product to the cart.');
            alert('Error adding product to the cart.');
          }
        } else {
          console.error('Cart not found for the user.');
          alert('Error retrieving cart.');
        }
      } else {
        console.error('Failed to fetch cart.');
        alert('Error fetching cart.');
      }
    } catch (error) {
      console.error('Error handling add to cart:', error);
      alert('Error occurred.');
    }
  } else {
    // User is not logged in, redirect to login
    alert('You need to log in first!');
    navigate('/login');
  }
};

  return (
    <div className="product-details">
      <h2>{product.name}</h2>
      <p>Price: ${formattedPrice}</p>
      <p>{product.description_long}</p>
      {product.img1 && <img src={product.img1} alt={product.name} className="product-detail-image" />}
      <button className="add-to-cart-button" onClick={handleAddToCart}>Add to cart</button>
    </div>
  );
};

export default ProductDetails;
