import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // Added Link import for consistency
import { useAuth } from './AuthContext'; // Import useAuth to access addToCart and user info

function ProductDetail() {
  const { id } = useParams(); // Get product ID from URL parameters (e.g., from /product/:id)
  const navigate = useNavigate(); // Hook for programmatic navigation
  // Destructure necessary functions and state from AuthContext
  const { user, token, addToCart, showCustomModal } = useAuth();

  const [product, setProduct] = useState(null); // State to store the fetched product details
  const [loading, setLoading] = useState(true); // State for loading indicator (true while fetching)
  const [error, setError] = useState(null);     // State to store any error messages during fetch
  const [quantity, setQuantity] = useState(1); // State for the quantity the user wants to add to cart

  // Function to format price as Nigerian Naira (₦)
  const formatPrice = (price) => {
    // Uses Intl.NumberFormat for robust currency formatting based on locale
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
  };

  // useEffect hook to fetch product details when the component mounts or the product ID changes
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true); // Start loading state
      setError(null);   // Clear previous errors

      try {
        // --- IMPORTANT: When deploying, replace 'http://localhost:5000' with your deployed backend URL ---
        const response = await fetch(`https://jora-mall-backend.onrender.com/api/products/${id}`);
        if (!response.ok) {
          // If the HTTP response is not OK (e.g., 404, 500), throw an error
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); // Parse the JSON response
        setProduct(data); // Update the product state with the fetched data
      } catch (err) {
        console.error('Error fetching product details:', err); // Log the detailed error
        setError(err.message); // Set the error message for display
      } finally {
        setLoading(false); // End loading state regardless of success or failure
      }
    };

    fetchProduct(); // Call the fetch function
  }, [id]); // Dependency array: Effect re-runs if the `id` from URL parameters changes

  // Handler for adding the product to the cart
  const handleAddToCart = () => {
    // Check if product data is available and has an ID
    if (product && product._id) {
      // Call addToCart from AuthContext, passing product ID, quantity, and relevant details
      // The product details (name, imageUrl, price) are important for local cart display when not logged in.
      addToCart(product._id, quantity, {
        name: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
      });
    } else {
      console.error('Attempted to add to cart with invalid product data:', product);
    }
  };

  // Handler for navigating to the product edit page (Admin only)
  const handleEditProduct = () => {
    // This will only be accessible if ProtectedRoute for /edit-product/:id allows 'admin' role
    navigate(`/edit-product/${product._id}`);
  };

  // Handler for deleting the product (Admin only)
  const handleDeleteProduct = async () => {
    // Perform authorization check before proceeding with deletion
    if (!user || user.role !== 'admin' || !token) {
      showCustomModal('You are not authorized to delete products.');
      return; // Exit if unauthorized
    }

    // Use the custom modal for confirmation before proceeding with the delete API call
    showCustomModal('Are you sure you want to delete this product? Click OK to confirm.', async () => {
      try {
        // --- IMPORTANT: When deploying, replace 'http://localhost:5000' with your deployed backend URL ---
        const response = await fetch(`https://jora-mall-backend.onrender.com/api/products/${product._id}`, {
          method: 'DELETE', // HTTP DELETE method
          headers: {
            'Authorization': `Bearer ${token}`, // Include JWT token for authentication
          },
        });

        if (!response.ok) {
          const errorData = await response.json(); // Parse error response from backend
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // Show success message and redirect to home page after successful deletion
        showCustomModal('Product deleted successfully!', () => {
          navigate('/');
        });
      } catch (err) {
        console.error('Error deleting product:', err); // Log the error
        showCustomModal(`Failed to delete product: ${err.message}`); // Show user-friendly error
      }
    });
  };

  // Conditional rendering based on loading, error, or product not found states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
        <p className="ml-4 text-lg text-white">Loading product details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative m-4 text-center">
          <p className="font-bold">Error:</p>
          <p className="block sm:inline ml-2">{error}</p>
          <Link to="/" className="mt-4 text-blue-700 hover:underline">Go to Home</Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-white text-gray-800 p-8 rounded-xl shadow-lg text-center">
          <p className="text-2xl font-semibold mb-4">Product not found.</p>
          <Link to="/" className="bg-blue-500 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-300 shadow-md">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Main render for product details
  return (
    <div className="min-h-screen bg-[#000080] p-4 sm:p-8 text-white font-inter">
      <header className="text-center py-8 bg-gradient-to-r from-blue-800 to-indigo-900 rounded-b-xl shadow-lg mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">{product.name}</h1>
        <p className="text-xl text-blue-200 mt-2">Product Details</p>
      </header>

      <main className="container mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-gray-800 flex flex-col md:flex-row items-start md:space-x-8">
          {/* Product Image Section */}
          <div className="flex-shrink-0 md:w-1/2 lg:w-1/3 mb-6 md:mb-0">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-auto object-cover rounded-xl shadow-md"
              onError={(e) => {
                e.target.onerror = null; // Prevent infinite loop if fallback image also fails
                e.target.src = 'https://placehold.co/600x400/E0E0E0/333333?text=Image+Not+Found'; // Fallback placeholder image
              }}
            />
          </div>

          {/* Product Information Section */}
          <div className="flex-grow">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">{product.name}</h2>
            <p className="text-gray-600 text-lg mb-4">{product.description}</p>
            <p className="text-blue-700 text-2xl font-bold mb-4">Category: {product.category}</p>
            <p className="text-green-600 text-3xl font-extrabold mb-4">{formatPrice(product.price)}</p> {/* Display price in Naira */}
            <p className="text-gray-700 text-lg mb-6">
              Availability: {product.stock > 0 ? (
                <span className="text-green-500 font-semibold">{product.stock} in stock</span>
              ) : (
                <span className="text-red-500 font-semibold">Out of Stock</span>
              )}
            </p>

            {/* Add to Cart Section (only if in stock) */}
            {product.stock > 0 && (
              <div className="flex items-center space-x-4 mb-6">
                <label htmlFor="quantity" className="text-gray-700 font-medium">Quantity:</label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  max={product.stock} // Maximum quantity user can add is limited by current stock
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} // Parse input to integer, default to 1 if invalid
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                />
                <button
                  onClick={handleAddToCart}
                  className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-300 shadow-md"
                  disabled={quantity > product.stock || quantity <= 0} // Disable if quantity is invalid or exceeds stock
                >
                  Add to Cart
                </button>
              </div>
            )}

            {/* Admin Actions Section (only visible to users with 'admin' role) */}
            {user && user.role === 'admin' && (
              <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">Admin Actions:</h3>
                <button
                  onClick={handleEditProduct}
                  className="w-full bg-yellow-500 text-white py-2 px-6 rounded-lg font-medium hover:bg-yellow-600 transition-colors duration-300 shadow-md"
                >
                  Edit Product
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="w-full bg-red-500 text-white py-2 px-6 rounded-lg font-medium hover:bg-red-600 transition-colors duration-300 shadow-md"
                >
                  Delete Product
                </button>
              </div>
            )}

            {/* Link back to products list */}
            <Link to="/" className="block mt-8 text-center text-blue-600 hover:underline">
              &larr; Back to Products
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 mt-8 text-blue-200 text-sm">
        <p>&copy; {new Date().getFullYear()} Jora Mall. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default ProductDetail; // Export the ProductDetail component
