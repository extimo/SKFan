var Order = require('./order');
var settings = require('../settings');

module.exports = function(io){
	io.sockets.on('connection', function(socket){
		var _type = null;
		
		socket.on('join',  function(type){
			console.log('new sock connected.');
			socket.join(type);
			_type = type;
			Order.getWorkingList(_type, function(err, orders){
				if(err){
					console.log('io.join: ' + err);
				}
				else{
					socket.emit('workingList', {list: orders, newly: false});
					Order.getPickingList(_type, function(err, orders){
						if(err){
							console.log('io.join: ' + err);
						}
						else{
							socket.emit('pickingList', orders);
						}
					});
				}
			});
		});
		socket.on('finishOrder', function(id){
			if(!_type){	
				socket.emit('pong', _type);
				return;
			}
			Order.finishOrder(_type, id, function(err, len){
				if(err){
					console.log('io.finishOrder: ' + err);
				}
				else{
					Order.getWorkingList(_type, function(err, orders){
						if(err){
							console.log('io.finishOrder.getWorkingList: ' + err);
						}
						else{
							socket.emit('workingList', {list: orders, newly: false});
							socket.to(_type).emit('workingList', {list: orders, newly: false});
							Order.getPickingList(_type, function(err, orders){
								if(err){
									console.log('io.finishOrder.getPickingList: ' + err);
								}
								else{
									socket.emit('pickingList', orders);
									socket.to(_type).emit('pickingList', orders);
								}
							});
						}
					});
				}
			});
		});
		socket.on('cancelOrder', function(id){
			if(!_type){	
				socket.emit('pong', _type);
				return;
			}
			Order.cancelOrder(_type, id, function(err){
				if(err){
					console.log('io.cancelOrder: ' + err);
				}
				else{
					Order.getWorkingList(_type, function(err, orders){
						if(err){
							console.log('io.cancelOrder.getWorkingList: ' + err);
						}
						else{
							socket.emit('workingList', {list: orders, newly: false});
							socket.to(_type).emit('workingList', {list: orders, newly: false});
						}
					});
				}
			});
		});
		socket.on('ping', function(){
			socket.emit('pong', _type);
		});
	});
}
