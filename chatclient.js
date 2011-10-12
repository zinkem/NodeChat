var socket;
var domain = 'cavehacker.com';

function checkForSend(input, event){
    var msg = input.value;
    var len = msg.length;
    var nick = document.getElementById('nickField').value;

    if(event.keyCode == 13){
        var sendString = input.id + " " + nick  + " " +  msg;
        socket.emit('data', sendString);
        input.value = null;
    }


}

var linesToDisplay = 14;
function showChat(room){

    var txtFile = new XMLHttpRequest();

    var lines = txtFile.responseText.split("\n");
    var i;
    var newDiv = document.createElement("div");
    var chatText = '<h1>#' + room + '</h1>';
    
    for(i = lines.length - linesToDisplay; i < lines.length; i++){
	if(i < 0 )
	    chatText += "<div>! </div>"
	    else
		chatText += "<div>"+lines[i] + "</div>";
	
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
    nameField.value = "guest";
    nameField.id = "nickField";
    document.body.appendChild(nameField);

    showChat('cs455');
    //showChat('zinkem');
    //showChat('kali');


    socket.on('message', function(data){

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
        });
}


function init(){

    socket = new io.connect('http://localhost');

    socket.emit('data', 'data bruhaha!');

    beginChat(socket);
}
