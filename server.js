const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 5000 })
wss.on("connection", (ws) => {
	console.log("got connection");
	ws.on("message", (message) => {
		console.log("got message: " + JSON.stringify(message));
	});
	ws.on("close", () => {
		console.log("disconnected");
	})
})