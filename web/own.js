var expr = require('express');
var app = expr();



app.use(expr.static('static'));

app.get('/', function(req,res){
	res.sendFile('/home/own/own_riot/web/index.html');
});

app.listen(8383);
