// client/src/WalletPage.js

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth to access user, token, fetchWalletBalance, showCustomModal

function WalletPage() {
  const { user, token, fetchWalletBalance, showCustomModal } = useAuth();
  const navigate = useNavigate();

  const [amountToAdd, setAmountToAdd] = useState(''); // State for amount to add to wallet
  const [loading, setLoading] = useState(false);     // State for loading indicator
  const [error, setError] = useState(null);         // State for error messages
  const [showBalance, setShowBalance] = useState(true); // NEW: State to toggle balance visibility

  // --- IMPORTANT: This URL is for your DEPLOYED backend ---
  const backendBaseUrl = 'https://jora-mall-backend.onrender.com';

  // Function to format price as Naira
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
  };

  // Effect to fetch wallet balance when component mounts or token changes
  useEffect(() => {
    // If not logged in, redirect to login
    if (!token) {
      showCustomModal('You must be logged in to access your wallet.', () => {
        navigate('/login');
      });
      return;
    }
    // Fetch balance when component mounts or token changes
    fetchWalletBalance(token);
  }, [token, navigate, fetchWalletBalance, showCustomModal]);


  // Handle adding funds via Paystack
  const handleAddFunds = async (e) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(amountToAdd);
    if (isNaN(amount) || amount <= 0) {
      showCustomModal('Please enter a valid positive amount.');
      return;
    }

    if (!user || !token) {
      showCustomModal('You must be logged in to add funds.', () => navigate('/login'));
      return;
    }

    setLoading(true);

    try {
      // Step 1: Initialize Paystack transaction on backend
      const response = await fetch(`${backendBaseUrl}/api/wallet/initialize-add-funds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initialize fund addition.');
      }

      const { authorizationUrl } = await response.json();
      console.log('Paystack authorization URL for wallet top-up:', authorizationUrl);

      // Step 2: Redirect to Paystack
      window.location.href = authorizationUrl;

      // Note: Loading state will be reset on redirect, or handled by the next page.
    } catch (err) {
      console.error('Error adding funds to wallet:', err);
      setError(err.message);
      showCustomModal(`Failed to add funds: ${err.message}`);
      setLoading(false);
    }
  };

  // If user or token is not available yet, show loading or redirect message
  if (!user || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-white text-gray-800 p-8 rounded-xl shadow-lg text-center">
          <p className="text-2xl font-semibold mb-4">Loading wallet or redirecting...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000080] p-4 sm:p-8 text-white font-inter">
      <header className="text-center py-8 bg-gradient-to-r from-blue-800 to-indigo-900 rounded-b-xl shadow-lg mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">My Wallet</h1>
        <p className="text-xl text-blue-200 mt-2">Manage your Jora Mall funds.</p>
      </header>

      <main className="container mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-gray-800">
          <div className="flex justify-center items-center mb-6">
            <h2 className="text-2xl font-bold text-center text-blue-700 mr-4">
              Current Balance: {showBalance ? formatPrice(user.walletBalance || 0) : '********'}
            </h2>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200"
              title={showBalance ? 'Hide Balance' : 'Show Balance'}
            >
              {showBalance ? (
                // Eye-slash icon for hide
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.293 3.293m7.532 7.532l3.293-3.293M3 3l3.594 3.594m-2.25 2.25L9.293 12l-2.293 2.293m7.532 7.532L21 3" />
                </svg>
              ) : (
                // Eye icon for show
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline ml-2">{error}</span>
            </div>
          )}

          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Add Funds to Wallet</h3>
            <form onSubmit={handleAddFunds} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (NGN)</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={amountToAdd}
                  onChange={(e) => setAmountToAdd(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 5000"
                  min="1"
                  step="any" // Allows decimal amounts if needed, though currency usually two decimal places
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-300 shadow-md flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Add Funds via Paystack'}
              </button>
            </form>
          </div>

          <div className="text-center mt-8">
            <Link to="/" className="text-blue-600 hover:underline">
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 mt-8 text-blue-200 text-sm">
        <p>&copy; {new Date().getFullYear()} Jora Mall. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default WalletPage;
