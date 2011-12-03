http = require('http');
url = require('url');
path = require('path');
fs = require('fs');
io = require('socket.io');

webServ = http.createServer(function(req, res){
	var uri = url.parse(req.url).pathname;
	var abspath = path.join(process.cwd(), uri);

	if(req.url == '/'){
	    abspath += 'index.html';
	}

	path.exists(abspath, function(exists){
		if(!exists){
		    res.writeHead(404, {"Content-Type":"text/html"});
		    res.write('<html><body>404</body></html>');
		    res.end('');
		    return;
		}

		fs.readFile(abspath, "binary", function(err, file){
			res.writeHead(200, {"Content-Type":"text/html"});
			res.write(file, "binary");
			res.end('');
		    });
	    });
	
    });

webServ.listen(8000);

var clients = [];
function userData(ip, socket) {
    this.socket = socket;
    this.nick = "";
    this.uid = ip;
    this.ip = ip;
    this.channels = [];
}

var channels = [];
function chanData() {
    this.name = "";
    this.users = [];
	this.mode = new channelModeData();
}

function channelModeData(){
	this.operator;
	this.private_chan;
	this.secret_chan;
	this.invite_only_chan;
	this.topic_mod_by_op_only;
	this.no_mes_from_outsiders;
	this.moderated_chan; 
	this.user_limit; //integer.
	this.ban_mask; //array of nicks.
	this.open_floor_chan;
	this.key;
}

function userModeData(){
	this.invisible;
	this.operator;
}

var socket = io.listen(webServ);

var user = function(params) {
    console.log("USER!");
};

var privmsg = function() {
    console.log("PRIVATE MESSAGE!!");
};

var who = function(params) {
    console.log("WHO!");
}

var nick = function(userdata, nick){
    console.log(userdata.nick + " nick changed to " + nick);
    userdata.nick = nick;
}

var userMode = function(params){
	
};

var chanMode = function(params){

};

var mode = function(params){
	if(params[0] === '#'){
		chanMode(params);
	} else {
		userMode(params);
	}
};

var nocommand = function(com){
    console.log(com + ": not a recognized command");
};


socket.sockets.on('connection', function(client){
	console.log("connection works!");
	var address = client.handshake.address; // Get client ip address and port.
	var thisuser = new userData(address.address, client);

	clients.push(thisuser);

	client.on('data', function(data){
		console.log(data);
		
		var a = data.indexOf(' ');
		var currentuid = data.slice(0, a);
		var fullcommand = data.slice(a+1, data.length);
		a = fullcommand.indexOf(' '); // find index of next space.
		var comtype = fullcommand.slice(0, a);
		var params = fullcommand.slice(a+1, fullcommand.length);
		
		console.log(fullcommand);

		switch(comtype){

			case "INIT":
				console.log("INIT connection with client: "+address.address+":"+address.port); // Log client ip and port.
				var uid = address.address+address.port; // Some sort of ip/port combo unique id <--- Replace with better identifier????
				client.send('#cs455 ' + uid); // Assign and send unique user id to client for identification later.
				break;
			case "USER":
				user(thisuser, params);
				break;
			case "PRIVMSG":
				privmsg();
				break;
			case "WHO":
				who(params);
				break;
			case "NICK":
				nick(thisuser, params);
				break;
			case "JOIN":
			case "PART":
			case "MODE":
				mode(params);
				break;
			case "TOPIC":
			case "LIST":
			case "INVITE":
			case "KICK":
			case "QUIT":
			default:
				nocommand(comtype);
			}
	
	    });
	


    });


