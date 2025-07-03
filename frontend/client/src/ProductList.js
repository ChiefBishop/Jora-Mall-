import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth hook for authentication and cart actions

function ProductList() {
  // Destructure user, logout, addToCart, and cart from the AuthContext
  const { user, logout, addToCart, cart } = useAuth();
  const navigate = useNavigate(); // Hook for programmatic navigation
  const [products, setProducts] = useState([]); // State to store the list of products
  const [loading, setLoading] = useState(true); // State to manage loading indicator
  const [error, setError] = useState(null); // State to store any fetch errors
  const [searchTerm, setSearchTerm] = useState(''); // State for the product search input
  const [selectedCategory, setSelectedCategory] = useState(''); // State for the selected product category filter
  const [minPrice, setMinPrice] = useState(''); // State for the minimum price filter
  const [maxPrice, setMaxPrice] = useState(''); // State for the maximum price filter
  const [availableCategories, setAvailableCategories] = useState([]); // State to store categories fetched from products
  const [totalPages, setTotalPages] = useState(1); // State for the total number of pages in pagination
  const [searchParams, setSearchParams] = useSearchParams(); // Hook to read and update URL search parameters
  const [currentPage, setCurrentPage] = useState(1); // State for the current active page in pagination

  // useCallback memoizes the fetchProducts function to prevent unnecessary re-creation
  // and optimize performance, especially when passed as a dependency to other effects.
  const fetchProducts = useCallback(async () => {
    // Get the current page number from the URL search parameters, default to 1
    const pageFromUrl = parseInt(searchParams.get('page')) || 1;
    // Update the currentPage state if it's different from the URL parameter
    if (currentPage !== pageFromUrl) {
      setCurrentPage(pageFromUrl);
    }

    setLoading(true); // Set loading to true before starting the fetch operation
    setError(null); // Clear any previous error messages

    try {
      const queryParams = new URLSearchParams(); // Create a new URLSearchParams object
      // Append search and filter parameters if they have values
      if (searchTerm) queryParams.append('search', searchTerm);
      if (selectedCategory) queryParams.append('category', selectedCategory);
      if (minPrice) queryParams.append('minPrice', minPrice);
      if (maxPrice) queryParams.append('maxPrice', maxPrice);
      queryParams.append('page', pageFromUrl); // Always include the current page for pagination
      queryParams.append('limit', 12); // Define the number of products per page

      // Construct the full API URL with all query parameters
      const url = `https://jora-mall-backend.onrender.com/api/products?${queryParams.toString()}`;
      const response = await fetch(url); // Perform the fetch request to the backend

      // Check if the HTTP response was successful (status code 200-299)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`); // Throw an error for unsuccessful responses
      }
      const data = await response.json(); // Parse the JSON response body
      setProducts(data.products); // Update the products state with the fetched data
      setTotalPages(data.totalPages); // Update the totalPages state for pagination controls
    } catch (err) {
      setError(err.message); // Set the error state with the error message
      console.error('Error in fetchProducts:', err); // Log the error to the console
    } finally {
      setLoading(false); // Set loading to false once the fetch operation is complete (success or failure)
    }
  }, [searchTerm, selectedCategory, minPrice, maxPrice, searchParams, currentPage]); // Dependencies for useCallback

  // Effect to call `fetchProducts` whenever its dependencies change (on initial mount and filter/search changes)
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]); // `fetchProducts` is memoized, so this effect runs only when its internal dependencies change

  // Effect to fetch unique product categories for the category filter dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('https://jora-mall-backend.onrender.com/api/products'); // Fetch all products initially
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Extract unique categories from the fetched products
        const categories = [...new Set(data.products.map(product => product.category))];
        setAvailableCategories(['All', ...categories]); // Set available categories, including an "All" option
      } catch (err) {
        console.error("Failed to fetch categories:", err); // Log any errors during category fetch
      }
    };
    fetchCategories(); // Call the category fetch function
  }, []); // Empty dependency array ensures this effect runs only once on mount

  // Handlers for filter and search input changes: update state and reset page to 1
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', '1'); // Reset to first page
    setSearchParams(newSearchParams);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value === 'All' ? '' : e.target.value); // Use empty string for 'All' to match backend
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', '1'); // Reset to first page
    setSearchParams(newSearchParams);
  };

  const handleMinPriceChange = (e) => {
    setMinPrice(e.target.value);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', '1'); // Reset to first page
    setSearchParams(newSearchParams);
  };

  const handleMaxPriceChange = (e) => {
    setMaxPrice(e.target.value);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', '1'); // Reset to first page
    setSearchParams(newSearchParams);
  };

  // Handler to clear all applied filters and reset to the first page
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSearchParams(new URLSearchParams({ page: '1' })); // Clear all params and set page to 1
  };

  // Handler for changing pagination page numbers
  const handlePageChange = (pageNumber) => {
    const currentPageFromUrl = parseInt(searchParams.get('page')) || 1;
    // Only proceed if the page number is valid and different from the current page
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPageFromUrl) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('page', pageNumber.toString()); // Update the 'page' parameter in the URL
      setSearchParams(newSearchParams); // Apply the new search parameters
    }
  };

  // Handler for user logout
  const handleLogout = () => {
    logout(); // Call the logout function from AuthContext
    navigate('/login'); // Redirect to the login page after successful logout
  };

  // Function to render pagination buttons based on total pages
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPageButtons = 5; // Maximum number of pagination buttons to display at once
    const currentPageRender = parseInt(searchParams.get('page')) || 1; // Get current page for UI highlighting

    // Calculate the range of page numbers to show around the current page
    let startPage = Math.max(1, currentPageRender - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    // Adjust the start page if the end page is capped by totalPages, to fill `maxPageButtons`
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i} // Unique key for React list rendering
          onClick={() => handlePageChange(i)} // Call handler on click
          // Apply dynamic styling based on whether it's the current page
          className={`px-4 py-2 rounded-md ${currentPageRender === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors duration-200`}
        >
          {i}
        </button>
      );
    }
    return pageNumbers; // Return the array of page number buttons
  };

  // If there's an error fetching products, display an informative error message
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] text-red-700 p-4 rounded-lg shadow-md m-4 flex-col">
        <p className="font-bold">Error:</p> <p className="ml-2">{error}</p>
        <p className="mt-2">Please ensure your backend server is running at `https://jora-mall-backend.onrender.com` and your MongoDB URI is correct.</p>
        <Link to="/" className="mt-4 text-blue-700 hover:underline">Retry Home</Link>
      </div>
    );
  }

  // Select first 8 products for the "Top Selling Products" section
  const topSellingProducts = products.slice(0, 8);


  return (
    <div className="min-h-screen bg-[#000080] text-white font-inter">
      {/* Header section with site title, slogan, and main navigation */}
      <header className="text-center py-8 bg-gradient-to-r from-blue-800 to-indigo-900 rounded-b-xl shadow-lg mb-8">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Jora Mall</h1>
        <p className="text-xl text-blue-200 mt-2">Discover our amazing products!</p>
        <nav className="mt-4 flex flex-wrap justify-center space-x-2 sm:space-x-4">
          {/* Home button - always present */}
          <Link
            to="/"
            className="inline-block bg-indigo-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-indigo-600 transition-colors duration-300 shadow-md"
          >
            Home
          </Link>
          {/* Admin specific navigation links, only visible if user is logged in as 'admin' */}
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
          {/* Conditional rendering for logged-in vs. logged-out user navigation */}
          {user ? (
            <>
              {/* Welcome message and user-specific links for logged-in users */}
              <span className="py-2 px-4 text-yellow-100">Welcome, {user.username}!</span>
              <Link
                to="/my-orders"
                className="inline-block bg-purple-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-purple-600 transition-colors duration-300 shadow-md"
              >
                My Orders
              </Link>
              <button
                onClick={handleLogout} // Logout button
                className="inline-block bg-red-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-red-600 transition-colors duration-300 shadow-md"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Login and Register links for guests */}
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
          {/* Cart Icon - Always visible, displays number of items in the current cart (local or server) */}
          <Link
            to="/cart"
            className="relative inline-flex items-center bg-yellow-500 text-white py-2 px-4 sm:px-6 rounded-lg font-medium hover:bg-yellow-600 transition-colors duration-300 shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="ml-2 hidden sm:inline">Cart</span>
            {/* Display the number of items in the cart if there are any */}
            {cart.items && cart.items.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {cart.items.length}
              </span>
            )}
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Top Selling Products Section - displays a subset of products */}
        {topSellingProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">🔥 Top Selling Products</h2>
            <div className="flex overflow-x-auto pb-4 space-x-6 scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-blue-900">
              {topSellingProducts.map((product) => (
                <Link to={`/product/${product._id}`} key={product._id} className="flex-shrink-0 w-64">
                  <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 h-full flex flex-col">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-40 object-cover rounded-t-xl"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/400x300/E0E0E0/333333?text=Image+Not+Found';
                      }}
                    />
                    <div className="p-4 flex-grow flex flex-col">
                      <h3 className="text-lg font-semibold mb-1 truncate">{product.name}</h3>
                      <p className="text-sm text-blue-100 mb-2 line-clamp-2">{product.description}</p>
                      <div className="flex justify-between items-center mt-auto pt-2">
                        <span className="text-2xl font-bold text-yellow-300">${product.price.toFixed(2)}</span>
                        <span className="text-xs text-blue-200">Stock: {product.stock}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault(); // Prevent navigation from the Link component
                          if (product && product._id) {
                            // Call addToCart from AuthContext, passing product details for local cart consistency
                            addToCart(product._id, 1, {
                              name: product.name,
                              imageUrl: product.imageUrl,
                              price: product.price,
                            });
                          } else {
                            console.error('Attempted to add to cart with invalid product data:', product);
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

        {/* Conditional rendering based on loading state or product availability */}
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
                      <p className="text-gray-600 text-sm mb-3 flex-grow">{product.description.substring(0, 100)}...</p>
                      <div className="flex justify-between items-center mt-auto pt-2">
                        <span className="text-2xl font-bold text-blue-600">${product.price.toFixed(2)}</span>
                        <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (product && product._id) {
                            addToCart(product._id, 1, {
                              name: product.name,
                              imageUrl: product.imageUrl,
                              price: product.price,
                            });
                          } else {
                            console.error('Attempted to add to cart with invalid product data:', product);
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

      {/* Footer section */}
      <footer className="text-center py-6 mt-8 text-blue-200 text-sm">
        <p>&copy; {new Date().getFullYear()} Jora Mall. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default ProductList;
