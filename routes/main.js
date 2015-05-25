var Dish = require('../lib/dish');
var express = require('express');
var router = express.Router();
var account = require('./account');
var multipart = require('connect-multiparty');
var uploadDir = require('path').join(__dirname, '../upload');
var auth = require('../lib/middleware/auth');

/* GET random dishes page. */
router.get('/random', function(req, res, next) {
	// under construct now
	res.end('coming soon!');
});

router.use(auth('user', '/account/signin'));

/* GET / , redirect to /dishes */
router.get('/', function(req, res, next) {
	Dish.getCurrentType(0, function(err, c_dishes){
		if(err){
			return next(err);
		}
		
		res.render('mainpage', {wwid: req.session.wwid,  dishes: c_dishes});
	});
});

/* GET /coffee */
router.get('/coffee', function(req, res, next) {
	Dish.getCurrentType(1, function(err, c_dishes){
		if(err){
			return next(err);
		}
		
		res.render('coffee', {wwid: req.session.wwid,  dishes: c_dishes});
	});
});


/* GET home page. */
router.get('/:p', function(req, res, next) {
	var page = req.params.p;
	
	res.render(page, {wwid: req.session.wwid, current: page, dishes: demo_dishes});
});

module.exports = router;
