import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useSearchParams, useNavigate, Navigate } from 'react-router-dom';

// Import AuthProvider and useAuth from the dedicated AuthContext.js file
import { AuthProvider, useAuth } from './AuthContext';

// Import all page components
import ProductDetail from './ProductDetail';
import AddProduct from './AddProduct';
import EditProduct from './EditProduct';
import Register from './Register';
import Login from './Login';
import CartPage from './CartPage';
import CheckoutPage from './CheckoutPage';
import OrderConfirmationPage from './OrderConfirmationPage';
import OrderHistoryPage from './OrderHistoryPage';
import OrderManagementPage from './OrderManagementPage';
import WalletPage from './WalletPage'; // Import WalletPage


// Add a style block for the marquee animation directly in the component.
// In a larger project, this would typically go in your `index.css` or `App.css`.
const MarqueeStyle = () => (
  <style>{`
    @keyframes marquee {
      0% { transform: translateX(100%); }
      100% { transform: translateX(-100%); }
    }
    .animate-marquee {
      animation: marquee 20s linear infinite;
    }
    /* Custom scrollbar for better appearance */
    .scrollbar-thin::-webkit-scrollbar {
      height: 8px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
      background: #00004d; /* Dark blue from your background */
      border-radius: 10px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: #60a5fa; /* Tailwind blue-400 */
      border-radius: 10px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background: #3b82f6; /* Tailwind blue-500 */
    }
  `}</style>
);


// ProtectedRoute component to control access based on authentication and roles
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, logout, showCustomModal } = useAuth(); // Destructure necessary items from useAuth
  const navigate = useNavigate(); // Hook for navigation

  // If there's no token or user data, the user is not authenticated
  if (!token || !user) {
    // Show a custom modal message and redirect to login
    showCustomModal('You must be logged in to view this page.', () => {
      logout(); // Perform a logout to clear any stale local storage data
      navigate('/login', { replace: true }); // Redirect to login page, replacing history entry
    });
    return null; // Don't render children until redirect
  }

  // If allowedRoles are specified, check if the user's role is included
  if (allowedRoles && (!user.role || !allowedRoles.includes(user.role))) {
    // Show access denied message and redirect to home
    showCustomModal('Access Denied. You do not have permission to view this page.', () => {
      navigate('/', { replace: true }); // Redirect to home page
    });
    return null; // Don't render children until redirect
  }

  return children; // Render the protected content if authenticated and authorized
};


// ProductList Component (serves as the Home Page)
function ProductList() {
  const { user, logout, addToCart, cart } = useAuth(); // Get user, logout, addToCart, and cart from context
  const navigate = useNavigate(); // Hook for navigation
  const [products, setProducts] = useState([]); // State for products list
  const [loading, setLoading] = useState(true); // State for loading indicator
  const [error, setError] = useState(null); // State for error messages
  const [searchTerm, setSearchTerm] = useState(''); // State for search input
  const [selectedCategory, setSelectedCategory] = useState(''); // State for category filter
  const [minPrice, setMinPrice] = useState(''); // State for minimum price filter
  const [maxPrice, setMaxPrice] = useState(''); // State for maximum price filter
  const [availableCategories, setAvailableCategories] = useState([]); // State for available categories for dropdown
  const [totalPages, setTotalPages] = useState(1); // State for total pages in pagination
  const [searchParams, setSearchParams] = useSearchParams(); // Hook to manage URL search parameters
  const [currentPage, setCurrentPage] = useState(1); // State for current page in pagination

  // Function to format price as Naira
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
  };

  // useCallback memoizes the fetchProducts function to prevent unnecessary re-renders
  const fetchProducts = useCallback(async () => {
    const pageFromUrl = parseInt(searchParams.get('page')) || 1; // Get current page from URL or default to 1
    // Update currentPage state if it differs from the URL parameter
    if (currentPage !== pageFromUrl) {
      setCurrentPage(pageFromUrl);
    }

    setLoading(true); // Set loading to true before fetching
    setError(null); // Clear any previous errors
    try {
      const queryParams = new URLSearchParams(); // Create URL search parameters
      if (searchTerm) queryParams.append('search', searchTerm);
      if (selectedCategory) queryParams.append('category', selectedCategory);
      if (minPrice) queryParams.append('minPrice', minPrice);
      if (maxPrice) queryParams.append('maxPrice', maxPrice);
      queryParams.append('page', pageFromUrl); // Append current page
      queryParams.append('limit', 12); // Define items per page

      // --- IMPORTANT: This URL is for your DEPLOYED backend ---
      // If you redeploy your backend and its URL changes, you MUST update it here.
      const backendBaseUrl = 'https://jora-mall-backend.onrender.com';
      const url = `${backendBaseUrl}/api/products?${queryParams.toString()}`; // Construct API URL
      const response = await fetch(url); // Fetch products

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`); // Throw error for non-OK responses
      }
      const data = await response.json(); // Parse JSON response
      setProducts(data.products); // Update products state
      setTotalPages(data.totalPages); // Update total pages state
    } catch (err) {
      setError(err.message); // Set error message
      console.error('Error in fetchProducts:', err); // Log error to console
    } finally {
      setLoading(false); // Set loading to false after fetch completes
    }
  }, [searchTerm, selectedCategory, minPrice, maxPrice, searchParams, currentPage]); // Dependencies for useCallback

  // Effect to fetch products on initial render and whenever filter/search/page terms change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]); // Runs when fetchProducts (memoized) changes

  // Effect to fetch categories for the filter dropdown (runs once on mount)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // --- IMPORTANT: This URL is for your DEPLOYED backend ---
        const backendBaseUrl = 'https://jora-mall-backend.onrender.com';
        const response = await fetch(`${backendBaseUrl}/api/products`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Extract unique categories from fetched products
        const categories = [...new Set(data.products.map(product => product.category))];
        setAvailableCategories(['All', ...categories]); // Add 'All' option
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []); // Runs only once on component mount

  // Handlers for filter and search input changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', '1'); // Reset to first page on new search
    setSearchParams(newSearchParams);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value === 'All' ? '' : e.target.value); // Set empty string for 'All'
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', '1'); // Reset to first page on new filter
    setSearchParams(newSearchParams);
  };

  const handleMinPriceChange = (e) => {
    setMinPrice(e.target.value);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', '1'); // Reset to first page on new filter
    setSearchParams(newSearchParams);
  };

  const handleMaxPriceChange = (e) => {
    setMaxPrice(e.target.value);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', '1'); // Reset to first page on new filter
    setSearchParams(newSearchParams);
  };

  // Handler to clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSearchParams(new URLSearchParams({ page: '1' })); // Clear all params and reset to page 1
  };

  // Handler for page change in pagination
  const handlePageChange = (pageNumber) => {
    const currentPageFromUrl = parseInt(searchParams.get('page')) || 1;
    // Only update if pageNumber is valid and different from current
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPageFromUrl) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('page', pageNumber.toString()); // Update page param in URL
      setSearchParams(newSearchParams);
    }
  };

  // Handler for logout action
  const handleLogout = () => {
    logout(); // Call logout from AuthContext
    navigate('/login'); // Redirect to login page after logout
  };

  // Function to render pagination page numbers
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPageButtons = 5; // Maximum number of page buttons to display
    const currentPageRender = parseInt(searchParams.get('page')) || 1; // Current page for rendering UI

    // Determine the range of page numbers to show
    let startPage = Math.max(1, currentPageRender - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    // Adjust startPage if there aren't enough pages after currentPage to fill maxPageButtons
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i} // Unique key for each button
          onClick={() => handlePageChange(i)} // Call handlePageChange on click
          className={`px-4 py-2 rounded-md ${currentPageRender === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors duration-200`}
        >
          {i}
        </button>
      );
    }
    return pageNumbers;
  };

  // Display error message if fetching products fails
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] text-red-700 p-4 rounded-lg shadow-md m-4 flex-col">
        <p className="font-bold">Error:</p> <p className="ml-2">{error}</p>
        <p className="mt-2">Please ensure your backend server is running at `https://jora-mall-backend.onrender.com` or your MongoDB URI is correct.</p>
        <Link to="/" className="mt-4 text-blue-700 hover:underline">Retry Home</Link>
      </div>
    );
  }

  // Slice products for "Top Selling Products" section (first 8 for now)
  const topSellingProducts = products.slice(0, 8);


  return (
    <div className="min-h-screen bg-[#000080] text-white font-inter">
      <MarqueeStyle /> {/* Include the style block for marquee animation */}

      {/* Header section with site title and navigation */}
      <header className="text-center py-8 bg-gradient-to-r from-blue-800 to-indigo-900 rounded-b-xl shadow-lg mb-8">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Jora Mall</h1>
        {/* Updated Slogan */}
        <p className="text-xl text-blue-200 mt-2">Jora Mall - Where Convenience Meets Quality.</p>
        <nav className="mt-4 flex flex-wrap justify-center space-x-2 sm:space-x-4 items-center">
          <Link
            to="/"
            className="inline-block bg-indigo-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-indigo-600 transition-colors duration-300 shadow-md"
          >
            Home
          </Link>
          {/* Admin specific navigation links */}
          {user && user.role === 'admin' && (
            <>
              <Link
                to="/add-product"
                className="inline-block bg-green-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-green-600 transition-colors duration-300 shadow-md"
              >
                Add New Product
              </Link>
              <Link
                to="/admin/orders"
                className="inline-block bg-orange-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-orange-600 transition-colors duration-300 shadow-md"
              >
                Manage Orders (Admin)
              </Link>
            </>
          )}
          {/* Conditional rendering for logged-in vs. logged-out users */}
          {user ? (
            <>
              {/* Welcome message for logged-in user */}
              <span className="py-2 px-4 text-yellow-100">Welcome, {user.username}!</span>
              {/* Link to user's orders */}
              <Link
                to="/my-orders"
                className="inline-block bg-purple-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-purple-600 transition-colors duration-300 shadow-md"
              >
                My Orders
              </Link>
              {/* NEW: Link to Wallet Page with visible balance */}
              <Link
                to="/wallet"
                className="inline-block bg-teal-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-teal-600 transition-colors duration-300 shadow-md flex items-center space-x-2"
              >
                <span>My Wallet</span>
                {/* Display wallet balance if available */}
                {user.walletBalance !== undefined && (
                  <span className="bg-teal-700 px-2 py-1 rounded-full text-xs font-bold">
                    {formatPrice(user.walletBalance)}
                  </span>
                )}
              </Link>
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="inline-block bg-red-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-red-600 transition-colors duration-300 shadow-md"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Links for login and registration if not logged in */}
              <Link
                to="/login"
                className="inline-block bg-blue-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-300 shadow-md"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-block bg-purple-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-purple-600 transition-colors duration-300 shadow-md"
              >
                Register
              </Link>
            </>
          )}

          {/* Phone Icon and Number */}
          <div className="flex items-center text-blue-100 space-x-1 ml-4 sm:ml-6 py-2 px-2 sm:px-4 rounded-lg bg-blue-700 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <a href="tel:+2348027035316" className="text-white hover:underline">+234 8027035316</a>
          </div>

          {/* Support Hotline */}
          <div className="text-blue-100 ml-2 sm:ml-4 py-2 px-2 sm:px-4 rounded-lg bg-blue-700 shadow-md">
            Support hotline: <a href="mailto:Support@retailshopping.com" className="text-white hover:underline">Support@retailshopping.com</a>
          </div>

          {/* Cart Icon - ALWAYS VISIBLE, shows item count from the active cart state */}
          <Link
            to="/cart"
            className="relative inline-flex items-center bg-yellow-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-yellow-600 transition-colors duration-300 shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="ml-2 hidden sm:inline">Cart</span>
            {/* Display the number of items in the cart (local or server cart) */}
            {cart.items && cart.items.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {cart.items.length}
              </span>
            )}
          </Link>
        </nav>
      </header>

      {/* Scrolling Marquee Title */}
      <div className="bg-yellow-400 text-gray-900 py-2 px-4 overflow-hidden shadow-inner text-sm font-semibold whitespace-nowrap">
        <div className="inline-block animate-marquee">
          Never pay more than the Jora Mall prize!! Questions or concerns? Contact <a href="mailto:support@retailshopping.com" className="text-blue-700 hover:underline">support@retailshopping.com</a>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Top Selling Products Section - displays first 8 products */}
        {topSellingProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">🔥 Top Selling Products</h2>
            <div className="flex overflow-x-auto pb-4 space-x-6 scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-blue-900">
              {topSellingProducts.map((product) => (
                // Link to product detail page
                <Link to={`/product/${product._id}`} key={product._id} className="flex-shrink-0 w-64">
                  <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 h-full flex flex-col">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-40 object-cover rounded-t-xl"
                      // Fallback for broken images
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/400x300/E0E0E0/333333?text=Image+Not+Found';
                      }}
                    />
                    <div className="p-4 flex-grow flex flex-col">
                      <h3 className="text-lg font-semibold mb-1 truncate">{product.name}</h3>
                      <p className="text-sm text-blue-100 mb-2 line-clamp-2">{product.description}</p>
                      <div className="flex justify-between items-center mt-auto pt-2">
                        <span className="text-2xl font-bold text-yellow-300">{formatPrice(product.price)}</span> {/* Currency Updated */}
                        <span className="text-xs text-blue-200">Stock: {product.stock}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault(); // Prevent navigation from the Link component
                          // --- DEBUGGING LOG ---
                          console.log('Attempting to add product to cart from ProductList:', {
                            productId: product._id,
                            quantity: 1,
                            name: product.name,
                            imageUrl: product.imageUrl,
                            price: product.price
                          });
                          // --- END DEBUGGING LOG ---
                          // Ensure product ID and details are valid before adding to cart
                          if (product && product._id) {
                            addToCart(product._id, 1, { // Pass product details for local cart
                              name: product.name,
                              imageUrl: product.imageUrl,
                              price: product.price,
                            });
                          } else {
                            console.error('Attempted to add to cart with invalid product data from ProductList:', product);
                          }
                        }}
                        className="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors duration-300 shadow-md"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Search and Filter Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-grow">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Products</label>
            <input
              type="text"
              id="search"
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              id="category"
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat === 'All' ? '' : cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2">
            <div>
              <label htmlFor="minPrice" className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
              <input
                type="number"
                id="minPrice"
                placeholder="Min"
                value={minPrice}
                onChange={handleMinPriceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
              <input
                type="number"
                id="maxPrice"
                placeholder="Max"
                value={maxPrice}
                onChange={handleMaxPriceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleClearFilters}
            className="w-full md:w-auto bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-300 shadow-sm"
          >
            Clear Filters
          </button>
        </div>

        {/* Conditional rendering based on loading state or products availability */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
            <p className="ml-4 text-lg text-white">Fetching products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center text-blue-100 text-xl py-10">
            No products found matching your criteria. Try adjusting your search or filters.
          </div>
        ) : (
          <>
            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                // Link to individual product detail page
                <Link to={`/product/${product._id}`} key={product._id} className="block">
                  <div
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col h-full"
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-xl"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/400x300/E0E0E0/333333?text=Image+Not+Found';
                      }}
                    />
                    <div className="p-4 flex-grow flex flex-col">
                      <h2 className="text-xl font-semibold text-gray-800 mb-2">{product.name}</h2>
                      {/* Display a truncated description */}
                      <p className="text-gray-600 text-sm mb-3 flex-grow">{product.description.substring(0, 100)}...</p>
                      <div className="flex justify-between items-center mt-auto pt-2">
                        <span className="text-2xl font-bold text-blue-600">{formatPrice(product.price)}</span> {/* Currency Updated */}
                        <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault(); // Prevent navigation when "Add to Cart" button is clicked
                          // --- DEBUGGING LOG ---
                          console.log('Attempting to add product to cart from ProductList (grid):', {
                            productId: product._id,
                            quantity: 1,
                            name: product.name,
                            imageUrl: product.imageUrl,
                            price: product.price
                          });
                          // --- END DEBUGGING LOG ---
                          if (product && product._id) {
                            addToCart(product._id, 1, { // Pass product details for local cart
                              name: product.name,
                              imageUrl: product.imageUrl,
                              price: product.price,
                            });
                          } else {
                            console.error('Attempted to add to cart with invalid product data from ProductList (grid):', product);
                          }
                        }}
                        className="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors duration-300 shadow-md"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <button
                  onClick={() => handlePageChange((parseInt(searchParams.get('page')) || 1) - 1)}
                  disabled={(parseInt(searchParams.get('page')) || 1) === 1}
                  className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Previous
                </button>
                {renderPageNumbers()}
                <button
                  onClick={() => handlePageChange((parseInt(searchParams.get('page')) || 1) + 1)}
                  disabled={(parseInt(searchParams.get('page')) || 1) === totalPages}
                  className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* New Footer Sections */}
      {/* Changed background to white and text to red-700 */}
      <section className="bg-white text-red-700 py-12 px-4 mt-8">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Explore Jora Mall */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-red-500">Explore Jora Mall</h3> {/* Sub-header changed to red-500 for slight contrast */}
            <ul className="space-y-2">
              {/* Links use text-red-700 by default and hover:text-red-500 for interactivity */}
              <li><Link to="/products?category=Smartphones" className="text-red-700 hover:text-red-500 transition-colors">Smart Phones</Link></li>
              <li><Link to="/products?category=Designer shoes" className="text-red-700 hover:text-red-500 transition-colors">Designer Shoes</Link></li>
              <li><Link to="/products?category=Jackets" className="text-red-700 hover:text-red-500 transition-colors">Jackets</Link></li>
              <li><Link to="/products?category=Sweatshirt" className="text-red-700 hover:text-red-500 transition-colors">Sweatshirt</Link></li>
              <li><Link to="/" className="text-red-700 hover:text-red-500 transition-colors">All Products</Link></li>
            </ul>
          </div>

          {/* Terms and Conditions */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-red-500">Terms and Conditions</h3> {/* Sub-header changed to red-500 */}
            <ul className="space-y-2">
              {/* Links use text-red-700 by default and hover:text-red-500 for interactivity */}
              <li><Link to="/cookie-policy" className="text-red-700 hover:text-red-500 transition-colors">Cookie Policy</Link></li>
              <li><Link to="/data-privacy-statement" className="text-red-700 hover:text-red-500 transition-colors">Data Privacy Statement</Link></li>
              <li><Link to="/website-usage-policy" className="text-red-700 hover:text-red-500 transition-colors">Website Usage Policy</Link></li>
            </ul>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-red-500">Contact Us</h3> {/* Sub-header changed to red-500 */}
            <p className="leading-relaxed">
              <strong>Head Office:</strong><br />
              Jora Estate, Victoria Island,<br />
              Lagos, Nigeria.
            </p>
            <p className="mt-2">
              <strong>Telephone:</strong> <a href="tel:+2348027035316" className="text-red-700 hover:text-red-500 transition-colors">+234 8027035316</a>
            </p>
            <p>
              <strong>Email:</strong> <a href="mailto:support@retailshopping.com" className="text-red-700 hover:text-red-500 transition-colors">support@retailshopping.com</a>
            </p>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-red-500">Follow Us</h3> {/* Sub-header changed to red-500 */}
            <div className="flex space-x-4">
              {/* Social media icons with updated colors and hover effects */}
              <a href="https://wa.me/2348027035316" target="_blank" rel="noopener noreferrer" className="text-red-700 hover:text-green-500 transition-colors">
                <svg role="img" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.77.47 3.45 1.38 4.9L2.05 22l5.03-1.32c1.4-.76 2.97-1.16 4.56-1.16 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zM17.3 15.68c-.19.34-.78.37-1.14.19-.36-.19-1.05-.43-1.47-.59-.42-.16-.72-.12-1.02.32-.3.44-1.17 1.54-1.42 1.83-.26.3-.51.34-.95.12-.44-.22-1.54-.57-2.93-1.81-1.08-.94-1.8-2.16-2-2.5a.6.6 0 01-.19-.44c0-.16.2-.38.45-.63.2-.23.44-.57.65-.85.2-.28.27-.47.18-.65-.08-.19-.72-1.74-1-2.45-.28-.7-.48-.59-.65-.6-.16-.01-.35-.02-.54-.02-.2 0-.52.07-.79.37-.27.3-.87 1.05-.87 2.56S6.9 16.33 7.3 16.92c.4.6 1.48 2.3 3.59 3.12 1.7 1 3.23 1.25 4.3 1.13 1.07-.12 2.36-.96 2.76-1.57.4-.6.4-1.1.2-1.42-.19-.32-.7-.49-1.05-.67z"/></svg>
              </a>
              <a href="https://www.facebook.com/joramall" target="_blank" rel="noopener noreferrer" className="text-red-700 hover:text-blue-500 transition-colors">
                <svg role="img" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.33 8.89 7.77 9.88V14.89h-2.54V12h2.54V9.79c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.19 2.24.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89H13.5V22C17.47 21.14 22 17.16 22 12z"/></svg>
              </a>
              <a href="https://www.instagram.com/joramall" target="_blank" rel="noopener noreferrer" className="text-red-700 hover:text-pink-500 transition-colors">
                <svg role="img" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 2c3.232 0 3.655.012 4.908.071 1.242.059 2.058.261 2.716.536.702.29 1.257.652 1.84 1.235.584.584.945 1.14 1.235 1.84.275.658.477 1.474.536 2.716.059 1.253.071 1.676.071 4.908s-.012 3.655-.071 4.908c-.059 1.242-.261 2.058-.536 2.716-.29.702-.652 1.257-1.235 1.84-.584.584-1.14.945-1.235 1.84-.275.658-.477 1.474-.536 2.716-.059 1.253-.071 1.676-.071 4.908s.012-3.655.071-4.908c.059-1.242.261-2.058.536-2.716.29-.702.652-1.257 1.235-1.84.584-.584 1.14-.945 1.84-1.235.658-.275 1.474-.477 2.716-.536C8.345 2.012 8.768 2 12 2zm0 2.474c-3.136 0-3.535.012-4.764.066-1.173.056-1.928.243-2.385.433-.497.199-.865.485-1.229.849-.364.364-.65.732-.849 1.229-.19.457-.377 1.212-.433 2.385-.054 1.23-.066 1.628-.066 4.764s.012 3.535.066 4.764c.056 1.173.243 1.928.433 2.385.199.497.485.865.849 1.229.364.364.732.65 1.229.849.457.19 1.212.377 2.385.433 1.23.054 1.628.066 4.764.066s3.535-.012 4.764-.066c1.173-.056 1.928-.243 2.385-.433.497-.199.865-.485 1.229-.849.364-.364.732-.65-.849-1.229-.457-.19-1.212-.377-2.385-.433-1.23-.054-1.628-.066-4.764-.066zm0 3.651c-3.411 0-6.192 2.781-6.192 6.192s2.781 6.192 6.192 6.192 6.192-2.781 6.192-6.192-2.781-6.192-6.192-6.192zm0 2.474a3.718 3.718 0 100 7.436 3.718 3.718 0 000-7.436zm6.335-3.327a1.474 1.474 0 110 2.948 1.474 1.474 0 010-2.948z"/></svg>
              </a>
              <a href="https://x.com/joramall" target="_blank" rel="noopener noreferrer" className="text-red-700 hover:text-blue-400 transition-colors">
                <svg role="img" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M18.901 1.153h3.682L15.344 8.441l8.529 11.408H20.4L13.882 12.3l-6.84 7.551H2.387l7.551-8.354L1.13 1.153h3.811L11.5 7.086l6.899-5.933zM16.947 18.309H15.02L5.051 4.118H6.883L16.947 18.309z"/></svg>
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* Main Footer (Copyright) - Updated background to white and text to red-700 */}
      <footer className="text-center py-6 bg-white text-red-700 text-sm">
        <p>&copy; {new Date().getFullYear()} Jora Mall. All rights reserved.</p>
      </footer>
    </div>
  );
}

// Main App component responsible for overall application structure and routing
function App() {
  return (
    <Router> {/* BrowserRouter for handling client-side routing */}
      <AuthProvider> {/* AuthProvider makes authentication and cart context available globally */}
        <Routes> {/* Defines all application routes */}
          {/* Public Routes - accessible to all users */}
          <Route path="/" element={<ProductList />} /> {/* Home page, lists products */}
          <Route path="/product/:id" element={<ProductDetail />} /> {/* Individual product detail page */}
          <Route path="/register" element={<Register />} /> {/* User registration page */}
          <Route path="/login" element={<Login />} /> {/* User login page */}
          <Route path="/cart" element={<CartPage />} /> {/* Cart page (now accessible to guests) */}

          {/* New placeholder routes for policy pages - you would create actual components for these later */}
          <Route path="/cookie-policy" element={<div className="min-h-screen bg-white text-red-700 flex items-center justify-center text-center text-4xl font-bold">Cookie Policy Page<br/><Link to="/" className="text-blue-500 hover:underline text-lg mt-4">Go to Home</Link></div>} />
          <Route path="/data-privacy-statement" element={<div className="min-h-screen bg-white text-red-700 flex items-center justify-center text-center text-4xl font-bold">Data Privacy Statement Page<br/><Link to="/" className="text-blue-500 hover:underline text-lg mt-4">Go to Home</Link></div>} />
          <Route path="/website-usage-policy" element={<div className="min-h-screen bg-white text-red-700 flex items-center justify-center text-center text-4xl font-bold">Website Usage Policy Page<br/><Link to="/" className="text-blue-500 hover:underline text-lg mt-4">Go to Home</Link></div>} />

          {/* Dynamic product category pages for "Explore" links. Renders ProductList with a pre-set category filter */}
          {/* Note: The ProductList component uses `useSearchParams` to read category from URL, so a generic /products route works for dynamic category links */}
          <Route path="/products" element={<ProductList />} />

          {/* Protected Routes (require user to be logged in) */}
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} /> {/* Checkout process */}
          <Route path="/order-confirmation" element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>} /> {/* Order confirmation */}
          <Route path="/my-orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} /> {/* User's order history */}
          <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} /> {/* NEW: Wallet Page */}

          {/* Admin Protected Routes (require user to be logged in AND have 'admin' role) */}
          <Route
            path="/add-product"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AddProduct /> {/* Admin page to add new products */}
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-product/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EditProduct /> {/* Admin page to edit existing products */}
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <OrderManagementPage /> {/* Admin page to manage all orders */}
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App; // Export the main App component
