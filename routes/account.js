var User = require('../lib/user');

exports.signup = function(req, res, next) {
	var data = req.body.user;
	User.checkExist(user.email, user.wwid, function(err){
		if(err){
			res.error("email or wwid already taken!");
			res.redirect("back");
		}else{
			var user = new User({
				wwid: data.wwid,
				nick: data.nick,
				password: data.password,
				email: data.email
			});
			
			user.save(function(err){
				if (err) return next(err);
				req.session.wwid = user.wwid;
				res.redirect('/');
			})
		}
	})
});

exports.signin = function(req, res, next) {
	var data = req.body.user;
	User.auth(user.email, user.password, function(err, user){
		if(err){
			return next(error);
		}
		
		if(user){
			req.session.wwid = user.wwid;
			req.redirect('/');
		}else{
			res.error("Sorry! invalid credentials!");
			res.redirect('back');
		}
	})
});

exports.signout = function(req, res, next) {
	req.session.destroy(function(err){
		if(err) throw err;
		res.redirect('/');
	});
}