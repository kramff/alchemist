const WebSocket = require("ws");
const wss = new WebSocket.Server({port: 5000});
wss.on("connection", (ws) => {
	console.log("got connection");
	let player = new Player(ws);
	let currentRoom;
	roomList.forEach(room => sendData(player.ws, "roomInfo", {roomName: room.name, roomID: room.id}))
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
			let roomData = {roomName: createdRoom.name, roomID: createdRoom.id};
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
		}
		// gameplay inputs
		else if (messageType === "playerInput") {
			if (currentRoom === undefined) {
				console.log("not in a room right now");
				return;
			}
			//console.log("player sent inputs");
			messageData.id = player.id;
			currentRoom.connectedPlayers.forEach(otherPlayer => sendData(otherPlayer.ws, "playerInput", messageData));
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
