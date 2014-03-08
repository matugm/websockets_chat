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
banned_users = [];
admin_pass = "92zn4tEU";

// Actual WebSockets stuff starts here
io.sockets.on('connection', function (socket) {
  socket.emit('server_message', { msg: 'Welcome to our chat!' });

  user_count += 1;

  var user = {};
  user.name  = genRandomUserName();
  user.admin = false;
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

  socket.on('admin_cmd', function(data) {
    socket.get('user_data', function(err, user) {
      var cmd  = data.msg.split(" ")[0];
      var args = data.msg.split(" ")[1];

      if (cmd == "/pass" && args == admin_pass) {
        user.admin = true;
        socket.emit('server_message', { msg: "You are now recognized as an admin."});
        socket.set('user_data', user);
      }

      if (!user.admin) {
        socket.emit('server_message', { msg: "Sorry, you need to be an admin to do that." });
        return false;
      }

      if (cmd == "/ban") {
        banned_users.push(args);
        socket.emit('server_message', { msg: args + " has been banned from chat."});
      }      

      if (cmd == "/unban") {
        var index = banned_users.indexOf(args);

        if (index == -1) {
          socket.emit('server_message', { msg: "User is not banned." });
          return;
        }

        banned_users.splice(index, index + 1);
        console.log(index);
        socket.emit('server_message', { msg: args + " has been unbanned."});
      }

    });
  });

  socket.on('send_message', function (data) {
    socket.get('user_data', function(err, user) {
      var time = new Date().getTime();
      var diff = time - user.last_message;

      if (banned_users.indexOf(user.name) > -1) {
        socket.emit('server_message', { msg: 'Sorry, you have been banned.'});

        return false;
      }

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
