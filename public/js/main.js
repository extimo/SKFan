$(window).resize(function(){
	var h = parseInt($(document).height());
	$(".sidebar-lg").height(h);
	$(".sidebar-lg").css("max-height", h);
	$(".sidebar-lg").css("min-height", h);
});

$(function() {
	$(window).resize();
	$(".sidebar>a").each(function(i){
		var u = $(this).attr("href");
		$(this).click(function(){
			location.href = u;
		});
		$(this).attr("href", "javascript:;");
	});

	var me = window.location.pathname.substr(window.location.pathname.lastIndexOf("/") + 1);
	me = me == "" ? "coffee" : me;
	$(".sb-" + me).addClass("active");
	$(".sb-" + me).unbind("click");
	
	$("#hook").hook();
});

angular.module('SKFanApp', []);
