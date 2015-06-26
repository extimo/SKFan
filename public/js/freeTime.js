var socket = io.connect('http://ecafe.pub:9527/barrage');

socket.on('new', function(text){
	barrage("#mask", text);
});

$(function(){
	$(window).resize(function(){
		$("#all").height($(window).height());
		$("#mask").height($("#all").height() - $("#sender").height() - 10);
	});
	$(window).resize();
	
	$("#send").click(function(){
		var text = $("#content").val();
		$("#content").val('');
		if(text == ""){
			return;
		};
		
		barrage("#mask", text, true);
		socket.emit('add', text);
	});
	$("#content").keydown(function(e){
		if(e.which == 13){
			$("#send").click();
		}
	});
});
