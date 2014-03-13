var express = require("express");
var app = express();
var port = 80;

var waiting = [];
var io = require("socket.io").listen(app.listen(port));

app.configure(function(){
  io.set('log level', 1);
  app.set('port', process.env.PORT || 80);
  app.set("views", __dirname + "/views");
  app.set('view engine', 'jade');
  app.set('view options', {layout: false});
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static('public'));
  app.use(express.cookieParser());
  app.use(app.router);
  app.use(app.router);
  app.use(express.static(__dirname + "/public"));
  app.engine("jade", require("jade").__express);
});

app.get("/", function(req, res){
  res.render("wings");
});

io.sockets.on("connection", function (socket) {
    clearInterval(socket['interval']);
    socket['interval'] == undefined;

    if (waiting.indexOf(socket['room']) > -1) {
      waiting.splice(waiting.indexOf(socket['room']), 1);
    }

    socket.leave(socket['room']);
    socket['room'] = "waiting";
    socket.join("waiting");
  console.log(io.sockets.clients().length);

  socket.on("restart", function (data) {
    clearInterval(socket['interval']);
    socket['interval'] == undefined;

    if (waiting.indexOf(socket['room']) > -1) {
      waiting.splice(waiting.indexOf(socket['room']), 1);
    }

    socket.leave(socket['room']);
    socket['room'] = "waiting";
    socket.join("waiting");
  });

  socket.on("tryconnect", function (data) {
    if (waiting.length > 0) {
      var otheruser = waiting.length - 1;
      socket['room'] = waiting[otheruser]['session'];
      socket.join(socket['room']);
      socket.emit("conn", waiting[otheruser]);

      waiting.shift();

      var info = {};
      io.sockets.in(socket['room']).emit("reset", info);

      socket['interval'] = setInterval(function(){
        var data = {};
        var pipegap = 140;
        var random = Math.floor(Math.random() * 160) + 200;
        data.pipe1y = random;
        data.pipe2y = random - 458 - pipegap;
        if (typeof socket['room'] !== undefined && socket['room'] !== null && socket['room'] !== "waiting") {
          io.sockets.in(socket['room']).emit("newpipe", data);
        }
      }, 1000);
    } else {
      var newGame = {};
      var sessionID = data.sessionID;
      newGame.session = sessionID;
      socket['room'] = sessionID;
      socket.join(socket['room']);
      waiting.push(newGame);
      socket.emit("paitence", {});
    }
  });

  socket.on("creategame", function (data) {
    var newGame = {};
    var sessionID = data.sessionID;
    newGame.playername = data.name;
    newGame.session = sessionID;
    socket['room'] = sessionID;
    socket.join(socket['room']);
    waiting.push(newGame);
  });

  socket.on("updatecoords", function (data) {
      io.sockets.in(socket['room']).emit("coords", data);
  });

  socket.on('disconnect', function () {
    clearInterval(socket['interval']);
    socket['interval'] == undefined;
  });
});