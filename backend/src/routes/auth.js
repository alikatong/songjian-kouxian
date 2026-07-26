const router = require('express').Router();
const {
  register, login, wechatPhoneLogin,
  registerValidation, loginValidation, wechatPhoneValidation,
} = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/register', registerValidation, asyncHandler(register));
router.post('/login',    loginValidation,    asyncHandler(login));
router.post('/wechat/phone', wechatPhoneValidation, asyncHandler(wechatPhoneLogin));

module.exports = router;
