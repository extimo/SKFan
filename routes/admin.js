var express = require('express');
var router = express.Router();
var User = require('../lib/user');
var Dish = require('../lib/dish');
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
			res.render('admin/index', {current: [c_dishes0, c_dishes1]});
		});
	});
});

/* GET setting pages */
router.get('/setting', function(req, res, next) {
	Order.getValveLock(1, function(lock){
		Order.getDeliveryTime(1, function(err, DeliveryTime){
			if(err){
				return next(err);
			}
			Order.getDeliveryCharge(1, function(err, minCharge){
				if(err){
					return next(err);
				}
			
				res.render('admin/setting', {valve: lock, start: DeliveryTime[0] || '', end: DeliveryTime[1] || '', minCharge: minCharge || ''});
			});
		});
	});
});

/* POST set delivery time */
router.post('/setDeliveryTime', function(req, res, next) {
	Order.setDeliveryTime(1, req.body.start, req.body.end, function(err){
		if(err){
			return next(err);
		}
		
		res.success('设置成功！');
		res.redirect('back');
	});
});

/* POST set delivery minimum charge */
router.post('/setDeliveryCharge', function(req, res, next) {
	Order.setDeliveryCharge(1, req.body.minCharge, function(err){
		if(err){
			return next(err);
		}
		
		res.success('设置成功！');
		res.redirect('back');
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
			res.render('admin/addDish', {all: dishes});
		});
	});
});

router.get('/toggle/:type', function(req, res, next){
	Order.toggleValve(req.params.type, function(err){
		if(err){
			return next(err);
		}
		else{
			res.success('设置成功！');
			res.redirect('back');
		}
	});
});


/********************<yemao>*********************************/
/* GET addAuto page*/
router.get('/addAuto', function(req, res, next) {
	res.render('admin/addAuto', {title: "添加咖啡"});
});

/* GET allOrder page*/
router.get('/allOrder', function(req, res, next) {
	Order.getids(1,function(err,ids){
	
		Order.gets(ids,function(err,orders){
			if(err){
			return callback(err);
			}
			
		res.render('admin/allOrder', {title: "订单记录", orders: orders, extraScripts: []});
		});		
	});
});

/* GET charge page*/
router.get('/charge', function(req, res, next) {
	res.render('admin/charge', {title: "充值"});
});

/* renew balance for user*/
router.post('/newBalance', function(req, res, next){
	var amount = parseInt(req.body.amount);
	var email = req.body.email;

	User.getId(email, function(err, id){
		if(!id){
			res.error("eamil 不存在！");
			res.redirect("back");
		}			
		else{
			User.inCharge(id, amount, function(err){
				if(err){
					return callback(err);
				}
				res.error("充值成功!");
				res.redirect("back");
			});
		}	
	});

});

/********************</yemao>*********************************/


module.exports = router;











