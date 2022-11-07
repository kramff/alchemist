"use strict";
console.log("alchemist game");

// Main render stuff
let scene;
let camera;
let renderer;

// Specific render stuff
let cubeGeometry;
let playerMaterial;
// let playerMesh;

let planeGeometry;
let floorMaterial;
let floorMesh;

let tableMaterial;
let tableMaterialHighlight;
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
	};
	itemList.push(newItem);
	return newItem;
}
let createItemMesh = (itemType) => {
	let newItemMesh;
	if (itemType === "orb") {
		newItemMesh = new THREE.Mesh(sphereGeometry, itemMaterial);
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

let init = () => {
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

	// Materials
	playerMaterial = new THREE.MeshToonMaterial({color: 0x22ff22});
	floorMaterial = new THREE.MeshToonMaterial({color: 0x504030});
	tableMaterial = new THREE.MeshToonMaterial({color: 0xccaa22});
	tableMaterialHighlight = new THREE.MeshToonMaterial({color: 0xddbb33});
	itemMaterial = new THREE.MeshToonMaterial({color: 0x2266dd});
	itemMaterial2 = new THREE.MeshToonMaterial({color: 0xdd2266});
	progressMaterial = new THREE.MeshToonMaterial({color: 0x33ffbb});

	// Single use meshes
	floorMesh = new THREE.Mesh(planeGeometry, floorMaterial);
	floorMesh.position.set(0, 0, -0.5);
	scene.add(floorMesh);

	// Lights
	sceneLight = new THREE.PointLight(0xff9999, 0.8, 14);
	sceneLight.position.set(4, 4, 4);
	scene.add(sceneLight);
	sceneLight2 = new THREE.AmbientLight(0xffdddd, 0.4);
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


	let newPlayerObject = createPlayer();
	let newPlayerMesh = createPlayerMesh();

	connectGameObjectToSceneMesh(newPlayerObject, newPlayerMesh);

	for (var i = 0; i < 6; i++) {
		let newTable = createAppliance("table", i * 2 - 3, i - 2);
		let newTableMesh = createApplianceMesh("table");
		newTableMesh.position.x = newTable.xPosition;
		newTableMesh.position.y = newTable.yPosition;
		connectGameObjectToSceneMesh(newTable, newTableMesh);
		if (i % 2 === 0) {
			let newItem = createItem("orb");
			let newItemMesh = createItemMesh("orb");
			connectGameObjectToSceneMesh(newItem, newItemMesh);
			transferItem(undefined, newTable, newItem);
		}
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

let lastTime;
let timeAccumulator = 0;
let frameTime = 1000/60;
let gameLoop = () => {
	let newTime = Date.now();
	let deltaTime = newTime - lastTime
	timeAccumulator += deltaTime;
	if (timeAccumulator > frameTime) {
		gameLogic();
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
			itemMesh.rotation.z = itemObject.holder.rotation * -1;
		}
		else if (itemObject.heldByAppliance) {
			itemMesh.position.set(0, 0, 1);
			itemMesh.rotation.z = 0;
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
		if (wDown) {
			ySpeedChange += 0.02;
		}
		if (aDown) {
			xSpeedChange -= 0.02;
		}
		if (sDown) {
			ySpeedChange -= 0.02;
		}
		if (dDown) {
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
				var targetRotationDifference = Math.abs(playerObject.rotation - targetRotation);
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
		if (!spaceDown) {
			playerObject.xSpeed += xSpeedChange;
			playerObject.ySpeed += ySpeedChange;
		}
		playerObject.xPosition += playerObject.xSpeed;
		playerObject.yPosition += playerObject.ySpeed;
		playerObject.xSpeed *= 0.8;
		playerObject.ySpeed *= 0.8;
		// Apply more friction if stopping
		if (!anyDirectionPressed || spaceDown) {
			playerObject.xSpeed *= 0.9;
			playerObject.ySpeed *= 0.9;
		}
		playerObject.xTarget = Math.round(playerObject.xPosition + Math.cos(playerObject.rotation));
		playerObject.yTarget = Math.round(playerObject.yPosition + Math.sin(playerObject.rotation));

		// World Interaction

		if (pDown) {
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
		if (oDown) {
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
	if (oldHolder !== undefined) {
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

let keyDownFunction = (event) => {
	if (event.keyCode === 87) {
		wDown = true;
	}
	if (event.keyCode === 65) {
		aDown = true;
	}
	if (event.keyCode === 83) {
		sDown = true;
	}
	if (event.keyCode === 68) {
		dDown = true;
	}
	if (event.keyCode === 79) {
		oDown = true;
	}
	if (event.keyCode === 80) {
		pDown = true;
	}
	if (event.keyCode === 32) {
		spaceDown = true;
	}
}

let keyUpFunction = (event) => {
	if (event.keyCode === 87) {
		wDown = false;
	}
	if (event.keyCode === 65) {
		aDown = false;
	}
	if (event.keyCode === 83) {
		sDown = false;
	}
	if (event.keyCode === 68) {
		dDown = false;
	}
	if (event.keyCode === 79) {
		oDown = false;
	}
	if (event.keyCode === 80) {
		pDown = false;
	}
	if (event.keyCode === 32) {
		spaceDown = false;
	}
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
