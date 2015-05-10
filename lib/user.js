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
	var user = this;

	/* hash user's password before save to database */
	user.hashPassword(function(err){
		if(err) return callback(err);
		user.update(callback);
	});
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
		/* user does not exist */
		if(!user.wwid){
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
	db.EXISTS('user:' + id, function(err, exist){
		if(err){
			return callback(err);
		}
		
		if(exist == "0"){
			/* user does not exists */
			return callback("not exist");
		}
		db.HGET('user:' + wwid, attr, function(err, val){
			if(err){
				return callback(err);
			}

			/* return attribute value via callback */
			callback(null, val);
		});
	});

}

User.getAuth = function(wwid, callback){
	User.getAttr(wwid, 'type', function(err, type){
		if(err){
			return callback(err);
		}

		db.HGETALL('user:auth:' + type, function(err, auth){
			if(err){
				return callback(err);
			}

			callback(null, auth);
		});
	});
}
