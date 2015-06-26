function barrage(container, text, self, speed, color, top){
	var $label = $("<div class='content'>" + text + "</div>");
	$(container).append($label.show());
	
	var _left = $(window).width() - $label.width();
	var _color = color || getRandomColor();
	var _top = top || getRandomTop(container);
	var _speed = speed || getRandomSpeed();
	var _css = {left: _left, top: _top, color: _color};
	
	if(self){
		_css.outline = '1px solid ' + _color;
	}
	
	$label.css(_css);
	$label.animate({left:"-"+_left+"px"}, _speed, "linear", function(){
		$label.remove();
	});
}

function getRandomColor(){
	return '#' + (function(h){
		return new Array(7 - h.length).join("0") + h;
	}
	)((Math.random() * 0x1000000 << 0).toString(16));
}

function getRandomSpeed(){
	return parseInt(Math.random() * 10000 + 10000);
}

function getRandomTop(container){
	var _height = $(container).height();
	return parseInt(Math.random() * (_height - 75));
}
