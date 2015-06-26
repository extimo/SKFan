
// check the form data
function charge(){
	var Email = document.getElementById("email").value + "@intel.com";
	var Amount = document.getElementById("amount").value;
	
	if(!isEmail(Email)){
		alert("Email格式不对！");
		return false;
		}
	else{
		if(isNaN(Amount)){
			alert("金额格式不对，请重新输入");
			return false;
		}
		else return true;
	}

}

function back(){
	top.location = "/admin";
}


