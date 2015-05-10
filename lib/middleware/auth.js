module.exports = function(type, url){
	return function(req, res, next){
		if(req.session.auth && req.session.auth[type] == "true"){
			return next();
		}

		if(url){
			res.redirect(url);
		}
		res.end('To view this page, you need to authenticate as ' + type);
	}
}
