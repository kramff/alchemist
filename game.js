"use strict";
console.log("alchemist game");

// Main render stuff
let scene;
let camera;
let renderer;

// Specific render stuff
let cubeGeometry;
let playerMaterial;
let playerTeam1Material;
let playerTeam2Material;

// let playerMesh;

let planeGeometry;
let floorMaterial;
let floorMesh;

let tableMaterial;
let tableMaterialHighlight;

let orbSourceMaterial;
// let tableMesh;
// let tableMaterial2;
// let tableMesh2;

let sphereGeometry;
let itemMaterial;
let itemMaterial2;
// let itemMesh;

let smallRectGeometry;
let progressMaterial;
let progressMesh;

let swordGeometry;
let swordMaterial;

let gunGeometry;
let gunMaterial

let bulletGeometry;
let bulletMaterial;

let ballGeometry;
let ballMaterial;

let sceneLight;
let sceneLight2;

// let playerObject; 
let playerList = [];
let playerMeshList = [];

let applianceList = [];
let applianceMeshList = [];

let itemObject;
let itemList = [];
let itemMeshList = [];

let connectGameObjectToSceneMesh = (object, mesh) => {
	object.connectedMesh = mesh;
}

let createPlayer = () => {
	let newPlayer = {
		type: "player",
		xPosition: 0,
		yPosition: 0,
		xSpeed: 0,
		ySpeed: 0,
		rotation: 0,
		xTarget: 0,
		yTarget: 0,
		hasItem: false,
		heldItem: undefined,
		upPressed: false,
		rightPressed: false,
		downPressed: false,
		leftPressed: false,
		grabPressed: false,
		usePressed: false,
		anchorPressed: false,
		releasedGrab: true,
		connectedMesh: undefined,
		id: undefined,
		name: undefined,
		team: undefined,
	};
	playerList.push(newPlayer);
	return newPlayer;
}
let createPlayerMesh = () => {
	let newPlayerMesh = new THREE.Mesh(cubeGeometry, playerMaterial);
	scene.add(newPlayerMesh);
	playerMeshList.push(newPlayerMesh);
	return newPlayerMesh;
}

let createAppliance = (applianceType, xPosition, yPosition) => {
	let newAppliance = {
		type: "appliance",
		subType: applianceType,
		xPosition: xPosition || 0,
		yPosition: yPosition || 0,
		rotation: 0,
		hasItem: false,
		heldItem: undefined,
		connectedMesh: undefined,
	};
	applianceList.push(newAppliance);
	return newAppliance;
}
let createApplianceMesh = (applianceType) => {
	let newApplianceMesh;
	if (applianceType === "table") {
		newApplianceMesh = new THREE.Mesh(cubeGeometry, tableMaterial);
	}
	else if (applianceType === "orbSource") {
		newApplianceMesh = new THREE.Mesh(cubeGeometry, tableMaterial);
	}
	else {
		console.log("appliance type missing: " + applianceType);
	}
	scene.add(newApplianceMesh);
	applianceMeshList.push(newApplianceMesh);
	return newApplianceMesh;
}

let createItem = (itemType) => {
	let newItem = {
		type: "item",
		chopped: false,
		progress: 0,
		subType: itemType,
		holder: undefined,
		heldByPlayer: false,
		heldByAppliance: false,
		connectedMesh: undefined,
		fixedRotation: true,
		initialRotation: 0,
	};
	if (itemType === "sword" || itemType === "gun" || itemType === "ball") {
		newItem.fixedRotation = false;
		newItem.initialRotation = - Math.PI / 2;
	}
	itemList.push(newItem);
	return newItem;
}
let createItemMesh = (itemType) => {
	let newItemMesh;
	if (itemType === "orb") {
		newItemMesh = new THREE.Mesh(sphereGeometry, itemMaterial);
	}
	else if (itemType === "sword") {
		newItemMesh = new THREE.Mesh(swordGeometry, swordMaterial);
	}
	else if (itemType === "gun") {
		newItemMesh = new THREE.Mesh(gunGeometry, gunMaterial);
	}
	else if (itemType === "bullet") {
		newItemMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
	}
	else if (itemType === "ball") {
		newItemMesh = new THREE.Mesh(ballGeometry, ballMaterial);
	}
	else {
		console.log("item type missing: " + itemType);
	}
	scene.add(newItemMesh);
	itemMeshList.push(newItemMesh);
	return newItemMesh;
}

let wDown = false;
let aDown = false;
let sDown = false;
let dDown = false;
let oDown = false;
let pDown = false;
let spaceDown = false;

let backgroundOverGame;
let roomListElement;
let teamBox1;
let teamBox2;
let nickname = "";
let nicknameInput;
let makeRoomButton;
let leaveRoomButton;
let joinTeam1Button;
let joinTeam2Button;
let startGameButton;

let gameStartPlayerInfo;
let otherPlayers = [];

let init = () => {

	backgroundOverGame = document.getElementsByClassName("background_over_game").item(0);
	roomListElement = document.getElementById("room_list");
	teamBox1 = document.getElementById("team_1");
	teamBox2 = document.getElementById("team_2");

	setupNetworkConnection();

	nicknameInput = document.getElementById("nickname");
	let savedNickname = localStorage.getItem("alchemist__nickname");
	if (!!savedNickname) {
		nickname = savedNickname;
		nicknameInput.value = nickname;
	}
	nicknameInput.oninput = (e) => {
		nickname = nicknameInput.value;
		localStorage.setItem("alchemist__nickname", nickname);
	}

	makeRoomButton = document.getElementById("make_room");
	makeRoomButton.onclick = (e) => {
		goToView("waiting");
		sendData("makeRoom", {roomName: `${nickname}'s room`, playerName: nickname});
	}

	leaveRoomButton = document.getElementById("leave_room");
	leaveRoomButton.onclick = (e) => {
		goToView("entry");
		sendData("leaveRoom", 0);
		document.querySelectorAll(".player_entry").forEach(playerEntry => playerEntry.remove());
	}

	joinTeam1Button = document.getElementById("join_team_1");
	joinTeam1Button.onclick = (e) => {
		sendData("switchTeam", 1);
	}

	joinTeam2Button = document.getElementById("join_team_2");
	joinTeam2Button.onclick = (e) => {
		sendData("switchTeam", 2);
	}

	startGameButton = document.getElementById("start_game");
	startGameButton.onclick = (e) => {
		sendData("startGame", 0);
	}

	//nicknameInput.oninput
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.position.z = 10;
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	// Geometries
	cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
	planeGeometry = new THREE.PlaneGeometry(10, 10);
	sphereGeometry = new THREE.SphereGeometry(0.25, 6, 6);
	smallRectGeometry = new THREE.PlaneGeometry(0.9, 0.3);
	// More specific geometries
	swordGeometry = new THREE.ConeGeometry(0.15, 1, 3, 1);
	gunGeometry = new THREE.BoxGeometry(0.2, 0.45, 0.2);
	bulletGeometry = new THREE.SphereGeometry(0.17, 5, 4);
	ballGeometry = new THREE.DodecahedronGeometry(0.35, 0);

	// Materials
	playerMaterial = new THREE.MeshToonMaterial({color: 0x22ff22});
	playerTeam1Material = new THREE.MeshToonMaterial({color: 0xff4444});
	playerTeam2Material = new THREE.MeshToonMaterial({color: 0x4444ff});
	floorMaterial = new THREE.MeshToonMaterial({color: 0x504030});
	tableMaterial = new THREE.MeshToonMaterial({color: 0xccaa22});
	tableMaterialHighlight = new THREE.MeshToonMaterial({color: 0xddbb33});
	itemMaterial = new THREE.MeshToonMaterial({color: 0x2266dd});
	itemMaterial2 = new THREE.MeshToonMaterial({color: 0xdd2266});
	progressMaterial = new THREE.MeshToonMaterial({color: 0x33ffbb});
	// More materials
	swordMaterial = new THREE.MeshToonMaterial({color: 0x90909a});
	gunMaterial = new THREE.MeshToonMaterial({color: 0x6f7064});
	bulletMaterial = new THREE.MeshToonMaterial({color: 0xc6a039});
	ballMaterial = new THREE.MeshToonMaterial({color: 0xdf202f});

	// Single use meshes
	floorMesh = new THREE.Mesh(planeGeometry, floorMaterial);
	floorMesh.position.set(0, 0, -0.5);
	scene.add(floorMesh);

	// Lights
	sceneLight = new THREE.PointLight(0xeeaaaa, 0.8, 14);
	sceneLight.position.set(4, 4, 4);
	scene.add(sceneLight);
	sceneLight2 = new THREE.AmbientLight(0xcccccc, 0.4);
	scene.add(sceneLight2);


	//tableMesh = createApplianceMesh("table");

	//tableMesh.position.set(3, 3, 0);
	// scene.add(tableMesh);

	// tableMaterial2 = new THREE.MeshToonMaterial({color: 0xccaa22});
	// tableMesh2 = new THREE.Mesh(cubeGeometry, tableMaterial2);
	// tableMesh2.position.set(3, -3, 0);
	// scene.add(tableMesh2);

	// itemMesh = new THREE.Mesh(sphereGeometry, itemMaterial);
	// itemMesh.position.set(3, 3, 1);
	// scene.add(itemMesh);

	// progressMesh = new THREE.Mesh(smallRectGeometry, progressMaterial);
	// progressMesh.position.set(0, 0.3, 0.3);
	// itemMesh.add(progressMesh);
	// progressMesh.scale.x = 0;


	// let newPlayerObject = createPlayer();
	// let newPlayerMesh = createPlayerMesh();

	// connectGameObjectToSceneMesh(newPlayerObject, newPlayerMesh);
	var listOfItems = ["sword", "gun", "ball", "sword", "gun", "ball"];

	for (let i = 0; i < 6; i++) {
		let newTable = createAppliance("table", i * 2 - 3, i - 2);
		let newTableMesh = createApplianceMesh("table");
		newTableMesh.position.x = newTable.xPosition;
		newTableMesh.position.y = newTable.yPosition;
		connectGameObjectToSceneMesh(newTable, newTableMesh);
		// if (i % 2 === 0) {
		// 	let newItem = createItem("orb");
		// 	let newItemMesh = createItemMesh("orb");
		// 	connectGameObjectToSceneMesh(newItem, newItemMesh);
		// 	transferItem(undefined, newTable, newItem);
		// }
		let newItem = createItem(listOfItems[i]);
		let newItemMesh = createItemMesh(listOfItems[i]);
		connectGameObjectToSceneMesh(newItem, newItemMesh);
		transferItem(undefined, newTable, newItem);
	}
	for (let i = 0; i < 4; i++) {
		let newTable = createAppliance("table", i * 3 - 5, -4);
		let newTableMesh = createApplianceMesh("table");
		newTableMesh.position.x = newTable.xPosition;
		newTableMesh.position.y = newTable.yPosition;
		connectGameObjectToSceneMesh(newTable, newTableMesh);
	}

	// itemObject = {
		// onTopTable: true,
		// chopped: false,
		// progress: 0,
	// }

	addEventListener("keydown", keyDownFunction);
	addEventListener("keyup", keyUpFunction);
	addEventListener("resize", resizeFunction);

	console.log("starting game loop");
	lastTime = Date.now();
	gameLoop();
}

let currentView = "entry";
let goToView = (view) => {
	let prevViewElement = document.getElementsByClassName("active_view").item(0);
	let nextViewElement = document.querySelector(`[view="${view}"]`)
	prevViewElement.classList.remove("active_view");
	nextViewElement.classList.add("active_view");
	currentView = view;
}

let roomJoinButtonFunction = (e) => {
	let roomID = e.target.getAttribute("roomID");
	goToView("waiting");
	sendData("joinRoom", {roomID: roomID, playerName: nickname});
}

let makeRoomOption = (roomName, roomID) => {
	let newOption = document.createElement("button");
	newOption.classList.add("room_option_button");
	newOption.onclick = roomJoinButtonFunction;
	// <button class="room_option_button" roomID="1" roomName="Example's room">Join Example's room</button>
	newOption.setAttribute("roomName", roomName);
	newOption.setAttribute("roomID", roomID);
	roomListElement.append(newOption);
	newOption.textContent = `Join ${roomName}`;
}

let removeRoomOption = (roomID) => {
	let roomToRemove = document.querySelector(`.room_option_button[roomID="${roomID}"]`);
	if (!roomToRemove) {
		console.log("no room option to remove with that id");
		return;
	}
	roomToRemove.remove();
}

let makePlayerEntry = (playerName, playerID, playerTeam) => {
	let newEntry = document.createElement("div");
	newEntry.classList.add("player_entry");
	newEntry.setAttribute("playerID", playerID);
	newEntry.textContent = playerName;
	let teamBox = teamBox1;
	if (!!playerTeam && playerTeam === 2) {
		teamBox = teamBox2;
	}
	teamBox.append(newEntry);
}

let removePlayerEntry = (playerID) => {
	let playerEntry = document.querySelector(`.player_entry[playerID="${playerID}"]`);
	if (!playerEntry) {
		return;
	}
	playerEntry.remove();
}

let switchPlayerTeam = (playerID, team) => {
	let playerEntry = document.querySelector(`.player_entry[playerID="${playerID}"]`);
	let newTeamBox = (team === 1 ? teamBox1 : teamBox2);
	newTeamBox.append(playerEntry);
}

let lastTime;
let timeAccumulator = 0;
let frameTime = 1000/60;
let gameLoop = () => {
	let newTime = Date.now();
	let deltaTime = newTime - lastTime
	lastTime = newTime
	timeAccumulator += deltaTime;
	if (timeAccumulator > frameTime) {
		if (inputChanged && currentView === "game") {
			sendData("playerInput", {
				upPressed: wDown,
				rightPressed: dDown,
				downPressed: sDown,
				leftPressed: aDown,
				grabPressed: pDown,
				usePressed: oDown,
				anchorPressed: spaceDown,
			});
		}
		inputChanged = false;
		let limit = 10;
		while (timeAccumulator > frameTime && limit > 0) {
			timeAccumulator -= frameTime;
			limit -= 1;
			gameLogic();
		}
		if (limit === 0) {
			timeAccumulator = 0;
		}
	}
	renderFrame();
	requestAnimationFrame(gameLoop);
}

let renderFrame = () => {
	playerList.forEach((playerObject) => {
		let playerMesh = playerObject.connectedMesh
		playerMesh.position.x = playerObject.xPosition;
		playerMesh.position.y = playerObject.yPosition;
		playerMesh.rotation.z = playerObject.rotation;
		applianceList.forEach((applianceObject) => {
			if (playerObject.xTarget === applianceObject.xPosition &&
				playerObject.yTarget === applianceObject.yPosition) {
				applianceObject.connectedMesh.material = tableMaterialHighlight;
			}
			else {
				applianceObject.connectedMesh.material = tableMaterial;
			}
		});
	});
	itemList.forEach((itemObject) => {
		let itemMesh = itemObject.connectedMesh;
		itemMesh.parent = itemObject.holder.connectedMesh;
		// Held by player or appliance
		if (itemObject.heldByPlayer) {
			itemMesh.position.set(1, 0, 0.5);
			if (itemObject.fixedRotation) {
				itemMesh.rotation.z = itemObject.holder.rotation * -1;
			}
			else {
				itemMesh.rotation.z = itemObject.initialRotation;
			}
		}
		else if (itemObject.heldByAppliance) {
			itemMesh.position.set(0, 0, 1);
			itemMesh.rotation.z = itemObject.initialRotation;
		}
		// Change material when progress is made
		if (itemObject.chopped) {
			itemMesh.material = itemMaterial2;
		}
	});
	renderer.render(scene, camera);
}


let gameLogic = () => {

	playerList.forEach((playerObject) => {
		// Player Movement

		let xSpeedChange = 0;
		let ySpeedChange = 0;
		if (playerObject.upPressed) {
			ySpeedChange += 0.02;
		}
		if (playerObject.leftPressed) {
			xSpeedChange -= 0.02;
		}
		if (playerObject.downPressed) {
			ySpeedChange -= 0.02;
		}
		if (playerObject.rightPressed) {
			xSpeedChange += 0.02;
		}
		// Diagonal movement
		if (xSpeedChange !== 0 && ySpeedChange !== 0) {
			xSpeedChange /= Math.SQRT2;
			ySpeedChange /= Math.SQRT2;
		}
		let anyDirectionPressed = (xSpeedChange !== 0 || ySpeedChange !== 0);
		let rotationChange = 0;
		let targetRotation = Math.atan2(ySpeedChange, xSpeedChange);
		let oppositeRotation = false;
		if (anyDirectionPressed) {
			if (playerObject.rotation !== targetRotation) {
				let targetRotationDifference = Math.abs(playerObject.rotation - targetRotation);
				// Apply spin to player's rotation toward targetRotation
				if (playerObject.rotation > targetRotation) {
					rotationChange -= 0.23;
				}
				else {
					rotationChange += 0.23;
				}
				// If the target rotation difference is greater than pi, spin the opposite way
				if (targetRotationDifference > Math.PI) {
					rotationChange *= -1;
					oppositeRotation = true;
				}
			}
		}
		let previousRotation = playerObject.rotation;
		if (rotationChange !== 0) {
			// Apply rotation
			playerObject.rotation += rotationChange;
			// Don't overshoot the targetRotation
			if (oppositeRotation) {
				if ((rotationChange > 0 && playerObject.rotation < targetRotation) || (rotationChange < 0 && playerObject.rotation > targetRotation)) {
					playerObject.rotation = targetRotation; 
				}
			}
			else {
				if ((rotationChange > 0 && playerObject.rotation > targetRotation) || (rotationChange < 0 && playerObject.rotation < targetRotation)) {
					playerObject.rotation = targetRotation; 
				}
			}
			// Loop around the pi to negative pi limit
			if (playerObject.rotation > Math.PI) {
				playerObject.rotation -= Math.PI * 2;
				previousRotation -= Math.PI * 2;
			}
			if (playerObject.rotation < -Math.PI) {
				playerObject.rotation += Math.PI * 2;
				previousRotation += Math.PI * 2;
			}
		}
		// If turning, slow down movement
		let rotationDifference = Math.abs(previousRotation - playerObject.rotation);
		if (rotationDifference > 0.01) {
			xSpeedChange *= 0.25;
			ySpeedChange *= 0.25;
		}
		// Don't move while holding space
		if (!playerObject.anchorPressed) {
			playerObject.xSpeed += xSpeedChange;
			playerObject.ySpeed += ySpeedChange;
		}
		playerObject.xPosition += playerObject.xSpeed;
		playerObject.yPosition += playerObject.ySpeed;
		playerObject.xSpeed *= 0.8;
		playerObject.ySpeed *= 0.8;
		// Apply more friction if stopping
		if (!anyDirectionPressed || playerObject.anchorPressed) {
			playerObject.xSpeed *= 0.9;
			playerObject.ySpeed *= 0.9;
		}
		playerObject.xTarget = Math.round(playerObject.xPosition + Math.cos(playerObject.rotation));
		playerObject.yTarget = Math.round(playerObject.yPosition + Math.sin(playerObject.rotation));

		// World Interaction

		if (playerObject.grabPressed) {
			if (playerObject.releasedGrab) {
				// Grab input: try to grab or put down an item
				applianceList.forEach((applianceObject) => {
					if (playerObject.xTarget === applianceObject.xPosition && playerObject.yTarget === applianceObject.yPosition) {
						if (playerObject.holdingItem && !applianceObject.holdingItem) {
							// Put down object
							// playerObject.heldItem.heldByPlayer = false;
							// playerObject.heldItem.heldByAppliance = true;
							// playerObject.heldItem.holder = applianceObject;
							// applianceObject.holdingItem = true;
							// applianceObject.heldItem = playerObject.heldItem;
							// playerObject.holdingItem = false;
							// playerObject.heldItem = undefined;
							transferItem(playerObject, applianceObject, playerObject.heldItem);
						}
						else if (!playerObject.holdingItem && applianceObject.holdingItem) {
							// Pick up object
							// applianceObject.heldItem.heldByPlayer = true;
							// applianceObject.heldItem.heldByAppliance = false;
							// applianceObject.heldItem.holder = playerObject;
							// playerObject.holdingItem = true;
							// playerObject.heldItem = applianceObject.heldItem;
							// applianceObject.holdingItem = false;
							// applianceObject.heldItem = undefined;
							transferItem(applianceObject, playerObject, applianceObject.heldItem);
						}
					}
				});
			}
			playerObject.releasedGrab = false;
		}
		else {
			playerObject.releasedGrab = true;
		}
		if (playerObject.usePressed) {
			// Interact button: can make progress on item
			applianceList.forEach((applianceObject) => {
				if (applianceObject.holdingItem) {
					if (playerObject.xTarget === applianceObject.xPosition && playerObject.yTarget === applianceObject.yPosition) {
						let targetItem = applianceObject.heldItem;
						if (!targetItem.chopped) {
							targetItem.progress += 1;
						}
						if (targetItem.progress >= 100) {
							targetItem.chopped = true;
						}
					}
				}
			});
			// if (!playerObject.holdingItem) {
			// 	if ((playerObject.xTarget === 3 && playerObject.yTarget === 3 && itemObject.onTopTable) ||
			// 		(playerObject.xTarget === 3 && playerObject.yTarget === -3 && !itemObject.onTopTable)) {
			// 		// Make progress
			// 		itemObject.progress += 1;
			// 		if (itemObject.progress >= 200) {
			// 			itemObject.chopped = true;
			// 		}
			// 	}
			// }
		}
	});
}
let transferItem = (oldHolder, newHolder, item) => {
	if (!!oldHolder) {
		oldHolder.heldItem = undefined;
		oldHolder.holdingItem = false;
	}
	newHolder.heldItem = item;
	newHolder.holdingItem = true;
	if (newHolder.type === "player") {
		item.heldByPlayer = true;
		item.heldByAppliance = false;
	}
	else {
		item.heldByPlayer = false;
		item.heldByAppliance = true;
	}
	item.holder = newHolder;
}

let inputChanged = false;
let keyDownFunction = (event) => {
	if (event.keyCode === 87 && !wDown) {
		wDown = true;
	}
	else if (event.keyCode === 65 && !aDown) {
		aDown = true;
	}
	else if (event.keyCode === 83 && !sDown) {
		sDown = true;
	}
	else if (event.keyCode === 68 && !dDown) {
		dDown = true;
	}
	else if (event.keyCode === 79 && !oDown) {
		oDown = true;
	}
	else if (event.keyCode === 80 && !pDown) {
		pDown = true;
	}
	else if (event.keyCode === 32 && !spaceDown) {
		spaceDown = true;
	}
	else {
		return;
	}
	inputChanged = true;
}

let keyUpFunction = (event) => {
	if (event.keyCode === 87) {
		wDown = false;
	}
	else if (event.keyCode === 65) {
		aDown = false;
	}
	else if (event.keyCode === 83) {
		sDown = false;
	}
	else if (event.keyCode === 68) {
		dDown = false;
	}
	else if (event.keyCode === 79) {
		oDown = false;
	}
	else if (event.keyCode === 80) {
		pDown = false;
	}
	else if (event.keyCode === 32) {
		spaceDown = false;
	}
	else {
		return;
	}
	inputChanged = true;
}
let resizeFunction = (event) => {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
}
let meshToScreenCoordinates = (mesh) => {
	let vector = new THREE.Vector3();
	mesh.updateMatrixWorld();
	vector.setFromMatrixPosition(mesh.matrixWorld);
	vector.project(camera);
	//not using window.devicePixelRatio for now
	return new THREE.Vector2(Math.round((0.5 + vector.x / 2) * window.innerWidth), Math.round((0.5 - vector.y / 2) * window.innerHeight));
}
let socket = undefined;
let connected = false;
let setupNetworkConnection = () => {
	try {
		let wsProtocol;
		let socketURL;
		if (location.href.indexOf("kramff.com") !== -1) {
			wsProtocol = "wss://";
			socketURL = wsProtocol + "bine.nfshost.com";
		}
		else {
			wsProtocol = "ws://";
			socketURL = (location.protocol + "//" + location.host + "/").replace(/\d+\/$/, "5000").replace("http://", wsProtocol);
		}
		socket = new WebSocket(socketURL);
		socket.onopen = (data) => {
			console.log("connected to server!");
			connected = true;
		}
		socket.onmessage = (message) => {
			let messageParse = JSON.parse(message.data);
			// console.log("got message: " + message.data);
			let messageType = messageParse.type;
			let messageData = messageParse.data;
			// new available room/rooms
			if (messageType === "roomInfo") {
				if (Array.isArray(messageData)) {
					messageData.forEach(roomData => {makeRoomOption(roomData.roomName, roomData.roomID)})
				}
				else {
					makeRoomOption(messageData.roomName, messageData.roomID);
				}
			}
			// room removed
			else if (messageType === "roomRemoved") {
				removeRoomOption(messageData);
			}
			// room information (other players joining / leaving the waiting room or switching teams)
			else if (messageType === "roomStatusPlayerJoin") {
				makePlayerEntry(messageData.playerName, messageData.playerID, messageData.playerTeam || 1);
			}
			else if (messageType === "roomStatusPlayerLeave") {
				removePlayerEntry(messageData);
			}
			else if (messageType === "roomStatusSwitchTeam") {
				switchPlayerTeam(messageData.playerID, messageData.team);
			}
			// game starting
			else if (messageType === "gameStarting") {
				goToView("game");
				backgroundOverGame.classList.remove("active_bg");
				gameStartPlayerInfo = messageData;
				gameStartPlayerInfo.forEach(otherPlayer => {
					let newOtherPlayerObject = createPlayer();
					newOtherPlayerObject.name = otherPlayer.playerName;
					newOtherPlayerObject.id = otherPlayer.playerID;
					newOtherPlayerObject.team = otherPlayer.playerTeam;
					let newOtherPlayerMesh = createPlayerMesh();
					connectGameObjectToSceneMesh(newOtherPlayerObject, newOtherPlayerMesh);
					if (newOtherPlayerObject.team === 1) {
						newOtherPlayerMesh.material = playerTeam1Material;
					}
					else if (newOtherPlayerObject.team === 2) {
						newOtherPlayerMesh.material = playerTeam2Material;
					}

					// newOtherPlayerObject.xPosition += Math.random();
					// newOtherPlayerObject.yPosition += Math.random();
				});
			}
			// other player input
			else if (messageType === "playerInput") {
				var matchingPlayer = playerList.find(player => player.id === messageData.id);
				matchingPlayer.upPressed = messageData.upPressed;
				matchingPlayer.rightPressed = messageData.rightPressed;
				matchingPlayer.downPressed = messageData.downPressed;
				matchingPlayer.leftPressed = messageData.leftPressed;
				matchingPlayer.grabPressed = messageData.grabPressed;
				matchingPlayer.usePressed = messageData.usePressed;
				matchingPlayer.anchorPressed = messageData.anchorPressed;
			}
			// other player quitting
			else if (messageType === "playerQuit") {
				
			}
		}
	}
	catch (error) {
		console.error("Could not connect to server");
		console.error(error);
	}
}
let sendData = (type, data) => {
	if (!connected) {
		return;
	}
	let sendObjStr = JSON.stringify({type: type, data: data});
	socket.send(sendObjStr);
	// console.log("send: " + sendObjStr);
}

// join a room
// start game
// gameplay inputs
