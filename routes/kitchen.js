var express = require('express');
var Order = require('../lib/order');
var router = express.Router();

/* GET /  */
router.get('/', function(req, res, next) {
	var names = ['小炒', '咖啡'];
	Order.getValveLock(req.session.auth.kit_bind, function(lock){
		res.render('kitchen', {type: req.session.auth.kit_bind, typeName: names[req.session.auth.kit_bind], valveLock: lock});
	});
});

router.get('/toggle', function(req, res, next){
	Order.toggleValve(req.session.auth.kit_bind, function(err){
		if(err){
			return next(err);
		}
		else{
			res.redirect('/kitchen');
		}
	});
});

/* GET addAuto page*/
router.get('/add', function(req, res, next) {
	res.render('admin/addAuto', {title: "添加咖啡"});
});

module.exports = router;
