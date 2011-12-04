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
		} else if(currentnick != nick){
			sendString = "NICK " + nick;
			currentnick = nick;
		} else {
			sendString = "PRIVMSG " + input.id + " " + nick  + " " +  msg;
			input.value = null;
		}
		console.log(sendString);
		socket.emit('data', sendString);

    }

}

var linesToDisplay = 14;
function showChat(room){

    //var txtFile = new XMLHttpRequest();

    var lines = [];// = txtFile.responseText.split("\n");
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
    sendForm.id = "#" + room;
    sendForm.className = "sendChatBox";
    sendForm.setAttribute("onKeyPress", "checkForSend(this, event)");
    newDiv.appendChild(sendForm);
    
    document.body.appendChild(newDiv);
}

function beginChat(socket){

    //document.body = document.createElement("body");                                                               

    showChat('cs455');
    //showChat('zinkem');
    //showChat('kali');


}


function init(){

    socket = new io.connect(domain);

    //create namefield and default nick
    var nameField = document.createElement("input");
    nameField.value = currentnick = "guest" + Math.floor(Math.random()*1001); //deflt username
    nameField.id = "nickField";
    nameField.setAttribute("onKeyPress", "checkForSend(this, event)");
    document.body.appendChild(nameField);

    socket.emit('data', "NICK " + currentnick);

    //need to wait on a response here... might need to do something special?
    
    socket.emit('data', "USER " + currentnick );


    socket.on('INIT', function(data){
	    console.log("Client side INIT "+ data);
	});
    
    socket.on('message', function(data){
	    
	    console.log('message: ' + data);
	    
	    
	    var a = data.indexOf(' ');
	    var currentuid = data.slice(0, a);
	    var fullcommand = data.slice(a+1, data.length);
	    a = fullcommand.indexOf(' '); // find index of next space.
	    var comtype = fullcommand.slice(0, a);
	    var params = fullcommand.slice(a+1, fullcommand.length);
	    
	    console.log(fullcommand);
	    
	    thisuser = currentuid;
	    
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
    
    
    beginChat(socket);
}


var privmsg = function(user, params){
    var a = params.indexOf(' ');
    var chan = params.slice(0, a);
    var chan_name = params.slice(1, a);
    var content = params.slice(a);
    
    var chatbox = document.getElementById(chan_name);
    var inputbox = document.getElementById(chan);
    
    var newDiv = document.createElement('div');
    newDiv.innerHTML = content + "<br/>";
    chatbox.insertBefore(newDiv, inputbox);
    
    var chatboxchildren = chatbox.children;
    if(chatboxchildren.length > linesToDisplay+2)
	chatbox.removeChild(chatboxchildren.item(1));
    
    console.log(params);
    
};

var who = function(thisuser, params){
};
var nick = function(thisuser, params){
};
var joinchan = function(thisuser, params){
};
var part = function(thisuser, pararms){
};
var mode = function(thisuser, params){
};
var list = function(thisuser, params){
};
var invite = function(thisuser, params){
};
var kick = function(thisuser, params){
};
var quit = function(thisuser, params){
};
var nocommand = function(comtype){
    console.log("No command: " + comtype);
};
