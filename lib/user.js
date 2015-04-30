var redis = require('redis');
var bcrypt = require('bcrypt');
var db = redis.createClient();

module.exports = User;

function User(obj) {
	for (var key in obj){
		this[key] = obj[key];
	}
}

User.prototype.save = function(callback){
	/* already saved */
	if(this.wwid){
		this.update(callback);
	}
	else{
		var user = this;

		/* hash user's password before save to database */
		user.hashPassword(function(err){
			if(err) return callback(err);
			user.update(callback);
		});
	}
}

User.prototype.update = function(callback){
	var user = this;
	var multi = db.multi();
	
	multi.SET('email:' + user.email + ':wwid', user.wwid);
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
	
	/* generate salt */
	bcrypt.genSalt(12, function(err, salt){
		if(err){
			return callback(err);
		}
		
		/* save salt in user */
		user.salt = salt;
		
		/* hash the password */
		bcrypt.hash(user.password, salt, function(err, hash){
			if(err){
				return callback(err);
			}
				
			/* replace user's original password with hashed one */
			user.password = hash;
			
			/* password is successfully hashed */
			callback();
		});
	});
}

User.checkExist = function(email, wwid, callback){
	db.EXISTS('user:' + wwid, function(err, exist){
		if(err){
			return callback(err);
		}
		
		if(exist == "1"){
			/* wwid already exists */
			return callback("exist");
		}
		db.EXISTS('email:' + email + ':wwid', function(err, exist){
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
	db.GET('email:' + email + ':wwid', callback);
}

User.get = function(id, callback){
	db.HGETALL('user:' + id, function(err, user){
		if(err){
			return callback(err);
		}
		callback(null, new User(user));
	});
}

User.auth = function(email, pass, callback){
	User.getByEmail(email, function(err, user){
		if(err){
			return callback(err);
		}
		bcrypt.hash(pass, user.salt, function(err, hash){
			if(err){
				return callback(err);
			}
			if(hash == user.password){
				return callback(null, user);
			}
			
			/* invalid password */
			callback();
		});
	});
}