import React, { useEffect, useState, useRef } from 'react'; // Added useRef
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth to access token, clearCart, showCustomModal

function OrderConfirmationPage() {
  const { token, clearCart, showCustomModal } = useAuth(); // Get token, clearCart, showCustomModal from context
  const location = useLocation(); // Hook to access URL's query parameters (where Paystack sends reference)
  const navigate = useNavigate(); // Hook for navigation

  const [order, setOrder] = useState(null);     // State to store fetched order details after verification
  const [loading, setLoading] = useState(true); // State for loading indicator during verification
  const [error, setError] = useState(null);     // State for error messages

  // New ref to track if verification has already been attempted/completed
  // Using useRef to prevent re-renders when this value changes, and to persist across renders
  const hasVerifiedPaymentRef = useRef(false);

  // Function to format price as Naira
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
  };

  // useEffect to handle payment verification when the component mounts or token changes
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const reference = queryParams.get('reference'); // Get Paystack transaction reference from the URL query string

    // IMPORTANT: Check the ref to ensure verification only runs once per component mount
    if (hasVerifiedPaymentRef.current) {
      console.log('OrderConfirmationPage: Verification already attempted, skipping.');
      setLoading(false); // Ensure loading is off if already verified
      return; // Exit the effect if already processed
    }

    // If no reference is found in the URL, it means the page was accessed incorrectly or payment wasn't initiated
    if (!reference) {
      console.log('OrderConfirmationPage: No payment reference found in URL.');
      showCustomModal('No payment reference found. Your order could not be confirmed.', () => {
        navigate('/cart'); // Redirect to cart or home
      });
      setLoading(false); // Stop loading, as there's nothing to verify
      return; // Exit the effect
    }

    // Ensure a token exists before attempting to verify payment with the backend
    if (!token) {
        console.log('OrderConfirmationPage: No token found, redirecting to login.');
      showCustomModal('You must be logged in to confirm your order.', () => {
        navigate('/login'); // Redirect to login if not authenticated
      });
      setLoading(false);
      return; // Exit function if no token
    }

    // Set the flag to true to prevent future re-runs of this effect for verification
    hasVerifiedPaymentRef.current = true;
    setLoading(true); // Explicitly set loading to true when starting verification
    setError(null); // Clear any previous errors

    // Function to send the verification request to your backend
    const verifyPayment = async () => {
      console.log('OrderConfirmationPage: Initiating payment verification for reference:', reference);
      try {
        // Send a POST request to your backend's Paystack verification endpoint
        const response = await fetch('https://jora-mall-backend.onrender.com/api/paystack/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // Authenticate the request with user's JWT token
          },
          body: JSON.stringify({ reference }), // Send the Paystack transaction reference
        });

        // Check if the backend response was successful
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Payment verification failed on server.');
        }

        const data = await response.json(); // Parse the successful response
        console.log('OrderConfirmationPage: Payment verification successful, response data:', data);

        // Check if the backend confirmed the order status
        if (data.order && data.order.status === 'completed' && data.order.paymentStatus === 'paid') {
          setOrder(data.order); // Set the confirmed order details in state
          clearCart(); // Clear the user's cart in the frontend context
          // Use auto-dismiss modal for success confirmation
          showCustomModal('Your order has been successfully placed!', () => {
            // Optional: navigate to order history after acknowledging confirmation
            // navigate('/my-orders');
          }, 3000); // Auto-dismiss after 3 seconds
        } else {
          // If verification succeeded but order status is not as expected
          throw new Error(data.message || 'Order status not confirmed as completed. Please check your order history.');
        }

      } catch (err) {
        console.error('OrderConfirmationPage: Error during payment verification:', err);
        setError(err.message); // Set error state
        // For errors, it's better to keep the modal with an OK button for user acknowledgement
        showCustomModal(`Order confirmation failed: ${err.message}`, () => {
          navigate('/my-orders'); // Redirect to order history to allow user to check manually
        });
      } finally {
        setLoading(false); // Ensure loading state is turned off after fetch
      }
    };

    // Only trigger verification if all conditions are met
    verifyPayment();

  }, [location.search, token, navigate, clearCart, showCustomModal]); // Dependencies for this effect

  // Render different UIs based on loading, error, or success states

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-white text-gray-800 p-8 rounded-xl shadow-lg text-center">
          <p className="text-2xl font-semibold mb-4">Verifying your payment and confirming order...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative m-4 text-center">
          <p className="font-bold">Error:</p>
          <p className="block sm:inline ml-2">{error}</p>
          <p className="mt-4">Please check your <Link to="/my-orders" className="text-blue-800 hover:underline">Order History</Link> for updates or contact support.</p>
        </div>
      </div>
    );
  }

  // If verification completed but no order data is set (e.g., failed silently or redirect issue)
  if (!order) {
    // This case should ideally be caught by error handling or `!reference` check.
    // If it still happens, it indicates an unexpected state.
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-white text-gray-800 p-8 rounded-xl shadow-lg text-center">
          <p className="text-2xl font-semibold mb-4">No order details found.</p>
          <p className="text-lg mb-6">Something went wrong or your order was not successfully processed.</p>
          <Link to="/" className="bg-blue-500 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-300 shadow-md">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Render the confirmed order details
  return (
    <div className="min-h-screen bg-[#000080] p-4 sm:p-8 text-white">
      <header className="text-center py-8 bg-gradient-to-r from-blue-800 to-indigo-900 rounded-b-xl shadow-lg mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">Order Confirmed!</h1>
        <p className="text-xl text-blue-200 mt-2">Thank you for your purchase.</p>
      </header>

      <main className="container mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-gray-800">
          <h2 className="text-2xl font-bold mb-6 text-center text-green-700">Order #{order._id}</h2>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Order Details</h3>
            <div className="space-y-2">
              <p><strong>Status:</strong> <span className="text-green-600 font-medium capitalize">{order.status}</span></p>
              <p><strong>Total Amount:</strong> <span className="font-bold text-blue-700">{formatPrice(order.totalAmount)}</span></p>
              <p><strong>Payment Status:</strong> <span className="capitalize">{order.paymentStatus}</span></p>
              <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
              {order.paystackReference && <p><strong>Paystack Ref:</strong> {order.paystackReference}</p>}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Items Ordered</h3>
            <div className="space-y-3">
              {order.items.map(item => (
                <div key={item.product} className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-gray-700">{item.name} (x{item.quantity})</span>
                  <span className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Shipping Address</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-1">
              <p>{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.address}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>

          <div className="text-center mt-8 space-y-4">
            <Link to="/my-orders" className="bg-purple-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-purple-700 transition-colors duration-300 shadow-md block max-w-xs mx-auto">
              View My Orders
            </Link>
            <Link to="/" className="text-blue-600 hover:underline block max-w-xs mx-auto">
              Continue Shopping
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

export default OrderConfirmationPage;
