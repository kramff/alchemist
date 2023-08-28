# alchemist
Alchemist Game

Potential Names:

"Alchemy Rivalry"

---

To run the websocket server:

In Server/

> node server.js

(Connects to ws port 8099)

---

To host the website files:

In Game/

> npx vite --port 8090

(Can use any port besides 8099)

---

View locally at:

http://localhost:8090/index.html

(or whatever port you picked in the last step)

---

Vite doesn't work over the internet. To build for web hosting:

In Game/

> npx vite build

then, copy the models folder into Game/dist/

(TODO: make that happen automatically)

The Game/dist/ folder is what should be put into the web server

---

Notes section

This project uses [javascript module syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) so that it can use [three.js](https://threejs.org/)'s [GLTF Loader](https://threejs.org/docs/index.html#examples/en/loaders/GLTFLoader).

The websocket server is using the [ws library](https://github.com/websockets/ws).


