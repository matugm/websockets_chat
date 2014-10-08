var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , crypto = require('crypto')
  , shasum = crypto.createHash('sha1');

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

function save_msg(msg) {
  last_20.push(msg);

  if (last_20.lenght >= 20)
    last_20.shift();
}

user_count = 0;
banned_users = [];
last_20 = [];
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

  socket.emit('multi_msg', last_20);

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
        banned_users.push({ name: args });
        socket.emit('server_message', { msg: args + " has been banned from chat."});
      }

      if (cmd == "/unban") {
        var index = getBannedIndex(args);

        if (!index) {
          socket.emit('server_message', { msg: "User is not banned." });
          return;
        }

        banned_users.splice(index, index + 1);
        socket.emit('server_message', { msg: args + " has been unbanned."});
      }

    });
  });

  function isBanned(user) {
    var ip = socket.handshake.address.address;

    for (index in banned_users) {
      var ban = banned_users[index];
      if (ban.name == user || ban.ip == ip)
        return true;
    }

    return false;
  }

  function getBannedIndex(user) {
    for (index in banned_users) {
      var ban = banned_users[index];

      if (ban.name == user)
        return index;
    }

    return false;
  }

  function setBannedIp(user) {
    var ip = socket.handshake.address.address;

    for (index in banned_users) {
      var ban = banned_users[index];

      if (ban.name == user)
        return ban.ip = ip;
    }
  }

  socket.on('send_message', function (data) {
    socket.get('user_data', function(err, user) {
      var time = new Date().getTime();
      var diff = time - user.last_message;

      if (isBanned(user.name)) {
        setBannedIp(user.name);
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

      var user_msg = { msg: data.msg, user: user.name, admin: user.admin };
      save_msg(user_msg);
      socket.broadcast.emit('user_message', user_msg);
    });
  });

});
