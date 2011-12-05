var socket;
var domain = document.location.href;

var currentnick;

//this is called every time the user presses a key in the chat box input line
function checkForSend(input, event){

	// Only if the user hit enter we do:
    if(event.keyCode == 13){

		var msg = input.value;
		var len = msg.length;
		var nick = document.getElementById('nickField').value;
		var sendString;

		// Forward slash "/" denotes that the user is specifying a command.
		if(msg[0] == '/'){
		    sendString = msg.slice(1); // remove the forward slash.
		    input.value = null;
		} else if(currentnick != nick){
			sendString = "NICK " + nick;
			currentnick = nick;
		} else {
		    sendString = "PRIVMSG " + input.id + " " + msg;
		    input.value = null;
		}
		console.log("to server: " + sendString);
		socket.emit('data', sendString);

    }

}

var linesToDisplay = 14;
function showChat(room){



    var i;
    var newDiv = document.createElement("div");
    var chatText = '<h1>#' + room + '</h1>';
    
    for(i = 0; i < linesToDisplay; i++){
    	chatText += "<div>&nbsp;</div>"
    }
    
    newDiv.id = room;
    newDiv.className = "chatBox";
    newDiv.innerHTML = chatText;
    
    var sendForm = document.createElement("input");
    sendForm.placeholder = "Type here and hit enter to send a message to  #" + room;

    if(room.split(' ').length == 2)
	sendForm.id = room.split(' ')[1];
    else
	sendForm.id = '#' + room;

    sendForm.className = "sendChatBox";
    sendForm.setAttribute("onKeyPress", "checkForSend(this, event)");
    newDiv.appendChild(sendForm);
    
    document.body.appendChild(newDiv);
}

function beginChat(socket){
    socket.emit('data', "JOIN #cs455"); 
}


function init(){

    socket = new io.connect(domain);

    //create system message box
    var newDiv = document.createElement("div");
    var sysText = 'system messages:';
    newDiv.id = "system";
    newDiv.className = "system";
    document.body.appendChild(newDiv);
    
    //create namefield and default nick
    var nameField = document.createElement("input");
    nameField.value = currentnick = "guest" + Math.floor(Math.random()*1001); //deflt username
    nameField.id = "nickField";
    nameField.setAttribute("onKeyPress", "checkForSend(this, event)");
    document.body.appendChild(nameField);




    socket.emit('data', "NICK " + currentnick);

    //need to wait on a response here... might need to do something special?
    
    socket.emit('data', "USER " + currentnick + " " + domain + " " + domain + " :Tyler Durden");


    socket.on('INIT', function(data){
	    console.log("Client side INIT "+ data);
	});
    
    socket.on('message', function(data){
	    
	    console.log('Full message from server: ' + data);
	    
	    
	    var a = data.indexOf(' ');
	    someNick = data.slice(0, a); // Pull some nickname off of message.
	    var fullcommand = data.slice(a+1, data.length);
	    a = fullcommand.indexOf(' '); // find index of next space.
	    var comtype = fullcommand.slice(0, a);
	    var params = fullcommand.slice(a+1, fullcommand.length);
	    
	    console.log("Client received command: "+fullcommand);
	    
	    switch(comtype){
	    case "USER":
				user(someNick, params);
				break;
			case "PRIVMSG":
				privmsg(someNick, params);				
				break;
			case "WHO":
				who(someNick, params);
				break;
			case "NICK":
				nick(someNick, params);
				break;
			case "JOIN":
				joinchan(someNick, params);
				break;
			case "PART":
				part(someNick, params);
				break;
			case "MODE":
				mode(someNick, params);
				break;
			case "TOPIC":
				topic(someNick, params);
				break;
			case "LIST":
				list(someNick, params);
				break;
			case "INVITE":
				invite(someNick, params);
				break;
			case "KICK":
				kick(someNick, params);
				break;
			case "QUIT":
				quit(someNick, params);
				break;
			default:
				nocommand(comtype);
	    }
	    
	});
    
    
    beginChat(socket);
}


var privmsg = function(user, params){

    console.log(user + " ... " + params);

    var a = params.indexOf(' ');
    var chan = params.slice(0, a);
    var chan_name = params.slice(1, a);
    var content = params.slice(a);

    
    var sender = user.slice(1);
    var rcvr = chan;

    if(sender == currentnick){
	var username = chan;
	var other = sender;
    } else {
	var username = sender;
	var other = chan;
    }

    var chatbox = document.getElementById(chan_name);
    var inputbox = document.getElementById(chan);

    if(chatbox == null){
	chatbox = document.getElementById("#user "+ username);
	inputbox = document.getElementById(username);
    }

    if(chatbox == null && chan[0] != '#'){
	chatbox = document.getElementById("#user "+ username);
	if(chatbox == null){
	    showChat("#user " + username);
	    chatbox = document.getElementById("#user "+ username);	    
	}
	inputbox = document.getElementById(username);
	if(username == currentnick){
	    inputbox.setAttribute('id', other);
	}
    }

    var newDiv = document.createElement('div');
    newDiv.innerHTML = "[" + sender + "]" + content + "<br/>";
    chatbox.insertBefore(newDiv, inputbox);
    
    var chatboxchildren = chatbox.children;
    if(chatboxchildren.length > linesToDisplay+2)
	chatbox.removeChild(chatboxchildren.item(1));
    
    console.log(params);
    
};

var who = function(thisuser, params){
    
    var sysbox = document.getElementById("system");
    if (!sysbox) {
        var newDiv = document.createElement("div");
        var sysText = '<h1>Command response:</h1>';
        newDiv.id = "system";
        newDiv.className = "system";
        document.body.appendChild(newDiv);
        sysbox = document.getElementById("system");
    }
    
    sysbox.innerHTML = params + "<br/>";
    
};

var nick = function(user, params){
    console.log(user + " changed nick to " + params);

    if(user == currentnick){
	currentnick = params;
    }

};
var joinchan = function(user, params){
    console.log(user + " & " + params);
    
    var chan_name = params.slice(1);
    var inputbox = document.getElementById(params);
    var chatbox = document.getElementById(chan_name);

    if(chatbox == undefined){
	showChat(params.slice(1));
    } else {
	var newDiv = document.createElement('div');
	newDiv.innerHTML = user.slice(1) + " entered " + params;
	chatbox.insertBefore(newDiv, inputbox);
    }

};
var part = function(thisuser, params){
    console.log(thisuser + " & " + params);
    var user = thisuser.slice(1);
    var chan = params.slice(1);
    var inputbox = document.getElementById(params);
    var chatbox = document.getElementById(chan);

    if (user == currentnick) {
        chatbox = document.getElementById(chan);
        if (chatbox) {
            document.body.removeChild(chatbox);
	}
    } else {
        if (chatbox == undefined) {
	    showChat(chan);
        } else {
	    var newDiv = document.createElement('div');
	    newDiv.innerHTML = user + " left " + params;
	    chatbox.insertBefore(newDiv, inputbox);
        }
    }
};
var mode = function(thisuser, params){
	console.log(params);
};

var list = function(thisuser, params){
    
    var sysbox = document.getElementById("system");
    if (!sysbox) {
        var newDiv = document.createElement("div");
        var sysText = '<h1>Command response:</h1>';
        newDiv.id = "system";
        newDiv.className = "system";
        document.body.appendChild(newDiv);
        sysbox = document.getElementById("system");
    }
    
    sysbox.innerHTML = params + "<br/>";
    
};

var invite = function(thisuser, params){
	console.log(thisuser.nick+" & "+params);
};
var kick = function(thisuser, params){
};
var quit = function(thisuser, params){
    console.log(thisuser + "has quit");

};
var topic = function(user, params){
    var a = params.indexOf(' ');
    var chan = params.slice(1, a);
    var t = params.slice(a+1);

    var chatbox = document.getElementById(chan);
    var inputbox = document.getElementById('#' + chan);

    var newDiv = document.createElement('div');
    newDiv.innerHTML = user.slice(1) + " set topic to \"" + t + "\"";
    chatbox.insertBefore(newDiv, inputbox);

    var chatboxchildren = chatbox.children;
    if(chatboxchildren.length > linesToDisplay+2)
	chatbox.removeChild(chatboxchildren.item(1));

}

var nocommand = function(comtype){
    console.log("No command: " + comtype);
};
