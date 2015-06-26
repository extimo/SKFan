var Order = require('./order');
var settings = require('../settings');
var User = require('./user');
var Dish = require('./dish');

module.exports = function(io){
	var countClients = [];

	io.of('kitchen').on('connection', function(socket){
		var _type = null;
		
		socket.on('join',  function(type){
			socket.join(type);
			_type = type;
			countClients[_type] = countClients[_type] || 0;
			if(countClients[_type] == 0){
				socket.emit('alert');
			}
			countClients[_type]++;
			Order.getPickingListAndWorkingList(_type, function(err, data){
				if(err){
					console.log('io.join: ' + err);
				}
				else{
					socket.emit('list', data);
				}
			});
		});
		socket.on('finish', function(id){
			if(!_type){	
				return;
			}
			Order.finishOrder(_type, id, function(err, data){
				if(err){
					console.log('io.finishOrder: ' + err);
				}
				else{
					socket.emit('list', data);
					socket.to(_type).emit('list', data);
					
					io.of('user').to('roomCof').emit('finish',id);
				}
			});
		});
		socket.on('cancel', function(cdata){
			if(!_type){	
				return;
			}
			Order.cancelOrder(_type, cdata.id, function(err, data){
				if(err){
					console.log('io.cancelOrder: ' + err);
				}
				else{
					socket.emit('list', data);
					socket.to(_type).emit('list', data);
					
					io.of('user').to('roomCof').emit('cancel', cdata.id);
					
					if(cdata.remove){
						Order.get(cdata.id, function(err, order){
							if(err){
								console.log('io.cancelOrder.remove: ' + err);
							}
							else{
								Dish.removeFromCurrent([order.dish], function(){});
							}
						});
					}
				}
			});
		});
		socket.on('ping', function(){
			socket.emit('pong', _type);
		});
		socket.on('disconnect', function(){
			countClients[_type]--;
			if(countClients[_type] == 0){
				setTimeout(function(){
					if(countClients[_type] == 0){
						Order.openValve(_type, function(err){
							if(err){
								console.log('io.disconnect.openValve: ' + err);
							}
						});
					}
				}, 1000);
			}
		});
	});

	io.of('user').on('connection', function(socket){
		socket.on('check',function(err,wwid){
			console.log("check on");
			socket.join('roomCof');

		});
	});
	
	io.of('barrage').on('connection', function(socket){
		socket.on('add',function(text){
			socket.broadcast.emit('new', text);
			io.of('kitchen').emit('barrage', text);
		});
	});
}
