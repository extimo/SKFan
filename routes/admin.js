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
	
		res.render('today_dish', {current: c_dishes});
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

module.exports = router;
