var app = angular.module('SKFanApp', ['angularMoment']);
app.run(function(amMoment) {
    amMoment.changeLocale('zh-cn');
});

app.factory('socket', function($rootScope){
	var socket = io.connect('http://ecafe.pub:9527/kitchen');
	return {
		on: function(eventName, callback){
			socket.on(eventName, function(){
				var args = arguments;
				$rootScope.$apply(function(){
					callback.apply(socket, args);
				});
			});
		},
		emit: function(eventName, data, callback){
			socket.emit(eventName, data, function(){
				var args = arguments;
				$rootScope.$apply(function(){
					if(callback){
						callback.apply(socket, args);
					}
				});
			});
		}
	}
});

app.controller('ListCtrl', function($scope, $timeout, socket){
	$scope.browserIE = /msie/i.test(navigator.userAgent.toLowerCase());
	$scope.workingList = [];
	$scope.pickingList = [];
	$scope.disconnected = true;
	
	var play = function(){
		if($scope.browserIE){
			var sound = $("#snd-sms").get(0);
			sound.volume = 1;
			sound.src = sound.src;
		}
		else{
			$("#snd-sms").html("<embed autostart='true' autoplay='true' height=0 width=0 loop='false' src='/renders/sms.mp3'>");
			if($("#snd-sms>embed").get(0).play){
				$("#snd-sms>embed").get(0).play();
			}
		}
	}
	
	var lapseCheckConnection = 3000;
	var lapseFlipDisconnected = 10000;
	
	socket.emit('join', type);
		
	$scope.checkConnection = function(){
		socket.emit('ping');
		$scope.timeoutCheckConnection = $timeout($scope.checkConnection, lapseCheckConnection);
	};
	
	$scope.flipDisconnected = function(){
		if($scope.disconnected){
			$("#all").html("<h1 class='text-danger'>连接丢失，请刷新</h1>");
			delete app;
		}
		$scope.disconnected = true;
		$scope.timeoutFlipDisconnected = $timeout($scope.flipDisconnected, lapseFlipDisconnected);
	};
	
	$scope.timeoutCheckConnection = $timeout($scope.checkConnection, lapseCheckConnection);
	$scope.timeoutFlipDisconnected = $timeout($scope.flipDisconnected, lapseFlipDisconnected);
	
	socket.on('list', function(data){
		if(data.newly){
			play();
		}
		if(data.dataPicking){	
			$scope.pickingList = data.dataPicking.list;
			$scope.pickingListLength = data.dataPicking.len;
		}
		if(data.dataWorking){	
			$scope.workingList = data.dataWorking.list;
			$scope.workingListLength = data.dataWorking.len;
		}
	});
	
	socket.on('pong', function(conformType){
		if(conformType != type){
			return;
		}
		$scope.disconnected = false;
	});
	
	socket.on('barrage', function(text){
		if($scope.valveLock){
			barrage("#workingList", text);
		}
	});
	
	socket.on('alert', function(){
		if($scope.valveLock){
			barrage("#all", "提示：目前打烊中", true, 15000, "#ff0000", 40);
		}
	});
	
	$scope.remind = function(id){
		socket.emit('finish', id);
	}
	
	$scope.prepareCancel = function(index){
		$scope.order = $scope.workingList[index];
	}
	
	$scope.cancel = function(){
		socket.emit('cancel', {id: $scope.order.id, remove: $scope.cancelWithRemove});
	}
	
	$scope.full = function(){
		launchFullScreen();
	}
});

$(document).ready(function(){
	if(type == "1"){
		$("body").css("background-image", "url(/images/coffee_bg_fade.JPG)");
	}
	launchFullScreen();
});

function launchFullScreen(element) {   
	var isInFullScreen = (document.fullScreenElement && document.fullScreenElement !== null) ||    // alternative standard method  
	(document.mozFullScreen || document.webkitIsFullScreen);

	element = element || document.documentElement;
	
	if (!isInFullScreen) {
		if(element.requestFullscreen) {
			element.requestFullscreen();
		} else if(element.mozRequestFullScreen) {
			element.mozRequestFullScreen();
		} else if(element.webkitRequestFullscreen) {
			element.webkitRequestFullscreen();
		} else if(element.msRequestFullscreen) {
			element.msRequestFullscreen();
		}
	}
}
