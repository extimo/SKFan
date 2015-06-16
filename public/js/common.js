
/*********************isEmail*************************/
function isEmail(str)     
{     
  
    if(str.length!=0){    
    reg=/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;    
    if(!reg.test(str)){    
        return false   
    }
    else{
        return true;
    }    
    }
    else{
        return false;
    }    
}     

/*************************isPhone**********************/
function isPhone(str){
  
     var partten = /^1[3|4|5|8][0-9]\d{8}$/;

     if(partten.test(str)){
      return true;
     }
     else{
      return false;
     }

    }

/*************************isWWID**********************/
function isWWID(str){

	if(!/^\d{8}$/.test(str)){
		return false;
	}
    else{
        return true;
    }

}

/*************************isPassword**********************/
function isPassword(str){
    if(str.length<6){
        return false;
        //alert("密码至少6位！");
    }
    else{
        return true;
    }

}



