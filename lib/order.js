var redis = require('redis');
var db = redis.createClient();

module.exports = Order;

///////////////////////////////////////////////////////////////////////////////////
// prototype
///////////////////////////////////////////////////////////////////////////////////

function Order(obj) {
	for (var key in obj){
		this[key] = obj[key];
	}
}

Order.prototype.save = function(callback){
	if(this.id){
		// order exists in db, so update it
		this.update(callback);
	}else{		
		var order = this;
		db.SELECT(1, function(){
			// get next order's id
			order.id = db.INCR('global:order:next');
			order.update(callback);
		});
	}	
};

Order.prototype.update = function(callback){
	var order = this;
	
	db.SELECT(1, function(){
		var id = order.id;

		async.series([
			// remove type-id and name-id if exist (i.e. update action)
			function(fn){
				db.HGETALL('order:' + order.id, function(err, orgin){
					if(!err){
						db.SREM('order:type:' + orgin.type, id);
						db.HDEL('order:names', orgin.name, orgin.ename);
					}
				});
			},
			// entity save to order:id
			function(fn){
				db.HMSET('order:' + id, order, fn);
			},
			// add to type-id set
			function(fn){
				db.SADD('order:type:' + order.type, id, fn);
			},
			// add its' chinese name and english name to name-id set
			function(fn){
				db.HSET('order:names', order.name, id, fn);
			},
			function(fn){
				db.HSET('order:names', order.ename, id, fn);
			},
		],
		function(err){
			if(err){
				return callback(err);
			}
			callback();
		});
	});
};

Order.prototype.remove = function(callback){
	var order = this;

	db.SELECT(1, function(){
		db.SREM('order:type:' + order.type, order.id);
		db.SREM('order:current:type:' + order.type, order.id);
		db.HDEL('order:names:', order.name, order.ename);
		db.DEL('order:' + id);
		if(callback) callback();
	});
};

Order.prototype.available = function(callback){
	var order = this;

	db.SELECT(1, function(){
		db.SADD('order:current:type:' + order.type, id, function(err){
			if(err) {
				return callback(err);
			}
			// the given id is added to current set, callback with no error
			callback();
		});
	});	
};

Order.prototype.unavailable = function(callback){
	var order = this;

	db.SELECT(1, function(){
		db.SREM('order:current:type:' + order.type, id);
		if(callback) callback();
	});	
};

///////////////////////////////////////////////////////////////////////////////////
// all orderes
///////////////////////////////////////////////////////////////////////////////////

Order.getType = function(type, callback){
	db.SELECT(1, function(){
		db.SMEMBERS('order:type:' + type, function(err, ids){
			if(err) return callback(err);

			Order.gets(ids, function(err, orderes){
				if(err) return callback(err);
			
				// successfully retrieved all orderes of #type, callback to caller
				callback(null, orderes);
			});
		});
	});
};

Order.get = function(id, callback){
	db.SELECT(1, function(){
		db.HGETALL('order:' + id, function(err, order){
			if(err) return callback(err);
			
			callback(null, new Order(order));
		});
	});
}

Order.gets = function(ids, callback) {
	var orderes = [];
	
	db.SELECT(1, function() {
		ids.forEach(function(id){
			Order.get(id, function(err, order){
				if(err) return callback(err);
				
				orderes.push(order);
			});
		});
		
		callback(null, orderes);
	});
};

Order.remove = function(id, callback){
	Order.get(id, function(err, order){
		if(err) return callback(err);

		order.remove();
		callback();
	});
};

Order.find = function(name, callback){
	db.SELECT(1, function() {
		db.HGET('order:names', name, function(err, id){
			if(err) return callback(err);

			Order.get(id ,callback);
		});
	});
};

///////////////////////////////////////////////////////////////////////////////////
// current orderes
///////////////////////////////////////////////////////////////////////////////////


/***********************************************************
 * add order to current available set
 * error returns when the id cannot be found in all orderes
 ***********************************************************/
Order.addToCurrent = function(id, callback){
	Order.get(id, function(err, order){
		if(err) return callback(err);

		order.available(callback);
	});
};

/***********************************************************
 * clear current orderes set of #type
 ***********************************************************/
Order.clearCurrentType = function(type, callback){
	db.SELECT(1, function(){
		// clear current orderes of #type
		db.DEL('order:current:type:' + type);
		
		if(callback) callback();
	});
}

/***********************************************************
 * clear all current orderes set
 ***********************************************************/
Order.clearCurrent = function(type, callback){
	db.SELECT(1, function(){
		// clear current orderes of all types
		var types = db.KEYS('order:current:type:*');
		db.DEL.apply(this, types);
		
		if(callback) callback();
	});
};

/***********************************************************
 * remove order from current orderes set
 * error returns when the id cannot be found in all orderes
 ***********************************************************/
Order.removeFromCurrent = function(id, callback){
	Order.get(id, function(err, order){
		if(err) return callback(err);

		order.unavailable(callback);
	});
}

/***********************************************************
 * random #count order ids from current orderes set
 * current orderes comes from union of all types
 * cache enabled 
 ***********************************************************/
Order.randomFromCurrent = function(count, callback){
	db.SELECT(1, function(){
		// try get from cache
		db.SRANDMEMBER('order:current:all', count, function(err, orderes){
			// cache expired, will now build new cache
			if(err){
				async.waterfall([
					function(fn){
						db.KEYS('order:current:type:*', fn);
					}
					function(keys, fn){
						db.SUNIONSTORE.apply(this, ['order:current:all'].concat(keys).concat([fn]));
					},
					function(ok, fn){
						db.SRANDMEMBER('order:current:all', count, fn);
					}
				],
				function(err, orderes){
					if(err) callback(err);
					
					// callback with the random ids
					callback(null, orderes);			
				});
			}
			
			// callback with the random ids
			callback(null, orderes);			
		});
	});
}

/***********************************************************
 * get all order ids of #type from current orderes set
 * return null if no order of #type exists in current set
 ***********************************************************/
 Order.getCurrentType = function(type, callback){
	db.SELECT(1, function(){
		db.SMEMBERS('order:current:type:' + type, function(err, ids){
			if(err) return callback(err);

			Order.gets(ids, function(err, orderes){
				if(err) return callback(err);

				callback(null, orderes);	
			});
		});
	});
}	
