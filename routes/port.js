var express = require('express');
var router = express.Router();
var User = require('../lib/user');
var path = require('path');
var uploadDir = path.join(__dirname, '../upload');

/* GET portrait image. */
router.get('/:id', function(req, res, next) {
	var id = req.params.id;
	User.getPortrait(id, function(err, port){
		if(err){
			res.end('');
		}else{
			var img = path.join(uploadDir, port) + ".jpg";
			res.sendFile(img);
		}
	});
});

/* GET portrait thumbnail. */
router.get('/:id/thumb', function(req, res, next) {
	var id = req.params.id;
	User.getPortrait(id, function(err, port){
		if(err){
			res.end('');
		}else{
			var img = path.join(uploadDir, port) + ".thumb.jpg";
			res.sendFile(img);
		}
	});
});

module.exports = router;
