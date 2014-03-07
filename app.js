var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

app.listen(8020);

// Read index.html and display it.
function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

function genRandomUserName() {
  var name = (Math.random() * 10000) + 1000;
  name = name + "";
  return "trader_" + name.substr(0, 3);
}

// Actual WebSockets stuff starts here
io.sockets.on('connection', function (socket) {
  socket.emit('server_message', { msg: 'Welcome to our chat!' });

  var name = genRandomUserName();
  socket.set('user_name', name);

  socket.emit('server_message', { msg: 'You are speaking as: ' + name })

// Events
  socket.on('send_message', function (data) {
    socket.get('user_name', function(err, name) {
      socket.broadcast.emit('user_message', { msg: data.msg, user: name });
    });
  });

});
