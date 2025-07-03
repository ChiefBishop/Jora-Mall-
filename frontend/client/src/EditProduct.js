import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth for token and modal

function EditProduct() {
  const { id } = useParams(); // Get product ID from URL parameters
  const navigate = useNavigate(); // Hook for navigation
  const { token, showCustomModal } = useAuth(); // Get token and showCustomModal from AuthContext

  // State to hold form data for the product being edited
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    imageUrl: '',
  });
  const [loading, setLoading] = useState(true); // State for initial product load
  const [submitting, setSubmitting] = useState(false); // State for form submission
  const [error, setError] = useState(null); // State for error messages
  const [success, setSuccess] = useState(false); // State for success message

  // Effect to fetch product details when component mounts or ID changes
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://jora-mall-web-backend.onrender.com/api/products/${id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Populate form data with fetched product details
        setFormData({
          name: data.name,
          description: data.description,
          price: data.price.toString(), // Convert number to string for input value
          stock: data.stock.toString(),   // Convert number to string for input value
          category: data.category,
          imageUrl: data.imageUrl,
        });
      } catch (err) {
        setError(err.message);
        console.error('Error fetching product details for edit:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]); // Re-run effect if product ID changes

  // Handler for input changes, updates formData state
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handler for form submission (updating the product)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); // Indicate submission in progress
    setError(null);
    setSuccess(false);

    try {
      // Client-side validation
      if (!formData.name || !formData.description || !formData.price || !formData.stock || !formData.category || !formData.imageUrl) {
        throw new Error('All fields are required.');
      }
      if (isNaN(formData.price) || parseFloat(formData.price) <= 0) {
        throw new Error('Price must be a positive number.');
      }
      if (isNaN(formData.stock) || parseInt(formData.stock) < 0) {
        throw new Error('Stock must be a non-negative integer.');
      }

      const response = await fetch(`https://jora-mall-web-backend.onrender.com/api/products/${id}`, {
        method: 'PUT', // Use PUT for updating an existing resource
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Include JWT token
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price), // Convert price to float
          stock: parseInt(formData.stock),   // Convert stock to integer
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Product updated successfully:', data);
      setSuccess(true);
      showCustomModal('Product updated successfully!', () => {
        navigate(`/product/${id}`); // Redirect to updated product detail page
      });

    } catch (err) {
      console.error('Error updating product:', err);
      setError(err.message);
      showCustomModal(`Failed to update product: ${err.message}`);
    } finally {
      setSubmitting(false); // Reset submitting state
    }
  };

  // Display loading message for initial fetch
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
        <p className="ml-4 text-lg">Loading product for editing...</p>
      </div>
    );
  }

  // Display error message if initial fetch failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] text-red-600">
        <p className="text-xl font-semibold">Error loading product: {error}</p>
        <button
          onClick={() => navigate('/')}
          className="ml-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000080] p-4 text-white">
      <header className="text-center py-8 bg-gradient-to-r from-blue-800 to-indigo-900 rounded-b-xl shadow-lg mb-8">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Edit Product</h1>
        <p className="text-xl text-blue-200 mt-2">Modify product details.</p>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl mx-auto text-gray-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              ></textarea>
            </div>

            {/* Price and Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price ($)</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>

            {/* Image URL */}
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">Image URL</label>
              <input
                type="url"
                id="imageUrl"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>

            {/* Error and Success Messages */}
            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}
            {success && (
              <p className="text-green-600 text-sm text-center">Product updated successfully!</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={submitting}
            >
              {submitting ? 'Updating Product...' : 'Update Product'}
            </button>
          </form>
        </div>
      </main>

      <footer className="text-center py-6 mt-8 text-blue-200 text-sm">
        <p>&copy; {new Date().getFullYear()} Jora Mall. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default EditProduct;
