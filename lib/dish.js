var redis = require('redis');
var db = redis.createClient();

module.exports = Dish;

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
			dish.id = db.INCR('global:dish:next');
			dish.update(callback);
		});
	}	
}

Dish.prototype.update = function(callback){
	var dish = this;
	
	db.SELECT(1, function(){
		var id = dish.id;
		
		// save dish to database
		db.HMSET('dish:' + id, dish, function(err){
			if(err){
				return callback(err);
			}
			
			// add dish to it's type set
			db.SADD('dish:type:' + dish.type, id, function(err){
				if(err){
					return callback(err);
				}
				
				// callback with no error
				callback();
			});
		});
	});
}

///////////////////////////////////////////////////////////////////////////////////
// all dishes
///////////////////////////////////////////////////////////////////////////////////

Dish.getAll = function(callback){
	var dishes = [];
	
	db.SELECT(1, function(){
		var count = db.GET('global:dish:next');
	
		for(var i = 1;i <= count;i++){
			db.HGETALL('dish:' + i, function(err, dish){
				if(err) return callback(err);
				
				dishes.push(new Dish(dish));
			});
		}
		
		// successfully retrieved all dishes, callback to caller
		callback(null, dishes);
	});
}

Dish.getTypeIds = function(type, callback){
	db.SELECT(1, function(){
		db.SMEMBERS('dish:current:type:' + type, function(err, dishes){
			if(err) return callback(err);
			
			// successfully retrieved all dishes of #type, callback to caller
			callback(null, dishes);
		});
	});
}

Dish.get = function(id, callback){
	db.SELECT(1, function(){
		db.HGETALL('dish:' + id, function(err, dish){
			if(err) return callback(err);
			
			callback(null, new Dish(dish));
		});
	});
}

Dish.gets = function(ids, callback) {
	var dishes = [];
	
	db.SELECT(1, function() {
		ids.forEach(function(id){
			Dish.get(id, function(err, dish){
				if(err) return callback(err);
				
				dishes.push(dish);
			});
		});
		
		callback(null, dishes);
	});
}

///////////////////////////////////////////////////////////////////////////////////
// current dishes
///////////////////////////////////////////////////////////////////////////////////


/***********************************************************
 * add dish to current available set
 * error returns when the id cannot be found in all dishes
 ***********************************************************/
Dish.addToCurrent = function(id, callback){
	Dish.get(id, function(err, dish){
		if(err) return callback(err);
		
		db.SELECT(1, function(){
			db.SADD('dish:current', id, function(err){
				if(err) {
					return callback(err);
				}
				
				// add to classified dishes set
				db.SADD('dish:current:type:' + dish.type, id, function(err){
					if(err) {
						db.SREM('dish:current', id)
						return callback(err);
					}
					// the given id is added to current set, callback with no error
					callback();
				});
			});
		});
	});
}

/***********************************************************
 * clear current dishes set of #type
 ***********************************************************/
Dish.clearCurrentType = function(type, callback){
	db.SELECT(1, function(){
		db.DEL('dish:current', function(err){
			if(err) return callback(err);
			
			// clear current dishes of #type
			db.DEL('dish:current:type:' + type, function(err){
				if(err) return callback(err););
			
				// successfully cleared current set, callback with no error
				callback();	
			});
		});
	}
}

/***********************************************************
 * clear all current dishes set
 ***********************************************************/
Dish.clearCurrent = function(type, callback){
	db.SELECT(1, function(){
		db.DEL('dish:current', function(err){
			if(err) return callback(err);
			
			// clear current dishes of all types
			var types = db.KEYS('dish:current:type:*');
			db.DEL(types, function(err){
				if(err) return callback(err););
			
				// successfully cleared current set, callback with no error
				callback();	
			});
		});
	}
}

/***********************************************************
 * remove dish from current dishes set
 * error returns when the id cannot be found in all dishes
 ***********************************************************/
Dish.removeFromCurrent = function(id, callback){
	Dish.get(id, function(err, dish){
		if(err) return callback(err);
		
		db.SELECT(1, function(){
			db.SREM('dish:current', id, function(err){
				if(err) return callback(err);
				
				db.SREM('dish:current：type：' + dish.type, id, function(err){
					if(err) return callback(err);
					
					// the given id is removed from current set, callback with no error
					callback();
				});	
			});
		});
	});
}

/***********************************************************
 * random #count dish ids from current dishes set
 * error returns when the id cannot be found in all dishes
 ***********************************************************/
Dish.randomFromCurrent = function(count, callback){
	db.SELECT(1, function(){
		db.SRANDMEMBER('dish:current', count, function(err, dishes){
			if(err) return callback(err);
			
			// callback with the random ids
			callback(null, dishes);			
		});
	});
}

/***********************************************************
 * get all dish ids of #type from current dishes set
 * return null if no dish of #type exists in current set
 ***********************************************************/
 Dish.getCurrentType = function(type, callback){
	db.SELECT(1, function(){
		db.SMEMBERS('dish:current:type:' + type, function(err, dishes){
			if(err) return callback(err);
			
			// callback with the random ids
			callback(null, dishes);			
		});
	});
}	