import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth to access user, token, showCustomModal

function OrderHistoryPage() {
  const { user, token, showCustomModal } = useAuth(); // Get user, token, showCustomModal from context
  const navigate = useNavigate(); // Hook for navigation

  const [orders, setOrders] = useState([]); // State to store user's orders
  const [loading, setLoading] = useState(true); // State for loading indicator
  const [error, setError] = useState(null);     // State for error messages

  // Function to format price as Naira
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
  };

  // Effect to fetch user's order history when component mounts or token changes
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);

      // If no token, user is not logged in, redirect to login page
      if (!token) {
        showCustomModal('You must be logged in to view your order history.', () => {
          navigate('/login');
        });
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('https://jora-mall-web-backend.onrender.com/api/orders/my-orders', {
          headers: {
            'Authorization': `Bearer ${token}`, // Authenticate request with user's token
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setOrders(data); // Set the fetched orders to state
      } catch (err) {
        console.error('Error fetching order history:', err);
        setError(err.message);
        showCustomModal(`Failed to fetch order history: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token, navigate, showCustomModal]); // Dependencies: re-fetch if token changes or navigation/modal function changes

  // Render different UIs based on loading, error, or no orders found
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-white text-gray-800 p-8 rounded-xl shadow-lg text-center">
          <p className="text-2xl font-semibold mb-4">Loading your order history...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative m-4 text-center">
          <p className="font-bold">Error loading orders:</p>
          <p className="block sm:inline ml-2">{error}</p>
          <p className="mt-4">Please try again later.</p>
          <Link to="/" className="mt-4 text-blue-700 hover:underline">Go to Home</Link>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-white text-gray-800 p-8 rounded-xl shadow-lg text-center">
          <p className="text-2xl font-semibold mb-4">No orders found.</p>
          <p className="text-lg mb-6">It looks like you haven't placed any orders yet.</p>
          <Link to="/" className="bg-blue-500 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-300 shadow-md">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  // Render the list of orders
  return (
    <div className="min-h-screen bg-[#000080] p-4 sm:p-8 text-white">
      <header className="text-center py-8 bg-gradient-to-r from-blue-800 to-indigo-900 rounded-b-xl shadow-lg mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">My Order History</h1>
        <p className="text-xl text-blue-200 mt-2">View details of your past purchases.</p>
      </header>

      <main className="container mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-gray-800">
          <div className="space-y-8">
            {orders.map(order => (
              <div key={order._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="text-xl font-bold text-blue-700">Order ID: {order._id}</h3>
                  {/* Display order status with dynamic styling */}
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold
                    ${order.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                      order.status === 'completed' ? 'bg-green-200 text-green-800' :
                      order.status === 'shipped' ? 'bg-blue-200 text-blue-800' :
                      order.status === 'delivered' ? 'bg-purple-200 text-purple-800' :
                      order.status === 'cancelled' ? 'bg-red-200 text-red-800' :
                      'bg-gray-200 text-gray-800'}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)} {/* Capitalize first letter */}
                  </span>
                </div>
                <p className="text-gray-600 mb-2"><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
                <p className="text-gray-600 mb-2"><strong>Total Amount:</strong> <span className="font-bold text-lg">{formatPrice(order.totalAmount)}</span></p> {/* Currency Updated */}
                <p className="text-gray-600 mb-4"><strong>Payment Status:</strong> <span className="capitalize">{order.paymentStatus}</span></p>
                {order.paystackReference && <p className="text-gray-600 mb-4"><strong>Paystack Ref:</strong> {order.paystackReference}</p>}


                <h4 className="font-semibold mb-2">Items:</h4>
                <ul className="space-y-1 pl-4 mb-4 text-gray-700">
                  {order.items.map(item => (
                    <li key={item.product}>
                      {item.name} (x{item.quantity}) - {formatPrice(item.price)} each
                    </li>
                  ))}
                </ul>

                <h4 className="font-semibold mb-2">Shipping Address:</h4>
                <div className="bg-white p-3 rounded-md border border-gray-100">
                  <p>{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.address}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center py-6 mt-8 text-blue-200 text-sm">
        <p>&copy; {new Date().getFullYear()} Jora Mall. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default OrderHistoryPage;
