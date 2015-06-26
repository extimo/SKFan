var Dish = require('../lib/dish');
var User = require('../lib/user');
var express = require('express');
var router = express.Router();
var account = require('./account');
var multipart = require('connect-multiparty');
var uploadDir = require('path').join(__dirname, '../upload');
var auth = require('../lib/middleware/auth');
var Order = require('../lib/order');
var url = require('url');

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
		
		Order.getDeliveryCharge(1, function(err, minCharge){
			if(err){
				return next(err);
			}
			
			res.render('main/coffee', {
				location: req.session.location, 
				wwid: req.session.wwid, 
				minCharge: minCharge,
				phone: user.phone, 
				title: "咖啡", 
				extraScripts: ["/js/coffee"]
			});
		});
	});
});

router.get('/freeTime', function(req, res, next) {
	res.render('main/freeTime');
});

/********************<yemao>*********************************/
/* GET /myorder */
router.get('/myorder', function(req, res, next) {
	Order.getWids(req.session.wwid, function(err, orders){
		if(err) return callback(err);
		User.get(req.session.wwid, function(err, user){
			if(err){
				return next(err);
			}

			res.render('main/myorder', {
				wwid: req.session.wwid, 
				orders: orders, 
				money: user.balance, 
				status: ["未处理","处理中","处理完毕","已取餐","抱歉，已售罄"], 
				title: "个人订单",
				extraScripts: ["/js/myorder"]
			});
		});
	});
});

/* GET /orderState */
router.get('/orderState', function(req, res, next) {
	Order.getPayids(req.session.wwid, function(err,ids){
		if(err){
			callback(err);
		}	
		
		Order.getsGroup(1,ids, function(err,order){
			if(err){
				console.log("get order error!");
				callback(err);
			}
			
			res.render('main/orderState', {
				wwid: req.session.wwid, 
				order: order,  
				title: "订单状态", 
				extraScripts: ["http://ecafe.pub:9527/socket.io/socket.io", "/js/orderState"]
			});	
		});
	});
});

/********************</yemao>*********************************/

/* GET /activities */
router.get('/activities', function(req, res, next) {
	res.render('main/activities', {wwid: req.session.wwid, title: "餐厅活动", extraScripts: []});
});

module.exports = router;
