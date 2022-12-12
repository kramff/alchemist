const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 5000 })
wss.on("connection", (ws) => {
	console.log("got connection");
	let player = new Player(ws);
	let currentRoom;
	ws.on("message", (message) => {
		console.log("got message: " + message);
		let messageParse = JSON.parse(message);
		let messageType = messageParse.type;
		let messageData = messageParse.data;
		// make a room
		if (messageType === "makeRoom") {
			var createdRoom = new Room(messageData);
			BroadcastNewRoom(createdRoom);
		}
		// join a room
		// switch team
		// start game
		// gameplay inputs
	});
	ws.on("close", () => {
		console.log("disconnected");
		if (currentRoom) {
			currentRoom.RemovePlayer(player);
			if (currentRoom.connectedPlayers.length === 0) {
				currentRoom.RemoveSelf();
			}
		}
		playerList.splice(playerList.indexOf(player));
	});
});

let sendData(ws, type, data) {
	if (ws.readyState !== WebSocket.OPEN) {
		return;
	}
	ws.send(JSON.stringify())
}

let playerIDCounter = 0;
let playerList = [];
function Player (ws) {
	this.id = playerIDCounter;
	this.ws = ws;
	this.name = "nickname";
	playerIDCounter ++;
	playerList.push(this);
}

let BroadcastNewRoom = (room) => {
	var roomData = {roomName: room.name, roomID: room.id};
	playerList.forEach(player => sendData(player.ws, "roomInfo", roomData)
}
let BroadcastRemoveRoom = function (room) {
	playerList.forEach(player => sendData(player.ws, "roomRemoved", room.id));
}

let roomIDCounter = 0;
let roomList = [];
function Room (roomName) {
	this.id = roomIDCounter;
	roomIDCounter ++;
	this.name = roomName;
	this.connectedPlayers = [];
}
Room.prototype.AddPlayer = function (player) {
	let playerData = {playerName: player.name, playerID: player.id};
	this.connectedPlayers.forEach(player => sendData(player.ws, "roomStatusPlayerJoin", ))
	this.connectedPlayers.push(player);
}
Room.prototype.RemovePlayer = function (player) {
	this.connectedPlayers.splice(this.connectedPlayers.indexOf(player));
	this.connectedPlayers.forEach(player => {
		sendData(player.ws, "roomStatusPlayerLeave", player.id);
	});
}
Room.prototype.RemoveSelf = function () {
	BroadcastRemoveRoom(this)
	roomList.splice(roomList.indexOf(this));
}
