var express = require('express');
var router = express.Router();
var account = require('./account');

/* GET home page. */
router.get('/', function(req, res, next) {
	if(req.session.wwid){
		res.end('hello');
	}else{
		res.render('signin');
	}
});

/* POST signin data. */
router.post('/signin', account.signin);

/* GET signup page. */
router.get('/signup', function(req, res, next) {
	res.render('signup');
});

/* POST signup data. */
router.post('/signup', account.signup);

module.exports = router;
