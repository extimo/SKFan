module.exports = function(type, url){
	return function(req, res, next){
		if(req.session.auth && req.session.auth[type] == "true"){
			return next();
		}

		if(url){
			res.redirect(url);
		}
		else{
			res.end('Your user account does not have sufficient privileges to access this page.');
		}
	}
}
