module.exports = function(io){
	return function(req, res, next){
		res.locals.io = io;
		next();
	};
}
