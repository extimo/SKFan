var express = require('express');
var router = express.Router();
var get = require('./get');
var Dish = require('../lib/dish');
var auth = require('../lib/middleware/auth');

/* route /dish/get to get */
router.use('/get', get);

router.use(auth('kitchen'));

/* set ids to currently available */
router.post('/set', function(req, res, next){
	Dish.addToCurrent(req.body.ids, function(err){
		returnStatus(res, err)
	})
});

/* remove ids from currently available */
router.post('/unset', function(req, res, next){
	Dish.removeFromCurrent(req.body.ids, function(err){
		returnStatus(res, err)
	})
});

router.use(auth('admin'));

router.post('/add', function(req, res, next){
	var dish = new Dish(req.body.dish);
	dish.save(function(err){
		returnStatus(res, err);
	});
});

router.get('/remove/:id', function(req, res, next){
	Dish.remove(req.params.id, function(err){
		returnStatus(res, err);
	})
});

router.get('/find/:name', function(req, res, next){
	Dish.find(req.params.name, function(err, dish){
		returnStatus(res, err, {target: id});
	});
});

module.exports = router;

var returnStatus = function(res, err, ex){
	if(err){
		res.send({status: 'fail', error: err});
	}else{
		var status = {status: 'success'};
		if(ex){
			status = extend(true, status, ex);
		}
		res.send(status);
	}
}

var extend = function(override, des){
	var src = Array.prototype.slice.call(arguments, 2);
	
	src.forEach(function(arg){
		for(key in arg){
			if(override || !(key in des)){
				des[key] = arg[key];
			}
		}
	});

	return des;
}
