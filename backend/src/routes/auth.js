const router = require('express').Router();
const {
  register, login, logout, getSession,
  registerValidation, loginValidation,
} = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');

router.post('/register', registerValidation, asyncHandler(register));
router.post('/login',    loginValidation,    asyncHandler(login));
router.get('/session', auth, asyncHandler(getSession));
router.post('/logout', auth, asyncHandler(logout));

module.exports = router;
