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

---

Vite doesn't work over the internet. To build for web hosting:

> npx vite build

then, copy the models folder into Game/dist

(TODO: make that happen automatically)

The Game/dist folder is what should be put into the web server

