    // backend/server/routes/auth.js

    const express = require('express');
    const router = express.Router();
    const {
      register,
      login,
      getMe,
      forgotPassword,
      resetPassword,
      updateDetails,
      updatePassword,
      logout
    } = require('../controllers/authController'); // Import auth controller functions
    const { protect } = require('../middleware/auth'); // Auth middleware

    // Auth routes
    router.post('/register', register);
    router.post('/login', login);
    router.get('/logout', logout); // Add logout route
    router.get('/me', protect, getMe);
    router.put('/updatedetails', protect, updateDetails);
    router.put('/updatepassword', protect, updatePassword);
    router.post('/forgotpassword', forgotPassword);
    router.put('/resetpassword/:resettoken', resetPassword);

    module.exports = router;
    