var express = require('express');
var router = express.Router();
var path = require('path');
var dir = path.join(__dirname, '../images/');
var gm = require('gm');
var fs = require('fs');

/* GET orgin image. */
router.get('/:img', function(req, res, next) {
	var options = {
		dotfiles: 'deny',
		headers: {
			'x-timestamp': Date.now(),
			'x-sent': true
		}
	};
	var img = dir + req.params.img+ ".jpg";
	res.sendFile(img, options, function(err){
		if (err) {
			res.status(404).end();
		}
	});
});

/* GET image of small size. */
router.get('/:img/:size', function(req, res, next) {
	sendImage(res, req.params.img, req.params.size);
});

module.exports = router;

var sendImage = function(res, img, size){
	var sizes = {"small": 64, "middle": 128, "large": 256, "xlarge": 512};
	if(!sizes[size]){
		res.status(404).end();
	}
	var options = {
		dotfiles: 'deny',
		headers: {
			'x-timestamp': Date.now(),
			'x-sent': true
		}
	};
	var img_path = dir + img + "." + size + ".jpg";
	res.sendFile(img_path, options, function(err){
		if (err) {
			var orgin_img_path = dir + img+ ".jpg";
			gm(orgin_img_path).thumb(sizes[size], sizes[size], img_path, 100, function(err){
				if(err){
					fs.unlink(img_path, function(err){});
					res.status(404).end();
				}
				else{
					res.sendFile(img_path, options, function(err){
						if (err) {
							res.status(404).end();
						}
					});
				}
			});
		}
	});

}
