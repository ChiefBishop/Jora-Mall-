import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext'; // Import useAuth to access user, token, showCustomModal
import { useNavigate, Link } from 'react-router-dom'; // Import Link for navigation

function OrderManagementPage() {
  const { user, token, showCustomModal } = useAuth(); // Get user, token, showCustomModal from context
  const navigate = useNavigate(); // Hook for navigation

  const [orders, setOrders] = useState([]); // State to store all orders
  const [loading, setLoading] = useState(true); // State for loading indicator
  const [error, setError] = useState(null);     // State for error messages
  const [filterStatus, setFilterStatus] = useState('all'); // State for status filter

  // Function to format price as Naira
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
  };

  // Effect to fetch all orders (admin view)
  useEffect(() => {
    const fetchAllOrders = async () => {
      setLoading(true);
      setError(null);

      // Early exit if user is not an admin or token is missing
      if (!user || user.role !== 'admin' || !token) {
        showCustomModal('Unauthorized access. Redirecting to home.', () => {
          navigate('/');
        });
        setLoading(false);
        return;
      }

      try {
        let url = 'https://jora-mall-backend.onrender.com/api/orders'; // Base URL for fetching all orders
        if (filterStatus !== 'all') {
          url += `?status=${filterStatus}`; // Add status filter if not 'all'
        }
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`, // Authenticate with admin token
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setOrders(data); // Set fetched orders to state
      } catch (err) {
        console.error('Error fetching all orders:', err);
        setError(err.message);
        showCustomModal(`Failed to fetch orders: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    // Only attempt to fetch orders if the user is confirmed to be an admin
    if (user && user.role === 'admin') {
      fetchAllOrders();
    } else {
      // If user is not admin and useEffect tries to run, show access denied
      if (!loading && !error && !user) { // Prevent showing multiple modals/redirects
          showCustomModal('Unauthorized access. Please log in as an administrator.', () => {
              navigate('/');
          });
      }
    }
  }, [user, token, navigate, showCustomModal, filterStatus]); // Re-fetch on user/token/filterStatus change

  // Function to update order status (admin action)
  const handleUpdateStatus = async (orderId, newStatus) => {
    if (!token) {
      showCustomModal('You are not authorized. Please log in.', () => navigate('/login'));
      return;
    }
    if (!user || user.role !== 'admin') {
      showCustomModal('Access Denied. Only administrators can update order status.');
      return;
    }

    try {
      const response = await fetch(`https://jora-mall-backend.onrender.com/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order status.');
      }

      const updatedOrder = await response.json();
      // Optimistically update the state with the new status
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order._id === orderId ? { ...order, status: updatedOrder.status } : order
        )
      );
      showCustomModal(`Order ${orderId} status updated to ${newStatus}.`);
    } catch (err) {
      console.error('Error updating order status:', err);
      showCustomModal(`Failed to update order status: ${err.message}`);
    }
  };

  // Render different UIs based on loading, error, access denied, or no orders
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-white text-gray-800 p-8 rounded-xl shadow-lg text-center">
          <p className="text-2xl font-semibold mb-4">Loading all orders...</p>
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
          <p className="mt-4">Please ensure you are logged in as an administrator and the backend is running.</p>
          <Link to="/" className="mt-4 text-blue-700 hover:underline">Go to Home</Link>
        </div>
      </div>
    );
  }

  // If not admin, or initial check failed for auth, show access denied
  // This specifically caters to cases where the initial `user` state might be null before auth check completes
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4 text-white">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative m-4 text-center">
          <p className="font-bold">Access Denied!</p>
          <p className="block sm:inline ml-2">You do not have administrative privileges to view this page.</p>
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
          <p className="text-lg mb-6">There are no orders to manage at this time.</p>
          <Link to="/" className="bg-blue-500 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-300 shadow-md">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Main render for Order Management Page
  return (
    <div className="min-h-screen bg-[#000080] p-4 sm:p-8 text-white">
      <header className="text-center py-8 bg-gradient-to-r from-blue-800 to-indigo-900 rounded-b-xl shadow-lg mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">Order Management</h1>
        <p className="text-xl text-blue-200 mt-2">Manage all customer orders.</p>
      </header>

      <main className="container mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-gray-800">
          <div className="mb-6 flex justify-end">
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mr-2 self-center">Filter by Status:</label>
            <select
              id="statusFilter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="mt-1 block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="space-y-8">
            {orders.map(order => (
              <div key={order._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-2">
                  <h3 className="text-xl font-bold text-blue-700 mb-2 sm:mb-0">Order ID: {order._id}</h3>
                  <div className="flex items-center space-x-2">
                    {/* Display current status */}
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold
                      ${order.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                        order.status === 'completed' ? 'bg-green-200 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-200 text-blue-800' :
                        order.status === 'delivered' ? 'bg-purple-200 text-purple-800' :
                        order.status === 'cancelled' ? 'bg-red-200 text-red-800' :
                        'bg-gray-200 text-gray-800'}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    {/* Dropdown to change status */}
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                      className="ml-2 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <p className="text-gray-600 mb-2"><strong>Ordered By:</strong> {order.user ? order.user.username : 'N/A'} ({order.user ? order.user.email : 'N/A'})</p>
                <p className="text-gray-600 mb-2"><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
                <p className="text-gray-600 mb-2"><strong>Total Amount:</strong> <span className="font-bold text-lg">{formatPrice(order.totalAmount)}</span></p> {/* Currency Updated */}
                <p className="text-gray-600 mb-4"><strong>Payment Status:</strong> <span className="capitalize">{order.paymentStatus}</span></p>
                {order.paystackReference && <p className="text-gray-600 mb-4"><strong>Paystack Ref:</strong> {order.paystackReference}</p>}


                <h4 className="font-semibold mb-2">Items:</h4>
                <ul className="space-y-1 pl-4 mb-4 text-gray-700">
                  {order.items.map(item => (
                    // Use item.product as key if item itself isn't a full product object
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

export default OrderManagementPage;
