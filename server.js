'use strict';

const ws = require('ws'),
      net = require('net'),
      http = require('http'),
      fs = require('fs'),
      { Duplex } = require('stream');


var wss = new ws.Server({port:8080})

wss.on('connection', function(ws) {
  console.log('new ws connect');

  let irc_proxy = net.createConnection(6667, 'fibonaut.com', () => {
    console.log('connected to fibonaut.com irc server at port 6667');
    ws.on('message', (msg) => {
      console.log('to irc: ', msg);
      irc_proxy.write(msg+'\r\n');
    });

    ws.on('error', (e) => {
      console.log('done messaged up', e);
    });
  });

  irc_proxy.on('data', (d) => {
    console.log('from irc: ', d.toString())
    try {
      ws.send(d.toString()+'\r\n');
    } catch (e) {
      console.log('cant send to ws', e);
    }
  });

  irc_proxy.on('error', (e) => {
    console.log('irc_proxy error', e); 
  });
})


var httpd = http.createServer((req, res) => {
  console.log(req.socket.remoteAddress, req.url);
  if( req.url === '/ws' ){
    //connect to 8080?
  }


  let fstream = fs.createReadStream('.'+req.url);

  fstream.pipe(res);
  fstream.on('error', (e) => {

    console.log(req.socket.remoteAddress, e);
    res.writeHead(404);
    res.end('404: not found');
  });
  
});


httpd.listen(8000);
