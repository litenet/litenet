var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb+srv://vbkellis:my1password@firstcluster-5wdsw.mongodb.net/test?retryWrites=true&w=majority";

var nameList = [];

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
			
			
			for (x in io.sockets.sockets)
			{
				if (io.sockets.connected[x].username == loginData.name)
				{
					socket.emit('login already');
					return false;
				}
			}
	  
			dbo.collection("users").find(loginData).toArray(function(err, result) {
				if (err) throw err;
				if (result.length == 0) {
					socket.emit('login fail');			
				}
				else {
					nameList.push(loginData.name);
					socket.emit('login success', nameList);
					socket.join('logged in');
					socket.username = loginData.name;
					socket.broadcast.to('logged in').emit('is_online', loginData.name);
				}
			});
		});
	});
	
	
	socket.on('logout', function(){
		socket.leave('logged in');		
		socket.broadcast.to('logged in').emit('is_offline', socket.username);
		io.to('logged in').emit('recipient dropped', socket.username);
		
		for (x in io.sockets.sockets)
		{
			if (x != socket.id)
			{
				io.sockets.connected[x].leave(socket.id);
				io.sockets.connected[socket.id].leave(x);
			}
		}
		
		for(i = 0; i < nameList.length; i++)
		{
			if (nameList[i] == socket.username)
			{
				nameList.splice(i, 1);
				i--;
			}
		}
		socket.username = '';
	});
  
  
	socket.on('chat message', function(msg){
		io.to(socket.id).emit('chat message', "<b>" + socket.username + "</b>" + ': ' + msg);
	});
	
	
	socket.on('add recipient', function(candidate){
		for (x in io.sockets.sockets)
		{
			if (io.sockets.connected[x].username == candidate && socket.username != candidate)
			{
				io.sockets.connected[x].join(socket.id);
				socket.emit('recipient added', candidate);
			}
		}
	});
	
	
	socket.on('drop recipient', function(candidate){
		for (x in io.sockets.sockets)
		{
			if (io.sockets.connected[x].username == candidate && socket.username != candidate)
			{
				io.sockets.connected[x].leave(socket.id);
				socket.emit('recipient dropped', candidate);
			}
		}
	});
	
	
	socket.on('disconnect', function(){
		if (socket.username != '')
		{
			io.to('logged in').emit('is_offline', socket.username);
			io.to('logged in').emit('recipient dropped', socket.username);
			
			for(i = 0; i < nameList.length; i++)
			{
				if (nameList[i] == socket.username)
				{
					nameList.splice(i, 1);
					i--;
				}
			}
		}
	});
});


http.listen(port, function(){
	console.log('listening on *:' + port);
});
