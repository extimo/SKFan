var Order = require('../lib/order');
var express = require('express');
var router = express.Router();
var auth = require('../lib/middleware/auth');

/* POST order to /order/place */
router.post('/place', function(req, res, next) {
	if(req.body.ids && req.body.ids.length > 0 && req.body.counts && req.body.counts.length > 0){
		Order.getValveLock(req.body.type, function(locked){
			if(locked){
				res.end('本店打烊中-_-!');
			}
			else{
				var orders = [];
				req.body.ids.forEach(function(did, i){
					orders.push(new Order({
						wwid: req.session.wwid, 
						type: req.body.type, 
						dish: did, 
						count: req.body.counts[i],
						extra: req.body.extras ? req.body.extras[i] : null,
						location: req.session.location
					}));
				});
				orders.forEach(function (order){
					order.place(function(err, orderComming){
						if(err){
							console.log('order.place: ' + err);
							return next(err);
						}
						if(orderComming){
							Order.getWorkingList(req.body.type, function(err, orders){
								if(err){
									console.log('order.place.getWorkingList: ' + err);
								}
								else{
									res.locals.io.to(req.body.type).emit('workingList', {list: orders, newly: true});
								}
							});
						}
					});
				});
				res.end('ok');
			}
		});
	}
	else{
		res.end('empty');
	}
});

/************************<yemao>***************************/
router.post('/finish', function(req, res, next) {
	
	Order.pickOrder(1, req.body.id, function(err){
		if(err){
			return next(err);
		}
		Order.getPickingList(1, function(err, orders){
			if(err){
				console.log('order.place.getPickingList: ' + err);
			}
			else{
				res.locals.io.to(1).emit('pickingList', orders);
			}
		});
		res.end("ok!");
	});

});

/************************</yemao>***************************/

module.exports = router;
