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
    this.mode = new userModeData();
	return this; // need these return statements, otherwise nothing is passed back.
}

var channels = [];
function chanData() {
    this.name = "";
    this.users = [];
	this.mode = new channelModeData();
	return this; // need these return statements, otherwise nothing is passed back.
}

function channelModeData(){
	this.operator = []; // array of operators (nicks)?
	this.private_chan = false; // boolean
	this.secret_chan = false; // boolean
	this.invite_only_chan = false; // boolean
	this.topic_mod_by_op_only = false; // boolean
	this.no_mes_from_outsiders = false; // boolean
	this.moderated_chan = false; // boolean
	this.user_limit = null; // integer.
	this.ban_mask = []; // array of banned users (nicks)?
	this.open_floor_chan = false; // boolean
	this.key = ""; // string?
	return this; // need these return statements, otherwise nothing is passed back.
}

function userModeData(){
	this.invisible = []; // Array of channl names user is invisible to?
	this.operator = []; // Array of channel names user is operator of?
	return this; // need these return statements, otherwise nothing is passed back.
}

var socket = io.listen(webServ);

var user = function(params) {
    console.log("USER!");
};

var privmsg = function(user, params) {
    console.log("PRIVATE MESSAGE!!");
    console.log(user);
    console.log(params);

    var channel = params.split(' ')[0];
    var dest = channels[channel].users 
    var sendmsg = ":" + user.nick + " PRIVMSG " + params;
    console.log(sendmsg);

    for(i = 0; i < dest.length; i++){
	dest[i].socket.emit(sendmsg);
    }

};

var who = function(thisuser, params) {
    console.log("WHO!");
    var pattern = "";
    var name = "";
    var i = 0;
    var thatuser;
    var chanfound = false;
    if (params[0] === '#') {
        if (channels[params].name == params) {
            for (i = 0; i < channels[params].users.length; i++) {
                thatuser = channels[params].users[i];
                if (!thatuser.mode.invisible) {
                    name = thatuser.nick;
                    console.log(name);
                    thisuser.socket.emit(name + '\n');
                }
            }
        } else {
            console.log("Channel " + params + " not found!");
            thisuser.socket.emit("Channel " + params + " not found!\n");
        }
    } else {
        if (params == "" || params == "0") {
            pattern = new RegExp(".*");
        } else {
            pattern = new RegExp(params);
        }
        for (var i = 0; i < clients.length; i++) {
            if (!clients[i].mode.invisible) {
                name = clients[i].nick;
                if (name.match(pattern)) {
                    console.log(name);
                    thisuser.socket.emit(name + '\n');
                }
            }
        }
    }
};


var nick = function(userdata, nick){
    console.log(userdata.nick + " nick changed to " + nick);
    userdata.nick = nick;
};

var joinchan = function(userdata, params){
    chan = params.split(' ')[0];

    if(!channels[chan]){
	channels[chan] = new chanData();
	channels[chan].name = chan;
    }

    channels[chan].users.push(userdata);

};

var quit = function(userdata, params){
};

var userMode = function(inputArray, params){
	
};

var chanMode = function(inputArray, params){
	var channelName = inputArray[0];
	var channel = null;
	for(var i = 0; i < channels.length; i++){
		if(channels[i].name === channelName){
			channel = channels[i];
			break;
		}
	}
	if(!channel){
		// Error: No channel with given name.
		console.log("ERROR: Can't find channel \""+channelName+"\"!");
	} else {
		var operation = inputArray[1];
		console.log("Found channel \""+channelName+"\"!"); // --- Debugging print.
		if(operation[0] === '+'){
			console.log(inputArray); // --- Debugging print.
			for(var i = 1; i < operation.length; i++){
				//add
				switch(operation[i]){
					case 'o':
						//give operator privlages.
						break;
					case 'p':
						channel.private_chan = true;
						break;
					case 's':
						channel.secret_chan = true;
						break;
					case 'i':
						channel.invite_only_chan = true;
						break;
					case 't':
						channel.topic_mod_by_op_only = true;
						break;
					case 'n':
						channel.no_mes_from_outsiders = true;
						break;
					case 'm':
						channel.moderated_chan = true;
						break;
					case 'l':
						channel.user_limit = inputArray[2]; // Add checks for existance of limit.
						break;
					case 'b':
						channel.ban_mask += inputArray[2];
						break;
					case 'v':
						channel.open_floor_chan = true;
						break;
					case 'k':
						channel.key = inputArray[2];
						break;
					default:
						// Error: unrecognized option flag.
				}
			}
		} else if(operation[0] === '-'){
			for(var i = 1; i < operation.length; i++){
				//subtract
				switch(operation[i]){
					case 'o':
						//take operator privlages.
						break;
					case 'p':
					case 's':
					case 'i':
					case 't':
					case 'n':
					case 'm':
					case 'l':
					case 'b':
					case 'v':
					case 'k':
					default:

				}
			}
		} else {
			//error;
		}
	}
};

var mode = function(params){
	var inputArray = params.split(/\s+/);
	if(params[0] === '#'){
		console.log(inputArray[0]);
		chanMode(inputArray, params);
	} else {
		userMode(inputArray, params);
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
		
		console.log(params);

		switch(comtype){
		case "INIT":
		    console.log("INIT connection with client: "+address.address+":"+address.port); // Log client ip and port.
		    var uid = address.address+address.port; // Some sort of ip/port combo unique id <--- Replace with better identifier????
			var newChannel = chanData(); // Create new channel data.
			if(newChannel == null) console.log("No NEW CHANNEL!");
			newChannel.name = "#cs455"; // Set channel name.
			newChannel.users.push(thisuser); // Add current user to channel.
			channels.push(newChannel); // Add new channel to array of channels.
		    client.send('#cs455 ' + uid); // Assign and send unique user id to client for identification later.
		    break;
		case "USER":
		    user(thisuser, params);
		    break;
		case "PRIVMSG":
		    privmsg(thisuser, params);				
		    break;
		case "WHO":
		    who(thisuser, params);
		    break;
		case "NICK":
		    nick(thisuser, params);
		    break;
		case "JOIN":
		    joinchan(thisuser, params);
		    break;
		case "PART":
		    part(thisuser, pararms);
		    break;
		case "MODE":
		    mode(params);
		    break;
		case "TOPIC":
		    topic(thisuser, params);
		    break;
		case "LIST":
		    list(thisuser, params);
		    break;
		case "INVITE":
		    invite(thisuser, params);
		    break;
		case "KICK":
		    invite(thisuser, params);
		    break;
		case "QUIT":
		    quit(thisuser, params);
		    break;
		default:
		    nocommand(comtype);
		}
		
	    });
	
	client.on('disconnect', function(data){
		
	    });
	
	
    });


