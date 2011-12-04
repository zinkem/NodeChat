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
			msg = msg.slice(1); // remove the forward slash.
			var userInput = msg.split(/\s+/);
			input.value = msg;// debugging.
			var command = userInput[0].toUpperCase();
			var param = userInput.slice(1).join(' ');
			sendString = nick + " " + command + " " + param;
			//input.value = null;
		} else if(currentnick != nick){
			sendString = currentnick + " NICK " + nick;
			currentnick = nick;
		} else {
			sendString = nick + " PRIVMSG " + input.id + " " + nick  + " " +  msg;
			input.value = null;
		}
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

    var nameField = document.createElement("input");
    nameField.value = currentnick = "guest"; // Default user name.
    nameField.id = "nickField";
    nameField.setAttribute("onKeyPress", "checkForSend(this, event)");
    document.body.appendChild(nameField);

    showChat('cs455');
    //showChat('zinkem');
    //showChat('kali');


}


function init(){

    socket = new io.connect(domain);

    socket.emit('data', "unknown INIT");

    beginChat(socket);
}


var privmsg = function(user, params){
    var a = data.indexOf(' ');
    var chan = data.slice(0, a);
    var chan_name = data.slice(1, a);
    var content = data.slice(a);
    
    var chatbox = document.getElementById(chan_name);
    var inputbox = document.getElementById(chan);
    
    var newDiv = document.createElement('div');
    newDiv.innerHTML = content + "<br/>";
    chatbox.insertBefore(newDiv, inputbox);
    
    var chatboxchildren = chatbox.children;
    if(chatboxchildren.length > linesToDisplay+2)
	chatbox.removeChild(chatboxchildren.item(1));
    
    console.log(data);
    
};


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
