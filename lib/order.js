var redis = require('redis');
var db = redis.createClient();
var async = require('async');
var settings = require('../settings');
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
 * basic structure of order (~ means should be given when create):
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
 * 3 informed
 * 4 closed
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

function Order(obj) {
	for (var key in obj){
		this[key] = obj[key];
	}
}

Order.prototype.place = function(callback){
	var order = this;
	
	// set place datetime for this order
	order.placeTime = new Date().toString();
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
					return dish.price;
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
							// save order dishes to order:dishes:id
							function(fn){
								var dishes = {};
								order.dishes.forEach(function(id, index){
									dishes[id] = order.counts[index];
								});
								// remove dishes from order
								delete order.dishes;
								delete order.counts;
						
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
							if(len == 1){
								// call Order.fetchOrderIfNeeded and then broadcast
								Order.fetchOrderIfNeeded(order.type, function(err, nothing, comingGroup){
									if(err){
										console.log(err);
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
						db.HMSET('order:t' + type + ':working:' + gid, 
						{dish: group.did, count: group.count, time: group.time}, fn);
						console.log(orders[index].placeTime);
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

var createLinedOrderGroups = function(dishesCollection, orders){
	var groups = [];
	dishesCollection.forEach(function(dishes, index){
		for(var id in dishes){
			var oids = [];
			
			for(var i = 0;i < dishes[id];i++){
				oids.push(orders[index].id);
			}
			
			groups.push({
				did: id, 
				count: dishes[id], 
				oids: oids,
				time: orders[index].placeTime
			});
			console.log(groups[0].time);
		}
	});
	
	return groups;
}

var createOrderHash = function(dishesCollection, oidCollection){
	var hash = {};
	dishesCollection.forEach(function(dishes, index){
		for(var id in dishes){
			if(!hash[id]){
				var oids = [];
				
				for(var i = 0;i < dishes[id];i++){
					oids.push(oidCollection[index]);
				}
				
				hash[id] = {
					count: parseInt(dishes[id]), 
					oids: oids
				};
			}
			else{
				hash[id].count += parseInt(dishes[id]);
				for(var i = 0;i < dishes[id];i++){
					hash[id].oids.push(oidCollection[index]);
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
				oids: hash[position].oids.splice(0, group_size)
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
			].concat(oids.map(function(id){
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
				var oidCollection = orders.map(function(order){
					return order.id;
				});
				
				// stats orders
				var hash = createOrderHash(dishesCollection, oidCollection);
				
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
				
				// create order groups
				var groups = createLinedOrderGroups(dishesCollection, orders);
				console.log(groups[0].time);
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

Order.getGroup = function(type, id, callback){
	db.SELECT(2, function(){
		db.HGETALL('order:t' + type + ':working:' + id, function(err, group){
			if(err) return callback(err);
			
			Dish.getEntity(group.dish, function(err, dish){
				if(err) return callback(err);
				
				console.log(group.time);
				callback(null, {gid: id, count: group.count, name: dish.name, ename: dish.ename, image: dish.image, time:group.time});
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
								db.ZINCRBY('order:finished:' + pair[0], pair[1], group.dish, fn);
							}
						}), fn);
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
			callback(err, result[4]);
		});
	});
}
