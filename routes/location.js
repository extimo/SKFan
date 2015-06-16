var express = require('express');
var router = express.Router();

/* save location to session. */
router.get('/:location', function(req, res, next) {
	req.session.location = req.params.location;
	res.redirect('/account/signin?next=/account/weixinCheck');
});

module.exports = router;

