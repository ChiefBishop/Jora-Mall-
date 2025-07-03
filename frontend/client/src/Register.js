import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth hook to access custom modal utility

function Register() {
  const navigate = useNavigate(); // Hook for programmatic navigation
  const { showCustomModal } = useAuth(); // Get custom modal utility from AuthContext

  // State to hold the form input values for username, email, and password
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  // State to manage the loading status during the registration API call
  const [loading, setLoading] = useState(false);
  // State to store and display any error messages from the registration process
  const [error, setError] = useState(null);
  // State to indicate successful registration (used for displaying a temporary message)
  const [success, setSuccess] = useState(false);

  // Handler for changes in the input fields. Updates the formData state.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value, // Dynamically update the field corresponding to the input's 'name' attribute
    }));
  };

  // Handler for the form submission. This function sends the registration request to the backend.
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior (page reload)
    setLoading(true); // Set loading state to true
    setError(null); // Clear any previous error messages
    setSuccess(false); // Clear previous success state

    try {
      // Send a POST request to your backend's registration API endpoint
      const response = await fetch('https://jora-mall-web-backend.onrender.com/api/auth/register', {
        method: 'POST', // HTTP method
        headers: {
          'Content-Type': 'application/json', // Specify that the request body is JSON
        },
        body: JSON.stringify(formData), // Convert formData object to a JSON string
      });

      // Check if the HTTP response was successful (status code 200-299)
      if (!response.ok) {
        // If not successful, parse the error response from the backend
        const errorData = await response.json();
        // Throw an error with the message provided by the backend, or a generic HTTP error message
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // If the response is successful, parse the success data (user info, token)
      const data = await response.json();
      console.log('Registration successful:', data);
      setSuccess(true); // Set success state to true

      // Show a success message using the custom modal
      showCustomModal('Registration successful! Please log in.', () => {
        navigate('/login'); // After the user clicks OK on the modal, navigate to the login page
      });

    } catch (err) {
      console.error('Error during registration:', err); // Log the detailed error to the console for debugging
      setError(err.message); // Set the error message to display on the form
      showCustomModal(`Registration failed: ${err.message}`); // Show the error message in the custom modal
    } finally {
      setLoading(false); // Reset loading state to false, whether registration succeeded or failed
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-6">Register Account</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username input field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required // HTML5 validation: field must not be empty
            />
          </div>
          {/* Email input field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required // HTML5 validation: field must not be empty
            />
          </div>
          {/* Password input field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required // HTML5 validation: field must not be empty
            />
          </div>

          {/* Display error message if the `error` state is not null */}
          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}
          {/* Display success message if the `success` state is true (will be short-lived due to redirect) */}
          {success && (
            <p className="text-green-600 text-sm text-center">Registration successful! Redirecting to login...</p>
          )}

          {/* Register button */}
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading} // Disable the button while an API call is in progress
          >
            {loading ? 'Registering...' : 'Register'} {/* Change button text based on loading state */}
          </button>
        </form>
        {/* Link to the login page for existing users */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register; // Export the Register component for use in App.js
