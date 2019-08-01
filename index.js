var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb+srv://vbkellis:my1password@firstcluster-5wdsw.mongodb.net/test?retryWrites=true&w=majority";

var roomSize = 0;

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	
	socket.username = '';
		
	socket.on('register', function(registerData){
	  
		var query = { name: registerData.name };
		if (registerData.name.length < 3) {
			socket.emit('short reg name');
			return false;
		}
	  
		MongoClient.connect(url, function(err, db) {
			if (err) throw err;
			var dbo = db.db("mydb");
	  
			dbo.collection("users").find(query).toArray(function(err, result) {
				if (err) throw err;
				if (result.length == 0) {
					dbo.collection("users").insertOne(registerData, function(err, res) {
						if (err) throw err;
						console.log('New user added: ' + registerData.name);
						db.close();
					});
					socket.emit('registration success');
				}
				else {
					socket.emit('registration fail');
				}	
			});
		});
	});
  
  
	socket.on('login', function(loginData){
	  
		MongoClient.connect(url, function(err, db) {
			if (err) throw err;
			var dbo = db.db("mydb");
	  
			dbo.collection("users").find(loginData).toArray(function(err, result) {
				if (err) throw err;
				if (result.length == 0) {
					socket.emit('login fail');			
				}
				else {
					socket.emit('login success');
					socket.join('logged in');
					socket.username = loginData.name;
					roomSize = io.sockets.adapter.rooms['logged in'].length;
					io.to('logged in').emit('is_online', '<i>' + socket.username + ' joined the chat. ' + roomSize + ' users are logged in.</i>');
				}
			});
		});
	});
  
	socket.on('disconnect', function(){
		if (socket.username != '')
			io.to('logged in').emit('is_online', '<i>' + socket.username + ' left the chat. ' + (roomSize - 1) + ' users are logged in.</i>');
	});
	
	socket.on('chat message', function(msg){
		io.to('logged in').emit('chat message', "<b>" + socket.username + "</b>" + ': ' + msg);
	});
});

http.listen(port, function(){
	console.log('listening on *:' + port);
});
