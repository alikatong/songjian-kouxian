const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/marketController');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.get('/', asyncHandler(controller.state));
router.get('/shop', asyncHandler(controller.shop));
router.get('/listings', asyncHandler(controller.listings));
router.get('/sellable', asyncHandler(controller.sellable));
router.post('/shop/buy', asyncHandler(controller.buyShop));
router.post('/auction/list', asyncHandler(controller.createListing));
router.post('/auction/buy', asyncHandler(controller.buyListing));
router.post('/auction/cancel', asyncHandler(controller.cancelListing));
router.get('/mail', asyncHandler(controller.mailState));
router.post('/mail/claim', asyncHandler(controller.claimMail));

module.exports = router;
