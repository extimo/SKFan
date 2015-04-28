var express = require('express');
var app = express();

http.createServer(function (req, res){
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('Hello World\n');
}).listen(80);
console.log('Server running at http://localhost:80/');