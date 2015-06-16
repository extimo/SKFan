var app = angular.module('SKFanApp');

app.controller('DishCtrl', function($scope){
	$scope.dishes = [];
	$scope.total = 0;
	$scope.colCount = 4;
	
	$(window).resize(function(){
		var width = parseInt($("html").width());
		$scope.$apply(function(){
			if(width < 768){
				$scope.colCount = 2;
			}
			else if(width < 992){
				$scope.colCount = 3;
			}
			else{
				$scope.colCount = 4;
			}
		});
	});

	$.getJSON('/dish/get/cur/1', function(dishes){
		$scope.$apply(function(){
			$scope.dishes = dishes;
		});
	});
	
	$scope.addDish = function(i){
		if(!$scope.dishes[i].count){
			$scope.dishes[i].count = 0;
		}
		$scope.dishes[i].count++;
		$scope.total += parseInt($scope.dishes[i].price);
	};
	
	$scope.minusDish = function(i){
		if(!$scope.dishes[i].count){
			$scope.dishes[i].count = 0;
		}
		$scope.dishes[i].count--;
		$scope.total -= parseInt($scope.dishes[i].price);
	};
	
	$scope.removeDish = function(i){
		$scope.total -= parseInt($scope.dishes[i].price) * $scope.dishes[i].count;
		$scope.dishes[i].count = 0;
	};
	
	$scope.prepareExtra = function(i, e){
		var extra = "";
		if(!$scope.dishes[i].predefinedExtra){
			$scope.dishes[i].predefinedExtra = [];
		}
		$scope.dishes[i].predefinedExtra[e] = $scope.dishes[i].predefinedExtra[e] ? 
			!$scope.dishes[i].predefinedExtra[e] : true;
		
		if($scope.dishes[i].predefinedExtra[1]){
			extra += "加奶 ";
		}
		if($scope.dishes[i].predefinedExtra[2]){
			extra += "加热 ";
		}
		if($scope.dishes[i].predefinedExtra[0]){
			extra += "加糖 ";
		}
		if($scope.dishes[i].extra){
			extra = extra + $scope.dishes[i].extra.replace("加奶 ", "").replace("加热 ", "").replace("加糖 ", "");
		}
		if(extra.length == 0){
			extra = null;
		}
		$scope.dishes[i].extra = extra;
	};
	
	$scope.clearSelections = function(){
    	$scope.dishes.forEach(function(dish, i){
    		dish.count = 0;
    		$scope.clearExtra(i);
    	});
    	$scope.total = 0;
	};
	
	var showSuccess = function(){
    	$('html, body').animate({scrollTop:0}, 100);
		$("#btnPlace").button('reset');
		$("#modalConfirmOrder").modal('hide');
		$('#resultTitle').text('下单成功');
		$('#resultDetail').text('您的订单正在以光速处理中…');
		$('#resultExtra').html("<a href='/myorder'>转到我的订单</a>");
    	$('#modalPlaceResult').modal('show');
		setTimeout("$('#modalPlaceResult').modal('hide')", 5000);
	};
	
	var showFail = function(info){
    	$('html, body').animate({scrollTop:0}, 100);
		$("#btnPlace").button('reset');
		$("#modalConfirmOrder").modal('hide');
		$('#resultTitle').text('下单失败');
		$('#resultDetail').text(info);
		$('#modalPlaceResult').modal('show');
	};
	
	$scope.place = function(){
		$("#btnPlace").button('loading');
		
		var ids = [], counts = [], extras = [];
		$scope.dishes.forEach(function(dish, i){
			if(dish.count > 0){
				ids.push(dish.id);
				counts.push(dish.count);
				extras.push(dish.extra);
			}
		});
		
		$.ajax({
            url:'/order/place',
            type:'POST',
            data:{
                counts: counts,
                ids: ids,
                extras: extras,
                type: 1
            },
            success: function(data){
            	if(data == 'ok'){
					$scope.$apply($scope.clearSelections);
		        	showSuccess();
				}
				else{
		        	showFail(data);
				}
        	},
            error: function(){
	        	showFail('未知原因');
        	}
    	});
	};
	
	$scope.clearExtra = function(i){
		$scope.dishes[i].extra = null;
		$scope.dishes[i].predefinedExtra = null;
		$("#btnPredefinedExtra-" + i + "-0").removeClass("active");
		$("#btnPredefinedExtra-" + i + "-1").removeClass("active");
		$("#btnPredefinedExtra-" + i + "-2").removeClass("active");
	}
	
	$scope.filterSelected = function(dish){
		return dish.count > 0;
	};
});

$(document).ready(function(){
	
});

