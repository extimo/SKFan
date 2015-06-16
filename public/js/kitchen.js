var app = angular.module('SKFanApp', ['angularMoment']);
app.run(function(amMoment) {
    amMoment.changeLocale('zh-cn');
});

app.factory('socket', function($rootScope){
	var socket = io.connect('http://ecafe.pub:9527');
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
	$scope.isInFullScreen = (document.fullScreenElement && document.fullScreenElement !== null) ||    // alternative standard method  
	(document.mozFullScreen || document.webkitIsFullScreen);
	
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
	
	socket.on('workingList', function(data){
		if(data.newly){
			play();
		}
		$scope.workingList = data.list;
	});
	
	socket.on('pickingList', function(list){
		$scope.pickingList = list;
	});
	
	socket.on('pong', function(conformType){
		if(conformType != type){
			socket.emit('join', type);
			return;
		}
		$scope.disconnected = false;
	});
	
	$scope.remind = function(id){
		socket.emit('finishOrder', id);
	}
	
	$scope.prepareCancel = function(index){
		$scope.$broadcast('confirm', $scope.workingList[index]);
	}
	
	$scope.full = function(){
		launchFullScreen();
		$scope.isInFullScreen = true;
	}
});

app.controller('modalCtrl', function($scope, socket){
	$scope.$on('confirm', function(evt, order){
		$scope.order = order;
	});
	
	$scope.cancel = function(){
		socket.emit('cancelOrder', $scope.order.id);
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

