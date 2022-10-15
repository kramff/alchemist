"use strict";
console.log("alchemist game");

let scene;
let camera;
let renderer;

let cubeGeometry;
let playerMaterial;
let playerObject;

let planeGeometry;
let floorMaterial;
let floorObject;

let sceneLight;
let sceneLight2;

let wDown = false;
let aDown = false;
let sDown = false;
let dDown = false;

let init = () => {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
	playerMaterial = new THREE.MeshToonMaterial({color: 0x22ff22});
	playerObject = new THREE.Mesh(cubeGeometry, playerMaterial);
	scene.add(playerObject);
	camera.position.z = 10;

	planeGeometry = new THREE.PlaneGeometry(10, 10);
	floorMaterial = new THREE.MeshToonMaterial({color: 0x504030});
	floorObject = new THREE.Mesh(planeGeometry, floorMaterial);
	floorObject.position.set(0, 0, -0.5);
	scene.add(floorObject);

	sceneLight = new THREE.PointLight(0xffaaaa, 1, 10);
	sceneLight.position.set(4, 4, 4);
	scene.add(sceneLight);

	sceneLight2 = new THREE.AmbientLight(0xffffff, 0.3);
	//scene.add(sceneLight2);

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
	renderer.render(scene, camera);
	requestAnimationFrame(gameLoop);
}

let gameLogic = () => {
	// cube.rotation.x += 0.01;
	// cube.rotation.y += 0.01;

	if (wDown) {
		playerObject.position.y += 0.1;
	}
	if (aDown) {
		playerObject.position.x -= 0.1;
	}
	if (sDown) {
		playerObject.position.y -= 0.1;
	}
	if (dDown) {
		playerObject.position.x += 0.1;
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
}
let resizeFunction = (event) => {
	renderer.setSize(window.innerWidth, window.innerHeight);
}
