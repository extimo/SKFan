var express = require('express');
var router = express.Router();
var multipart = require('connect-multiparty');
var uploadDir = require('path').join(__dirname, '../upload');
var auth = require('../lib/middleware/auth');

var User = require('../lib/user');
var path = require('path');
var fs = require('fs');
var join = path.join;
var crypto = require('crypto');
var gm = require('gm');

/************************<yemao>****************************/
var url = require('url');
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'QQ',
    auth: {
        user: '564494052@qq.com',
        pass: 'sai@564494'
    }
});
/**************************</yemao>******************************/

/* GET signout page. */
router.get('/signout', signout());

/* POST signin data. */
router.post('/signin', signin());

/* check weixin binding. */
router.get('/weixinCheck', auth('user'), function(req, res, next) {
	res.redirect(getRedirectLocation(req));
});

/* if already signed in, redirect */
router.use(function(req, res, next) {
	if(req.session.auth && req.session.auth['authed']){
		res.redirect(getRedirectLocation(req));
	}
	else{
		next();
	}
});

/* try cookie auth */
router.use(function(req, res, next) {
	if(req.cookies.signined){
		req.session.auth = req.cookies.auth;
		req.session.auth['authed'] = true;
		req.session.wwid = req.cookies.wwid;
			
		res.redirect(getRedirectLocation(req));
	}
	else{
		next();
	}
});

/* GET signin page. */
router.get('/signin', function(req, res, next) {
	if(req.query.next){
		req.session.next = req.query.next;
	}
	res.render('signin');
});


/* GET signup page. */
router.get('/signup', function(req, res, next) {
	res.render('signup');
});

/************************<yemao>***********************************/
router.get('/signin/active', function(req, res, next) {
	var token = url.parse(req.url).query;
	if(token.length == 0){
		console.log(err);
	}
	else{
		console.log(token);
		res.redirect('/signout');
	}
});

/***************************</yemao>***********************************/

/* POST signup data. */
router.post('/signup', multipart({uploadDir: uploadDir}), signup(uploadDir));

/* GET other pages that does not exist */
router.use(function(req, res, next) {
	res.redirect('/account/signin');
});

module.exports = router;

/********************************************************/

function getRedirectLocation(req, url){
	if(req.query.next){
		return req.query.next;
	}
	else if(req.session.next){
		var next = req.session.next;
		req.session.next = null;
		return next;
	}
	else if(url){
		return url;
	}
	else{		
		return req.session.auth.home;
	}
}

function signup(dir){
	return function(req, res, next) {
		var data = req.body.user;

/************************<yemao>****************************/
			var mail = data.email + "@163.com";
			var nick = data.nickname;
			var token = data.wwid+"intel";
			var html = "<p>"+nick+",您好：<p/><p>我们收到您在 SKFan 的注册申请，请点击下面的链接激活帐户：</p><a href='http://ecafe.pub/account/signin/active?"+token+"'>请点击本链接激活帐号</a>"


			var mailOptions = {
		    from: '564494052@qq.com ', 
		    to: mail, 
		    subject: 'signup ', 
		    text: 'intel-signup ', 
		    html: html 
			};

			transporter.sendMail(mailOptions, function(error, info){
		    if(error){
		        console.log(error);
		    }else{
		        console.log('Message sent: ' + info.response);
		    }
			});

/**************************</yemao>******************************/


		User.checkExist(data.email, data.wwid, function(err){
			if(err){
				fs.unlinkSync(req.files.user.portrait.path);
				res.error("email or wwid already taken!");
				res.redirect("back");
			}else{
				var user = new User({
					wwid: data.wwid,
					nick: data.nickname,
					pass: data.password,
					email: data.email,
					phone: data.phone,
					token: token,
					balance: 0,
					port: "default"
				});

				// move & rename user's portrait
				if(req.files.user.portrait.name){
					var img = req.files.user.portrait;
					if(img.size > 1024 * 1024){
						res.error("portrait image should smaller than 1M!");
						res.redirect("back");
						return;
					}
					if(img.type !== "image/jpeg" && img.type !== "application/octet-stream"){
						console.log('err: ' + img.type);
						res.error("only accept portrait image of type jpg/jpeg!");
						res.redirect("back");
						return;
					}
		
					var name = new Date().getTime().toString();
					var md5 = crypto.createHash('md5');
					md5.update(name);
					name = md5.digest('hex');
					name = name.substring(0,8);
					var path = join(dir, name + ".jpg");
					var thumb_path = join(dir, name + ".thumb.jpg");
					fs.rename(img.path, path, function(err){
						if(err){
							fs.unlinkSync(img.path);
							return next(err);
						}
						
						gm(path).thumb(100, 100, thumb_path, 100, function(err){
							if(err){
								console.log(err);
								fs.unlinkSync(path);
								return next(err);
							}
						});
						
						user.port = name;
						saveUser(req, res, next, user);
					});	
				}else{
					fs.unlinkSync(req.files.user.portrait.path);
					saveUser(req, res, next, user);
				}
			}
		});
	};
}

function saveUser(req, res, next, user){
	// grant as user first
	user.type = 'user';

	// save user to db
	user.save(function(err){
		if (err){
			console.log(err);
			return next(err);
		}
		authedUser(user, req, res, next);
	});
}

function authedUser(user, req, res, next){
	User.getAuth(user.wwid, function(err, auth){
		if(err){
			console.log(err);
			return next(err);
		}
		
		if(user.type == 'kitchen'){
			auth['kit_bind'] = user.kit;
		}
		req.session.auth = auth;
		req.session.auth['authed'] = true;
		req.session.wwid = user.wwid;
		if(user.type == 'kitchen'){
			req.session.auth['kit_bind'] = user.kit;
		}
		
		var cookieProp = {maxAge: 60000 * 60};
		res.cookie('signined', true, cookieProp);
		res.cookie('auth', auth, cookieProp);
		res.cookie('wwid', user.wwid, cookieProp);
		
		if(req.session.next){
			var url = req.session.next;
			req.session.next = null;
			res.redirect(url);
		}
		else{
			res.redirect(auth.home);
		}
	});
}

function signin(){
	return function(req, res, next) {
		var data = req.body.user;
		User.auth(data.email, data.password, function(err, user){
			if(err){
				console.log(err);
				return next(err);
			}
		
			if(user){
				authedUser(user, req, res, next);
			}else{
				res.error("Sorry! invalid credentials!");
				res.redirect('back');
			}
		});
	};
}

function signout(){
	return function(req, res, next) {
		res.clearCookie('signined');
		res.clearCookie('auth');
		res.clearCookie('wwid');
		req.session.destroy(function(err){
			if(err) throw err;
			
			if(req.query.next){
				res.redirect(req.query.next);
			}
			else{
				res.redirect('/account');
			}
		});
	};
}
