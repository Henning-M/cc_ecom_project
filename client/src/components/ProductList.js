import React, { useEffect, useState } from 'react';
import Product from './Product';
import '../styles/productlist.css';
import { useNavigate } from 'react-router-dom';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate(); // To handle navigation

  useEffect(() => {
    // Fetch products from the backend
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []);

  const handleProductClick = (id) => {
    navigate(`/products/${id}`); // Navigate to the product details page
  };

  return (
    <div className="product-list">
      {products.map((product) => (
        <Product
          key={product.id}
          name={product.name}
          price={product.price}
          imgUrl={product.img_url}
          description={product.description}
          onClick={() => handleProductClick(product.id)} // Pass the click handler
        />
      ))}
    </div>
  );
};

export default ProductList;