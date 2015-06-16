var redis = require('redis');
var db = redis.createClient();
var async = require('async');
var settings = require('../settings');
var User = require('./user');
var Dish = require('./dish');

module.exports = Order;

///////////////////////////////////////////////////////////////////////////////////
// prototype
///////////////////////////////////////////////////////////////////////////////////

/****************************************************************************
 * did: dish id
 * oid: order id
 *
 * structure of order (~ means should be given when create):
 * .type ~
 * .wwid ~
 * .dish ~
 * .count ~
 * .id
 * .total 
 * .placeTime
 * .handleTime
 * .finishTime
 * .pickTime
 * .status
 *
 *
 * status:
 * 0 initial
 * 1 handling
 * 2 finished
 * 3 picked
 * 4 canceled
 *
 * structure of order:type:working
 * list [oid]
 *
 **********************************/

Date.prototype.format = function(format)
{
	format = format || 'yyyy-MM-dd hh:mm:ss';
	var o = {
		"M+" : this.getMonth() + 1, //month
		"d+" : this.getDate(), //day
		"h+" : this.getHours(), //hour
		"m+" : this.getMinutes(), //minute
		"s+" : this.getSeconds(), //second
		"q+" : Math.floor((this.getMonth()+3)/3), //quarter
		"S" : this.getMilliseconds() //millisecond
	}
	if(/(y+)/.test(format)){
		format=format.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
	}
	for(var k in o){
		if(new RegExp("(" + k + ")").test(format)){
			format = format.replace(RegExp.$1, RegExp.$1.length==1? o[k] : ("00"+ o[k]).substr((""+ o[k]).length));
		}
	}
	return format;
}

function Order(obj) {
	for (var key in obj){
		if(obj[key]){
			this[key] = obj[key];
		}
	}
}

Order.prototype.place = function(callback){
	var order = this;
	var workingListLength = settings.lengthOfWorkingList;
	
	// set place datetime for this order
	order.placeTime = new Date().format();	
	// set order status to 0
	order.status = 0;
		
	
	db.SELECT(2, function(){
		async.waterfall([
			// count total price of the order
			function(fn){
				Dish.getEntity(order.dish, function(err, dishEntity){
					if(err) return fn(err);

					order.total = dishEntity.price * order.count;
					order.name = dishEntity.name;
					order.price = dishEntity.price;
					// count finished
					fn();
				});
			},
			// get next order's id
			function(fn){
				db.INCR('order:next', fn);
			},
			function(id, fn){
				order.id = id;
				// entity save to order:id
				db.HMSET('order:' + order.id, order, fn);
			},
			// add order.id to order:user:uid
			function(nothing, fn){
				db.SADD('order:user:' + order.wwid, order.id, fn);
			},
			// add order.id to order:type:
			function(nothing, fn){
				db.SADD('order:type:' + order.type, order.id, fn);
			},
			// push order.id to type working list
			function(nothing, fn){
				db.RPUSH('order:working:t' + order.type, order.id, fn);
			}
		], 
		function(err, len){
			if(err){
				console.log('order.place: ' + err);
			}
			
			// trigger orderComming if in the front of order list
			callback(err, workingListLength >= len);
			});
		});
};

///////////////////////////////////////////////////////////////////////////////////
// functions
///////////////////////////////////////////////////////////////////////////////////

Order.changeStatus = function(id, status, callback){
	db.SELECT(2, function(){
		db.HSET('order:' + id, 'status', status, callback);
	});
}

Order.get = function(id, callback){
	db.SELECT(2, function(){
		db.HGETALL('order:' + id, callback);
	});
}

Order.gets = function(ids, callback) {
	async.parallel(ids.map(function(id){
		return async.apply(Order.get, id);
	}), callback);
}

/*******************<yemao>*************************/
// get ids from order type
Order.getids = function(type,callback){
	db.SELECT(2,function(){
		db.SMEMBERS('order:type:' + type,callback);
	});

}

// get ids from wwid
Order.getWids = function(wwid,callback){
	db.SELECT(2,function(){
	db.SMEMBERS('order:user:' + wwid, function(err, ids){
		if(err) return callback(err);
		
		Order.gets(ids, callback);
		
		});
	});
}

/*********************</yemao>*****************************/
Order.getGroup = function(type, id, callback){
	Order.get(id, function(err, order){
		if(err) return callback(err);
		
		Dish.getEntity(order.dish, function(err, dish){
			if(err) return callback(err);
			
			User.get(order.wwid, function(err, user){
				if(err) return callback(err);
				
				var group = {
					id: order.id,
					name: dish.name, 
					ename: dish.ename,
					image: dish.image,
					count: order.count,
					price: dish.price,
					total: dish.price*order.count,
					uid: order.wwid,
					placeTime: order.placeTime,
					finishTime: order.finishTime,
					phone: user.phone,
					nick: user.nick,
					extra: order.extra,
					location: order.location
				}
				callback(null, group);
			});
		});
	});
}

Order.getsGroup = function(type, ids, callback){
	async.parallel(ids.map(function(id){
		return async.apply(Order.getGroup, type, id);
	}), callback);
}

Order.getWorkingList = function(type, callback){
	var workingListLength = settings.lengthOfWorkingList;
	
	db.SELECT(2, function(){
		async.waterfall([
			// get orders from working list
			function(fn){
				db.LRANGE('order:working:t' + type, 0, workingListLength - 1, fn);
			},
			// filter valid id
			function(ids, fn){
				fn(null, ids.filter(function(id){
					return id != null;
				}));
			},
			// change these orders' status to handling(1)
			function(ids, fn){
				async.parallel(ids.map(function(id){
					return async.apply(Order.changeStatus, id, 1);
				}), function(err){
					fn(err, ids);
				});
			},
			// record handle time
			function(ids, fn){
				async.parallel(ids.map(function(id){
					return function(fn){
						db.HSETNX('order:' + id, 'handleTime', new Date().format(), fn);
					}
				}), function(err){
					fn(err, ids);
				});
			},
			// get orders' info
			function(ids, fn){
				Order.getsGroup(type, ids, fn);
			}
		], callback);
	});
}

Order.finishOrder = function(type, id, callback){
	db.SELECT(2, function(){
		async.series([
			// change order status to finished(2)
			function(fn){
				Order.changeStatus(id, 2, fn);
			},
			// record finish time
			function(fn){
				db.HSETNX('order:' + id, 'finishTime', new Date().format(), fn);
			},
			// delete order from working list
			function(fn){
				db.LREM('order:working:t' + type, 0 , id, fn);
			},
			// add order to picking list
			function(fn){
				db.RPUSH('order:picking:t' + type, id, fn);
			}
		], callback);
	});
}

Order.cancelOrder = function(type, id, callback){
	db.SELECT(2, function(){
		async.series([
			// change order status to canceled(4)
			function(fn){
				Order.changeStatus(id, 4, fn);
			},
			// record finish time
			function(fn){
				db.HSETNX('order:' + id, 'finishTime', new Date().format(), fn);
			},
			// delete order from working list
			function(fn){
				db.LREM('order:working:t' + type, 0 , id, fn);
			}
		], callback);
	});
}

Order.getPickingList = function(type, callback){
	var pickingListLength = settings.lengthOfPickingList;
	
	db.SELECT(2, function(){
		async.waterfall([
			// get orders from picking list
			function(fn){
				db.LRANGE('order:picking:t' + type, 0, pickingListLength - 1, fn);
			},
			// filter valid id
			function(ids, fn){
				fn(null, ids.filter(function(id){
					return id != null;
				}));
			},
			// get orders' info
			function(ids, fn){
				Order.getsGroup(type, ids, fn);
			}
		], callback);
	});
}

Order.pickOrder = function(type, id, callback){
	db.SELECT(2, function(){
		async.series([
			// change order status to picked(3)
			function(fn){
				Order.changeStatus(id, 3, fn);
			},
			// record pick time
			function(fn){
				db.HSETNX('order:' + id, 'pickTime', new Date().format(), fn);
			},
			// delete order from picking list
			function(fn){
				db.LREM('order:picking:t' + type , 0 , id, fn);
			},
			// do accounting
			function(fn){
				async.waterfall([
					function(fn){
						db.HGET('order:' + id , 'total', fn);
					},
					function(total, fn){
						db.HGET('order:' + id , 'wwid', function(err, wwid){
							fn(err, total, wwid);
						});
					},
					function(total, wwid, fn){
						User.consume(wwid, total, fn);
					}
				], fn);
			},
		], callback);
	});
}

Order.getValveLock = function(type, fn){
	db.SELECT(2, function(){
		db.GET('order:lock:' + type, function(err, lock){
			if(err || lock == 1){
				fn('locked');
			}
			else{
				fn();
			}
		});
	});
}

Order.openValve = function(type, fn){
	db.SELECT(2, function(){
		db.SET('order:lock:' + type, 1, fn);
	});
}

Order.closeValve = function(type, fn){
	db.SELECT(2, function(){
		db.SET('order:lock:' + type, 0, fn);
	});
}

Order.toggleValve = function(type, fn){
	Order.getValveLock(type, function(lock){
		if(lock){
			Order.closeValve(type, fn);
		}
		else{
			Order.openValve(type, fn);
		}
	});
}
