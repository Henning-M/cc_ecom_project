import React from 'react';
import '../styles/product.css';

const Product = ({ name, price, imgUrl, description, onClick }) => {
  
  // Ensure price is a number before formatting
  const formattedPrice = typeof price === 'number' ? price.toFixed(2) : 'N/A';

  return (
    <div className="product-card"onClick={onClick} style={{ cursor: 'pointer' }}>
      <img src={imgUrl} alt={name} className="product-image" />
      <div className="product-info">
        <h3 className="product-name">{name}</h3>
        <p className="product-description">{description}</p>
        <p className="product-price">${formattedPrice}</p>
      </div>
    </div>
  );
};

export default Product;