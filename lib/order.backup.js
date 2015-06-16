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
 * gid: group id
 *
 * structure of order (~ means should be given when create):
 * .type ~
 * .wwid ~
 * .dishes [id...] ~
 * .counts [count...] ~
 * .id
 * .total 
 * .placeTime
 * .status
 *
 *
 * status:
 * 0 initial
 * 1 handling
 * 2 finished
 * 3 closed
 *
 *
 * structure of order:dishes:oid
 * .dish_id : count
 *
 * structure of order:type:working
 * list [gid]
 *
 * structure of order:type:working:gid
 * .dish: did
 * .count: count
 *
 * structure of order:type:working:oid:gid
 * sset [oid]
 *
 **********************************/

Date.prototype.format =function(format)
{
	format = format || 'hh:mm';
	var o = {
		"M+" : this.getMonth()+1, //month
		"d+" : this.getDate(), //day
		"h+" : this.getHours(), //hour
		"m+" : this.getMinutes(), //minute
		"s+" : this.getSeconds(), //second
		"q+" : Math.floor((this.getMonth()+3)/3), //quarter
		"S" : this.getMilliseconds() //millisecond
	}
	if(/(y+)/.test(format)) format=format.replace(RegExp.$1,
	(this.getFullYear()+"").substr(4- RegExp.$1.length));
	for(var k in o)if(new RegExp("("+ k +")").test(format))
	format = format.replace(RegExp.$1,
	RegExp.$1.length==1? o[k] :
	("00"+ o[k]).substr((""+ o[k]).length));
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
	
	// set place datetime for this order
	order.placeTime = new Date();
	// set order status to 0
	order.status = 0;
	
	async.series([
		// count total price of the order
		function(fn){
			var ids = order.dishes;

			Dish.gets(ids, function(err, dishes){
				if(err) return fn(err);
				
				// map dishes.price to prices 
				var prices = dishes.map(function(dish){
					return parseInt(dish.price);
				});
		
				// fold prices to total
				order.total = prices.reduce(function(tot, price){
					return tot + price;
				}, 0);
		
				// count finished
				fn();
			});
		},
		// start procedure
		function(fn){
			db.SELECT(2, function(){
				async.waterfall([
					// get next order's id
					function(fn){
						db.INCR('order:next', fn);
					},
					function(id, fn){
						order.id = id;
						async.series([
							// save order extras to order:extras:id
							function(fn){
								if(order.extras){
									var extras = {};
									order.dishes.forEach(function(id, index){
										extras[id] = order.extras[index];
									});
									// remove extras from order
									delete order.extras;
									
									db.HMSET('order:extras:' + order.id, extras, fn);
								}
								else{
									fn();
								}
							},
							// save order dishes to order:dishes:id
							function(fn){
								var dishes = {};
								order.dishes.forEach(function(id, index){
									dishes[id] = order.counts[index];
								});
								// remove counts from order
								delete order.counts;
								delete order.dishes;
						
								db.HMSET('order:dishes:' + order.id, dishes, fn);
							},
							// entity save to order:id
							function(fn){
								db.HMSET('order:' + order.id, order, fn);
							},
							// add order.id order:user:uid
							function(fn){
								db.SADD('order:user:' + order.wwid, order.id, fn);
							},
							// push order.id to type list
							function(fn){
								db.RPUSH('order:type:' + order.type, order.id, fn);
							}
						], 
						function(err, len){
							// in the front of order list, so request working list to fetch orders
							if(len == len[len.length - 1]){
								// call Order.fetchOrderIfNeeded and then broadcast
								Order.fetchOrderIfNeeded(order.type, function(err, nothing, comingGroup){
									if(err){
										console.log('order.place.fetchOrderIfNeeded: ' + err);
									}
									
									fn(err, comingGroup);
								});
							}
							fn(err);
						});
					}
				], fn);
			});
		}],
		function(err, comingGroup){
			if(err){
				console.log('order.place: ' + err);
			}
	
			callback(err, comingGroup);
		}
	);
};

///////////////////////////////////////////////////////////////////////////////////
// functions
///////////////////////////////////////////////////////////////////////////////////

Order.remove = function(id, callback){
	Order.get(id, function(err, order){
		if(err) return callback(err);
	
		db.SELECT(2, function(){
			db.LREM('order:type:' + order.type, 0, order.id);
			db.DEL('order:' + order.id);
			if(callback) callback();
		});
	});
};

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

Order.getDishes = function(id, callback){
	db.SELECT(2, function(){
		db.HGETALL('order:dishes:' + id, callback);
	});
}

Order.getsDishes = function(ids, callback){
	async.parallel(ids.map(function(id){
		return async.apply(Order.getDishes, id);
	}), callback);
}

Order.getExtras = function(id, callback){
	db.SELECT(2, function(){
		db.HGETALL('order:extras:' + id, callback);
	});
}

Order.getsExtras = function(ids, callback){
	async.parallel(ids.map(function(id){
		return async.apply(Order.getExtras, id);
	}), callback);
}

// fetch a batch of order, unpack them and add to working list
Order.fetch = function(type, callback){
	db.SELECT(2, function(){
		db.HGETALL('order:typevar:' + type, function(err, theType){
			if(err){
				console.log(err);
				return callback(err);
			}
			
			if(theType.fetch == 'smart'){
				Order.fetchSmart(type, callback);
			}
			else{
				Order.fetchSimple(type, callback);
			}
		});
	});
}

var saveGroups = function(type, groups, callback){
	async.series(groups.map(function(group){
		// create function that add a single group to working list
		return async.apply(async.waterfall, [
			// get next group id
			function(fn){
				db.INCR('order:t' + type + ':working:next', fn);
			},
			function(gid, fn){
				async.series([
					// push gid to order:type:working
					function(fn){
						db.RPUSH('order:t' + type + ':working', gid, fn);
					},
					// set package detail to order:type:working:gid
					function(fn){
						var _group = group;
						_group.dish = group.did;
						_group.gid = gid;
						delete _group.did;
						delete _group.oids;
						db.HMSET('order:t' + type + ':working:' + gid, _group, fn);
					}
					// set order ids to sset order:type:working:oid:gid
				].concat(group.oids.map(function(oid){
					return function(fn){
						db.ZINCRBY('order:t' + type + ':working:oid:' + gid, 1, oid, fn);
					};
				})), fn);
			}
		]);
	}), callback);
}

var createLinedOrderGroups = function(dishesCollection, extrasCollection, orders){
	var groups = [];
	dishesCollection.forEach(function(dishes, index){
		for(var id in dishes){
			var oids = [];
			
			for(var i = 0;i < dishes[id];i++){
				oids.push(orders[index].id);
			}
			
			var group = {
				did: id, 
				count: dishes[id], 
				oids: oids,
				uid: orders[index].wwid,
				time: orders[index].placeTime
			};
			if(orders[index].location){
				group.location = orders[index].location;
			}
			if(extrasCollection[index] && extrasCollection[index][id]){
				group.extra = extrasCollection[index][id];
			}
			groups.push(group);
		}
	});
	
	return groups;
}

var createOrderHash = function(dishesCollection, orders){
	var hash = {};
	dishesCollection.forEach(function(dishes, index){
		for(var id in dishes){
			if(!hash[id]){
				var oids = [];
				
				for(var i = 0;i < dishes[id];i++){
					oids.push(orders[index].id);
				}
				
				hash[id] = {
					count: parseInt(dishes[id]), 
					oids: oids,
					time: orders[index].placeTime
				};
			}
			else{
				hash[id].count += parseInt(dishes[id]);
				for(var i = 0;i < dishes[id];i++){
					hash[id].oids.push(orders[index].id);
				}
			}
		}
	});
	
	return hash;
}

var createGroupsFromHash = function(hash, group_size){
	var groups = [];
	while(Object.keys(hash).length != 0){
		// find dish who has max count
		var maxDishCount = 0;
		var position = Object.keys(hash)[0];
		for(var key in hash){
			if(hash[key].count > maxDishCount){
				maxDishCount = hash[key].count;
				position = key;
			}
		}
		
		// push this dish to groups
		do{
			// slice to #group_size
			groups.push({
				did: position, 
				count: Math.min(maxDishCount, group_size), 
				oids: hash[position].oids.splice(0, group_size),
				time: hash[position].time
			});
			maxDishCount -= group_size;
		}while(maxDishCount > 0);
		
		// remove this dish from hash
		delete hash[position];
	}
	
	return groups;
}

var fetchOrders = function(type, pack_size){
	return [
		// lock order list
		function(fn){
			db.SELECT(2, function(){
				db.INCR('order:lock:' + type, fn);
			});
		},
		function(lock, fn){
			if(lock != 1){
				fn("CAN NOT GET LOCK");
			}
			else{
				db.LLEN('order:type:' + type, fn);
			}
		},
		// fetch #pack_size orders(order id)
		function(len, fn){
			// nothing in order list
			if(len == 0){
				return fn("EMPTY ORDER LIST");
			}
	
			var fns = [];
			for(var i = 0;i < pack_size;i++){
				fns.push(function(fn){db.LPOP('order:type:'+ type, fn);});
			}
			async.parallel(fns, fn);
		},
		// fetch orders and dishes using order ids
		function(ids, fn){
			var oids = ids.filter(function(id){
				return id != null;
			});
			
			async.parallel([
				async.apply(Order.gets, oids),
				async.apply(Order.getsDishes, oids),
				async.apply(Order.getsExtras, oids),
			].concat(oids.map(function(id){
				// change these orders' status to handling(1)
				return async.apply(Order.changeStatus, id, 1);
			})), fn);
		}
	];
}

// fetch using merge
Order.fetchSmart = function(type, callback){
	var pack_size = settings.sizeOfOrderFetchPackage;
	var group_size = settings.sizeOfDishGroup;

	async.waterfall(
		fetchOrders(type, pack_size).concat(
		[
			// bind order id and dish id, save to db
			function(result, fn){
				var orders = result[0];
				var dishesCollection = result[1];
				
				// stats orders
				var hash = createOrderHash(dishesCollection, orders);
				
				// create order groups
				var groups = createGroupsFromHash(hash, group_size);
				
				// add groups to working list
				saveGroups(type, groups, fn);
		}]),
		function(err, r){
			db.DECR('order:lock:' + type, function(e, lock){
				if(err == "EMPTY ORDER LIST" || err == "CAN NOT GET LOCK"){
					callback();
				}
				else{
					callback(err);
				}
			});
		}
	);
}

// fetch in a simple way
Order.fetchSimple = function(type, callback){
	var pack_size = settings.sizeOfOrderFetchPackage;
	
	async.waterfall(
		fetchOrders(type, pack_size).concat(
		[
			// bind order id and dish id, save to db
			function(result, fn){
				var orders = result[0];
				var dishesCollection = result[1];
				var extrasCollection = result[2];
				
				// create order groups
				fn(null, createLinedOrderGroups(dishesCollection, extrasCollection, orders));
			},
			// add username to groups
			function(groups, fn){
				async.parallel(groups.map(function(group){
					return async.apply(User.getAttr, group.uid, 'nick');
				}), function(err, names){
					fn(err, groups, names);
				});
			},
			// add groups to working list
			function(groups, names, fn){
				groups.forEach(function(group, index){
					groups[index].nick = names[index];
				});
				saveGroups(type, groups, fn);
			}
		]),
		function(err, r){
			db.DECR('order:lock:' + type, function(e, lock){
				if(err == "EMPTY ORDER LIST" || err == "CAN NOT GET LOCK"){
					callback();
				}
				else{
					callback(err);
				}
			});
		}
	);
}

Order.getGroup = function(type, id, callback){
	db.SELECT(2, function(){
		db.HGETALL('order:t' + type + ':working:' + id, function(err, group){
			if(err) return callback(err);
			
			Dish.getEntity(group.dish, function(err, dish){
				if(err) return callback(err);
				
				var _group = group;
				_group.name = dish.name, 
				_group.ename = dish.ename;
				_group.image = dish.image;
				callback(null, _group);
			});
		});
	});
}

Order.getsGroup = function(type, ids, callback){
	async.parallel(ids.map(function(id){
		return async.apply(Order.getGroup, type, id);
	}), callback);
}

Order.getWorkingGroups = function(type, callback){
	var showing_size = settings.sizeOfShowingDishGroup;
	
	db.SELECT(2, function(){
		async.waterfall([
			// get list length and fetch orders to list if needed
			async.apply(Order.fetchOrderIfNeeded, type),
			// get all group id from working list
			function(len, comingGroup, fn){
				db.LRANGE('order:t' + type + ':working', 0, showing_size - 1, fn);
			},
			// get groups info
			function(ids, fn){
				// filter valid id
				Order.getsGroup(type, ids.filter(function(id){
					return id != null;
				}), fn);
			}
		], callback);
	});
}

Order.fetchOrderIfNeeded = function(type, callback){
	var min_group = settings.countOfMinDishGroup;
	
	db.SELECT(2, function(){
		db.LLEN('order:t' + type + ':working', function(err, len){
			if(len < min_group){
				Order.fetch(type, function(err){
					callback(err, len, true);
				});
			}
			else{
				callback(null, len, false);
			}
		});
	});
}

Order.finishGroup = function(type, gid, callback){
	db.SELECT(2, function(){
		async.series([
			// notify user to pick up dish
			function(fn){
				async.waterfall([
					function(fn){
						db.ZRANGE(['order:t' + type + ':working:oid:' + gid, 0, -1, 'WITHSCORES'], fn);
					},
					function(arr, fn){
						db.HGETALL('order:t' + type + ':working:' + gid, function(err, group){
							fn(err, arr, group);
						});
					},
					function(arr, group, fn){
						var pairs = arr.map(function(e, i, a){
							return i % 2 == 0 ? [e, a[i + 1]] : null;
						}).filter(function(e){
							return e != null;
						});
						async.parallel(pairs.map(function(pair){
							return function(fn){
								db.ZINCRBY('order:dishes:finished:' + pair[0], pair[1], group.dish, fn);
							};
						}), function(err){
							fn(err, pairs.map(function(pair){
								return pair[0];
							}));
						});
					},
					// get order dishes
					function(oids, fn){
						async.parallel(oids.map(function(oid){
							return function(fn){
								db.HGETALL('order:dishes:' + oid, fn);
							};
						}), function(err){
							fn(err, oids);
						});
					},
					// convert to temporarily sset order:dishes:all:oid
					function(orders, fn){
						async.parallel(orders.map(function(order){
							return function(fn){
								var params = ['order:dishes:all:' + oid];
								for(var did in order){
									params.push(order[did]);
									params.push(did);
								}
								db.ZADD.apply(this, params.concat(fn));
							};
						}), function(err, result){
							fn(err, oids, result);
						});
					},
					// calculate intersection of order:dishes:finished:oid and order:dishes:all:oid
					function(oids, olens, fn){
						async.parallel(oids.map(function(oid){
							return function(fn){
								db.ZINTERSTORE('order:dishes:compare:' + oid, 2, 
									'order:dishes:all:' + oid, 'order:dishes:finished:' + oid, fn);
							};
						}), function(err, result){
							fn(err, oids, olens, result);
						});
					},
					// check if order has all finished
					function(oids, olens, oflens, fn){
						async.series(oids.map(function(oid, i){
							return function(fn){
								if(olens[i] == oflens[i]){
									Order.changeStatus(oid, 2, fn);
								}
								else{
									fn();
								}
							}
						}), function(err){
							fn(err, oids);
						});
					},
					// do cleaning
					function(oids, fn){
						async.parallel(oids.map(function(oid){
							return function(fn){
								db.DEL('order:dishes:all:' + oid, fn);
							};
						}).concat(oids.map(function(oid){
							return function(fn){
								db.DEL('order:dishes:compare:' + oid, fn);
							};
						})), fn);
					}
				], fn);
			},
			function(fn){
				db.DEL('order:t' + type + ':working:' + gid, fn);
			},
			function(fn){
				db.DEL('order:t' + type + ':working:oid:' + gid, fn);
			},
			function(fn){
				db.LREM('order:t' + type + ':working', 0 , gid, fn);
			},
			// return length of working list
			function(fn){
				db.LLEN('order:t' + type + ':working', fn);
			}
		], function(err, result){
			callback(err, result[result.length - 1]);
		});
	});
}

Order.getValveLock = function(fn){
	db.SELECT(2, function(){
		db.GET('global:lock', function(err, lock){
			if(err || lock == 1){
				fn('locked');
			}
			else{
				fn();
			}
		});
	});
}
