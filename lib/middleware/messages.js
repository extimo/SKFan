var express = require('express');
var res = express.response;
/*
函数功能：前端页面的提示信息分类；
*/
res.message = function(msg, type){
	type = type || 'info';
	var sess = this.req.session;
	sess.messages = sess.messages || [];
	sess.messages.push({type: type, string: msg});
}

res.error = function(msg){
	return this.message(msg, 'danger');
}
/*
函数功能：将页面提示信息放入res返回给前端页面；
*/
module.exports = function(req, res, next){
	res.locals.messages = req.session.messages || [];
	res.locals.removeMessages = function(){
		req.session.messages = [];
	}
	next();
}
