var express = require('express');
var router = express.Router();
var Dish = require('../lib/dish');
var auth = require('../lib/middleware/auth');

/* GET current dishes of #type. */
router.get('/cur/:type', function(req, res, next) {
	var type = req.params.type;
	Dish.getCurrentType(type, function(err, dishes){
		if(err){
			return next(err);
		}

		returnDishes(res, dishes);
	});
});

/* GET all dishes of #type. */
router.get('/all/:type', function(req, res, next) {
	var type = req.params.type;
	Dish.getType(type, function(err, dishes){
		if(err){
			return next(err);
		}

		returnDishes(res, dishes);
	});
});

module.exports = router;

var returnDishes = function(res, dishes){
	res.format({
		json: function(){
			res.send(dishes);
		},
		xml: function(){
			res.render('dishes-xml', {dishes: dishes});
		}
	});
}
