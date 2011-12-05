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

			var filetype = path.extname(abspath);
			
			if(filetype == '.html'){
			    res.writeHead(200, {"Content-Type":"text/html"});
			} else if(filetype == '.js'){
			    res.writeHead(200, {"Content-Type":"text/script"});
			} else if(filetype == '.css'){
			    res.writeHead(200, {"Content-Type":"text/css"});
			} else{
			    res.writeHead(200, {"Content-Type":"text"});
			}
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
	this.topic = "";
    this.users = []; // userData[]
	this.invited = []; // Invited users. Indices are nicks, values are booleans.
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
	this.voice = []; // array of booleans, indices are nicknames (strings)
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

    if(channel[0] === '#'){
	if(channels[channel] != undefined){
	    var dest = channels[channel].users;
	}
    } else {
	var dest = [];
	if(clients[channel] != undefined){
	    dest[channel] = clients[channel];
	}
	
	if(clients[user.nick] != undefined){
	    dest[user.nick] = clients[user.nick];
	}

    }

    var sendmsg = ":" + user.nick + " PRIVMSG " + params;
    console.log(sendmsg);

    for(var i in dest){
	dest[i].socket.emit('message', sendmsg);
    }

};

var who = function(thisuser, params) {
    console.log("WHO!");
    var pattern = "";
    var name = "";
    var i;
    var thatuser;
    var oper = "";
    var sendmsg = ":" + thisuser.nick + " WHO";
    if (!params) {
       params = "";
    }
    var a = params.indexOf(' ');
    if (a > 0) {
        oper = params.slice(a+1, a+2);
        params = params.slice(0, a);
        console.log("params: " + params + " oper: " + oper);
    }
    if (params[0] === '#') {
        if (channels[params] && !channels[params].mode.secret_chan) {
            for (i in channels[params].users) {
                thatuser = channels[params].users[i];
                if (!thatuser.mode.invisible) {
                    name = thatuser.nick;
                    if (oper === 'o') {
                        if (channels[params].mode.operators[name]) {
                            console.log(name);
                            sendmsg += " " + name;
                        }
                    } else {
                        console.log(name);
                        sendmsg += " " + name;
                    }
                }
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
            if (!clients[i].mode.invisible) {
                name = clients[i].nick;
                if (name.match(pattern)) {
                    if (oper == "o") {
                        var isOper = false;
                        for (var temp in clients[i].mode.operatorOf) {
                            isOper = true;
                        }
                        if (isOper) {
                            console.log(name);
                            sendmsg += " " + name;
                            foundusers = true;
                        }
                    } else {
                        console.log(name);
                        sendmsg += " " + name;
                        foundusers = true;
                    }
                }
            }
        }
        if (!foundusers) {
            if (oper == "o") {
                sendmsg += " no opers matching pattern " + params;
            } else {
                sendmsg += " no users matching pattern " + params;
            }
        }
    }
    thisuser.socket.emit('message', sendmsg);
};

var list = function(thisuser, params) {
    console.log("LIST!");
    var i;
    var sendmsg = ":" + thisuser.nick + " LIST";
    if (params == undefined) {
        for (i in channels) {
            if (!channels[i].mode.secret_chan) {
                sendmsg += " " + i + ": " + channels[i].topic + "<br>";
            }
        }
    } else {
        var chans = params.split(','); //channel(s) to list
        var chan;
        for (i in chans) {
            chan = chans[i];
            if (chan[0] != '#') {
	        console.log("Invalid channel name: " + chan);
	        //error to client?
            } else if (channels[chan] && !(channels[chan].mode.secret_chan)) {
                sendmsg += " " + chan + ": " + channels[chan].topic + "<br>";
            }
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


    //change nick in each channel
    for(var i in userdata.channels){
	var c = userdata.channels[i];

	c.users[nick] = userdata;
	delete c.users[oldnick]; 

	//change invited nick
	if(c.invited[oldnick]){
	    c.invited[nick] = c.invited[oldnick];
	    delete c.invited[oldnick];
	}

	//change nick for ops/ban/voice
	var m = c.mode;

	if(m.operators[oldnick]){
	    m.operators[nick] = m.operators[oldnick];
	    delete m.operators[oldnick];
	}

	if(m.ban_mask[oldnick]){
	    m.ban_mask[nick] = m.ban_mask[oldnick];
	    delete m.ban_mask[oldnick];
	}

	if(m.voice[oldnick]){
	    m.voice[nick] = m.voice[oldnick];
	    delete m.voice[oldnick];
	}

    }
    
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
		//create channel, add user as init operator.
		channels[chan] = new chanData();
		channels[chan].name = chan;
		channels[chan].mode.operators[userdata.nick] = userdata;
		userdata.mode.operatorOf[chan] = channels[chan];
    } else {
	console.log("join:" + channels[chan].mode.invite_only_chan);
	if(channels[chan].mode.private_chan ||
	   channels[chan].mode.invite_only_chan){
	    //check to see if user is invited, and return if not
	    console.log("join:" + channels[chan].invited[userdata.nick]);
	    if(channels[chan].invited[userdata.nick] == false ||
	       channels[chan].invited[userdata.nick] == undefined){
		console.log("user not invited");
		//return error?
		return;
	    }
	}
    }

    //add user to channel, and add channel to user's channel list
    channels[chan].users[userdata.nick] = userdata;
    userdata.channels[chan] = channels[chan];
    
    console.log("join: " + userdata.channels.length + " " + chan);
						
    //broadcast to everyone in the channel that a user has joined
    for(var i in channels[chan].users){
	var peer = channels[chan].users[i];
	peer.socket.emit('message', ":" + userdata.nick + " JOIN " + chan);
    }
};

var part = function(thisuser, params) {
    if (params == undefined) {
        return;
    }
    var thisnick = thisuser.nick;
    var chans = params.split(','); //channel(s) to leave
    var chan;
    var i;
    for (i in chans) {
        chan = chans[i];
        console.log("PART Channel " + chan);
        if (chan[0] != '#') {
	    console.log("Invalid channel name: " + chan);
	    //error to client?
	    return;
        }

        if (thisuser.channels[chan]) {
            console.log("Deleting channel " + chan + " from user " + thisnick);
            delete thisuser.channels[chan];
        }
	
	//this happens first so parting user gets the part message
        for (i in channels[chan].users) {
	    var peer = channels[chan].users[i];
	    peer.socket.emit('message', ":" + thisuser.nick + " PART " + chan);
        }

        if (channels[chan].users[thisnick]) {
            console.log("Deleting user " + thisnick + " from channel " + chan);
            delete channels[chan].users[thisnick];
        }
    }
};

var quit = function(userdata, params){

    var quitmsg;

    if(params == undefined)
	quitmsg = "disconnected";
    else
	quitmsg = params;

    for(var i in userdata.channels){

	console.log("join: " + channels[i].name);
	var u = channels[i].users;
	delete u[userdata.nick];

	for(var j in userdata.channels[i].users){
	    var ud = userdata.channels[i].users[j];
	    console.log("quit: " + ud.nick);
	    ud.socket.emit('message', ':' + userdata.nick + ' QUIT ' + quitmsg);
	}
    }

    delete clients[userdata.nick];

    console.log(userdata.nick + " has quit");

};

var user = function(userdata, params){

};

var invite = function(userdata, params){
    console.log("INVITE: "+params);
    paramArray = params.split(/\s+/);
    if(paramArray.length != 2){
	// Incorrect number of args.
	console.log("ERROR: Incorrect number of args!");
    } else if(paramArray[0] == userdata.nick && null != clients[paramArray[0]]){
	var channelName = paramArray[1];
	var channel = channels[channelName];
	if(null != channel){
	    var channelModes = channel.mode;
	    if(!channelModes.invite_only_chan){
		
		// Invite user...how?
		channel.invited[paramArray[0]] = true;
	    } else {
		// If channel is an "invite only" channel, check that the
		// inviting user is an operator of that channel.
		if(userData.mode.operatorOf[channelName] != null){
		    
		    // Inivte user...how?
		    channel.invited[paramArray[0]] = true;
		} else {
		    // Error: Inviter does not have privileges to invite others to this
		    // "invite only" channel.
		    console.log("ERROR: You don't have privileges to invite others to \""+channelName+"\" -- invite_only_channel.");
		}
	    }
	} else {
	    console.log("ERROR: Channel does not exist to invite to");
	}
    } else console.log("ERROR: Either the user \""+params[0]+"\" doesn't exist OR You attempted to invite yourself.");
};

var userMode = function(userdata, inputArray){
	var returnMsg = "blah";
	var userNick = inputArray[0];
	var userDataWithNick = clients[userNick];
	if(!userDataWithNick){
		// Error: No user with given name.
		returnMsg = "ERROR: Can't find user \""+userNick+"\"!";
		console.log(returnMsg);
	} else if(inputArray.length > 1){
		var operation = inputArray[1];
		var argLength = inputArray.length;
		var userModes = userDataWithNick.mode;
		console.log("Found user \""+userNick+"\"!"); // --- Debugging print.
		if(operation.length > 2) console.log("This IRC only processes one mode change at a time.");
		if(operation[0] === '+'){
			switch(operation[1]){
				case 'i':
					userModes.invisible = true;
					returnMsg = "SUCCESS: User \""+userDataWithNick.nick+"\" changed invisibility to "+userDataWithNick.mode.invisible;
					console.log(returnMsg);
					break;
				case 'o':
					// Implemented in channel modes.
					//break;
				case 'w':
					// Wont be implemented.
					//break;
				case 's':
					// Wont be implemented.
					//break;
				default:
					// Error: unrecognized option flag.
					returnMsg = "ERROR: Unrecognized option flag \""+operation[1]+"\" --ignored.";
					console.log(returnMsg);
			}
		} else if(operation[0] === '-'){
			switch(operation[1]){
				case 'i':
					userModes.invisible = false;
					returnMsg = "SUCCESS: User \""+userDataWithNick.nick+"\" changed invisibility to "+userDataWithNick.mode.invisible;
					console.log(returnMsg);
					break;
				case 'o':
					//break;
				case 'w':
					// Wont be implemented.
					//break;
				case 's':
					// Wont be implemented.
					//break;
				default:
					returnMsg = "ERROR: Unrecognized option flag \""+operation[1]+"\" --ignored.";
					console.log(returnMsg);
			}
		} else {
			//error;
			returnMsg = "ERROR: Mode flag must be preceeded by +|-";
			console.log(returnMsg);
		}
	}

	//emit returnMsg to all users connected to all channel this user is in.
	for (j in userDataWithNick.channels){
		var tmpChanName = j;
		for (i in channels[j].users) {
			var peer = channels[j].users[i];
			//console.log("ZOMG! +++++ "+ ":" + userDataWithNick.nick + " MODE "+returnMsg);
			peer.socket.emit('message', ":" + userDataWithNick.nick + " MODE "+returnMsg);
		}
	}
};

var chanMode = function(userdata, inputArray){
	var channelName = inputArray[0];
	var channel = channels[channelName];//findChannelWithName(channelName);
	var returnMsg = "";
	if(!channel){
		// Error: No channel with given name.
		returnMsg = "ERROR: Can't find channel \""+channelName+"\"!";
		console.log(returnMsg);
	} else if(channel.mode.operators[userdata.nick] == null){
		returnMsg = "ERROR: \""+userdata.nick+"\" must be a moderator/operator of channel \""+channelName+"\" to make changes to the channel."
		console.log(returnMsg);
	} else if(inputArray.length > 1){
		var operation = inputArray[1];
		var argLength = inputArray.length;
		var channelModes = channel.mode;
		console.log("Found channel \""+channelName+"\"!"); // --- Debugging print.
		if(operation.length > 2) console.log("This IRC only processes one mode change at a time.");
		if(operation[0] === '+'){
			//add
			switch(operation[1]){
				case 'o':
					//give operator privlages.
					if(argLength != 3){
						// Error: not enough args.
						returnMsg = "ERROR: Not enough args specified to add an operator.";
						console.log(returnMsg);
					} else {
						if(userdata.nick === inputArray[2]) console.log("You are not allowed to make yourself an operator.");
						else {
							var user = clients[inputArray[2]]//findUserWithNick(inputArray[2]);
							if(user != null){
								//cross check channels and users?
								channelModes.operators[user.nick] = user; // only pushing strings, not objects.
								user.mode.operatorOf[channel.name] = channel; // dido.
							} else {
								returnMsg = "ERROR: Could not find user \""+inputArray[2]+"\".";
								console.log(returnMsg);
							}
						}
					}
					break;
				case 'p':
					channelModes.private_chan = true;
					returnMsg = "SUCCESS: privacy for channel \""+channelName+"\" set to "+channelModes.private_chan;
					break;
				case 's':
					channelModes.secret_chan = true;
					returnMsg = "SUCCESS: secrecy for channel \""+channelName+"\" set to "+channelModes.secret_chan;
					break;
				case 'i':
					channelModes.invite_only_chan = true;
					returnMsg = "SUCCESS: invite only for channel \""+channelName+"\" set to "+channelModes.invite_only_chan;
					break;
				case 't':
					channelModes.topic_mod_by_op_only = true;
					returnMsg = "SUCCESS: topic modification by operators only for channel \""+channelName+"\" set to "+channelModes.topic_mod_by_op_only;
					break;
				case 'n':
					channelModes.no_mes_from_outsiders = true;
					returnMsg = "SUCCESS: no messages from outsiders for channel \""+channelName+"\" set to "+channelModes.no_mes_from_outsiders;
					break;
				case 'm':
					channelModes.moderated_chan = true;
					returnMsg = "SUCCESS: moderated flag for channel \""+channelName+"\" set to "+channelModes.moderated_chan;
					break;
				case 'l':
					if(argLength != 3){
						returnMsg = "ERROR: Not enough args specified to change user limit.";
						console.log(returnMsg);
					} else {
						if(isNaN(inputArray[2])){
							returnMsg = "ERROR: Limit arg \""+inputArray[2]+"\" is not a number";
							console.log(returnMsg);
						} else {
							channelModes.user_limit = inputArray[2];
							returnMsg = "SUCCESS: limit for channel \""+channelName+"\" set to "+channelModes.user_limit;
						}
					}
					break;
				case 'b':
					if(argLength != 3){
						returnMsg = "ERROR: No user specified.";
						console.log(returnMsg);
					} else {
						var user = clients[inputArray[2]];
						if(user != null){
							channelModes.ban_mask[user.name] = inputArray[2]; // need to do more funky stuff?
						} else {
							returnMsg = "ERROR: Could not find user \""+inputArray[2]+"\".";
							console.log(returnMsg);
						}
					}
					break;
				case 'v':
					if(argLength != 3){
						returnMsg = "ERROR: No user specified.";
						console.log(returnMsg);
					} else {
						var user = channel.users[inputArray[2]]; // find user in this channel.
						if(user != null){
							channelModes.voice[user.name] = true; // if user found in channel, give voice.
							returnMsg = "SUCCESS: User \""+user.name+"\" now has a voice.";
						} else {
							returnMsg = "ERROR: Could not find user \""+inputArray[2]+"\" in channel \""+channelName+"\".";
							console.log(returnMsg);
						}
					}
					break;
				case 'k':
					channelModes.key = inputArray[2]; // need to do more funky stuff and discuss necessity.
					break;
				default:
					// Error: unrecognized option flag.
					returnMsg = "ERROR: Unrecognized option flag \""+operation[1]+"\" --ignored.";
					console.log(returnMsg);
			}
		} else if(operation[0] === '-'){
			//subtract
			switch(operation[1]){
				case 'o':
					//take operator privlages.
					if(argLength != 3){
						// Error: not enough args.
						returnMsg = "ERROR: Not enough args specified to remove an operator.";
						console.log(returnMsg);
					} else {
						var user = clients[inputArray[2]]//findUserWithNick(inputArray[2]);
						if(user != null){
							//cross check channels and users?
							delete channelModes.operators[user.nick]; // only pushing strings, not objects.
							delete user.mode.operatorOf[channel.name]; // dido.
							returnMsg = "SUCCESS: User \""+user.nick+"\" removed as an operator to channel \""+channelName+"\"";
						} else {
							returnMsg = "ERROR: Could not find user \""+inputArray[2]+"\".";
							console.log(returnMsg);
						}
					}
					break;
				case 'p':
					channelModes.private_chan = false;
					returnMsg = "SUCCESS: privacy for channel \""+channelName+"\" set to "+channelModes.private_chan;
					break;
				case 's':
					channelModes.secret_chan = false;
					returnMsg = "SUCCESS: secrecy for channel \""+channelName+"\" set to "+channelModes.secret_chan;
					break;
				case 'i':
					channelModes.invite_only_chan = false;
					returnMsg = "SUCCESS: invite only for channel \""+channelName+"\" set to "+channelModes.invite_only_chan;
					break;
				case 't':
					channelModes.topic_mod_by_op_only = false;
					returnMsg = "SUCCESS: topic modification by operators only for channel \""+channelName+"\" set to "+channelModes.topic_mod_by_op_only;
					break;
				case 'n':
					channelModes.no_mes_from_outsiders = false;
					returnMsg = "SUCCESS: no messages from outsiders for channel \""+channelName+"\" set to "+channelModes.no_mes_from_outsiders;
					break;
				case 'm':
					channelModes.moderated_chan = false;
					returnMsg = "SUCCESS: moderated flag for channel \""+channelName+"\" set to "+channelModes.moderated_chan;
					break;
				case 'l':
					channelModes.user_limit = null;
					returnMsg = "SUCCESS: limit for channel \""+channelName+"\" set to "+channelModes.user_limit;
					break;
				case 'b':
					if(argLength != 3){
						returnMsg = "ERROR: No user specified.";
						console.log(returnMsg);
					} else {
						var user = clients[inputArray[2]];
						if(user != null){
							delete channelModes.ban_mask[inputArray[2]]; // need to do more funky stuff?
						} else {
							returnMsg = "ERROR: Could not find user \""+inputArray[2]+"\".";
							console.log(returnMsg);
						}
					}
					break;
				case 'v':
					if(argLength != 3){
						returnMsg = "ERROR: No user specified.";
						console.log(returnMsg);
					} else {
						var user = channel.users[inputArray[2]]; // find user in this channel.
						if(user != null){
							channelModes.voice[user.name] = false; // if user found in channel, give voice.
							returnMsg = "SUCCESS: User \""+user.name+"\" now has NO voice.";
						} else {
							returnMsg = "ERROR: Could not find user \""+inputArray[2]+"\" in channel \""+channelName+"\".";
							console.log(returnMsg);
						}
					}
					break;
				case 'k':
					// some magic yet to be done.
					break;
				default:
					returnMsg = "ERROR: Unrecognized option flag \""+operation[1]+"\" --ignored.";
					console.log(returnMsg);
			}
		} else {
			//error;
			returnMsg = "Mode flag must be preceeded by +|-";
			console.log(returnMsg);
		}
	} else {
		returnMsg = "ERROR: Not enough args or some other error.";
		console.log(returnMsg);
	}

	//emit returnMsg to all user in current channel.
	for (i in channel.users) {
		var peer = channel.users[i];
		peer.socket.emit('message', ":" + userdata.nick + " MODE " + returnMsg);
    }

};

var mode = function(thisuser, params){
	var inputArray = params.split(/\s+/);
console.log("mode function splitter: "+params[0]);
	if(params[0] === '#'){
		chanMode(thisuser, inputArray);
	} else {
		userMode(thisuser, inputArray);
	}
};

var kick = function(thisuser, params){
    console.log("Kick " + params);
    var args = params.split(' ');
    if(args.length != 2){
	console.log("Kick: invalid args");
	return;
    }

    if(channels[args[0]]){
	var c = channels[args[0]];

	if(c.users[args[1]]){
	    var u = c.users[args[1]];
	    part(u, args[0]);
	}
    }

};

var topic = function(thisuser, params){
    var a = params.indexOf(' ');
    var chan = params.slice(0, a);
    var top = params.slice(a+1);

    if(channels[chan] != undefined){
	channels[chan].topic = top;

	for(var i in channels[chan].users){
	    var u = channels[chan].users[i];
	    console.log( ':' + thisuser.nick + ' TOPIC ' + params);
	    u.socket.emit('message', ':' + thisuser.nick + ' TOPIC ' + params);
	}

    }

}

var nocommand = function(com){
    console.log(com + ": not a recognized command");
};


socket.sockets.on('connection', function(client){
	console.log("connection works!");
	var address = client.handshake.address; // Get client ip address and port.
	var thisuser = new userData(address.address, client);


	client.on('disconnect', function(data){
		console.log(thisuser.nick);
		quit(thisuser);
	    });

	client.on('data', function(data){
		console.log(thisuser.nick);
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
		//console.log(a);
		if(a > 0){
		    var comtype = fullcommand.slice(0, a);
		    var params = fullcommand.slice(a+1, fullcommand.length);
		} else {
		    var comtype = fullcommand;
		    var params = undefined;
		}
		
		//console.log(params);

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
		    part(thisuser, params);
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
		    kick(thisuser, params);
		    break;
		case "QUIT":
		    quit(thisuser, params);
		    break;
		default:
		    nocommand(comtype);
		}
	

	
	    });
	
	
	
    });


