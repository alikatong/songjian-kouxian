const router = require('express').Router();
const auth   = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const {
  getCharacter,
  createCharacter,
  breakthrough,
  createValidation,
} = require('../controllers/characterController');

// 所有路由都需要登录
router.use(auth);

router.get('/',              asyncHandler(getCharacter));
router.post('/',             createValidation, asyncHandler(createCharacter));
router.post('/create',       createValidation, asyncHandler(createCharacter));
router.post('/breakthrough', asyncHandler(breakthrough));

module.exports = router;
