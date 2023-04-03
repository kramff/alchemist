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

let hitEffectGeometry;
let hitEffectMaterial;

let sceneLight;
let sceneLight2;

let createGameState = () => {
	return {
		playerList: [],
		applianceList: [],
		itemList: [],
		projectileList: [],
		effectList: [],
		frameCount: 0,
	}
}

let copyGameState = (gs) => {
	let gsNew = createGameState();
	copyGameObjectList(gsNew, gs.playerList, gsNew.playerList, createPlayer);
	copyGameObjectList(gsNew, gs.applianceList, gsNew.applianceList, createAppliance);
	copyGameObjectList(gsNew, gs.itemList, gsNew.itemList, createItem);
	copyGameObjectList(gsNew, gs.projectileList, gsNew.projectileList, createProjectile);
	copyGameObjectList(gsNew, gs.effectList, gsNew.effectList, createEffect);
	// Fix references - Change references from objects in old gamestate to objects in new gamestate
	// player: heldItem
	// appliance: heldItem
	// item: holder
	// projectile: sourcePlayer
	fixReferences(gsNew.playerList, "heldItem", gs.itemList, gsNew.itemList);
	fixReferences(gsNew.applianceList, "heldItem", gs.itemList, gsNew.itemList);
	fixReferences(gsNew.itemList, "holder", gs.playerList, gsNew.playerList, gs.applianceList, gsNew.applianceList);
	fixReferences(gsNew.projectileList, "sourcePlayer", gs.playerList, gsNew.playerList);
	return gsNew;
}

let copyGameObjectList = (gsNew, sourceObjectList, targetObjectList, createObjFunc) => {
	sourceObjectList.forEach(gameObject => {
		let copyObject = createObjFunc(gsNew);
		Object.keys(gameObject).forEach(key => {
			if (key !== "connectedMesh" && key !== "connectedOverlayObjects") {
				copyObject[key] = gameObject[key];
			}
		});
	});
}

let fixReferences = (fixObjectList, referenceKey, oldReferenceList, newReferenceList, oldReferenceListB, newReferenceListB) => {
	fixObjectList.forEach(gameObject => {
		if (gameObject[referenceKey] !== undefined) {
			let oldReferenceObject = gameObject[referenceKey];
			let useListBs = false;
			if (gameObject.type === "item") {
				// Item can either have a player holder or appliance holder
				// Main list: players, B list: appliances
				if (gameObject.heldByAppliance) {
					useListBs = true;
				}
			}
			if (useListBs) {
				let oldReferenceIndex = oldReferenceListB.indexOf(oldReferenceObject);
				// Assumes the lists match order
				let newReferenceObject = newReferenceListB[oldReferenceIndex];
				gameObject[referenceKey] = newReferenceObject;
			}
			else {
				let oldReferenceIndex = oldReferenceList.indexOf(oldReferenceObject);
				// Assumes the lists match order
				let newReferenceObject = newReferenceList[oldReferenceIndex];
				gameObject[referenceKey] = newReferenceObject;
			}
		}
	});
}

let currentGameState;
let gameStateHistory = [];

let playerMeshList = [];
let applianceMeshList = [];
let itemMeshList = [];
let projectileMeshList = [];
let effectMeshList = [];

let createPlayer = (gs, name, id, team) => {
	let newPlayer = {
		type: "player",
		xPosition: 0,
		yPosition: 0,
		xSpeed: 0,
		ySpeed: 0,
		rotation: 0,
		xTarget: 0,
		yTarget: 0,
		health: 10,
		maxHealth: 10,
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
		releasedUse: true,
		connectedMesh: undefined,
		connectedOverlayObjects: {},
		id: id,
		name: name,
		team: team,
		toBeRemoved: false,
	};
	gs.playerList.push(newPlayer);
	return newPlayer;
}
let createPlayerMesh = (playerObject) => {
	let matToUse = playerMaterial;
	if (playerObject.team === 1) {
		matToUse = playerTeam1Material;
	}
	else if (playerObject.team === 2) {
		matToUse = playerTeam2Material;
	}
	let newPlayerMesh = new THREE.Mesh(cubeGeometry, matToUse);
	scene.add(newPlayerMesh);
	playerMeshList.push(newPlayerMesh);
	return newPlayerMesh;
}
let removePlayer = (gs, playerObject) => {
	gs.playerList.splice(gs.playerList.indexOf(playerObject), 1);
}

let createAppliance = (gs, applianceType, xPosition, yPosition) => {
	let newAppliance = {
		type: "appliance",
		subType: applianceType,
		xPosition: xPosition || 0,
		yPosition: yPosition || 0,
		rotation: 0,
		hasItem: false,
		heldItem: undefined,
		connectedMesh: undefined,
		connectedOverlayObjects: {},
		toBeRemoved: false,
	};
	gs.applianceList.push(newAppliance);
	return newAppliance;
}
let createApplianceMesh = (applianceObject) => {
	let newApplianceMesh;
	if (applianceObject.subType === "table") {
		newApplianceMesh = new THREE.Mesh(cubeGeometry, tableMaterial);
	}
	else if (applianceObject.subType === "orbSource") {
		newApplianceMesh = new THREE.Mesh(cubeGeometry, tableMaterial);
	}
	else {
		console.log("appliance type missing: " + applianceObject.subType);
		newApplianceMesh = new THREE.Mesh(cubeGeometry, tableMaterial);
	}
	scene.add(newApplianceMesh);
	applianceMeshList.push(newApplianceMesh);
	return newApplianceMesh;
}
let removeAppliance = (gs, applianceObject) => {
	gs.applianceList.splice(gs.applianceList.indexOf(applianceObject), 1);
}

let createItem = (gs, itemType) => {
	let newItem = {
		type: "item",
		chopped: false,
		progress: 0,
		subType: itemType,
		holder: undefined,
		heldByPlayer: false,
		heldByAppliance: false,
		connectedMesh: undefined,
		connectedOverlayObjects: {},
		fixedRotation: true,
		initialRotation: 0,
		hasAbility: false,
		toBeRemoved: false,
	};
	if (itemType === "sword" || itemType === "gun" || itemType === "ball") {
		newItem.fixedRotation = false;
		newItem.initialRotation = - Math.PI / 2;
		newItem.hasAbility = true;
	}
	gs.itemList.push(newItem);
	return newItem;
}
let createItemMesh = (itemObject) => {
	let newItemMesh;
	if (itemObject.subType === "orb") {
		newItemMesh = new THREE.Mesh(sphereGeometry, itemMaterial);
	}
	else if (itemObject.subType === "sword") {
		newItemMesh = new THREE.Mesh(swordGeometry, swordMaterial);
	}
	else if (itemObject.subType === "gun") {
		newItemMesh = new THREE.Mesh(gunGeometry, gunMaterial);
	}
	else if (itemObject.subType === "bullet") {
		newItemMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
	}
	else if (itemObject.subType === "ball") {
		newItemMesh = new THREE.Mesh(ballGeometry, ballMaterial);
	}
	else {
		console.log("item type missing: " + itemObject.subType);
		newItemMesh = new THREE.Mesh(sphereGeometry, itemMaterial);
	}
	scene.add(newItemMesh);
	itemMeshList.push(newItemMesh);
	return newItemMesh;
}
let removeItem = (gs, itemObject) => {
	gs.itemList.splice(gs.itemList.indexOf(itemObject), 1);
}

let createProjectile = (gs, projectileType, xPosition, yPosition, rotation, speed) => {
	let newProjectile = {
		type: "projectile",
		subType: projectileType,
		connectedMesh: undefined,
		connectedOverlayObjects: {},
		xPosition: xPosition || 0,
		yPosition: yPosition || 0,
		rotation: rotation || 0,
		speed: speed || 0,
		sourcePlayer: undefined,
		lifespan: 500,
		toBeRemoved: false,
	};
	gs.projectileList.push(newProjectile);
	return newProjectile;
}
let createProjectileMesh = (projectileObject) => {
	let newProjectileMesh;
	if (projectileObject.subType === "bullet") {
		newProjectileMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
	}
	else if (projectileObject.subType === "thrownBall") {
		newProjectileMesh = new THREE.Mesh(ballGeometry, ballMaterial);
	}
	else if (projectileObject.subType === "swordSwing") {
		newProjectileMesh = new THREE.Mesh(swordGeometry, swordMaterial);
	}
	else {
		console.log("projectile type missing: " + projectileObject.subType);
		newProjectileMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
	}
	scene.add(newProjectileMesh);
	projectileMeshList.push(newProjectileMesh);
	return newProjectileMesh;
}
let removeProjectile = (gs, projectileObject) => {
	gs.projectileList.splice(gs.projectileList.indexOf(projectileObject), 1);
}

let createEffect = (gs, effectType, xPosition, yPosition) => {
	let newEffect = {
		type: "effect",
		subType: effectType,
		connectedMesh: undefined,
		connectedOverlayObjects: {},
		xPosition: xPosition || 0,
		yPosition: yPosition || 0,
		lifespan: 200,
		toBeRemoved: false,
	}
	gs.effectList.push(newEffect);
	return newEffect;
}
let createEffectMesh = (effectObject) => {
	let newEffectMesh;
	if (effectObject.subType === "hit") {
		newEffectMesh = new THREE.Mesh(hitEffectGeometry, hitEffectMaterial);
	}
	scene.add(newEffectMesh);
	effectMeshList.push(newEffectMesh);
	return newEffectMesh;
}
let removeEffect = (gs, effectObject) => {
	gs.effectList.splice(gs.effectList.indexOf(effectObject), 1);
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

let gameOverlay;
let overlayList = [];

let init = () => {

	backgroundOverGame = document.getElementsByClassName("background_over_game").item(0);
	roomListElement = document.getElementById("room_list");
	teamBox1 = document.getElementById("team_1");
	teamBox2 = document.getElementById("team_2");

	gameOverlay = document.getElementById("game_overlay");

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
	hitEffectGeometry = new THREE.RingGeometry(0.2, 0.5, 14);

	// Materials
	playerMaterial = new THREE.MeshToonMaterial({color: 0x22ff22});
	playerTeam1Material = new THREE.MeshToonMaterial({color: 0xff7777});
	playerTeam2Material = new THREE.MeshToonMaterial({color: 0x77ff77});
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

	addEventListener("keydown", keyDownFunction);
	addEventListener("keyup", keyUpFunction);
	addEventListener("resize", resizeFunction);

	console.log("starting game loop");
	lastTime = Date.now();
	gameLoop();
}

let initializeGameState = (gs) => {
	var listOfItems = ["sword", "gun", "ball", "sword", "gun", "ball"];

	for (let i = 0; i < 6; i++) {
		let newTable = createAppliance(gs, "table", i * 2 - 3, i - 2);
		let newItem = createItem(gs, listOfItems[i]);
		transferItem(undefined, newTable, newItem);
	}
	for (let i = 0; i < 6; i++) {
		let newTable = createAppliance(gs, "table", i - 3, -4);
	}
	for (let i = 0; i < 6; i++) {
		let newTable = createAppliance(gs, "table", i + 1, -3);
	}
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

let makeRoomOption = (roomName, roomID, gameStarted) => {
	let existingOption = document.querySelector(`button.room_option_button[roomid="${roomID}"]`);
	// Replace existing button if one already exists
	if (existingOption) {
		if (gameStarted) {
			existingOption.disabled = true;
		}
		return;
	}

	let newOption = document.createElement("button");
	newOption.classList.add("room_option_button");
	newOption.onclick = roomJoinButtonFunction;
	newOption.setAttribute("roomName", roomName);
	newOption.setAttribute("roomID", roomID);
	newOption.textContent = `Join ${roomName}`;
	if (gameStarted) {
		newOption.disabled = true;
	}
	roomListElement.append(newOption);
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

let createOverlayObject = (overlayType, gameObject) => {
	let newOverlayObject = {
		overlayType: overlayType,
		connectedObject: gameObject,
		overlayElement: document.createElement("div"),
		xLast: undefined,
		yLast: undefined,
		toBeRemoved: false,
	};
	let ovEl = newOverlayObject.overlayElement;
	ovEl.classList.add("ov_item");
	ovEl.classList.add(overlayType);
	if (overlayType === "player_name") {
		ovEl.textContent = gameObject.name;
		ovEl.classList.add("team" + gameObject.team);
	}
	else if (overlayType === "player_health_bar") {
		let healthBarInner = document.createElement("div");
		healthBarInner.classList.add("health_bar_inner");
		ovEl.classList.add("team" + gameObject.team);
		ovEl.append(healthBarInner);
	}
	gameObject.connectedOverlayObjects[overlayType] = newOverlayObject;
	overlayList.push(newOverlayObject);
	gameOverlay.append(ovEl);
	return newOverlayObject;
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
			if (currentGameState) {
				gameLogic(currentGameState);
			}
		}
		if (limit === 0) {
			timeAccumulator = 0;
		}
	}
	if (currentGameState) {
		renderFrame(currentGameState);
	}
	requestAnimationFrame(gameLoop);
	if (currentGameState) {
		gameStateHistory.push(copyGameState(currentGameState));
	}
}

let createMissingMeshes = (gameObjectList, createMeshFunc) => {
	gameObjectList.forEach(gameObject => {
		if (gameObject.connectedMesh === undefined) {
			gameObject.connectedMesh = createMeshFunc(gameObject);
			gameObject.connectedMesh.connectedObject = gameObject;
		}
	});
};

let removeUnneededMeshes = (meshList, gameObjectList) => {
	meshList.forEach(mesh => {
		// gameObject isn't in the game anymore (destroyed, or rollbacked to never exist)
		// OR, gameObject has a different mesh attached (rollback shenanigans)
		if (!gameObjectList.includes(mesh.connectedObject) || mesh.connectedObject.connectedMesh !== mesh) {
			scene.remove(mesh);
			meshList.splice(meshList.indexOf(mesh), 1);
		}
	});
}

let createMissingOverlays = (overlayType, gameObjectList) => {
	gameObjectList.forEach(gameObject => {
		if (gameObject.connectedOverlayObjects[overlayType] === undefined) {
			createOverlayObject(overlayType, gameObject);
		}
	});
};

let removeUnneededOverlays = (gs) => {
	let anyRemovals = false;
	overlayList.forEach(overlayItem => {
		let connectedObject = overlayItem.connectedObject;
		let connectedObjectType = connectedObject.type;
		let gameObjectList;
		if (connectedObjectType === "player") {
			gameObjectList = gs.playerList;
		}
		// Put the other object list conditionals here...
		else {
			// No object list? not sure what can be done
			return;
		}
		// gameObject has a different overlay attached for this type (rollback shenanigans?)
		if (connectedObject.connectedOverlayObjects[overlayItem.overlayType] !== overlayItem) {
			overlayItem.overlayElement.remove();
			overlayItem.toBeRemoved = true;
		}
		// gameObject isn't in the game anymore (destroyed, or rollbacked to never exist?)
		else if (!gameObjectList.includes(connectedObject)) {
			overlayItem.overlayElement.remove();
			overlayItem.toBeRemoved = true;
			connectedObject.connectedOverlayObjects[overlayItem.overlayType] = undefined;
		}
	});
	if (anyRemovals) {
		overlayList = overlayList.filter(overlayItem => !overlayItem.toBeRemoved);
	}
}

let renderFrame = (gs) => {
	// Create meshes for all objects if they haven't been made yet
	// (Done here to better support rollback)
	createMissingMeshes(gs.playerList, createPlayerMesh);
	createMissingMeshes(gs.applianceList, createApplianceMesh);
	createMissingMeshes(gs.itemList, createItemMesh);
	createMissingMeshes(gs.projectileList, createProjectileMesh);
	createMissingMeshes(gs.effectList, createEffectMesh);
	// Remove unused meshes
	// Check that the connected object is in the game, and that the connected object is still actually connected
	removeUnneededMeshes(playerMeshList, gs.playerList);
	removeUnneededMeshes(applianceMeshList, gs.applianceList);
	removeUnneededMeshes(itemMeshList, gs.itemList);
	removeUnneededMeshes(projectileMeshList, gs.projectileList);
	removeUnneededMeshes(effectMeshList, gs.effectList);
	// Update rendering position, rotation, material, etc for all objects
	gs.applianceList.forEach(applianceObject => {
		let applianceMesh = applianceObject.connectedMesh;
		applianceMesh.position.x = applianceObject.xPosition;
		applianceMesh.position.y = applianceObject.yPosition;
	});
	gs.playerList.forEach(playerObject => {
		let playerMesh = playerObject.connectedMesh;
		playerMesh.position.x = playerObject.xPosition;
		playerMesh.position.y = playerObject.yPosition;
		playerMesh.rotation.z = playerObject.rotation;
		gs.applianceList.forEach(applianceObject => {
			if (playerObject.xTarget === applianceObject.xPosition &&
				playerObject.yTarget === applianceObject.yPosition) {
				applianceObject.connectedMesh.material = tableMaterialHighlight;
			}
			else {
				applianceObject.connectedMesh.material = tableMaterial;
			}
		});
	});
	gs.itemList.forEach(itemObject => {
		let itemMesh = itemObject.connectedMesh;
		if (itemObject.holder !== undefined) {
			itemMesh.parent = itemObject.holder.connectedMesh;
		}
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
	gs.projectileList.forEach(projectileObject => {
		let projectileMesh = projectileObject.connectedMesh;
		projectileMesh.position.x = projectileObject.xPosition;
		projectileMesh.position.y = projectileObject.yPosition;
		projectileMesh.rotation.z = projectileObject.rotation;
	});
	gs.effectList.forEach(effectObject => {
		let effectMesh = effectObject.connectedMesh;
		effectMesh.scale.x *= 0.9;
		effectMesh.scale.y *= 0.9;
		effectMesh.position.x = effectObject.xPosition;
		effectMesh.position.y = effectObject.yPosition;
	});
	// Actually render the 3d scene
	renderer.render(scene, camera);
	// Create overlays for all objects that need them
	createMissingOverlays("player_name", gs.playerList);
	createMissingOverlays("player_health_bar", gs.playerList);
	// Remove unneeded overlays
	removeUnneededOverlays(gs);
	// Update overlays
	overlayList.forEach(overlayItem => {
		let overlayElement = overlayItem.overlayElement;
		let trackTarget = overlayItem.connectedObject.connectedMesh;
		let coords = meshToScreenCoordinates(trackTarget);
		if (overlayItem.xLast !== coords.x || overlayItem.yLast !== coords.y) {
			overlayElement.style.setProperty("--x-pos", coords.x + "px");
			overlayElement.style.setProperty("--y-pos", coords.y + "px");
			overlayItem.xLast = coords.x;
			overlayItem.yLast = coords.y;
		}
		if (overlayItem.overlayType === "player_health_bar") {
			var displayedHealth = overlayElement.style.getPropertyValue("--health");
			var displayedMaxHealth = overlayElement.style.getPropertyValue("--max-health");
			// Using != because the dom saves these as strings instead of numbers
			if (overlayItem.connectedObject.health != displayedHealth || overlayItem.connectedObject.maxHealth != displayedMaxHealth) {
				overlayElement.style.setProperty("--health", overlayItem.connectedObject.health);
				overlayElement.style.setProperty("--max-health", overlayItem.connectedObject.maxHealth);
			}
		}
	});
}

let collisionTest = (object1, object2) => {
	let xDif = Math.abs(object1.xPosition - object2.xPosition);
	let yDif = Math.abs(object1.yPosition - object2.yPosition);
	return (xDif < 0.5 && yDif < 0.5);
}

let gameLogic = (gs) => {
	let anyRemovals = false;
	gs.playerList.forEach(playerObject => {
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
		// Check for appliances in the way
		let xPotential = playerObject.xPosition + playerObject.xSpeed;
		let yPotential = playerObject.yPosition + playerObject.ySpeed;
		gs.applianceList.forEach(appliance => {
			if (Math.abs(appliance.xPosition - xPotential) <= 1 &&
				Math.abs(appliance.yPosition - yPotential) <= 1) {
				let xAppDif = Math.abs(playerObject.xPosition - appliance.xPosition);
				let yAppDif = Math.abs(playerObject.yPosition - appliance.yPosition);
				if (xAppDif > yAppDif) {
					// Left or right side
					if (playerObject.xPosition > appliance.xPosition) {
						// Right side
						playerObject.xSpeed = Math.max(playerObject.xSpeed, 1 + appliance.xPosition - playerObject.xPosition);
					}
					else {
						// Left side
						playerObject.xSpeed = Math.min(playerObject.xSpeed, -1 + appliance.xPosition - playerObject.xPosition);
					}
				}
				else {
					// Top or bottom side
					if (playerObject.yPosition > appliance.yPosition) {
						// Bottom side
						playerObject.ySpeed = Math.max(playerObject.ySpeed, 1 + appliance.yPosition - playerObject.yPosition);
					}
					else {
						// Top side
						playerObject.ySpeed = Math.min(playerObject.ySpeed, -1 + appliance.yPosition - playerObject.yPosition);
					}
				}
			}
		});
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
				gs.applianceList.forEach((applianceObject) => {
					if (playerObject.xTarget === applianceObject.xPosition && playerObject.yTarget === applianceObject.yPosition) {
						if (playerObject.holdingItem && !applianceObject.holdingItem) {
							// Put down object
							transferItem(playerObject, applianceObject, playerObject.heldItem);
						}
						else if (!playerObject.holdingItem && applianceObject.holdingItem) {
							// Pick up object
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
			// Interact button: can activate held item
			if (playerObject.holdingItem && playerObject.heldItem.hasAbility) {
				// Use ability
				if (playerObject.releasedUse) {
					// console.log("Used item ability: " + playerObject.heldItem.subType);
					let abilityType = playerObject.heldItem.subType;
					let projectileType;
					if (abilityType === "gun") {
						projectileType = "bullet";
					}
					else if (abilityType === "sword") {
						projectileType = "swordSwing";
					}
					else if (abilityType === "ball") {
						projectileType = "thrownBall";
					}
					let projectileObject = createProjectile(gs, projectileType, playerObject.xPosition, playerObject.yPosition, playerObject.rotation, 0.1);
					projectileObject.sourcePlayer = playerObject;
				}
			}
			else {
				// Interact button: can make progress on item
				gs.applianceList.forEach((applianceObject) => {
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
			}
			playerObject.releasedUse = false;
		}
		else {
			playerObject.releasedUse = true;
		}
	});
	gs.projectileList.forEach(projectileObject => {
		// Apply speed
		projectileObject.xPosition += Math.cos(projectileObject.rotation) * projectileObject.speed;
		projectileObject.yPosition += Math.sin(projectileObject.rotation) * projectileObject.speed;
		// Test collisions against players
		gs.playerList.forEach(playerObject => {
			if (projectileObject.sourcePlayer !== playerObject && collisionTest(playerObject, projectileObject)) {
				// console.log("Collision!");
				// Subtract 1 health from player
				playerObject.health -= 1;
				// Create hit effect
				let effectObject = createEffect(gs, "hit", projectileObject.xPosition, projectileObject.yPosition);
				// Remove projectile
				projectileObject.toBeRemoved = true;
				anyRemovals = true;
			}
		});
		// Reduce lifespan and remove if time is up
		projectileObject.lifespan -= 1;
		if (projectileObject.lifespan <= 0) {
			projectileObject.toBeRemoved = true;
			anyRemovals = true;
		}
	});
	gs.effectList.forEach(effectObject => {
		effectObject.lifespan -= 1;
		if (effectObject.lifespan <= 0) {
			effectObject.toBeRemoved = true;
			anyRemovals = true;
		}
	});
	// Removal loops
	if (anyRemovals) {
		gs.playerList.filter(playerObject => playerObject.toBeRemoved).forEach(playerObject => {removePlayer(gs, playerObject);});
		gs.projectileList.filter(projectileObject => projectileObject.toBeRemoved).forEach(projectileObject => {removeProjectile(gs, projectileObject);});
		gs.applianceList.filter(applianceObject => applianceObject.toBeRemoved).forEach(applianceObject => {removeAppliance(gs, applianceObject);});
		gs.itemList.filter(itemObject => itemObject.toBeRemoved).forEach(itemObject => {removeItem(gs, itemObject);});
		gs.effectList.filter(effectObject => effectObject.toBeRemoved).forEach(effectObject => {removeEffect(gs, effectObject);});
	}
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
					messageData.forEach(roomData => {makeRoomOption(roomData.roomName, roomData.roomID, roomData.gameStarted)})
				}
				else {
					makeRoomOption(messageData.roomName, messageData.roomID, messageData.gameStarted);
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
				currentGameState = createGameState();
				initializeGameState(currentGameState);
				gameStartPlayerInfo.forEach(playerData => {
					let newPlayerObject = createPlayer(currentGameState, playerData.playerName, playerData.playerID, playerData.playerTeam);
				});
			}
			// other player input
			else if (messageType === "playerInput") {
				var matchingPlayer = currentGameState.playerList.find(player => player.id === messageData.id);
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
}
