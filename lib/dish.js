var redis = require('redis');
var db = redis.createClient();

module.exports = Dish;

function Dish(obj) {
	for (var key in obj){
		this[key] = obj[key];
	}
}

Dish.prototype.save = function(callback){
	var dish = this;
	
	db.SELECT(1, function(){
		// get next dish's id
		var id = db.INCR('global:dish:next');
		
		// save dish to database
		db.HMSET('dish:' + id, dish, function(err){
			if(err){
				db.DEL('dish:' + id);
				db.DECR('global:dish:next');
				return callback(err);
			}
		});
		
		
		// add dish to it's type set
		db.SADD('dish:type:' + dish.type, id, function(err){
			if(err){
				db.SREM('dish:type:' + dish.type, id);
				db.DEL('dish:' + id);
				db.DECR('global:dish:next');
				return callback(err);
			}
		});
		
		// callback with no error
		callback();
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
				
				dishes.push(dish);
			});
		}
		
		// successfully retrieved all dishes, callback to caller
		callback(null, dishes);
	});
}

Dish.get = function(id, callback){
	db.SELECT(1, function(){
		db.HGETALL('dish:' + id, function(err, dish){
			if(err) return callback(err);
			
			callback(null, dish);
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


/***********************************************
 * add dish to current available set
 * will not check whether the id exists
 ***********************************************/
Dish.addToCurrent = function(id, callback){
	db.SELECT(1, function(){
		db.SADD('dish:current', id, function(err){
			if(err) return callback(err);
			
			// the given id is added to current set, callback with no error
			callback();
		});
	});
}

Dish.clearCurrent = function(callback){
	db.SELECT(1, function(){
		db.DEL('dish:current', function(err){
			if(err) return callback(err);
			
			// successfully cleared current set, callback with no error
			callback();		
		});
	}
}

Dish.removeFromCurrent = function(id, callback){
	db.SELECT(1, function(){
		db.SREM('dish:current', id, function(err){
			if(err) return callback(err);
			
			// the given id is removed from current set, callback with no error
			callback();
		});
	});
}

Dish.randomFromCurrent = function(count, callback){
	db.SELECT(1, function(){
		db.SRANDMEMBER('dish:current', count, function(err, result){
			if(err) return callback(err);
			
			// callback with the random ids
			callback(null, result);			
		});
	});
}
