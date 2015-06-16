var express = require('express');
var router = express.Router();

/* GET /  */
router.get('/', function(req, res, next) {
	var names = ['小炒', '咖啡'];
	res.render('kitchen', {type: req.session.auth.kit_bind, typeName: names[req.session.auth.kit_bind]});
});

module.exports = router;
