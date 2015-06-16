var express = require('express');
var router = express.Router();
var User = require('../lib/user');
var Dish = require('../lib/dish');
var Order = require('../lib/order');

var Order = require('../lib/order');

/* GET admin pages */
router.get('/', function(req, res, next) {
	Dish.getCurrentType(0, function(err, c_dishes0){
		if(err){
			return next(err);
		}
	
		Dish.getCurrentType(1, function(err, c_dishes1){
			if(err){
				return next(err);
			}
	
	
			Order.getValveLock(1, function(lock){
				res.render('today_dish', {valve: lock, actionName: lock ? '开张' : '打烊', current: [c_dishes0, c_dishes1]});
			});
		});
	});
});

/* GET add page */
router.get('/add', function(req, res, next) {
	Dish.getType(req.query.type, function(err, dishes){
		if(err){
			return next(err);
		}

		Dish.getCurrentTypeIds(req.query.type, function(err, c_ids){
			if(err){
				return next(err);
			}
			
			dishes = dishes.filter(function(dish){
				var in_c = c_ids.reduce(function(fire, id){
					return fire + ((dish.id == parseInt(id)) ? 100 : 0);
				}, 0);
				return in_c == 0;
			});
			res.render('all_dish', {all: dishes});
		});
	});
});

router.post('/toggle/:type', function(req, res, next){
	console.log(req.params.type);
	Order.toggleValve(req.params.type, function(err){
		if(err){
			return next(err);
		}
		else{
			res.redirect('/admin');
		}
	});
});


/********************<yemao>*********************************/
/* GET addAuto page*/
router.get('/addAuto', function(req, res, next) {
	res.render('addAuto', {title: "添加咖啡"});
});

/* GET allOrder page*/
router.get('/allOrder', function(req, res, next) {
	Order.getids(1,function(err,ids){
	
		Order.gets(ids,function(err,orders){
			if(err){
			return callback(err);
			}
			
		res.render('allOrder', {title: "订单记录", orders: orders, extraScripts: []});
		});		
	});
});

/* GET charge page*/
router.get('/charge', function(req, res, next) {
	res.render('charge', {title: "充值"});
});

/* renew balance for user*/
router.post('/newBalance', function(req, res, next){
	var amount = parseInt(req.body.amount);
	var email = req.body.email;
	console.log(amount + " " + email);

	User.getId(email, function(err, id){
		if(err){
			console.log("email in not in");
			res.error("eamil 不存在！");
			res.redirect("back");
			//return callback(err);
		}	
		
		User.inCharge(id, amount, function(err, callback){
			if(err){
				console.log("inCharge error");
				return callback(err);
			}
			res.success("充值成功!");
			res.redirect('/admin');
		});			
	});

});



/********************</yemao>*********************************/


module.exports = router;











