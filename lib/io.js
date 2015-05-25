var Order = require('./order');
var settings = require('../settings');

module.exports = function(io){
	io.sockets.on('connection', function(socket){
		console.log('new sock connected.');
		socket.emit('connected');
		socket.on('getAllGroups', function(type){
			Order.getWorkingGroups(type, function(err, groups){
				if(err){
					console.log('io.getAllGroups.getWorkingGroups: ' + err);
				}
				else{
					socket.emit('allGroups:' + type, groups);
				}
			});
		});
		socket.on('finishGroup', function(type, gid){
			Order.finishGroup(type, gid, function(err, len){
				if(err){
					console.log('io.finishGroup: ' + err);
				}
				else{
					if(len < settings.countOfMinDishGroup){
						Order.getWorkingGroups(type, function(err, groups){
							if(err){
								console.log('io.finishGroup.getWorkingGroups: ' + err);
							}
							else{
								socket.emit('allGroups:' + type, groups)
							}
						});
					}
				}
			});
		});
		socket.on('ping', function(){
			socket.emit('pong');
		});
	});
}
