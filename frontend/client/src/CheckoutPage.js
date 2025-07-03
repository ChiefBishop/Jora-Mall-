import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth to get user, token, cart, showCustomModal, clearCart, fetchWalletBalance

function CheckoutPage() {
  const { user, token, cart, clearCart, showCustomModal, fetchWalletBalance } = useAuth(); // Get necessary context values
  const navigate = useNavigate(); // Hook for navigation

  // State for delivery address form
  const [deliveryInfo, setDeliveryInfo] = useState({
    fullName: user?.username || '', // Pre-fill with username if available (using optional chaining)
    email: user?.email || '',       // Pre-fill with email if available
    address: '',
    city: '',
    postalCode: '',
    country: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('paystack'); // Default payment method
  const [loading, setLoading] = useState(false); // State for loading indicator during checkout process
  const [error, setError] = useState(null);     // State for displaying error messages

  // --- IMPORTANT: This URL is for your DEPLOYED backend ---
  // If you redeploy your backend and its URL changes, you MUST update it here.
  const backendBaseUrl = 'https://jora-mall-web-backend.onrender.com';

  // Function to format price as Naira
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
  };

  // Effect to handle initial checks: cart empty or user not logged in
  useEffect(() => {
    // Stringify cart.items to ensure effect only re-runs if cart content changes, not just reference
    if (!cart || !cart.items || cart.items.length === 0) {
      showCustomModal('Your cart is empty. Please add items before checking out.', () => {
        navigate('/cart'); // Redirect to cart page
      });
      return; // Exit early
    }
    // Also handle case where user somehow lands here without being logged in (though ProtectedRoute should catch this)
    if (!user || !token) {
      showCustomModal('You must be logged in to proceed to checkout.', () => {
        navigate('/login'); // Redirect to login page
      });
      return; // Exit early
    }
    // Fetch wallet balance when component mounts or user/token changes
    fetchWalletBalance(token);
  }, [JSON.stringify(cart.items), user, token, navigate, showCustomModal, fetchWalletBalance]); // Dependencies include stringified cart items for content change detection


  // Handle input changes for delivery information form
  const handleDeliveryInfoChange = (e) => {
    const { name, value } = e.target;
    setDeliveryInfo(prevInfo => ({
      ...prevInfo,
      [name]: value,
    }));
  };

  // Function to initiate Paystack payment by calling your backend
  const initiatePaystackPayment = async (orderId, amount, customerEmail) => {
    setLoading(true); // Set loading state while payment initiation is in progress
    setError(null);   // Clear any previous errors

    try {
      // Step 1: Call your backend API to initialize the Paystack transaction
      const response = await fetch(`${backendBaseUrl}/api/paystack/initialize`, { // Using deployed backend URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Authenticate the request with JWT token
        },
        body: JSON.stringify({
          amount: amount * 100, // Paystack expects amount in kobo (Nigerian cents), so multiply by 100
          email: customerEmail,
          orderId: orderId, // Pass the internal order ID created on your backend
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initialize Paystack transaction.');
      }

      const { authorizationUrl } = await response.json(); // Get the authorization URL from Paystack
      console.log('Paystack authorization URL:', authorizationUrl);

      // Step 2: Redirect the user's browser to the Paystack payment page
      window.location.href = authorizationUrl;

      // Note: No `setLoading(false)` here, as the page will immediately redirect.
      // The rest of the success flow (e.g., clearing cart, showing confirmation)
      // happens on the `OrderConfirmationPage` after Paystack redirects back.

    } catch (err) {
      console.error('Error initiating Paystack payment:', err);
      setError(err.message); // Set error message
      showCustomModal(`Paystack payment initiation failed: ${err.message}`); // Show error to user
      setLoading(false); // Reset loading state if an error prevents redirection
    }
  };


  // Main handler for the checkout submission
  const handleCheckout = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setLoading(true);   // Set loading state
    setError(null);     // Clear previous errors

    // --- Frontend Validation ---
    if (!deliveryInfo.fullName || !deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.postalCode || !deliveryInfo.country) {
      showCustomModal('Please fill in all delivery information fields.');
      setLoading(false);
      return;
    }

    if (!user || !token) {
      showCustomModal('You must be logged in to complete checkout. Please log in or register.', () => {
        navigate('/login');
      });
      setLoading(false);
      return;
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      showCustomModal('Your cart is empty. Please add items before checking out.', () => {
        navigate('/cart');
      });
      setLoading(false);
      return;
    }

    // NEW: Wallet payment specific validation
    if (paymentMethod === 'wallet' && (!user.walletBalance || user.walletBalance < cart.totalAmount)) {
      showCustomModal('Insufficient wallet balance. Please add funds or choose another payment method.');
      setLoading(false);
      return;
    }
    // --- End Frontend Validation ---

    try {
      // Step 1: Create the order on your backend API
      const orderResponse = await fetch(`${backendBaseUrl}/api/orders`, { // Using deployed backend URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Authenticate the request
        },
        body: JSON.stringify({
          items: cart.items.map(item => ({
            // Ensure product ID is used, whether from `product._id` or `product` directly (for local cart items)
            product: item.product._id || item.product,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
            imageUrl: item.imageUrl
          })),
          totalAmount: cart.totalAmount,
          shippingAddress: deliveryInfo,
          paymentMethod: paymentMethod, // Pass the selected payment method to the backend
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'Failed to create order on backend.');
      }

      const orderData = await orderResponse.json();
      console.log('Order created successfully on backend:', orderData);

      // Step 2: Handle payment based on selected method
      if (paymentMethod === 'paystack') {
        await initiatePaystackPayment(orderData.order._id, orderData.order.totalAmount, user.email);
      } else if (paymentMethod === 'wallet') {
        // If payment was handled by wallet on backend, navigate to confirmation page directly
        // Backend already deducted funds and updated order status
        showCustomModal('Payment successful via wallet!', () => {
          clearCart(); // Clear cart after successful wallet payment
          fetchWalletBalance(token); // Refresh wallet balance after deduction
          navigate('/order-confirmation', { state: { orderId: orderData.order._id } }); // Pass order ID for confirmation page
        }, 3000); // Auto-dismiss after 3 seconds
      }

      // IMPORTANT: The page will redirect to Paystack if paymentMethod is 'paystack'.
      // If paymentMethod is 'wallet', the modal and navigation above handle it.
      // Do NOT clear cart or navigate here for Paystack path. That's handled by Paystack verification
      // on the OrderConfirmationPage once the payment is confirmed.

    } catch (err) {
      console.error('Error during checkout process:', err);
      setError(err.message); // Set form error
      showCustomModal(`Checkout failed: ${err.message}`); // Show modal error
      setLoading(false); // Reset loading state if the process fails before redirection
    }
  };

  // Render a loading/redirect message if cart is empty, user is not logged in, or during initial checks.
  // This prevents the flickering by providing a stable UI during transient states.
  if (!cart || !cart.items || cart.items.length === 0 || !user || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-white text-gray-800 p-8 rounded-xl shadow-lg text-center">
          <p className="text-2xl font-semibold mb-4">Redirecting or checking cart status...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  // Main render for the Checkout Page
  return (
    <div className="min-h-screen bg-[#000080] p-4 sm:p-8 text-white">
      <header className="text-center py-8 bg-gradient-to-r from-blue-800 to-indigo-900 rounded-b-xl shadow-lg mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">Checkout</h1>
        <p className="text-xl text-blue-200 mt-2">Complete your purchase</p>
      </header>

      <main className="container mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-gray-800">
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">Delivery Information & Payment</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline ml-2">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Order Summary Section */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Order Summary</h3>
              <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                {cart.items.map(item => (
                  <div key={item.product._id || item.product} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{item.name} (x{item.quantity})</span>
                    <span className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatPrice(cart.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Information Form */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Delivery Details</h3>
              <form onSubmit={handleCheckout} className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={deliveryInfo.fullName}
                    onChange={handleDeliveryInfoChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={deliveryInfo.email}
                    onChange={handleDeliveryInfoChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                    readOnly={!!user && !!user.email} // Make email read-only if user is logged in and has an email
                  />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={deliveryInfo.address}
                    onChange={handleDeliveryInfoChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={deliveryInfo.city}
                      onChange={handleDeliveryInfoChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">Postal Code</label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      value={deliveryInfo.postalCode}
                      onChange={handleDeliveryInfoChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country</label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={deliveryInfo.country}
                      onChange={handleDeliveryInfoChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* NEW: Payment Method Selection */}
                <div className="mt-6">
                  <h3 className="text-xl font-semibold mb-3 text-gray-800">Select Payment Method</h3>
                  <div className="space-y-3">
                    {/* Paystack Option */}
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="paystack"
                        name="paymentMethod"
                        value="paystack"
                        checked={paymentMethod === 'paystack'}
                        onChange={() => setPaymentMethod('paystack')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="paystack" className="ml-3 block text-base font-medium text-gray-700">
                        Pay with Card / Bank Transfer (via Paystack)
                      </label>
                    </div>

                    {/* Wallet Option */}
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="wallet"
                        name="paymentMethod"
                        value="wallet"
                        checked={paymentMethod === 'wallet'}
                        onChange={() => setPaymentMethod('wallet')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        // Disable wallet option if user is not logged in or has insufficient balance
                        disabled={!user || (user.walletBalance || 0) < cart.totalAmount}
                      />
                      <label htmlFor="wallet" className="ml-3 block text-base font-medium text-gray-700">
                        Pay with Wallet (Balance: {formatPrice(user?.walletBalance || 0)})
                        {(!user || (user.walletBalance || 0) < cart.totalAmount) && (
                          <span className="text-sm text-red-500 ml-2">
                            (Insufficient funds or not logged in)
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                </div>


                {/* Payment button */}
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300 shadow-md flex items-center justify-center"
                  // Disable button if loading, cart empty, or user not logged in
                  disabled={loading || !cart.items.length || !user}
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : `Complete Order with ${paymentMethod === 'wallet' ? 'Wallet' : 'Paystack'}`}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 mt-8 text-blue-200 text-sm">
        <p>&copy; {new Date().getFullYear()} Jora Mall. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default CheckoutPage;
