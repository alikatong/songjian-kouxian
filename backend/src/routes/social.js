const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/socialController');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.get('/friends', asyncHandler(controller.getFriends));
router.get('/requests', asyncHandler(controller.getFriendRequests));
router.get('/search', asyncHandler(controller.searchPlayers));
router.post('/friends/request', asyncHandler(controller.sendFriendRequest));
router.post('/friends/respond', asyncHandler(controller.respondFriendRequest));
router.get('/messages', asyncHandler(controller.getMessages));
router.post('/messages', asyncHandler(controller.sendMessage));

module.exports = router;
