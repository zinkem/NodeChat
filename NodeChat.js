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
    this.channels = []; // chanData[];
    this.mode = new userModeData();
	return this; // need these return statements, otherwise nothing is passed back.
}

var channels = [];
function chanData() {
    this.name = "";
    this.users = []; // userData[]
	this.mode = new channelModeData();
	return this; // need these return statements, otherwise nothing is passed back.
}

function channelModeData(){
	this.operators = []; // array of operators (nicks)?
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
	this.invisible = false; // boolean
	this.operatorOf = []; // Array of channel names user is operator of?
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
	dest[i].socket.emit('message', sendmsg);
    }

};

var who = function(thisuser, params) {
    console.log("WHO!");
    var pattern = "";
    var name = "";
    var i;
    var thatuser;
    var sendmsg = ":" + thisuser.nick + " WHO";
    if (!params) {
       params = "";
    }
    if (params[0] === '#') {
        if (channels[params]) {
            for (i in channels[params].users) {
                thatuser = channels[params].users[i];
                //if (!clients[thatuser].mode.invisible) {
                    name = thatuser.nick;
                    console.log(name);
                    sendmsg += " " + name;
                //}
            }
        } else {
            console.log("ERROR: Channel " + params + " not found!");
            sendmsg += " Channel " + params + " not found!\n";
        }
    } else {
        if (params == "" || params == "0") {
            pattern = new RegExp(".*");
        } else {
            pattern = new RegExp(params);
        }
        var foundusers = false;
        for (i in clients) {
            //if (!clients[i].mode.invisible) {
                name = clients[i].nick;
                if (name.match(pattern)) {
                    console.log(name);
                    sendmsg += " " + name;
                    foundusers = true;
                }
            //}
        }
        if (!foundusers) {
            sendmsg += " no users matching pattern " + params;
        }
    }
    thisuser.socket.emit('message', sendmsg);
};


var nick = function(userdata, nick){

    if(clients[nick] != undefined){
	console.log("cannot change " + userdata.nick + "'s name to " + nick);
	console.log("Nick taken");
	//error to client?
	return;
    }

    console.log(userdata.nick + " nick changed to " + nick);

    oldnick = userdata.nick;
    userdata.nick = nick;

    if(clients[oldnick] != undefined){
	delete clients[oldnick];
    }

    clients[userdata.nick] = userdata;

};

var joinchan = function(userdata, params){
    var chan = params.split(' ')[0]; //channel name to join

    if(chan[0] != '#'){
	console.log("Invalid channel name: " + chan);
	//error to client?
	return;
    }

    if(channels[chan] == undefined){
	channels[chan] = new chanData();
	channels[chan].name = chan;
    }

    channels[chan].users.push(userdata);
    userdata.channels.push(channels[chan]);

    for(var i in channels[chan].users){
	var peer = channels[chan].users[i];
	peer.socket.emit('message', ":" + userdata.nick + " JOIN " + chan);
    }
};

var quit = function(userdata, params){
};

var userMode = function(userdata, inputArray){
	var userNick = inputArray[0];
	var userDataWithNick = clients[userNick];
	if(!userDataWithNick){
		// Error: No user with given name.
		console.log("ERROR: Can't find user \""+userNick+"\"!");
	} else if(inputArray.length < 1){
		var operation = inputArray[1];
		var argLength = inputArray.length;
		var userModes = userDataWithNick.mode;
		console.log("Found user \""+userNick+"\"!"); // --- Debugging print.
		if(operation.length > 2) console.log("This IRC only processes one mode change at a time.");
		if(operation[0] === '+'){
			switch(operation[1]){
				case 'o':
					// Implemented in channel modes.
					break;
				case 'w':
					// Wont be implemented.
					break;
				case 's':
					// Wont be implemented.
					break;
				case 'i':
					userModes.invisible = true;
					break;
				default:
					// Error: unrecognized option flag.
					console.log("ERROR: Unrecognized option flag \""+operation[1]+"\" --ignored.");
			}
		} else if(operation[0] === '-'){
			switch(operation[1]){
				case 'o':
					break;
				case 'w':
					// Wont be implemented.
					break;
				case 's':
					// Wont be implemented.
					break;
				case 'i':
					userModes.invisible = false;
					break;
				default:
					console.log("ERROR: Unrecognized option flag \""+operation[1]+"\" --ignored.");
			}
		} else {
			//error;
			console.log("Mode flag must be preceeded by +|-");
		}
	}
};

var chanMode = function(userdata, inputArray){
	var channelName = inputArray[0];
console.log(userdata.nick);// testing
	var channel = channels[channelName];//findChannelWithName(channelName);
	if(!channel){
		// Error: No channel with given name.
		console.log("ERROR: Can't find channel \""+channelName+"\"!");
	} else if(inputArray.length < 1){
		var operation = inputArray[1];
		var argLength = inputArray.length;
		var channelModes = channel.mode;
		console.log("Found channel \""+channelName+"\"!"); // --- Debugging print.
		if(operation.length > 2) console.log("This IRC only processes one mode change at a time.");
		if(operation[0] === '+'){
			console.log(inputArray); // --- Debugging print.
			//add
			switch(operation[1]){
				case 'o':
					//give operator privlages.
					if(argLength != 3){
						// Error: not enough args.
						console.log("ERROR: Not enough args specified to add an operators.");
					} else {
						if(userdata.nick === inputArray[2]) console.log("You are not allowed to make yourself an operator.");
						else {
							var user = clients[inputArray[2]]//findUserWithNick(inputArray[2]);
							if(user != null){
								//cross check channels and users?
								channelModes.operators[user.nick] = user; // only pushing strings, not objects.
								user.mode.operatorOf[channel.name] = channel; // dido.
							} else console.log("Could not find user \""+inputArray[2]+"\".");
						}
					}
					break;
				case 'p':
					channelModes.private_chan = true;
					break;
				case 's':
					channelModes.secret_chan = true;
					break;
				case 'i':
					channelModes.invite_only_chan = true;
					break;
				case 't':
					channelModes.topic_mod_by_op_only = true;
					break;
				case 'n':
					channelModes.no_mes_from_outsiders = true;
					break;
				case 'm':
					channelModes.moderated_chan = true;
					break;
				case 'l':
					if(argLength != 3){
						// Error: not enough args.
						console.log("ERROR: Not enough args specified to change user limit.");
					} else {
						if(isNaN(inputArray[2])) console.log("ERROR: Limit arg \""+inputArray[2]+"\" is not a number"); // Error
						else channelModes.user_limit = inputArray[2];
					}
					break;
				case 'b':
					if(argLength != 3){
						console.log("ERROR: No user specified.");
					} else {
						var user = clients[inputArray[2]];
						if(user != null){
							channelModes.ban_mask[user.name] = inputArray[2]; // need to do more funky stuff?
						} else console.log("Could not find user \""+inputArray[2]+"\".");
					}
					break;
				case 'v':
					channelModes.open_floor_chan = true;
					break;
				case 'k':
					channelModes.key = inputArray[2]; // need to do more funky stuff and discuss necessity.
					break;
				default:
					// Error: unrecognized option flag.
					console.log("ERROR: Unrecognized option flag \""+operation[1]+"\" --ignored.");
			}
		} else if(operation[0] === '-'){
			//subtract
			switch(operation[1]){
				case 'o':
					//take operator privlages.
					if(argLength != 3){
						// Error: not enough args.
						console.log("ERROR: Not enough args specified to add an operators.");
					} else {
						var user = clients[inputArray[2]]//findUserWithNick(inputArray[2]);
						if(user != null){
							//cross check channels and users?
							channelModes.operators[user.nick] = user; // only pushing strings, not objects.
							user.mode.operatorOf[channel.name] = channel; // dido.
						} else console.log("Could not find user \""+inputArray[2]+"\".");
					}
					break;
				case 'p':
					channelModes.private_chan = false;
					break;
				case 's':
					channelModes.secret_chan = false;
					break;
				case 'i':
					channelModes.invite_only_chan = false;
					break;
				case 't':
					channelModes.topic_mod_by_op_only = false;
					break;
				case 'n':
					channelModes.no_mes_from_outsiders = false;
					break;
				case 'm':
					channelModes.moderated_chan = false;
					break;
				case 'l':
					channelModes.user_limit = null;
					break;
				case 'b':
					if(argLength != 3){
						console.log("ERROR: No user specified.");
					} else {
						var user = clients[inputArray[2]];
						if(user != null){
							delete channelModes.ban_mask[inputArray[2]]; // need to do more funky stuff?
						} else console.log("Could not find user \""+inputArray[2]+"\".");
					}
					break;
				case 'v':
					channelModes.open_floor_chan = false;
					break;
				case 'k':
					// some magic yet to be done.
					break;
				default:
					console.log("ERROR: Unrecognized option flag \""+operation[1]+"\" --ignored.");
			}
		} else {
			//error;
			console.log("Mode flag must be preceeded by +|-");
		}
	}
};

var mode = function(thisuser, params){
	var inputArray = params.split(/\s+/);
	if(params[0] === '#'){
		console.log(inputArray[0]);
		chanMode(thisuser, inputArray);
	} else {
		userMode(thisuser, inputArray);
	}
};

var nocommand = function(com){
    console.log(com + ": not a recognized command");
};


socket.sockets.on('connection', function(client){
	console.log("connection works!");
	var address = client.handshake.address; // Get client ip address and port.
	var thisuser = new userData(address.address, client);

	client.on('data', function(data){
		console.log(data);
		var a, fullcommand;

		if(data[0] === ':'){
		    a = data.indexOf(' ');
		    var currentuid = data.slice(0, a);
		    fullcommand = data.slice(a+1, data.length);
		} else {
		    fullcommand = data;
		}

		a = fullcommand.indexOf(' '); // find index of next space.
		console.log(a);
		if(a > 0){
		    var comtype = fullcommand.slice(0, a);
		    var params = fullcommand.slice(a+1, fullcommand.length);
		} else {
		    var comtype = fullcommand;
		    var params = undefined;
		}
		
		console.log(params);

		comtype = comtype.toUpperCase();

		switch(comtype){
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
		    mode(thisuser, params);
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


