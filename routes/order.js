var Order = require('../lib/order');
var User = require('../lib/user');
var express = require('express');
var async = require('async');
var router = express.Router();
var auth = require('../lib/middleware/auth');

/* POST order to /order/place */
router.post('/place', function(req, res, next) {
	if(!req.body.ids || req.body.ids.length == 0 || !req.body.counts || req.body.counts.length == 0){
		return res.end('empty');
	}
	
	Order.getValveLock(req.body.type, function(locked){
		if(locked){
			return res.end('本店打烊中-_-!');
		}
	
		Order.isNowInDeliveryTime(req.body.type, function(err, goodToGo){
			if(err){
				return res.end('未知原因出错');
			}
			if(!goodToGo){
				return res.end('还未到本店外送时间-_-!');
			}
			
			Order.getDeliveryCharge(req.body.type, function(err, minCharge){
				if(err){
					return res.end('未知原因出错');
				}
			
				Order.countOrderTotal(req.body.ids, req.body.counts, function(err, total){
					if(err){
						return res.end('未知原因出错');
					}
					if(total < minCharge){
						return res.end('未达到起送价格！');
					}
					
					User.consume(req.session.wwid, total, function(err){
						if(err){
							return res.end(err);
						}
					
						var orders = [];
	
						req.body.ids.forEach(function(did, i){
							orders.push(new Order({
								wwid: req.session.wwid, 
								type: req.body.type, 
								dish: did, 
								count: req.body.counts[i],
								extra: req.body.extras ? req.body.extras[i] : null,
								location: req.body.location,
								phone: req.body.phone
							}));
						});
						async.series(orders.map(function(order){
							return function(fn){order.place(fn);};
						}), function(err, result){
							if(err){
								console.log('order.place: ' + err);
								return next(err);
							}
				
							if(result.some(function(b){return b;})){
								Order.getWorkingList(req.body.type, function(err, data){
									if(err){
										console.log('order.place.getWorkingList: ' + err);
									}
									else{
										res.locals.io.of('kitchen').to(req.body.type).emit('list', {dataWorking: data, newly: true});
									}
								});
							}
			
							res.end('ok');
						});
					});
				});
			});
		});
	});
});

/************************<yemao>***************************/
router.post('/finish', function(req, res, next) {
	
	Order.pickOrder(1, req.body.id, function(err){
		if(err){
			return next(err);
		}
		Order.getPickingList(1, function(err, data){
			if(err){
				console.log('order.place.getPickingList: ' + err);
			}
			else{
				res.locals.io.of('kitchen').to(1).emit('list', {dataPicking: data});
			}
		});
		res.end("ok!");
	});

});

/************************</yemao>***************************/

module.exports = router;
