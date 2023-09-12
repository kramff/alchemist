"use strict";
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.log("alchemist game");


let showDebug = true;
let currentFrameSpan;
let rollbacksSpan;
let resimulatedFramesSpan;
let largestRemoteLagSpan;

let inputDelay = 3;

// Main render stuff
let scene;
let camera;
let renderer;

let xCamera = 0;
let yCamera = 0;
let zCamera = 10;

let thirdPersonTest = false;
let firstPersonTest = false;

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

let supplyMaterial;
let supplyMaterialHighlight;

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

let herbGeometry;
let herbMaterial;

let powderGeometry;
let powderMaterial;

let rockGeometry;
let rockMaterial;

let safeGeometry;
let safeMaterial;
let safeMaterialHighlight;

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
	gsNew.frameCount = gs.frameCount;
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

let copyGameStateNoCircularRef = (gs) => {
	let gsNew = copyGameState(gs);
	gsNew.itemList.forEach(item => item.holder = undefined);
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

let compareGameStates = (gs1, gs2) => {
	// For each comparison, either add a string describing the difference, or nothing if there is no difference
	// Overall function should return false if the game states match, or true if there is any difference
	let comparisons = [];
	if (gs1.frameCount !== gs2.frameCount) {comparisons.push(`frameCount diff ${gs1.frameCount} !== ${gs2.frameCount}`);}
	if (gs1.applianceList.length !== gs2.applianceList.length) {comparisons.push(`applicationList.length diff ${gs1.applicationList.length} !== ${gs2.applicationList.length}`);}
	gs1.applianceList.map((object, index) => {
		let matchingObject = gs2.applianceList[index];
		let hasMatch = matchingObject !== undefined;
		if (hasMatch) {
			if (object.subType !== matchingObject.subType) {comparisons.push(`appliance.subType diff ${object.subType} !== ${matchingObject.subType}`);}
			if (object.xPosition !== matchingObject.xPosition) {comparisons.push(`appliance.xPosition diff ${object.xPosition} !== ${matchingObject.xPosition}`);}
			if (object.yPosition !== matchingObject.yPosition) {comparisons.push(`appliance.yPosition diff ${object.yPosition} !== ${matchingObject.yPosition}`);}
			if (object.holdingItem !== matchingObject.holdingItem) {comparisons.push(`appliance.holdingItem diff ${object.holdingItem} !== ${matchingObject.holdingItem}`);}
			if (object.heldItem?.subType !== matchingObject.heldItem?.subType) {comparisons.push(`appliance.heldItem.subType diff ${object.heldItem?.subType} !== ${matchingObject.heldItem?.subType}`);}
		}
		else {comparisons.push(`appliance in gs1 has no match in gs2 at index ${index}`);}
	});
	if (gs1.itemList.length !== gs2.itemList.length) {comparisons.push(`itemList.length diff ${gs1.itemList.length} !== ${gs2.itemList.length}`);}
	gs1.itemList.map((object, index) => {
		let matchingObject = gs2.itemList[index];
		let hasMatch = matchingObject !== undefined;
		if (hasMatch) {
			if (object.subType !== matchingObject.subType) {comparisons.push(`item.subtype diff ${object.subtype} !== ${matchingObject.subtype}`);}
		}
		else {comparisons.push(`item in gs1 has no match in gs2 at index ${index}`);}
	});
	if (gs1.playerList.length !== gs2.playerList.length) {comparisons.push(`playerList.length diff ${gs1.playerList.length} !== ${gs2.playerList.length}`);}
	gs1.playerList.map((object, index) => {
		let matchingObject = gs2.playerList[index];
		let hasMatch = matchingObject !== undefined;
		if (hasMatch) {
			if (object.id !== matchingObject.id) {comparisons.push(`player.id diff ${object.id} !== ${matchingObject.id}`);}
			if (object.upPressed !== matchingObject.upPressed) {comparisons.push(`player.upPressed diff ${object.upPressed} !== ${matchingObject.upPressed}`);}
			if (object.rightPressed !== matchingObject.rightPressed) {comparisons.push(`player.rightPressed diff ${object.rightPressed} !== ${matchingObject.rightPressed}`);}
			if (object.downPressed !== matchingObject.downPressed) {comparisons.push(`player.downPressed diff ${object.downPressed} !== ${matchingObject.downPressed}`);}
			if (object.leftPressed !== matchingObject.leftPressed) {comparisons.push(`player.leftPressed diff ${object.leftPressed} !== ${matchingObject.leftPressed}`);}
			if (object.grabPressed !== matchingObject.grabPressed) {comparisons.push(`player.grabPressed diff ${object.grabPressed} !== ${matchingObject.grabPressed}`);}
			if (object.usePressed !== matchingObject.usePressed) {comparisons.push(`player.usePressed diff ${object.usePressed} !== ${matchingObject.usePressed}`);}
			if (object.anchorPressed !== matchingObject.anchorPressed) {comparisons.push(`player.anchorPressed diff ${object.anchorPressed} !== ${matchingObject.anchorPressed}`);}
			if (object.releasedGrab !== matchingObject.releasedGrab) {comparisons.push(`player.releasedGrab diff ${object.releasedGrab} !== ${matchingObject.releasedGrab}`);}
			if (object.releasedUse !== matchingObject.releasedUse) {comparisons.push(`player.releasedUse diff ${object.releasedUse} !== ${matchingObject.releasedUse}`);}
			if (object.xPosition !== matchingObject.xPosition) {comparisons.push(`player.xPosition diff ${object.xPosition} !== ${matchingObject.xPosition}`);}
			if (object.xSpeed !== matchingObject.xSpeed) {comparisons.push(`player.xSpeed diff ${object.xSpeed} !== ${matchingObject.xSpeed}`);}
			if (object.yPosition !== matchingObject.yPosition) {comparisons.push(`player.yPosition diff ${object.yPosition} !== ${matchingObject.yPosition}`);}
			if (object.ySpeed !== matchingObject.ySpeed) {comparisons.push(`player.ySpeed diff ${object.ySpeed} !== ${matchingObject.ySpeed}`);}
			if (object.health !== matchingObject.health) {comparisons.push(`player.health diff ${object.health} !== ${matchingObject.health}`);}
			if (object.holdingItem !== matchingObject.holdingItem) {comparisons.push(`player.holdingItem diff ${object.holdingItem} !== ${matchingObject.holdingItem}`);}
			if (object.heldItem?.subType !== matchingObject.heldItem?.subType) {comparisons.push(`player.heldItem diff ${object.heldItem?.subType} !== ${matchingObject.heldItem?.subType}`);}
		}
		else {comparisons.push(`player in gs1 has no match in gs2 at index ${index}`);}
	});
	if (gs1.projectileList.length !== gs2.projectileList.length) {comparisons.push(`projectileList.length diff ${gs1.projectileList.length} !== ${gs2.projectileList.length}`);}
	gs1.projectileList.map((object, index) => {
		let matchingObject = gs2.projectileList[index];
		let hasMatch = matchingObject !== undefined;
		if (hasMatch) {
			if (object.subType !== matchingObject.subType) {comparisons.push(`projectile.subType diff ${object.subType} !== ${matchingObject.subType}`);}
			if (object.xPosition !== matchingObject.xPosition) {comparisons.push(`projectile.xPosition diff ${object.xPosition} !== ${matchingObject.xPosition}`);}
			if (object.yPosition !== matchingObject.yPosition) {comparisons.push(`projectile.yPosition diff ${object.yPosition} !== ${matchingObject.yPosition}`);}
			if (object.sourcePlayer.id !== matchingObject.sourcePlayer.id) {comparisons.push(`projectile.sourcePlayer.id diff ${object.sourcePlayer.id} !== ${matchingObject.sourcePlayer.id}`);}
			if (object.rotation !== matchingObject.rotation) {comparisons.push(`projectile.rotation diff ${object.rotation} !== ${matchingObject.rotation}`);}
			if (object.lifespan !== matchingObject.lifespan) {comparisons.push(`projectile.lifespan diff ${object.lifespan} !== ${matchingObject.lifespan}`);}
		}
		else {comparisons.push(`projectile in gs1 has no match in gs2 at index ${index}`);}
	});
	// Ignoring effect list
	//gameState1.effectList.map((object, index) => {
		//return true;
	//}),
	comparisons = comparisons.flat(1);
	// Any truthy value means there was a difference. (the truthy value would be a string)
	let overallResult = comparisons.reduce((result, comparison) => {
		if (comparison !== false) {
			return true;
		}
		return result;
	}, false);
	if (overallResult === true) {
		console.log("Difference detected");
		console.log(comparisons);
		debugger;
	}
	return overallResult;
}

let currentGameState;
let gameStateHistory = [];
let gameStarted = false;
let gamePaused = false;
let currentFrameCount = 0;
let playerInputLog = [];
let rollbackInputReceived = false;
let latestFullInputFrame = 0;
let localPlayerID;
let lastInputSentFrame = 0;
let playerFrameAdvantages = [];

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
		holdingItem: false,
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
		defeated: false,
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
		holdingItem: false,
		heldItem: undefined,
		connectedMesh: undefined,
		regularMat: undefined,
		highlightMat: undefined,
		assignedTeam: undefined,
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
		applianceObject.regularMat = tableMaterial;
		applianceObject.highlightMat = tableMaterialHighlight;
	}
	else if (applianceObject.subType === "supply") {
		newApplianceMesh = new THREE.Mesh(cubeGeometry, supplyMaterial);
		applianceObject.regularMat = supplyMaterial;
		applianceObject.highlightMat = supplyMaterialHighlight;
	}
	else if (applianceObject.subType === "safe") {
		newApplianceMesh = new THREE.Mesh(safeGeometry, safeMaterial);
		//newApplianceMesh.scale.multiplyScalar(0.5);
		applianceObject.regularMat = safeMaterial;
		applianceObject.highlightMat = safeMaterialHighlight;
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
		processed: false,
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
	if (itemObject.subType === "sword") {
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
	else if (itemObject.subType === "herb") {
		newItemMesh = new THREE.Mesh(herbGeometry, herbMaterial);
	}
	else if (itemObject.subType === "rock") {
		newItemMesh = new THREE.Mesh(rockGeometry, rockMaterial);
		newItemMesh.scale.multiplyScalar(0.3);
	}
	else if (itemObject.subType === "powder") {
		newItemMesh = new THREE.Mesh(powderGeometry, powderMaterial);
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
let pauseGameButton;
let hitBreakpointButton;
let desyncToolButton;

let gameStartPlayerInfo;
let otherPlayers = [];

let gameOverlay;
let overlayList = [];

let glTFLoader;

let modelLoadList = [
	{model: "rock2", name: "rock", setGeo: geo => rockGeometry = geo, setMat: mat => rockMaterial = mat},
	{model: "safe1", name: "safe", setGeo: geo => {
		safeGeometry = geo;
		safeGeometry.scale(0.6, 0.6, 0.6);
		safeGeometry.rotateX(Math.PI / 2);
		safeGeometry.rotateZ(-Math.PI / 2);
	}},
];

let init = () => {

	glTFLoader = new GLTFLoader();

	modelLoadList.forEach(loadItem => {
		glTFLoader.load(`models/${loadItem.model}.gltf`,
			(gltf) => {
				if (loadItem.setGeo !== undefined) {
					loadItem.setGeo(gltf.scene.children[0].geometry);
				}
				if (loadItem.setMat !== undefined) {
					loadItem.setMat(gltf.scene.children[0].material);
				}
				console.log(`${loadItem.name} model loaded`);
			},
			(xhr) => {
			},
			(err) => {
			}
		);
	});

	currentFrameSpan = document.getElementById("current_frame");
	rollbacksSpan = document.getElementById("rollbacks");
	resimulatedFramesSpan = document.getElementById("resimulated_frames");
	largestRemoteLagSpan = document.getElementById("largest_remote_lag");

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

	pauseGameButton = document.getElementById("pause_game");
	pauseGameButton.onclick = (e) => {
		gamePaused = !gamePaused;
		if (gamePaused) {
			sendData("pauseGame", currentFrameCount);
			pauseGameButton.textContent = "Resume Game";
		}
		else {
			sendData("resumeGame", currentFrameCount);
			pauseGameButton.textContent = "Pause Game";
		}
	}

	hitBreakpointButton = document.getElementById("hit_breakpoint");
	hitBreakpointButton.onclick = (e) => {
		debugger;
	}

	desyncToolButton = document.getElementById("run_desync_tool");
	desyncToolButton.onclick = (e) => {
		sendData("desyncTool", 0);
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
	herbGeometry = new THREE.LatheGeometry(undefined, 8, 0, 2 * Math.PI);
	powderGeometry = new THREE.CapsuleGeometry(0.1, 0.2, 2, 7);
	hitEffectGeometry = new THREE.RingGeometry(0.2, 0.5, 14);

	// Materials
	playerMaterial = new THREE.MeshToonMaterial({color: 0x22ff22});
	playerTeam1Material = new THREE.MeshToonMaterial({color: 0xff7777});
	playerTeam2Material = new THREE.MeshToonMaterial({color: 0x77ff77});
	floorMaterial = new THREE.MeshToonMaterial({color: 0x504030});
	tableMaterial = new THREE.MeshToonMaterial({color: 0xccaa22});
	tableMaterialHighlight = new THREE.MeshToonMaterial({color: 0xddbb33});
	supplyMaterial = new THREE.MeshToonMaterial({color: 0xaa99cc});
	supplyMaterialHighlight = new THREE.MeshToonMaterial({color: 0xbbaadd});
	itemMaterial = new THREE.MeshToonMaterial({color: 0x2266dd});
	itemMaterial2 = new THREE.MeshToonMaterial({color: 0xdd2266});
	progressMaterial = new THREE.MeshToonMaterial({color: 0x33ffbb});
	// More materials
	swordMaterial = new THREE.MeshToonMaterial({color: 0x90909a});
	gunMaterial = new THREE.MeshToonMaterial({color: 0x6f7064});
	bulletMaterial = new THREE.MeshToonMaterial({color: 0xc6a039});
	ballMaterial = new THREE.MeshToonMaterial({color: 0xdf202f});
	herbMaterial = new THREE.MeshToonMaterial({color: 0x10c040});
	powderMaterial = new THREE.MeshToonMaterial({color: 0x60a080});
	//rockMaterial = new THREE.MeshToonMaterial({color: 0x994433});
	safeMaterial = new THREE.MeshToonMaterial({color: 0x444444});
	safeMaterialHighlight = new THREE.MeshToonMaterial({color: 0x555555});

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
}
window.addEventListener('load', init);

let initializeGameState = (gs) => {
	let listOfItems = ["sword", "gun", "ball", "rock", "sword", "gun", "ball", "herb", "powder"];

	for (let i = 0; i < 9; i++) {
		let newSupply = createAppliance(gs, "supply", i * 2 - 6, i - 2);
		let newItem = createItem(gs, listOfItems[i]);
		transferItem(gs, undefined, newSupply, newItem);
	}
	for (let i = 0; i < 6; i++) {
		let newTable = createAppliance(gs, "table", i - 3, -4);
	}
	for (let i = 0; i < 6; i++) {
		let newTable = createAppliance(gs, "table", i + 1, -3);
	}
	let safe1 = createAppliance(gs, "safe", -7, 0);
	safe1.assignedTeam = 1;
	let safe2 = createAppliance(gs, "safe", 7, 0);
	safe2.assignedTeam = 2;
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

let compareInputFrameCount = (a, b) => {
	return a.frameCount - b.frameCount;
}

// Apply input to a player object, and return true if there were any changes (and false if not)
let applyInputToPlayer = (playerObject, playerInput) => {
	if (
		playerObject.upPressed !== playerInput.upPressed ||
		playerObject.rightPressed !== playerInput.rightPressed ||
		playerObject.downPressed !== playerInput.downPressed ||
		playerObject.leftPressed !== playerInput.leftPressed ||
		playerObject.grabPressed !== playerInput.grabPressed ||
		playerObject.usePressed !== playerInput.usePressed ||
		playerObject.anchorPressed !== playerInput.anchorPressed
	) {
		playerObject.upPressed = playerInput.upPressed;
		playerObject.rightPressed = playerInput.rightPressed;
		playerObject.downPressed = playerInput.downPressed;
		playerObject.leftPressed = playerInput.leftPressed;
		playerObject.grabPressed = playerInput.grabPressed;
		playerObject.usePressed = playerInput.usePressed;
		playerObject.anchorPressed = playerInput.anchorPressed;
		return true;
	}
	return false;
}

// Stats for debug info
let numRollbacks = 0;
let numResimulatedFrames = 0;
let numLargestRemoteLag = 0;

// Rollback function
let resimulateGame = () => {
	let currentResimulatedState = gameStateHistory[latestFullInputFrame];
	// Only keep inputs as long as they will be needed
	let recentPlayerInputLog = playerInputLog.filter(input => input.frameCount >= latestFullInputFrame);
	// Sort inputs by frame number
	recentPlayerInputLog.sort(compareInputFrameCount);
	// Keep track of latest input from each player
	let latestPlayerInputs = currentResimulatedState.playerList.map(player => {return {id: player.id, frameCount: latestFullInputFrame};});
	// Run the game back up to the current frame but with inputs from the input log
	let tempFrameCount = latestFullInputFrame;
	let inputLogIterator = 0;
	let nextPlayerInput = recentPlayerInputLog[inputLogIterator];
	let anyChangedInputs = false;
	while (tempFrameCount < currentFrameCount) {
		// Apply all (known) player inputs for this frame
		while (nextPlayerInput !== undefined && nextPlayerInput?.frameCount === tempFrameCount) {
			let matchingPlayer = currentResimulatedState.playerList.find(player => player.id === nextPlayerInput.id);
			if (matchingPlayer !== undefined) {
				// Check if any inputs are different than expected
				let applyResult = applyInputToPlayer(matchingPlayer, nextPlayerInput)
				anyChangedInputs = anyChangedInputs || applyResult;
				latestPlayerInputs.find(playerInput => playerInput.id === matchingPlayer.id).frameCount = tempFrameCount;
			}
			// Get next player input in the log
			inputLogIterator += 1;
			nextPlayerInput = recentPlayerInputLog[inputLogIterator];
		}
		// If any inputs (or any previous inputs) are different than what the historical game state had, resimulate it
		if (anyChangedInputs) {
			// Overwrite historical states
			gameStateHistory[tempFrameCount] = copyGameState(currentResimulatedState);
			// Run game logic
			gameLogic(currentResimulatedState);
			numResimulatedFrames += 1;
			tempFrameCount += 1;
			currentResimulatedState.frameCount = tempFrameCount;
		}
		else {
			// Just use existing historical state
			tempFrameCount += 1;
			if (gameStateHistory[tempFrameCount] !== undefined) {
				currentResimulatedState = gameStateHistory[tempFrameCount];
			}
		}
	}
	// Only change anything if any inputs were different than expected
	if (anyChangedInputs) {
		// Caught up to current frame, replace game state
		currentGameState = currentResimulatedState;
		// Update latest full input frame
		latestPlayerInputs.sort(compareInputFrameCount);
		latestFullInputFrame = latestPlayerInputs[0]?.frameCount || latestFullInputFrame;
		numRollbacks += 1;
	}
}

let lastTime;
let timeAccumulator = 0;
let frameTime = 1000/60;
let gameLoop = () => {
	if (gameStarted && currentGameState !== undefined && !gamePaused) {

		// Do rollback simulations if needed
		if (rollbackInputReceived) {
			rollbackInputReceived = false;
			resimulateGame();
		}

		let frameTimeAdjust = 0;
		// Determine if a slight delay or skip forward is needed
		numLargestRemoteLag = Math.min(...playerFrameAdvantages.map(entry => entry.frameAdvantage));
		if (numLargestRemoteLag < -1) {
			frameTimeAdjust = 4;
			if (numLargestRemoteLag < -5) {
				frameTimeAdjust = 8;
			}
			if (numLargestRemoteLag < -10) {
				frameTimeAdjust = 16;
			}
		}

		let newTime = Date.now();
		let deltaTime = newTime - lastTime;
		lastTime = newTime;
		timeAccumulator += deltaTime;
		if (timeAccumulator > (frameTime + frameTimeAdjust)) {
			// Run logic to simulate frames of the game
			let limit = 10;
			while (timeAccumulator > frameTime && limit > 0) {
				timeAccumulator -= frameTime;
				limit -= 1;
				// Apply any playerinputs for this frame
				let playerInputsToApply = playerInputLog.filter(playerInput => playerInput.frameCount === currentFrameCount);
				playerInputsToApply.forEach(playerInput => {
					let matchingPlayer = currentGameState.playerList.find(player => player.id === playerInput.id);
					applyInputToPlayer(matchingPlayer, playerInput);
				});
				gameStateHistory.push(copyGameState(currentGameState));
				gameLogic(currentGameState);
				currentFrameCount += 1;
				currentGameState.frameCount = currentFrameCount;
			}
			if (limit === 0) {
				timeAccumulator = 0;
			}
			// Send inputs to server, and save to input log for local game simulation in a couple frames
			if (currentView === "game" && (inputChanged || (lastInputSentFrame + 120 < currentFrameCount))) {
				// Case 1: input has changed
				// Case 2: too long since last time input was sent to server
				let inputData = {
					upPressed: wDown,
					rightPressed: dDown,
					downPressed: sDown,
					leftPressed: aDown,
					grabPressed: pDown,
					usePressed: oDown,
					anchorPressed: spaceDown,
					// Put input delay here?
					frameCount: currentFrameCount + inputDelay,
				};
				sendData("playerInput", inputData);
				// Also put this into the local copy of the input log (the server will not send it to us)
				inputData.id = localPlayerID;
				playerInputLog.push(inputData);
				// Ok this is mostly for testing rollback
				// but if the input frame is set to be before the current frame (or the current frame), do a rollback
				// (Would only happen if there is an artifically negative inputDelay
				if (inputData.frameCount <= currentFrameCount) {
					rollbackInputReceived = true;
				}
				lastInputSentFrame = currentFrameCount;
			}
			inputChanged = false;
		}
		renderFrame(currentGameState);
	}
	else if (gamePaused) {
		// Don't build up a large chunk of time while paused
		lastTime = Date.now();
	}
	requestAnimationFrame(gameLoop);
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
				applianceObject.connectedMesh.material = applianceObject.highlightMat;
			}
			else {
				applianceObject.connectedMesh.material = applianceObject.regularMat;
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
		if (itemObject.processed) {
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
		effectMesh.scale.x = effectObject.lifespan / 500;
		effectMesh.scale.y = effectObject.lifespan / 500;
		effectMesh.position.x = effectObject.xPosition;
		effectMesh.position.y = effectObject.yPosition;
	});
	let localPlayer = getLocalPlayer(gs);
	let localPlayerMesh = localPlayer.connectedMesh;
	if (thirdPersonTest || firstPersonTest) {
		if (thirdPersonTest) {
			camera.position.set(localPlayerMesh.position.x, localPlayerMesh.position.y, localPlayerMesh.position.z + 10);
			localPlayerMesh.visible = true;
			camera.rotation.set(0, 0, 0);
		}
		else if (firstPersonTest) {
			camera.position.set(localPlayerMesh.position.x, localPlayerMesh.position.y, localPlayerMesh.position.z);
			localPlayerMesh.visible = false;
			camera.rotation.copy(localPlayerMesh.rotation);
		}
	}
	else {
		// Normal overhead view
		localPlayerMesh.visible = true;
		camera.rotation.set(0, 0, 0);
		let xMin = gs.playerList.reduce((x, object) => Math.min(object.xPosition, x), Infinity);
		xMin = Math.min(xMin, gs.applianceList.reduce((x, object) => Math.min(object.xPosition, x), Infinity));

		let xMax = gs.playerList.reduce((x, object) => Math.max(object.xPosition, x), -Infinity);
		xMax = Math.max(xMax, gs.applianceList.reduce((x, object) => Math.max(object.xPosition, x), -Infinity));

		let yMin = gs.playerList.reduce((y, object) => Math.min(object.yPosition, y), Infinity);
		yMin = Math.min(yMin, gs.applianceList.reduce((y, object) => Math.min(object.yPosition, y), Infinity));

		let yMax = gs.playerList.reduce((y, object) => Math.max(object.yPosition, y), -Infinity);
		yMax = Math.max(yMax, gs.applianceList.reduce((y, object) => Math.max(object.yPosition, y), -Infinity));

		let sceneSize = Math.max(Math.abs(xMax - xMin), Math.abs(yMax - yMin));

		let xCamTarget = (xMin + xMax) / 2;
		let yCamTarget = (yMin + yMax) / 2;
		let zCamTarget = 5 + sceneSize * 0.5;
		xCamera = 0.9 * xCamera + 0.1 * xCamTarget;
		yCamera = 0.9 * yCamera + 0.1 * yCamTarget;
		zCamera = 0.9 * zCamera + 0.1 * zCamTarget;
		camera.position.x = xCamera;
		camera.position.y = yCamera;
		camera.position.z = zCamera;
	}
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
			let displayedHealth = overlayElement.style.getPropertyValue("--health");
			let displayedMaxHealth = overlayElement.style.getPropertyValue("--max-health");
			// Using != because the dom saves these as strings instead of numbers
			if (overlayItem.connectedObject.health != displayedHealth || overlayItem.connectedObject.maxHealth != displayedMaxHealth) {
				overlayElement.style.setProperty("--health", Math.max(0, overlayItem.connectedObject.health));
				overlayElement.style.setProperty("--max-health", overlayItem.connectedObject.maxHealth);
			}
		}
	});
	if (showDebug) {
		currentFrameSpan.textContent = currentFrameCount;
		rollbacksSpan.textContent = numRollbacks;
		resimulatedFramesSpan.textContent = numResimulatedFrames;
		largestRemoteLagSpan.textContent = numLargestRemoteLag;
	}
}

let getLocalPlayer = (gs) => {
	return gs.playerList.filter(player => player.id === localPlayerID)[0];
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
		// Defeated players are very slow
		if (playerObject.defeated) {
			xSpeedChange *= 0.1;
			ySpeedChange *= 0.1;
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
			// Defeated players turn slower
			if (playerObject.defeated) {
				rotationChange *= 0.5;
			}
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
						// Make sure appliance's right side isn't covered by another appliance
						let rightSideCovered = gs.applianceList.some(otherAppliance => {
							return otherAppliance.xPosition === appliance.xPosition + 1 &&
								otherAppliance.yPosition === appliance.yPosition;
						});
						if (!rightSideCovered) {
							playerObject.xSpeed = Math.max(playerObject.xSpeed, 1 + appliance.xPosition - playerObject.xPosition);
						}
					}
					else {
						// Left side
						// Make sure appliance's right side isn't covered by another appliance
						let leftSideCovered = gs.applianceList.some(otherAppliance => {
							return otherAppliance.xPosition === appliance.xPosition - 1 &&
								otherAppliance.yPosition === appliance.yPosition;
						});
						if (!leftSideCovered) {
							playerObject.xSpeed = Math.min(playerObject.xSpeed, -1 + appliance.xPosition - playerObject.xPosition);
						}
					}
				}
				else {
					// Top or bottom side
					if (playerObject.yPosition > appliance.yPosition) {
						// Bottom side
						// Make sure appliance's bottom side isn't covered by another appliance
						let bottomSideCovered = gs.applianceList.some(otherAppliance => {
							return otherAppliance.xPosition === appliance.xPosition &&
								otherAppliance.yPosition === appliance.yPosition + 1;
						});
						if (!bottomSideCovered) {
							playerObject.ySpeed = Math.max(playerObject.ySpeed, 1 + appliance.yPosition - playerObject.yPosition);
						}
					}
					else {
						// Top side
						// Make sure appliance's right side isn't covered by another appliance
						let topSideCovered = gs.applianceList.some(otherAppliance => {
							return otherAppliance.xPosition === appliance.xPosition &&
								otherAppliance.yPosition === appliance.yPosition - 1;
						});
						if (!topSideCovered) {
							playerObject.ySpeed = Math.min(playerObject.ySpeed, -1 + appliance.yPosition - playerObject.yPosition);
						}
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
						// Supply appliances - copy item when picking up, delete item when putting down, never remove item from supply
						// Can only put item down onto same type of supply
						if (applianceObject.subType === "supply") {
							if (playerObject.holdingItem && applianceObject.holdingItem && playerObject.heldItem.subType === applianceObject.heldItem.subType) {
								// Delete player's held item
								transferItem(gs, playerObject, undefined, playerObject.heldItem);
							}
							else if (!playerObject.holdingItem && applianceObject.holdingItem) {
								// Pick up copy of item
								let newItemCopy = createItem(gs, applianceObject.heldItem.subType);
								transferItem(gs, undefined, playerObject, newItemCopy);
							}
						}
						else {
							if (playerObject.holdingItem && !applianceObject.holdingItem) {
								// Put down object
								transferItem(gs, playerObject, applianceObject, playerObject.heldItem);
							}
							else if (!playerObject.holdingItem && applianceObject.holdingItem) {
								// Pick up object
								transferItem(gs, applianceObject, playerObject, applianceObject.heldItem);
							}
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
					// Defeated players cannot fire projectiles
					if (!playerObject.defeated) {
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
			}
			else {
				// Interact button: can make progress on item
				gs.applianceList.forEach((applianceObject) => {
					if (applianceObject.holdingItem) {
						if (playerObject.xTarget === applianceObject.xPosition && playerObject.yTarget === applianceObject.yPosition) {
							let targetItem = applianceObject.heldItem;
							if (!targetItem.processed) {
								let progressAmt = 1;
								// defeated players are very slow at making progress
								if (playerObject.defeated) {
									progressAmt = 0.1;
								}
								targetItem.progress += progressAmt;
							}
							if (targetItem.progress >= 100) {
								targetItem.processed = true;
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
				// Subtract 1 health from player
				playerObject.health -= 1;
				// Check if player is defeated
				if (playerObject.health <= 0) {
					playerObject.defeated = true;
				}
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
	gs.itemList.forEach(itemObject => {
		if (itemObject.toBeRemoved) {
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
let transferItem = (gs, oldHolder, newHolder, item) => {
	if (!!oldHolder) {
		oldHolder.heldItem = undefined;
		oldHolder.holdingItem = false;
	}
	if (!!newHolder) {
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
	else {
		// Remove item if no new holder
		item.toBeRemoved = true;
		item.heldByPlayer = false;
		item.heldByAppliance = false;
		item.holder = undefined;
	}
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
			socketURL = wsProtocol + "bine.nfshost.com/alchemist/";
		}
		else {
			wsProtocol = "ws://";
			socketURL = (location.protocol + "//" + location.host + "/").replace(/\d+\/$/, "8099").replace("http://", wsProtocol);
		}
		socket = new WebSocket(socketURL);
		socket.onopen = (data) => {
			console.log("connected to server!");
			connected = true;
			makeRoomButton.disabled = undefined;
		}
		socket.onmessage = (message) => {
			let messageParse = JSON.parse(message.data);
			let messageType = messageParse.type;
			let messageData = messageParse.data;
			// new available room/rooms
			if (messageType === "localPlayerID") {
				localPlayerID = messageData;
				// Remove local player from playerFrameAdvantages list if still in there
				// playerFrameAdvantages = playerFrameAdvantages.filter(entry => entry.id !== localPlayerID);
			}
			else if (messageType === "roomInfo") {
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
				gameStarted = true;
				currentGameState = createGameState();
				initializeGameState(currentGameState);
				playerFrameAdvantages = [];
				gameStartPlayerInfo.forEach(playerData => {
					let newPlayerObject = createPlayer(currentGameState, playerData.playerName, playerData.playerID, playerData.playerTeam);
					if (newPlayerObject.team === 1) {
						newPlayerObject.xPosition = -6;
					}
					else if (newPlayerObject.team === 2) {
						newPlayerObject.xPosition = 6;
					}
					// Don't add local player to playerFrameAdvantages
					if (playerData.playerID !== localPlayerID) {
						playerFrameAdvantages.push({id: playerData.playerID, frameAdvantage: 0});
					}
				});
				console.log("starting game loop");
				lastTime = Date.now();
				gameLoop();
			}
			// other player input
			else if (messageType === "playerInput") {
				playerInputLog.push(messageData);
				// If the input was meant for an earlier frame (or this frame) than what we're currently on, prepare to do a rollback simulation
				if (messageData.frameCount <= currentFrameCount) {
					rollbackInputReceived = true;
				}
				// Calculate remoteFrameLag
				let remoteFrameLag = (messageData.frameCount - inputDelay) - currentFrameCount;
				let playerEntry = playerFrameAdvantages.find(entry => entry.id === messageData.id);
				playerEntry.frameAdvantage = remoteFrameLag;
			}
			// other player quitting
			else if (messageType === "playerQuit") {
			}
			// other player pausing the game
			else if (messageType === "pauseGame") {
				gamePaused = true;
				pauseGameButton.textContent = "Resume Game";
			}
			// other player resuming the game
			else if (messageType === "resumeGame") {
				gamePaused = false;
				pauseGameButton.textContent = "Pause Game";
			}
			// other player used the desync eval tool
			else if (messageType === "desyncTool") {
				// send whole game state history
				console.log("Other player requested full game state history for desync detector tool");
				sendData("gameStateHistory", gameStateHistory.map(copyGameStateNoCircularRef));
				console.log("Sent game state history...");
			}
			// other player sending game state history
			else if (messageType === "gameStateHistory") {
				console.log("Got game state history, running desync detector...");
				//  read through history and compare each frame state
				let foundDesync = false;
				messageData.forEach((otherGameState, index) => {
					if (foundDesync) {
						// Already found a desync - no need to keep iterating
						return;
					}
					if (gameStateHistory.length <= index) {
						console.log("remote gameStateHistory ran out of states without finding a desync");
						console.log(`local: ${gameStateHistory.length} frames, remote: ${messageData.length} frames`);
						foundDesync = true;
						return;
					}
					let statesDifferent = compareGameStates(gameStateHistory[index], otherGameState);
					if (statesDifferent) {
						console.log(`Desync detected at frame ${index}`);
						console.log(gameStateHistory[index]);
						console.log(otherGameState);
						console.log("Full game state histories:");
						console.log(gameStateHistory)
						console.log(messageData);
						foundDesync = true;
					}
				});
				if (!foundDesync) {
					console.log("No desync detected!");
				}
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


