var Dish = require('../lib/dish');
var User = require('../lib/user');
var express = require('express');
var router = express.Router();
var account = require('./account');
var multipart = require('connect-multiparty');
var uploadDir = require('path').join(__dirname, '../upload');
var auth = require('../lib/middleware/auth');
/*****************<yemamo>************************/
var Order = require('../lib/order');
var redis = require('redis');
/*****************<yemamo>************************/

/* GET random dishes page. */
router.get('/random', function(req, res, next) {
	// under construct now
	res.end('coming soon!');
});

router.use(auth('user', '/account/signin'));

/* GET / , redirect to /coffee */
router.get('/', function(req, res, next) {
	res.redirect('/coffee');
});

/* GET /coffee */
router.get('/coffee', function(req, res, next) {
	User.get(req.session.wwid, function(err, user){
		if(err){
			return next(err);
		}
		res.render('main/coffee', {wwid: req.session.wwid, phone: user.phone, title: "咖啡", extraScripts: ["coffee"]});
	});
});

/********************<yemao>*********************************/
/* GET /myorder */
router.get('/myorder', function(req, res, next) {
	Order.getWids(req.session.wwid, function(err, orders){
		if(err) return callback(err);
		//console.log(orders);
		User.get(req.session.wwid, function(err, user){
			if(err){
			return next(err);
					}

		res.render('main/myorder', {wwid: req.session.wwid, orders: orders, money: user.balance, status: ["未处理","处理中","处理完毕","已取餐","无法处理"], title: "个人订单", extraScripts: ["myorder"]});
		});
	});
});
/********************</yemao>*********************************/

/* GET /activities */
router.get('/activities', function(req, res, next) {
	res.render('main/activities', {wwid: req.session.wwid, title: "餐厅活动", extraScripts: []});
});

module.exports = router;
