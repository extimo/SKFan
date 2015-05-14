var redis = require('redis');
var settings = require('../settings');
var db = redis.createClient();
var async = require('async');

module.exports = Order;

///////////////////////////////////////////////////////////////////////////////////
// prototype
///////////////////////////////////////////////////////////////////////////////////

/**********************************
 * basic structure of order (~ means should be given when create):
 * .type ~
 * .wwid ~
 * .id
 * .total 
 *
 * structure of order:dishes
 * .dish_id : count
 *
 **********************************/

function Order(obj) {
	for (var key in obj){
		this[key] = obj[key];
	}
}

Order.prototype.countPrice = function(callback){
	var ids = this.dishes;

	Dish.gets(ids, function(err, dishes){
		if(err) return callback(err);
	
		// map dishes.price to prices 
		var prices = dishes.map(function(dish){
			return dish.price;
		});
		
		// fold prices to total
		this.total = prices.reduce(function(tot, price){
			return tot + price;
		}, 0);
		
		// count finished
		callback();
	});
}

Order.prototype.place = function(callback){
	var order = this;
	
	// set place datetime for this order
	order.placeTime = new Date().toLocalString();
	
	async.series([
		// count total price of the order
		async.apply(order.countPrice),
		// save order to db2
		async.apply(db.SELECT, 2),
		// start procedure
		async.apply(async.waterfall, [
			// get next order's id
			async.apply(db.INCR, 'global:order:next'),
			function(id, fn){
				order.id = id;
				async.series([
					// save order dishes to order:dishes:id
					function(fn){
						var dishes = order.dishes;
						// remove dishes from order
						delete order.dishes;
						
						db.HMSET('order:dishes:' + order.id, dishes, fn);
					},
					// entity save to order:id
					async.apply(db.HMSET, 'order:' + order.id, order),
					// push order.id to type list
					async.apply(db.LPUSH, 'order:type:' + order.type, order.id)
				], fn);
			}]
		)],
		function(err){
			
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


Order.get = function(id, callback){
	db.SELECT(2, function(){
		db.HGETALL('order:' + id, callback);
	});
}

Order.gets = function(ids, callback) {
	db.SELECT(2, function() {
		var fns = [];
		for(var i = 0;i < ids.length;i++){
			fns.push(Order.get.bind({}, ids[i]));
		}
		async.parallel(fns, callback);
	});
}

Order.getDishes = function(ids, callback){
	db.SELECT(2, function(){
		db.HGETALL('order:dishes:' + id, callback);
	});
}

Order.getsDishes = function(ids, callback){
	db.SELECT(2, function() {
		var fns = [];
		for(var i = 0;i < ids.length;i++){
			fns.push(Order.getDishes.bind({}, ids[i]));
		}
		async.parallel(fns, callback);
	});
}


// fetch a batch of order, unpack them and add to working list
// will callback with error "EMPTY ORDER LIST" if order list is empty
// will clear current working list
Order.fetch = function(type, callback){
	var pack_size = settings.sizeOfOrderFetchPackage;
	var group_size = settings.sizeOfOrderGroup;

	db.SELECT(2, function(){
		async.waterfall([
			async.apply(db.LLEN, 'order:type:' + type),
			function(len, fn){
				// nothing in order list
				if(len == 0){
					return fn("EMPTY ORDER LIST");
				}
				
				// clear working list
				async.series([
					async.apply(db.DEL, 'order:working:list'),
					async.apply(db.DEL, 'order:working:packs'),
				], fn);
			},
			// fetch #pack_size orders(order id)
			function(nothing, fn){
				var fns = [];
				for(var i = 0;i < pack_size;i++){
					fns.push(async.apply(db.RPOP, 'order:type:'+ type));
				}
				async.series(fns, fn);
			},
			// fetch user id and dishes id using order ids
			function(ids, fn){
				var oids = ids.filter(function(id){
					return id != null;
				});
				
				async.parallel([
					async.apply(Order.gets, oids),
					async.apply(Order.getsDishes, oids),
				], fn);
			},
			// bind user id, order id and dish id
			function(result, fn){
				var orders = result[0];
				var didCollection = result[1];
				var uidCollection = orders.map(function(order){
					return order.wwid;
				});
				var oidCollection = orders.map(function(order){
					return order.wwid;
				});
			}],
			function(err, r){
			
			}
		);
	});
}

