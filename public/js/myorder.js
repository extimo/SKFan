
window.onload = function(){ 

    $('.btnOrder').each(function(){      	
    	var text = $(this).text();
    	var id = $(this).attr("id");
    	var value = $(this).val();
    	
    	if(value == 0){
    		$(this).text("请稍后...");
    		$('#'+id).attr("disabled",true); 
    	}

    	if(value == 1){
    		$(this).text("处理中...");
    		$('#'+id).attr("disabled",true); 
    	}

    	if(value == 2){
    		$(this).text("确认取餐");
    		$('#'+id).attr("disabled",false); 
    	}

    	if(value == 3){
    		$("#"+id).text("已取餐");
			$("#"+id).css("background-color","#bbbbbb");
    		$('#'+id).attr("disabled",true); 
    	}

    	if(value == 4){
    		$(this).text("抱歉，暂时售罄...");
    		$("#"+id).css("background-color","#bbbbbb");
    		$('#'+id).attr("disabled",true); 
    	}
    });

};


function getCof(id){
	//$("#"+id).text("已取餐");
	//$("#"+id).css("background-color","#bbbbbb");
	$('#'+id).attr("disabled",true);

	var id = id.substring(9,id.length);

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

function orderState(){
    location.href='/orderState';
}














