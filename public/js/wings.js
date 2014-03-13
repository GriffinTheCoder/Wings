/** 
 * Socket.IO config
 */
var socketURI = "localhost";

/**
 * Canvas
 */
var context, canvas;

/**
 * Intervals
 */
var updateInterval;
var	broadcastInterval;

/**
 * Sounds
 */
var soundJump = new Audio("./sounds/sfx_wing.ogg");
var soundHit = new Audio("./sounds/sfx_hit.ogg");
var soundDie = new Audio("./sounds/sfx_die.ogg");

/**
 * Terrain
 */
var floor = new Image();
floor.src = './imgs/floor32.png';
var tiles = [],
	terrain_x = 0;

/**
 * Pipes
 */
var pipe32 = new Image();
pipe32.src = './imgs/pipe32.png';
var pipes = [];

/**
 * Player
 */
var player_sprite = new Image();
player_sprite.src = './imgs/wings32.png';
var player = {
	x: 80,
	y: 0,
	speed: 2.8,
	rotation: 0,
	lastrotation: 0,
	velocity: 0,
	dead: false
}
var playing = false;

/**
 * Opponent
 */
var opponent_sprite = new Image();
opponent_sprite.src = './imgs/wings_opponent32.png';

/**
 * Physics
 */
var gravity = 0.25,
	jump = -4.6;

/**
 * Network
 */
var sessionID;
var socket;
var id = makeid();
var multi = false;
var opponent = [];

$(function() {
	// conenct to the main server
	socket = io.connect(socketURI);

	socket.emit("restart", {});

	// button events...
	$("#showcredits").click(function() {
		$("#container").fadeOut("slow", function() {
			$("#credits").fadeIn("slow", function() {});
		});
	});

	$("#closecredits").click(function() {
		$("#credits").fadeOut("slow", function() {
			$("#container").fadeIn("slow", function() {});
		});
	});

	socket.on("paitence", function (data) {
		$("#container").fadeOut("slow", function() {});
		$("#loading").fadeIn("slow", function() {});
	});

	$("#joingame").click(function() {
		// for new games
		var newGame = {};
		newGame.id = id;
		newGame.sessionID = makeid();

		socket.emit("tryconnect", newGame);
	});

	$(".reset").click(function() {
		reset();
	});

	// socket events...
	socket.on("conn", function (data) {
		sessionID = data.session;
	});

	socket.on("reset", function (data) {
		if ($("#loading").css('display') == 'block') {
			$("#loading").fadeOut("slow", function() {
				multi = true;
				player.x = 80;
				player.y = (canvas.height / 2) - player_sprite.naturalHeight;
				player.velocity = 0;
	 		});
		} else {
			$("#container").fadeOut("slow", function() {
				multi = true;
				player.x = 80;
				player.y = (canvas.height / 2) - player_sprite.naturalHeight;
				player.velocity = 0;
	 		});
		}
	});

	socket.on("fail", function (data) {
		alert(data);
	});

	socket.on("coords", function (data) {
		playing = true;
		if (data.id != id) {
			opponent = data;
		}
	});

	socket.on('disconnect', function() {
		socket.socket.connect();
		console.log("asdf");
	});

	socket.on("newpipe", function(data) {
		console.log("PIPE1");
		var newPipe = {};
		newPipe.x = canvas.width + pipe32.width;
		newPipe.y = data.pipe1y;
		newPipe.virtx = canvas.width + player.x;
		newPipe.rotation = 0;
		newPipe.passed = false;
		pipes.push(newPipe);

		var newPipe2= {};
		newPipe2.x = canvas.width + pipe32.width;
		newPipe2.y = data.pipe2y;
		newPipe2.virtx = canvas.width + player.x;
		newPipe2.rotation = 180;
		newPipe2.passed = false;
		pipes.push(newPipe2);
	});

	// setup the canvas
	canvas = document.getElementById('game');
	context = canvas.getContext('2d');

	// place the player in the middle of the screen
	player.y = (canvas.height / 2) - player_sprite.naturalHeight;

	// create the first few tiles
	createTerrain();

	// start the intervals
	start();

	// bind the click event
	$("#game").on("click", function() {
  		flap();
	});

	$(document).keypress(function(e) {
	  if (e.which == '33' || e.which == '87' || e.which == '32') {
	    e.preventDefault();
	    flap();
	   }
	});
});

/**
 * Pre-generate the first few tiles
 */
function createTerrain() {
	for (i = 0; i < canvas.width; i += floor.naturalWidth) {
		var newTile = {};
		newTile.y = canvas.height - floor.naturalHeight;
		terrain_x = i;
		newTile.x = terrain_x;
		tiles.push(newTile);
	}
}

/**
 * Create new game intervals
 */
function start() {
	if (updateInterval == null && broadcastInterval == null) {
		// the main game loop (sixty times a second)
		updateInterval = setInterval(update, 1000 / 60);

		// send data up the wire (nine times a second)
		broadcastInterval = setInterval(broadcast, 1000 / 20);
	}
}

/** 
 * The main game loop
 */
function update() {
	// apply gravity and update velocity
	player.velocity += gravity;
   	player.y += player.velocity;

   	updatePlayerPosition();

   	if (player.dead == false) {
		checkCollisions();
		updateTerrain();

		redraw();
	} else {
		// draw the player falling
		if (player.y + player_sprite.height <= canvas.height - floor.height) {
			redraw();
		}
	}

	// win/lose events
   	if (opponent.dead && !player.dead && multi == true) {
		$("#win").fadeIn("slow", function() {});
	} else if (!opponent.dead && player.dead && multi == true) {
		$("#lose").fadeIn("slow", function() {});
	}
}

/** 
 * Check if the player hit anything or got past obstacles
 */
function checkCollisions() {
	for (i = 0; i < pipes.length; i++) {
		// hit pipe
		if (player.x < pipes[i].virtx + pipe32.width && player.x + player_sprite.width  > pipes[i].virtx && player.y < pipes[i].y + pipe32.height && player.y + player_sprite.height > pipes[i].y) {
			if (multi == true) {
				die();
			}
		}

		// went through pipe
		if (player.dead == false && pipes[i].virtx < player.x && pipes[i].passed == false) {
			pipes[i].passed = true;
		}
	}

	// hit floor
	if (player.y + player_sprite.height >= canvas.height - floor.height) {
		if (multi == true) {
			die();
		} else {
			// bouncy
			player.velocity = jump;
		}
	}

	// hit celing
	if (player.y <= 0) {
		player.y += 15;
	}
}

/** 
 * Update the player position
 */
function updatePlayerPosition() {
	if (!player.dead) {
		// apply horizontal speed and reset y
		player.x += player.speed;
		player.y = player.y;
		
		// apply last rotation
		lastrotation = Math.min(player.velocity, 90);
	}
}

/** 
 * Send the data up the wire
 */
function broadcast() {
	if (multi == true) {
		var data = {};
		data.x = player.x;
		data.y = player.y;
		data.dead = player.dead;
		data.velocity = player.velocity;
		data.rotation = player.rotation;
		data.lastrotation = player.lastrotation;
		data.id = id;
		data.sessionID = sessionID;
		socket.emit("updatecoords", data);
	}
}

/** 
 * Update tiles and pipes
 */
function updateTerrain() {
	/*
		terrain generation is all relative to the player
		the player's x value changes, but they never actually
		move - the speed of the terrain generation is also
		relative to player.speed
	*/

	// increase tile x value
	for (i = 0; i < tiles.length; i++) {
		tiles[i].x -= player.speed;
	}

	// create new tile 100 pixels before right edge of canvas
	if (tiles[tiles.length - 1].x <= canvas.width + 100) {
		var newTile = {};
		newTile.y = canvas.height - floor.naturalHeight;
		newTile.x = tiles[tiles.length - 1].x + floor.naturalWidth;
		tiles.push(newTile);
	}

	// increase pipe x value
	for (i = 0; i < pipes.length; i++) {
		pipes[i].x -= player.speed;
	}
}

/** 
 * Redraw all canvas elements
 */ 
function redraw() {
	// clear the canvas
	context.fillStyle = '#71C5CF';
	context.fillRect(0, 0, canvas.width, canvas.height);

	// pipes
	for (i = 0; i < pipes.length; i++) {
		context.save();
	    context.translate(pipes[i].x + pipe32.width / 2, pipes[i].y + pipe32.height / 2);
	    context.rotate(pipes[i].rotation * Math.PI / 180);
	    context.drawImage(pipe32, -pipe32.width / 2, -pipe32.height / 2, pipe32.width, pipe32.height);
	    context.restore();
	}

	// terrain
	for (i = 0; i < tiles.length; i++) {
		context.drawImage(floor, tiles[i].x, tiles[i].y);
	}

	// opponent
	if (multi == true) {
		context.globalAlpha = 0.3;
    	context.drawImage(opponent_sprite, 80, opponent.y);
    }

    // player
    context.globalAlpha = 1;
    context.drawImage(player_sprite, 80, player.y);


	/*
		THIS IS FOR ROTATION - BROKEN

		context.save();
	    context.translate(80 + player_sprite.width / 2, player.y + player_sprite.height / 2);
	    player.rotation = Math.min((player.velocity / 100) * 90, 90);
	    context.rotate(lastrotation - player.rotation);
	    context.drawImage(player_sprite, -player_sprite.width / 2, -player_sprite.height / 2, player_sprite.width, player_sprite.height);
	    context.restore();
    */
}

/** 
 * Make the player jump
 */
function flap() {
	if (!player.dead && playing == true) {
		player.velocity = jump;
		soundJump.pause();
	    soundJump.currentTime = 0;
		soundJump.play();
	}
}

/** 
 * Kill player and start death sequence
 */
function die() {
	player.dead = true;
	soundHit.play();
	setTimeout(function(){soundDie.play();}, 400);
	broadcast();
}

/** 
 * Create a random game ID
 */
function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

/**
 * Reset the game for another game
 */
function reset() {
	// intervals
	clearInterval(updateInterval);
	clearInterval(broadcastInterval);
	updateInterval = undefined;
	broadcastInterval = undefined;

	// terrain
	tiles = [];
	terrain_x = 0;

	// pipes
	pipes = [];

	// player
	player = {
		x: 80,
		y: 0,
		speed: 2.8,
		rotation: 0,
		lastrotation: 0,
		velocity: 0,
		dead: false
	}

	// network
	sessionID = undefined;
	id = makeid();
	multi = false;
	opponent = [];
	playing = false;

	// reset the socket
	socket.emit("restart", {});
	socket.socket.disconnect();

	// misc
	player.y = (canvas.height / 2) - player_sprite.naturalHeight;
	createTerrain();
	
	// menus
	$("#lose").fadeOut("slow", function() {
		$("#container").fadeIn("slow", function() {});
	});

	$("#win").fadeOut("slow", function() {
		$("#container").fadeIn("slow", function() {});
	});

	// create new intervals
	start();
}
