console.log("Starting alchemy game server");

const WebSocket = require("ws");
const wss = new WebSocket.Server({port: 8099});
wss.on("connection", (ws) => {
	console.log("got connection");
	let player = new Player(ws);
	let currentRoom;
	sendData(player.ws, "localPlayerID", player.id);
	roomList.forEach(room => sendData(player.ws, "roomInfo", {roomName: room.name, roomID: room.id, gameStarted: room.gameStarted}))
	ws.on("message", (message) => {
		// console.log("got message: " + message);
		let messageParse = JSON.parse(message);
		let messageType = messageParse.type;
		let messageData = messageParse.data;
		// make a room
		if (messageType === "makeRoom") {
			player.name = messageData.playerName;
			let createdRoom = new Room(messageData.roomName);
			createdRoom.AddPlayer(player);
			let roomData = {roomName: createdRoom.name, roomID: createdRoom.id, gameStarted: createdRoom.gameStarted};
			playerList.forEach(player => sendData(player.ws, "roomInfo", roomData));
			currentRoom = createdRoom;
			console.log(`player ${player.id} made room ${currentRoom.id}`);
		}
		// join a room
		else if (messageType === "joinRoom") {
			player.name = messageData.playerName;
			let roomToJoin = roomList.find(room => room.id === Number(messageData.roomID));
			if (roomToJoin === undefined) {
				console.log("no room with that id");
				return;
			}
			roomToJoin.connectedPlayers.forEach(otherPlayer => sendData(player.ws, "roomStatusPlayerJoin", {playerName: otherPlayer.name, playerID: otherPlayer.id, team: otherPlayer.team}));
			roomToJoin.AddPlayer(player);
			currentRoom = roomToJoin;
			console.log(`player ${player.id} joined room ${currentRoom.id}`);
		}
		else if (messageType === "leaveRoom") {
			if (currentRoom === undefined) {
				console.log("not in a room right now");
				return;
			}
			console.log(`player ${player.id} about to leave room ${currentRoom.id}`);
			currentRoom.RemovePlayer(player);
			currentRoom = undefined;
		}
		// switch team
		else if (messageType === "switchTeam") {
			if (currentRoom === undefined) {
				console.log("not in a room right now");
				return;
			}
			currentRoom.SwitchTeamPlayer(player, Number(messageData));
		}
		// start game
		else if (messageType === "startGame") {
			if (currentRoom === undefined) {
				console.log("not in a room right now");
				return;
			}
			let finalPlayerSetup = currentRoom.connectedPlayers.map((player) => {return {playerName: player.name, playerID: player.id, playerTeam: player.team};})
			currentRoom.connectedPlayers.forEach(player => sendData(player.ws, "gameStarting", finalPlayerSetup));
			currentRoom.gameStarted = true;
			let roomData = {roomName: currentRoom.name, roomID: currentRoom.id, gameStarted: currentRoom.gameStarted};
			playerList.forEach(player => sendData(player.ws, "roomInfo", roomData));
			console.log(`Room #${currentRoom.id} (${currentRoom.name}) is starting a game`);
		}
		// gameplay inputs
		else if (messageType === "playerInput") {
			if (currentRoom === undefined) {
				console.log("not in a room right now");
				return;
			}
			//console.log("player sent inputs");
			messageData.id = player.id;
			currentRoom.connectedPlayers.forEach(otherPlayer => {
				if (otherPlayer !== player) {
					sendData(otherPlayer.ws, "playerInput", messageData);
				}
			});
		}
		// pause the game
		else if (messageType === "pauseGame") {
			if (currentRoom === undefined) {
				console.log("not in a room right now");
				return;
			}
			console.log(`Room ${currentRoom.id} pausing game!`);
			messageData.id = player.id;
			currentRoom.connectedPlayers.forEach(otherPlayer => {
				if (otherPlayer !== player) {
					sendData(otherPlayer.ws, "pauseGame", messageData);
				}
			});
		}
		// resume the game
		else if (messageType === "resumeGame") {
			if (currentRoom === undefined) {
				console.log("not in a room right now");
				return;
			}
			console.log(`Room ${currentRoom.id} resuming game!`);
			messageData.id = player.id;
			currentRoom.connectedPlayers.forEach(otherPlayer => {
				if (otherPlayer !== player) {
					sendData(otherPlayer.ws, "resumeGame", messageData);
				}
			});
		}
		// run the desync tool
		else if (messageType === "desyncTool") {
			if (currentRoom === undefined) {
				console.log("not in a room right now");
				return;
			}
			console.log("Running desync tool");
			messageData.id = player.id;
			currentRoom.connectedPlayers.forEach(otherPlayer => {
				if (otherPlayer !== player) {
					sendData(otherPlayer.ws, "desyncTool", messageData);
				}
			});
		}
		// game state history passed for desync tool
		else if (messageType === "gameStateHistory") {
			if (currentRoom === undefined) {
				console.log("not in a room right now");
				return;
			}
			messageData.id = player.id;
			currentRoom.connectedPlayers.forEach(otherPlayer => {
				if (otherPlayer !== player) {
					sendData(otherPlayer.ws, "gameStateHistory", messageData);
					console.log("Game state history passed through server");
				}
			});

		}
	});
	ws.on("close", () => {
		console.log("disconnected");
		if (currentRoom) {
			currentRoom.connectedPlayers.forEach(otherPlayer => sendData(otherPlayer.ws, "playerQuit", player.id));
			currentRoom.RemovePlayer(player);
		}
		playerList.splice(playerList.indexOf(player), 1);
	});
});

let sendData = (ws, type, data) => {
	if (ws.readyState !== WebSocket.OPEN) {
		return;
	}
	let sendObjStr = JSON.stringify({type: type, data: data});
	ws.send(sendObjStr);
	// console.log("send: " + sendObjStr);
}

let playerIDCounter = 0;
let playerList = [];
function Player (ws) {
	this.id = playerIDCounter;
	playerIDCounter ++;
	this.ws = ws;
	this.name = "nickname";
	this.team = 1;
	playerList.push(this);
}

let roomIDCounter = 0;
let roomList = [];
function Room (roomName) {
	this.id = roomIDCounter;
	roomIDCounter ++;
	this.name = roomName;
	this.connectedPlayers = [];
	this.gameStarted = false;
	roomList.push(this);
}
Room.prototype.AddPlayer = function (player) {
	let playerData = {playerName: player.name, playerID: player.id};
	this.connectedPlayers.push(player);
	this.connectedPlayers.forEach(otherPlayer => sendData(otherPlayer.ws, "roomStatusPlayerJoin", playerData));
	console.log("Room " + this.id + " now has " + this.connectedPlayers.length + " in it");
}
Room.prototype.RemovePlayer = function (player) {
	this.connectedPlayers.splice(this.connectedPlayers.indexOf(player), 1);
	this.connectedPlayers.forEach(otherPlayer => {
		sendData(otherPlayer.ws, "roomStatusPlayerLeave", player.id);
	});
	if (this.connectedPlayers.length === 0) {
		console.log("Closing room " + this.id + " because no players");
		this.RemoveSelf();
	}
}
Room.prototype.SwitchTeamPlayer = function (player, team) {
	player.team = team;
	let teamSwitchData = {playerID: player.id, team: team};
	this.connectedPlayers.forEach(otherPlayer => {
		sendData(otherPlayer.ws, "roomStatusSwitchTeam", teamSwitchData);
	});
}
Room.prototype.RemoveSelf = function () {
	playerList.forEach(player => sendData(player.ws, "roomRemoved", this.id));
	roomList.splice(roomList.indexOf(this), 1);
}

process.on('SIGINT', function() {
	console.log("Stopping alchemy game server");
	process.exit();
});
