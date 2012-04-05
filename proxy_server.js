#!/usr/bin/env node

var    http = require('http'),
      https = require('https'),
  httpProxy = require('http-proxy'),
       path = require('path'),
         fs = require('fs'),
    connect = require('connect');

// Create an instance of node-http-proxy
var proxy = new httpProxy.HttpProxy({
  target: {
    host: '127.0.0.1',
    port: 10000
  }
});

var server = http.createServer(function (req, res) {
  // Proxy normal HTTP requests
  proxy.proxyRequest(req, res);
});

server.on('upgrade', function(req, socket, head) {
  // Proxy websocket requests too
  proxy.proxyWebSocketRequest(req, socket, head);
});

server.listen(8080);

// custom 503 page
proxy.on('proxyError', function (err, req, res) {
  connect.static('/home/app/500')(req, res, function() {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Something went wrong.  Someone should fix it.');
  });
});

// now for an ssl proxy
httpProxy.createServer(8080, 'localhost', {
  https: {
    key: fs.readFileSync(path.join(process.env['HOME'], 'key.pem'), 'utf8'),
    cert: fs.readFileSync(path.join(process.env['HOME'], 'cert.pem'), 'utf8')
  }
}).listen(8443);
