var express = require('express');
var router = express.Router();
var account = require('./account');
var multipart = require('connect-multiparty');
var uploadDir = require('path').join(__dirname, '../upload');

var demo_dishes = [];
for(var i = 0;i < 12;i++)
	demo_dishes.push({name: 'humberger', price: 15, rate: 3});

/* GET / , redirect to /dishes */
router.get('/', function(req, res, next) {
	res.redirect('/dishes');
});

/* GET random dishes page. */
router.get('/random', function(req, res, next) {
	// under construct now
	res.end('coming soon!');
});

/* GET home page. */
router.get('/:p', function(req, res, next) {
	var page = req.params.p;
	
	// make sure user has signed in
	if(req.session.wwid){
		res.render(page, {wwid: req.session.wwid, current: page, dishes: demo_dishes});
	}else{
		res.redirect('/account/signin');
	}
});

module.exports = router;
