var express = require('express');
var router = express.Router();
var User = require('../lib/user');
var Dish = require('../lib/dish');

/* GET admin pages */
router.get('/', function(req, res, next) {
	Dish.getCurrentType(0, function(err, c_dishes){
		if(err){
			return next(err);
		}
		
		Dish.getType(0, function(err, dishes){
			if(err){
				return next(err);
			}
	
			res.render('today_dish', {current: c_dishes, all: dishes});
		});
	});
});

/* GET all dishes pages */
router.get('/all', function(req, res, next) {
	Dish.getType(0, function(err, dishes){
		if(err){
			return next(err);
		}

		res.render('all_dish', {dishes: dishes});
	});
});

module.exports = router;
