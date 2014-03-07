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

user_count = 0;

// Actual WebSockets stuff starts here
io.sockets.on('connection', function (socket) {
  socket.emit('server_message', { msg: 'Welcome to our chat!' });

  user_count += 1;
  console.log(user_count);

  var user = {};
  user.name = genRandomUserName();
  user.msg_count = 0;
  user.last_message = new Date().getTime();
  socket.set('user_data', user);

  socket.broadcast.emit('new_user', { count: user_count });
  socket.emit('new_user', { count: user_count });
  socket.emit('server_message', { msg: 'You are speaking as: ' + user.name });

// Events
  socket.on('disconnect', function() { 
    user_count -= 1;
    socket.broadcast.emit('new_user', { count: user_count });
  });

  socket.on('send_message', function (data) {
    socket.get('user_data', function(err, user) {
      var time = new Date().getTime();
      var diff = time - user.last_message;

      if (diff < 8000) {
        if (user.msg_count >= 3) {
          socket.emit('server_message', { msg: 'You are sending messages '
            + 'too fast. Please slow down.'} );

          return false;
        }
      }
      else {
        user.last_message = time;
        user.msg_count = 0;
      }

      user.msg_count += 1;
      socket.set('user_data', user);

      socket.broadcast.emit('user_message', { msg: data.msg, user: user.name });
    });
  });

});
