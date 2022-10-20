"use strict";
console.log("alchemist game");

// Main render stuff
let scene;
let camera;
let renderer;

// Specific render stuff
let cubeGeometry;
let playerMaterial;
let playerMesh;

let planeGeometry;
let floorMaterial;
let floorMesh;

let tableMaterial;
let tableMesh;
let tableMaterial2;
let tableMesh2;

let sphereGeometry;
let itemMaterial;
let itemMesh;

let sceneLight;
let sceneLight2;

// Game stuff
let playerObject; 
let itemObject;

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
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
	playerMaterial = new THREE.MeshToonMaterial({color: 0x22ff22});
	playerMesh = new THREE.Mesh(cubeGeometry, playerMaterial);
	scene.add(playerMesh);
	camera.position.z = 10;

	planeGeometry = new THREE.PlaneGeometry(10, 10);
	floorMaterial = new THREE.MeshToonMaterial({color: 0x504030});
	floorMesh = new THREE.Mesh(planeGeometry, floorMaterial);
	floorMesh.position.set(0, 0, -0.5);
	scene.add(floorMesh);

	tableMaterial = new THREE.MeshToonMaterial({color: 0xccaa22});
	tableMesh = new THREE.Mesh(cubeGeometry, tableMaterial);
	tableMesh.position.set(3, 3, 0);
	scene.add(tableMesh);

	tableMaterial2 = new THREE.MeshToonMaterial({color: 0xccaa22});
	tableMesh2 = new THREE.Mesh(cubeGeometry, tableMaterial2);
	tableMesh2.position.set(3, -3, 0);
	scene.add(tableMesh2);

	sphereGeometry = new THREE.SphereGeometry(0.25, 6, 6);
	itemMaterial = new THREE.MeshToonMaterial({color: 0x2266dd});
	itemMesh = new THREE.Mesh(sphereGeometry, itemMaterial);
	itemMesh.position.set(3, 3, 1);
	scene.add(itemMesh);

	sceneLight = new THREE.PointLight(0xff9999, 0.8, 14);
	sceneLight.position.set(4, 4, 4);
	scene.add(sceneLight);

	sceneLight2 = new THREE.AmbientLight(0xffdddd, 0.4);
	scene.add(sceneLight2);

	playerObject = {
		xSpeed: 0,
		ySpeed: 0,
		xPosition: 0,
		yPosition: 0,
		rotation: 0,
		xTarget: 0,
		yTarget: 0,
		releasedGrab: true,
		holdingItem: false,
	};
	itemObject = {
		onTopTable: true,
	}

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
	playerMesh.position.x = playerObject.xPosition;
	playerMesh.position.y = playerObject.yPosition;
	playerMesh.rotation.z = playerObject.rotation;
	if (playerObject.holdingItem) {
		itemMesh.parent = playerMesh;
		itemMesh.position.set(1, 0, 0.5);
	}
	else {
		if (itemObject.onTopTable) {
			itemMesh.parent = tableMesh;
		}
		else {
			itemMesh.parent = tableMesh2;
		}
		itemMesh.position.set(0, 0, 1);
	}
	if (playerObject.xTarget === 3 && playerObject.yTarget === -3) {
		tableMaterial2.color.setHex(0xddbb33);
	}
	else {
		tableMaterial2.color.setHex(0xccaa22);
	}
	if (playerObject.xTarget === 3 && playerObject.yTarget === 3) {
		tableMaterial.color.setHex(0xddbb33);
	}
	else {
		tableMaterial.color.setHex(0xccaa22);
	}
	
	renderer.render(scene, camera);
}


let gameLogic = () => {

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
			if (playerObject.xTarget === 3 && playerObject.yTarget === 3) {
				if (playerObject.holdingItem) {
					// Put item down
					playerObject.holdingItem = false;
					itemObject.onTopTable = true;
				}
				else if (itemObject.onTopTable) {
					// Pick item up
					playerObject.holdingItem = true;
				}
			}
			else if (playerObject.xTarget === 3 && playerObject.yTarget === -3) {
				if (playerObject.holdingItem) {
					// Put item down
					playerObject.holdingItem = false;
					itemObject.onTopTable = false;
				}
				else if (!itemObject.onTopTable) {
					// Pick item up
					playerObject.holdingItem = true;
				}
			}
		}
		playerObject.releasedGrab = false;
	}
	else {
		playerObject.releasedGrab = true;
	}
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
