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


var socket = io.listen(webServ);

socket.sockets.on('connection', function(client){
	console.log("connection works!");


	client.on('data', function(data){
		console.log(data);
	    });
	

    });


