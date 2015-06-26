
	var socket = io.connect('http://ecafe.pub:9527/user');
	var wwid = $('#wid').val();

	window.onload = function(){ 	
		socket.emit('check',wwid);
		
		socket.on('finish',function(id){
			$('#orderState'+id).text("你的订单已完成，小二正在极速派送.......");
			$('#confirm'+id).attr("disabled",false);
			$('#confirm'+id).css("background-color","#286090");
		});

		socket.on('cancel',function(id){
			$('#orderState'+id).text("抱歉，临时售罄.......");
		});
		
		
		$('.state').each(function(){      	
			var id = $(this).attr("id");
			id = "confirm"+id.substring(10,id.length);	
			var value = $(this).text();			
				
			if(value == 0){
				$(this).text("客官，请稍等...");
				$("#"+id).css("background-color","#bbbbbb");
			}

			if(value == 1){
				$(this).text("正在为你备置咖啡..."); 
				$("#"+id).css("background-color","#bbbbbb");
			}

			if(value == 2){
				$(this).text("你的订单已完成，小二正在极速派送.......");
				$('#'+id).attr("disabled",false);
			}

			if(value == 3){
				$(this).text("已取餐");
				$("#"+id).css("background-color","#bbbbbb");
			}

			if(value == 4){
				$(this).text("抱歉，临时售罄.......");
				$("#"+id).css("background-color","#bbbbbb");
			}
		});
					
	};
	
	function confirm(id){
		$('#'+id).attr("disabled",true);
		var id = id.substring(7,id.length);

		$.ajax({
				url:'/order/finish',
				type:'POST',
				data:{
					id: id,
					type: 1
				},
				success: function(data){
					if(data == "ok!"){
						location.reload();
					}
					else{
						alert("finish error!");
					}
					console.log("finish order success!");
				},
				error: function(){
					console.log("finish order error!");
				}
			});
	}


