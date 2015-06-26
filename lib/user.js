var redis = require('redis');
var bcrypt = require('bcrypt');
var db = redis.createClient();

module.exports = User;

///////////////////////////////////////////////////////////////////////////////////
// prototype
///////////////////////////////////////////////////////////////////////////////////

function User(obj) {
	for (var key in obj){
		this[key] = obj[key];
	}
}

User.prototype.save = function(callback){
	var user = this;

	/* hash user's password before save to database */
	user.hashPassword(function(err){
		if(err){
			return callback(err);
		}
		user.update(callback);
	});
}

User.prototype.update = function(callback){
	var user = this;
	var multi = db.multi();
	
	multi.SADD('user:pool', user.wwid);
	multi.SADD('email:pool', user.email);//yemao
	multi.HSET('email:wwid', user.email, user.wwid);
	multi.HMSET('user:' + user.wwid, user);
	multi.EXEC(function(err, result){
		if(err){
			return callback(err);
		}
		
		callback();
	});
}

User.prototype.hashPassword = function(callback){
	var user = this;
	
	// async does not work	
	user.pass = bcrypt.hashSync(user.pass, 10);
	return callback();

	/* hash the password with salt */
	bcrypt.hash(user.pass, 10, function(err, hash){
		if(err){
			return callback(err);
		}
		
		/* replace user's original password with hashed one */
		user.pass = hash;
	
		/* password is successfully hashed */
		callback();
	});
}

User.prototype.remove = function(callback){
	var user = this;
	
	db.SELECT(0, function(){
		db.SREM('user:pool', user.wwid);
		db.HDEL('email:wwid', user.email);
		db.DEL('user:' + user.wwid);
	});
}

///////////////////////////////////////////////////////////////////////////////////
// functions
///////////////////////////////////////////////////////////////////////////////////

User.checkExist = function(email, wwid, callback){
	db.SISMEMBER('user:pool', wwid, function(err, exist){
		if(err){
			return callback(err);
		}
		
		if(exist == "1"){
			/* wwid already exists */
			return callback("exist");
		}
		db.HEXISTS('email:wwid', email, function(err, exist){
			if(err){
				return callback(err);
			}
			
			if(exist == "1"){
				/* email already exists */
				return callback("exist");
			}
			
			/* the given email and wwid is good to use */
			callback();
		});
	});
}

User.getByEmail = function(email, callback){
	User.getId(email, function(err, id){
		if(err){
			return callback(err);
		}
		User.get(id, callback);
	});
}

User.getId = function(email, callback){
	db.SELECT(0, function(){
		db.HGET('email:wwid', email, callback);
	});
}

User.get = function(id, callback){
	db.SELECT(0, function(){
		db.HGETALL('user:' + id, function(err, user){
			if(user){
				callback(null, new User(user));
			}
			else{
				callback(err);
			}
		});
	});
}

User.gets = function(ids, callback){
	db.SELECT(0, function() {
		var fns = [];
		var afn = function(id, fn){
			User.get(id, fn);
		}
		for(var i = 0;i < ids.length;i++){
			fns.push(afn.bind({}, ids[i]));
		}
		async.series(fns, callback);
	});
}

User.getAll = function(callback){
	db.SELECT(0, function(){
		db.SMEMBERS('user:pool', function(err, ids){
			if(err) return callback(err);
			
			User.gets(ids, callback);
		});
	});
}

User.auth = function(email, pass, callback){
	User.getByEmail(email, function(err, user){
		if(err){
			return callback(err);
		}
		/* user does not exist */
		if(!user){
			return callback();
		}
		bcrypt.compare(pass, user.pass, function(err, checked){
			if(err){
				return callback(err);
			}
			if(checked){
				return callback(null, user);
			}
			
			/* invalid password */
			callback();
		});
	});
}

User.getPortrait = function(wwid, callback){
	User.getAttr(wwid, 'port', callback);
}

User.getAttr = function(id, attr, callback){
	db.SELECT(0, function(){
		db.HGET('user:' + id, attr, callback);
	});
}

User.setAttr = function(id, attr, val, callback){
	db.SELECT(0, function(){
		db.HSET('user:' + id, attr, val, callback);
	});
}

User.getAuth = function(wwid, callback){
	User.getAttr(wwid, 'type', function(err, type){
		if(err){
			return callback(err);
		}

		db.SELECT(0, function(){
			db.HGETALL('user:auth:' + type, callback);
		});
	});
}

User.consume = function(id, amount, callback){
	User.getAttr(id, 'balance', function(err, balance){
		if(err){
			return callback(err);
		}
		if(balance < amount){
			return callback('余额不足');
		}
		
		User.setAttr(id, 'balance', parseInt(balance) - amount, callback);
	});
}

/************************<yemao>***********************************/
User.inCharge = function(id, amount, callback){
	User.getAttr(id, 'balance', function(err, balance){
		if(err){
			return callback(err);
		}
		
		User.setAttr(id, 'balance', parseInt(balance) + amount, callback);
	});
}
/************************</yemao>***********************************/
