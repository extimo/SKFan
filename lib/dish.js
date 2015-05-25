var redis = require('redis');
var db = redis.createClient();
var async = require('async');

module.exports = Dish;

///////////////////////////////////////////////////////////////////////////////////
// prototype
///////////////////////////////////////////////////////////////////////////////////

function Dish(obj) {
	for (var key in obj){
		this[key] = obj[key];
	}
}

Dish.prototype.save = function(callback){
	if(this.id){
		// dish exists in db, so update it
		this.update(callback)
	}else{		
		var dish = this;
		db.SELECT(1, function(){
			// get next dish's id
			db.INCR('dish:next', function(err, id){
				if(err) return callback(err);
				dish.id = id;
				dish.update(callback);
			});
		});
	}	
}

Dish.prototype.update = function(callback){
	var dish = this;
	
	db.SELECT(1, function(){
		var id = dish.id;

		async.series([
			// remove type-id and name-id if exist (i.e. update action)
			function(fn){
				db.HGETALL('dish:' + id, function(err, orgin){
					if(err) fn(err);
					
					if(orgin){
						db.SREM('dish:type:' + orgin.type, id);
						db.HDEL('dish:names', orgin.name, orgin.ename);
					}
					
					fn();
				});
			},
			// entity save to dish:id
			function(fn){
				db.HMSET('dish:' + id, dish, fn);
			},
			// add to type-id set
			function(fn){
				db.SADD('dish:type:' + dish.type, id, fn);
			},
			// add its' chinese name and english name to name-id set
			function(fn){
				if(dish.name){
					db.HSET('dish:names', dish.name, id, fn);
				}
				else fn();
			},
			function(fn){
				if(dish.ename){
					db.HSET('dish:names', dish.ename, id, fn);
				}
				else fn();
			},
		],
		function(err){
			callback(err);
		});
	});
}

Dish.prototype.remove = function(callback){
	var dish = this;

	db.SELECT(1, function(){
		db.SREM('dish:type:' + dish.type, dish.id);
		db.SREM('dish:current:type:' + dish.type, dish.id);
		db.HDEL('dish:names:', dish.name, dish.ename);
		db.DEL('dish:' + dish.id);
		if(callback) callback();
	});
}

Dish.prototype.available = function(callback){
	var dish = this;

	db.SELECT(1, function(){
		db.SADD('dish:current:type:' + dish.type, dish.id, callback);
	});	
}

Dish.prototype.unavailable = function(callback){
	var dish = this;

	db.SELECT(1, function(){
		db.SREM('dish:current:type:' + dish.type, dish.id, callback);
	});	
}

///////////////////////////////////////////////////////////////////////////////////
// all dishes
///////////////////////////////////////////////////////////////////////////////////

Dish.getType = function(type, callback){
	db.SELECT(1, function(){
		db.SMEMBERS('dish:type:' + type, function(err, ids){
			if(err) return callback(err);
			
			Dish.gets(ids, callback);
		});
	});
}

Dish.get = function(id, callback){
	db.SELECT(1, function(){
		db.HGETALL('dish:' + id, function(err, dish){
			if(dish){
				callback(err, new Dish(dish));
			}
			else{
				callback(err)
			}
		});
	});
}

Dish.getEntity = function(id, callback){
	db.SELECT(1, function(){
		db.HGETALL('dish:' + id, function(err, dish){
			if(dish){
				callback(err, dish);
			}
			else{
				callback(err)
			}
		});
	});
}

Dish.gets = function(ids, callback) {
	db.SELECT(1, function() {
		async.series(ids.map(function(id){
			return async.apply(Dish.getEntity, id);
		}), callback);
	});
}

Dish.remove = function(id, callback){
	Dish.get(id, function(err, dish){
		if(err) return callback(err);

		dish.remove(callback);
	});
}

Dish.find = function(name, callback){
	db.SELECT(1, function() {
		db.HGET('dish:names', name, function(err, id){
			if(err) return callback(err);

			Dish.get(id, callback);
		});
	});
}

///////////////////////////////////////////////////////////////////////////////////
// current dishes
///////////////////////////////////////////////////////////////////////////////////


/***********************************************************
 * add dish to current available set
 * error returns when the id cannot be found in all dishes
 ***********************************************************/
Dish.addToCurrent = function(ids, callback){
	var fns = [];
	var afn = function(id, fn){
		Dish.get(id, function(err, dish){
			if(err) return fn(err);

			dish.available(fn);
		});
	}
	for(var i = 0;i < ids.length;i++){
		fns.push(afn.bind({}, ids[i]));
	}
	async.series(fns, callback);
}

/***********************************************************
 * clear current dishes set of #type
 ***********************************************************/
Dish.clearCurrentType = function(type, callback){
	db.SELECT(1, function(){
		// clear current dishes of #type
		db.DEL('dish:current:type:' + type, callback);
	});
}

/***********************************************************
 * clear all current dishes set
 ***********************************************************/
Dish.clearCurrent = function(callback){
	db.SELECT(1, function(){
		// clear current dishes of all types
		var types = db.KEYS('dish:current:type:*');
		db.DEL.apply(this, types.concat(callback));
	});
}

/***********************************************************
 * remove dish from current dishes set
 * error returns when the id cannot be found in all dishes
 ***********************************************************/
Dish.removeFromCurrent = function(ids, callback){
	var fns = [];
	var afn = function(id, fn){
		Dish.get(id, function(err, dish){
			if(err) return fn(err);

			dish.unavailable(fn);
		});
	}
	for(var i = 0;i < ids.length;i++){
		fns.push(afn.bind({}, ids[i]));
	}
	async.series(fns, callback);
}

/***********************************************************
 * random #count dish ids from current dishes set
 * current dishes comes from union of all types
 * cache enabled 
 ***********************************************************/
/* unused
Dish.randomFromCurrent = function(count, callback){
	db.SELECT(1, function(){
		// try get from cache
		db.SRANDMEMBER('dish:current:all', count, function(err, dishes){
			// cache expired, will now build new cache
			if(err){
				async.waterfall([
					function(fn){
						db.KEYS('dish:current:type:*', fn);
					},
					function(keys, fn){
						db.SUNIONSTORE.apply(this, ['dish:current:all'].concat(keys).concat([fn]));
					},
					function(ok, fn){
						db.SRANDMEMBER('dish:current:all', count, fn);
					}
				],
				function(err, dishes){
					if(err) callback(err);
					
					// callback with the random ids
					callback(null, dishes);			
				});
			}
			
			// callback with the random ids
			callback(null, dishes);			
		});
	});
}
*/


/***********************************************************
 * get all dish ids of #type from current dishes set
 * return null if no dish of #type exists in current set
 ***********************************************************/
Dish.getCurrentType = function(type, callback){
	db.SELECT(1, function(){
		db.SMEMBERS('dish:current:type:' + type, function(err, ids){
			if(err) return callback(err);

			Dish.gets(ids, callback);
		});
	});
}

Dish.getCurrentTypeIds = function(type, callback){
	db.SELECT(1, function(){
		db.SMEMBERS('dish:current:type:' + type, callback);
	});
}
