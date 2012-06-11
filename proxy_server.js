#!/usr/bin/env node

var    http = require('http'),
      https = require('https'),
  httpProxy = require('http-proxy'),
       path = require('path'),
         fs = require('fs'),
    connect = require('connect');

var sslConfig = "enable";
try {
  var c = JSON.parse(fs.readFileSync(path.join(process.env.HOME, "config.json"))).ssl;
  if (['enable','disable','force'].indexOf(c) === -1)
    throw "invalid value for ssl: " + c;
  sslConfig = c;
} catch(e) {
  console.log("can't read config.json:", e);
}
console.log("ssl config is '" + sslConfig + "'");

// Create an instance of node-http-proxy
var proxy = new httpProxy.HttpProxy({
  target: {
    host: '127.0.0.1',
    port: 10000
  }
});

function handleVerRequest(req, res) {
  if (req.url === '/ver.txt') {
    res.setHeader('Content-Type', 'text/plain');
    res.end(fs.readFileSync('/home/app/ver.txt'));
    return true;
  }
  return false;
}

var server = http.createServer(function (req, res) {
  if (handleVerRequest(req, res)) return;

  // Proxy normal HTTP requests if sslConfig != 'force',
  // otherwise issue a redirect
  if (sslConfig === 'force') {
    var url = 'https://';
    if (!req.headers.host) {
      res.writeHead(400, "host header required");
      return res.end();
    }
    url += req.headers.host + req.url;
    res.writeHead(301, { 'Location': url });
    res.end();
  } else {
    proxy.proxyRequest(req, res);
  }
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
if (['enable','force'].indexOf(sslConfig) != -1) {
  var sslServer = https.createServer({
    key: fs.readFileSync(path.join(process.env['HOME'], 'key.pem'), 'utf8'),
    cert: fs.readFileSync(path.join(process.env['HOME'], 'cert.pem'), 'utf8')
  }, function (req, res) {
    if (handleVerRequest(req, res)) return;

    proxy.proxyRequest(req, res);
  }).listen(8443);
}
