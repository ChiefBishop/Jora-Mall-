import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import useAuth hook to access cart data and actions

function CartPage() {
  // Destructure cart state, and cart actions from AuthContext, plus user for conditional logic and showCustomModal
  const { cart, updateCartQuantity, removeFromCart, clearCart, user, showCustomModal } = useAuth();
  const navigate = useNavigate(); // Hook for programmatic navigation

  // Function to format price as Naira
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
  };

  // Handler for "Proceed to Checkout" button click
  const handleProceedToCheckout = () => {
    if (user) {
      // If user is logged in, navigate to the checkout page
      navigate('/checkout');
    } else {
      // If user is not logged in, show a modal prompting them to log in/register
      showCustomModal('Please log in or register to proceed to checkout.', () => {
        navigate('/login'); // Redirect to login page after modal is acknowledged
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#000080] p-4 sm:p-8 text-white">
      {/* Page Header */}
      <header className="text-center py-8 bg-gradient-to-r from-blue-800 to-indigo-900 rounded-b-xl shadow-lg mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">Your Shopping Cart</h1>
        <p className="text-xl text-blue-200 mt-2">Review your selected items before checkout.</p>
      </header>

      <main className="container mx-auto px-4">
        {/* Conditional rendering: if cart is empty */}
        {cart.items.length === 0 ? (
          <div className="bg-white text-gray-800 p-8 rounded-xl shadow-lg text-center">
            <p className="text-2xl font-semibold mb-4">Your cart is empty!</p>
            <p className="text-lg mb-6">Looks like you haven't added anything to your cart yet.</p>
            {/* Link to home page to start shopping */}
            <Link to="/" className="bg-blue-500 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-300 shadow-md">
              Start Shopping
            </Link>
          </div>
        ) : (
          /* If cart has items, display cart content */
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <div className="space-y-6">
              {/* Map over cart items and render each item */}
              {cart.items.map((item) => (
                <div key={item.product} className="flex flex-col sm:flex-row items-center border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                  {/* Link to product detail page */}
                  <Link to={`/product/${item.product}`} className="flex-shrink-0 mr-4 mb-4 sm:mb-0">
                    <img
                      src={item.imageUrl || 'https://placehold.co/100x100/E0E0E0/333333?text=No+Image'} // Fallback image
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-md shadow-sm"
                      onError={(e) => {
                        e.target.onerror = null; // Prevent infinite loop on error
                        e.target.src = 'https://placehold.co/100x100/E0E0E0/333333?text=No+Image'; // Set fallback image
                      }}
                    />
                  </Link>
                  <div className="flex-grow text-gray-800">
                    <h2 className="text-xl font-semibold">{item.name}</h2>
                    <p className="text-gray-600">Price: {formatPrice(item.price)}</p> {/* Currency Updated */}
                    <div className="flex items-center mt-2">
                      <label htmlFor={`quantity-${item.product}`} className="mr-2 text-sm">Quantity:</label>
                      <input
                        type="number"
                        id={`quantity-${item.product}`}
                        min="1"
                        value={item.quantity}
                        // Update quantity in state when input changes
                        onChange={(e) => updateCartQuantity(item.product, parseInt(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end items-center mt-4 sm:mt-0">
                    <span className="text-lg font-bold text-gray-800">Subtotal: {formatPrice(item.price * item.quantity)}</span> {/* Currency Updated */}
                    <button
                      onClick={() => removeFromCart(item.product)} // Call removeFromCart action
                      className="bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 transition-colors duration-300 text-sm shadow-sm mt-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary and Actions */}
            <div className="border-t border-gray-300 pt-6 mt-6 flex flex-col sm:flex-row justify-between items-center text-gray-800">
              <h3 className="text-2xl font-bold mb-4 sm:mb-0">Total: {formatPrice(cart.totalAmount)}</h3> {/* Currency Updated */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <button
                  onClick={clearCart} // Call clearCart action
                  className="w-full sm:w-auto bg-gray-300 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-300 shadow-md"
                >
                  Clear Cart
                </button>
                <button
                  onClick={handleProceedToCheckout} // Use the conditional handler
                  className="w-full sm:w-auto bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300 shadow-md text-center"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Link to continue shopping */}
        <Link to="/" className="block mt-8 text-center text-blue-300 hover:underline">
          &larr; Continue Shopping
        </Link>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 mt-8 text-blue-200 text-sm">
        <p>&copy; {new Date().getFullYear()} Jora Mall. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default CartPage; // Export the CartPage component
