// client/src/AuthContext.js
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Create and EXPORT Auth Context to be consumed by other components
export const AuthContext = createContext(null);

// Auth Provider component that wraps your application and provides global state
export function AuthProvider({ children }) {
  // State for the authenticated user data
  const [user, setUser] = useState(null);
  // State for the JWT authentication token
  const [token, setToken] = useState(null);
  // State for the local cart (used when user is not authenticated)
  const [localCart, setLocalCart] = useState([]);
  // State for the server cart (used when user is authenticated)
  const [serverCart, setServerCart] = useState({ items: [], totalAmount: 0 });

  // --- IMPORTANT: This URL is for your DEPLOYED backend ---
  // If you redeploy your backend and its URL changes, you MUST update it here.
  const backendBaseUrl = 'https://jora-mall-web-backend.onrender.com';

  // Custom modal function to display messages to the user.
  // Now accepts an optional `autoDismissDuration` (in ms) to make it disappear automatically.
  const showCustomModal = useCallback((message, onConfirm = () => {}, autoDismissDuration = 0) => {
    // Remove any existing modals to prevent stacking
    const existingModal = document.getElementById('custom-modal-container');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }

    // Create the modal container element
    const modalElement = document.createElement('div');
    modalElement.id = 'custom-modal-container'; // Assign an ID for easy removal
    modalElement.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

    let modalContentHtml = `
      <div class="bg-white p-6 rounded-lg shadow-xl text-gray-800 max-w-sm w-full mx-4 text-center">
        <p class="text-lg font-semibold mb-4">${message}</p>
    `;

    // Only add an "OK" button if autoDismissDuration is 0 (i.e., manual dismissal)
    if (autoDismissDuration === 0) {
      modalContentHtml += `
        <button id="modal-confirm-btn" class="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition-colors">OK</button>
      `;
    }

    modalContentHtml += `</div>`;
    modalElement.innerHTML = modalContentHtml;

    // Append the modal to the document body
    document.body.appendChild(modalElement);

    // If autoDismissDuration is provided, set a timeout to remove the modal
    if (autoDismissDuration > 0) {
      setTimeout(() => {
        if (document.body.contains(modalElement)) {
          document.body.removeChild(modalElement);
        }
        onConfirm(); // Execute callback even for auto-dismissed modals
      }, autoDismissDuration);
    } else {
      // If no autoDismissDuration, set up click listener for the "OK" button
      const confirmBtn = modalElement.querySelector('#modal-confirm-btn');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          if (document.body.contains(modalElement)) {
            document.body.removeChild(modalElement);
          }
          onConfirm();
        });
      }
    }
  }, []); // Empty dependency array means this function definition is stable and won't change

  // Effect to load initial state from localStorage when the component mounts
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedLocalCart = localStorage.getItem('localCart');

    // Restore user and token if found in localStorage
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        console.error("AuthContext: Failed to parse stored user data from localStorage", e);
        // Clear corrupted data to prevent future errors
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    // Restore local cart if found in localStorage
    if (storedLocalCart) {
      try {
        // Ensure the parsed data is an array before setting
        const parsedCart = JSON.parse(storedLocalCart);
        if (Array.isArray(parsedCart)) {
          setLocalCart(parsedCart);
        } else {
          console.warn("AuthContext: Stored local cart was not an array, clearing.");
          localStorage.removeItem('localCart');
        }
      } catch (e) {
        console.error("AuthContext: Failed to parse stored local cart data from localStorage", e);
        // Clear corrupted data
        localStorage.removeItem('localCart');
      }
    }
  }, []); // Runs only once on component mount

  // Effect to synchronize the local cart state with localStorage whenever it changes
  useEffect(() => {
    // Only save if localCart is actually an array (to prevent saving initial null/undefined states)
    if (Array.isArray(localCart)) {
      localStorage.setItem('localCart', JSON.stringify(localCart));
    }
  }, [localCart]); // Re-runs whenever localCart state changes

  // Function to fetch the authenticated user's cart from the backend server
  const fetchServerCart = useCallback(async (authToken) => {
    // If no auth token is provided, clear server cart and return
    if (!authToken) {
      setServerCart({ items: [], totalAmount: 0 });
      return;
    }
    console.log('AuthContext fetchServerCart: Attempting to fetch cart with token.');
    try {
      const response = await fetch(`${backendBaseUrl}/api/cart`, { // Using deployed backend URL
        headers: {
          'Authorization': `Bearer ${authToken}`, // Include JWT token for authentication
        },
      });
      if (!response.ok) {
        // If the response is 401 (Unauthorized), it means the token is invalid or expired
        if (response.status === 401) {
          console.warn('AuthContext fetchServerCart: Token invalid/expired, forcing logout.');
          // Show a modal and then log out the user after they acknowledge
          showCustomModal('Your session has expired. Please log in again.', () => {
            logout(); // Calls the logout function defined below
          });
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('AuthContext fetchServerCart: Server cart fetched successfully.', data);
      setServerCart(data); // Update server cart state
      // After successfully fetching server cart, clear the local cart
      setLocalCart([]);
      localStorage.removeItem('localCart'); // Also remove from localStorage
    } catch (error) {
      console.error('AuthContext fetchServerCart: Error fetching cart:', error);
      // Fallback to an empty server cart on error
      setServerCart({ items: [], totalAmount: 0 });
    }
  }, [showCustomModal, backendBaseUrl]); // Dependency: backendBaseUrl added

  // Function to merge items from the local (guest) cart into the authenticated user's server cart
  const mergeLocalCartWithServer = useCallback(async (authToken) => {
    // Only proceed if there are items in the local cart and a token is available
    if (localCart.length === 0 || !authToken) return;

    try {
      console.log('AuthContext mergeLocalCartWithServer: Attempting to merge local cart with server cart...');
      // Loop through each item in the local cart
      for (const item of localCart) {
        // Send a POST request to the cart API to add each item
        // The backend should handle updating quantity if the item already exists
        const response = await fetch(`${backendBaseUrl}/api/cart`, { // Using deployed backend URL
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ productId: item.product, quantity: item.quantity }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Log specific errors for each item without stopping the loop
          console.error(`AuthContext mergeLocalCartWithServer: Error merging item ${item.name}:`, errorData.message || response.status);
        }
      }
      // Notify user about successful merge using auto-dismiss modal
      showCustomModal('Your guest cart has been merged with your account!', () => {}, 3000); // Auto-dismiss after 3 seconds
      // Clear local cart and its localStorage entry after all items have been processed
      setLocalCart([]);
      localStorage.removeItem('localCart');
      // Re-fetch the server cart to ensure the frontend reflects the fully merged cart
      fetchServerCart(authToken);
    } catch (error) {
      console.error('AuthContext mergeLocalCartWithServer: Error during cart merge process:', error);
      showCustomModal('There was an issue merging your guest cart.'); // This one should still require OK click
    }
  }, [localCart, fetchServerCart, showCustomModal, backendBaseUrl]); // Dependencies: backendBaseUrl added

  // Function to fetch the user's wallet balance from the backend
  const fetchWalletBalance = useCallback(async (authToken) => {
    if (!authToken) {
      // If no token, user is not logged in, so wallet balance is 0
      setUser(prevUser => (prevUser ? { ...prevUser, walletBalance: 0 } : null));
      return;
    }
    try {
      const response = await fetch(`${backendBaseUrl}/api/wallet/balance`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (!response.ok) {
        // If 401, session expired. Handle via logout in fetchServerCart or similar.
        // For now, just log and set balance to 0.
        console.error('Failed to fetch wallet balance:', response.status);
        setUser(prevUser => (prevUser ? { ...prevUser, walletBalance: 0 } : null));
        return;
      }
      const data = await response.json();
      // Update the user state with the new wallet balance
      setUser(prevUser => ({
        ...prevUser,
        walletBalance: data.walletBalance,
      }));
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setUser(prevUser => (prevUser ? { ...prevUser, walletBalance: 0 } : null)); // Set to 0 on error
    }
  }, [backendBaseUrl]); // Dependency: backendBaseUrl added

  // Effect to manage fetching server cart, merging local cart, and fetching wallet balance
  // whenever the `token` changes (i.e., on login/logout)
  useEffect(() => {
    console.log('AuthProvider useEffect: Token changed. Re-fetching server cart, potentially merging local cart, and fetching wallet balance.');
    if (token) {
      fetchServerCart(token);
      mergeLocalCartWithServer(token);
      fetchWalletBalance(token); // Fetch wallet balance on login
    } else {
      setServerCart({ items: [], totalAmount: 0 }); // Clear server cart state
      setUser(null); // Ensure user is null on logout
    }
  }, [token, fetchServerCart, mergeLocalCartWithServer, fetchWalletBalance]); // Dependencies for this effect

  // Function to handle user login: sets user data and token in state and localStorage
  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('AuthContext login: User logged in. Context state and localStorage updated.');
    // Cart fetching and merging, and wallet balance fetching will be handled by the useEffect that depends on `token`
  };

  // Function to handle user logout: clears user data, token, and server cart from state and localStorage
  const logout = () => {
    console.log('AuthContext logout: User logging out. Clearing context state and localStorage.');
    setUser(null);
    setToken(null);
    setServerCart({ items: [], totalAmount: 0 }); // Clear server cart state
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Local cart remains for a guest shopping experience, but can be cleared if desired
  };

  // Function to add a product to the cart (smartly handles both local and server carts)
  const addToCart = async (productId, quantity = 1, productDetails = {}) => {
    if (!productId) {
      showCustomModal('Cannot add to cart: Product ID is missing or invalid.');
      console.error('AuthContext addToCart: productId is undefined or null');
      return;
    }

    if (token) {
      // If user is authenticated, add product to the server cart via API
      try {
        const response = await fetch(`${backendBaseUrl}/api/cart`, { // Using deployed backend URL
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ productId, quantity }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const updatedCart = await response.json();
        setServerCart(updatedCart); // Update the server cart state
        // Use auto-dismiss modal for "Product added to cart!"
        showCustomModal('Product added to cart!', () => {}, 2000); // Auto-dismiss after 2 seconds
      } catch (error) {
        console.error('AuthContext addToCart: Error adding to server cart:', error);
        showCustomModal(`Failed to add to cart: ${error.message}`);
      }
    } else {
      // If user is not authenticated, manage the cart locally (in memory and localStorage)
      const existingItemIndex = localCart.findIndex(item => item.product === productId);
      let updatedLocalCart;

      if (existingItemIndex > -1) {
        // If the product already exists in the local cart, update its quantity
        updatedLocalCart = localCart.map((item, index) =>
          index === existingItemIndex ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        // If the product is new, add it to the local cart
        // Ensure productDetails are provided for local cart display (name, imageUrl, price)
        if (!productDetails.name || !productDetails.price) {
          console.warn('AuthContext addToCart: Missing product details for local cart. Attempting to fetch or using defaults.');
          try {
            // Attempt to fetch product details if not provided to make local cart display richer
            const res = await fetch(`${backendBaseUrl}/api/products/${productId}`); // Using deployed backend URL
            const productData = await res.json();
            if (res.ok) {
              productDetails = {
                name: productData.name,
                imageUrl: productData.imageUrl,
                price: productData.price,
              };
            } else {
              console.error('AuthContext addToCart: Failed to fetch product details for local cart:', productData.message);
              productDetails = { name: 'Unknown Product', imageUrl: '', price: 0 }; // Fallback details
            }
          } catch (fetchErr) {
            console.error('AuthContext addToCart: Error fetching product details for local cart:', fetchErr);
            productDetails = { name: 'Unknown Product', imageUrl: '', price: 0 }; // Fallback details
          }
        }

        updatedLocalCart = [
          ...localCart,
          {
            product: productId, // Store the product ID
            name: productDetails.name,
            imageUrl: productDetails.imageUrl,
            price: productDetails.price,
            quantity: quantity,
          },
        ];
      }
      setLocalCart(updatedLocalCart); // Update the local cart state
      // Use auto-dismiss modal for "Product added to local cart!"
      showCustomModal('Product added to local cart!', () => {}, 2000); // Auto-dismiss after 2 seconds
    }
  };

  // Function to update the quantity of a specific product in the cart
  const updateCartQuantity = async (productId, quantity) => {
    if (quantity < 0) {
      showCustomModal('Quantity cannot be negative.');
      return;
    }

    if (token) {
      // If authenticated, update quantity on the server via API
      try {
        const response = await fetch(`${backendBaseUrl}/api/cart/${productId}`, { // Using deployed backend URL
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const updatedCart = await response.json();
        setServerCart(updatedCart); // Update server cart state
      } catch (error) {
        console.error('AuthContext updateCartQuantity: Error updating server cart quantity:', error);
        showCustomModal(`Failed to update quantity: ${error.message}`);
      }
    } else {
      // If unauthenticated, update quantity in the local cart
      const updatedLocalCart = localCart.map(item =>
        item.product === productId ? { ...item, quantity: quantity } : item
      ).filter(item => item.quantity > 0); // Remove item from local cart if quantity becomes 0

      setLocalCart(updatedLocalCart); // Update local cart state
    }
  };

  // Function to remove a specific product from the cart
  const removeFromCart = async (productId) => {
    if (token) {
      // If authenticated, remove from server cart via API
      try {
        const response = await fetch(`${backendBaseUrl}/api/cart/${productId}`, { // Using deployed backend URL
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const updatedCart = await response.json();
        setServerCart(updatedCart); // Update server cart state
        showCustomModal('Product removed from cart.'); // This should still require OK click
      } catch (error) {
        console.error('AuthContext removeFromCart: Error removing from server cart:', error);
        showCustomModal(`Failed to remove from cart: ${error.message}`);
      }
    } else {
      // If unauthenticated, remove from local cart
      const updatedLocalCart = localCart.filter(item => item.product !== productId);
      setLocalCart(updatedLocalCart); // Update local cart state
      showCustomModal('Product removed from local cart.'); // This should still require OK click
    }
  };

  // Function to clear all items from the cart
  const clearCart = async () => {
    if (token) {
      // If authenticated, clear server cart via API
      try {
        const response = await fetch(`${backendBaseUrl}/api/cart`, { // Using deployed backend URL
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const clearedCart = await response.json();
        setServerCart(clearedCart); // Update server cart state to empty
        showCustomModal('Cart cleared successfully.'); // This should still require OK click
      } catch (error) {
        console.error('AuthContext clearCart: Error clearing server cart:', error);
        showCustomModal(`Failed to clear cart: ${error.message}`);
      }
    } else {
      // If unauthenticated, clear local cart
      setLocalCart([]); // Set local cart to empty array
      showCustomModal('Local cart cleared successfully.'); // This should still require OK click
    }
  };

  // Determine which cart to display based on authentication status
  const currentDisplayCart = token ? serverCart : {
    items: localCart,
    // Calculate total amount for local cart items dynamically
    totalAmount: localCart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  };

  // The object containing all values and functions that will be exposed through the context
  const authContextValue = {
    user,             // Currently authenticated user data
    token,            // JWT token
    login,            // Function to log in a user
    logout,           // Function to log out a user
    cart: currentDisplayCart, // The active cart (local or server)
    addToCart,        // Function to add product to cart
    updateCartQuantity, // Function to update product quantity in cart
    removeFromCart,   // Function to remove product from cart
    clearCart,        // Function to clear the entire cart
    fetchServerCart,  // Function to manually fetch server cart (internal use mostly)
    showCustomModal,  // Utility function to show custom alert/confirm modals
    fetchWalletBalance // NEW: Function to fetch wallet balance
  };

  return (
    // Provide the constructed context value to all child components
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to easily consume the AuthContext in any functional component
export const useAuth = () => {
  const context = useContext(AuthContext);
  // Throw an error if useAuth is used outside of an AuthProvider, helping debugging
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context; // Return the context value
};
