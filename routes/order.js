var Order = require('../lib/order');
var express = require('express');
var router = express.Router();
var account = require('./account');
var auth = require('../lib/middleware/auth');

/* POST order to /order/place */
router.post('/place', function(req, res, next) {
	if(req.body.ids && req.body.ids.length > 0 && req.body.counts && req.body.counts.length > 0)
	new Order({
		wwid: req.session.wwid, 
		type: req.body.type, 
		dishes: req.body.ids, 
		counts: req.body.counts
	}).place(function(err, comingGroup){
		if(err){
			console.log('order.place: ' + err);
			return next(err);
		}
		if(comingGroup){
			Order.getWorkingGroups(req.body.type, function(err, groups){
				if(err){
					console.log('order.place.getWorkingGroups: ' + err);
				}
				else{
					res.locals.io.sockets.emit('allGroups:' + req.body.type, {orderGroup: groups, newly: true});
				}
			});
		}
	});
	res.end('ok');
});

module.exports = router;
