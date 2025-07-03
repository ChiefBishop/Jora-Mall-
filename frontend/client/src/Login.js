import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth to access login function and showCustomModal

function Login() {
  const [email, setEmail] = useState('');     // State for email input
  const [password, setPassword] = useState(''); // State for password input
  const [loading, setLoading] = useState(false); // State for loading indicator during login
  const [error, setError] = useState(null);     // State for displaying login errors

  const { login, showCustomModal } = useAuth(); // Destructure login function and showCustomModal from context
  const navigate = useNavigate();               // Hook for programmatic navigation

  // Handler for form submission (login attempt)
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default browser form submission
    setLoading(true);   // Set loading state to true
    setError(null);     // Clear any previous error messages

    try {
      // Send login request to your backend API
      const response = await fetch('https://jora-mall-backend.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Specify content type as JSON
        },
        body: JSON.stringify({ email, password }), // Send email and password in the request body
      });

      // Check if the login request was successful (HTTP status 2xx)
      if (!response.ok) {
        // If not successful, parse the error response from the backend
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed. Please check your credentials.');
      }

      // If login is successful, parse the success response
      const data = await response.json();
      console.log('Login successful:', data);

      // Call the login function from AuthContext to update global state and localStorage
      login(data.user, data.token);

      // Show a success modal that automatically dismisses after 2 seconds (2000 milliseconds)
      showCustomModal('Login successful!', () => {
        navigate('/'); // Redirect to the home page after successful login
      }, 2000); // Auto-dismiss after 2 seconds

    } catch (err) {
      // Catch and handle any errors during the login process
      console.error('Login error:', err);
      setError(err.message); // Set the error message for display on the form
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#000080] p-4 font-inter">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-gray-800">
        <h2 className="text-3xl font-bold text-center text-blue-700 mb-6">Login to Jora Mall</h2>

        {/* Display error message if there's an error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300 shadow-md flex items-center justify-center"
            disabled={loading} // Disable button when loading
          >
            {loading ? (
              // Loading spinner SVG
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Login'}
          </button>
        </form>

        {/* Link to registration page */}
        <p className="mt-6 text-center text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">
            Register here
          </Link>
        </p>
      </div>

      <footer className="text-center py-6 mt-8 text-blue-200 text-sm">
        <p>&copy; {new Date().getFullYear()} Jora Mall. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Login; // Export the Login component
