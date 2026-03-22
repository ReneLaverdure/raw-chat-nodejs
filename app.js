const http = require("http");
const { promises: fs } = require("fs");
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const { buffer } = require("stream/consumers");
const { randomUUID } = require("crypto");

const pathToDb = path.join(__dirname, "db");
const database = new DatabaseSync(pathToDb);
// const returnUserInDb = database
//   .prepare("SELECT * FROM users WHERE username = ?")
//   .get(username);

const inputUserIntoDb = database.prepare(
  "INSERT INTO users (username, password, id) VALUES(?, ?, ?)",
);

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "impage/png",
  ".jpg": "image/jpeg",
};

// event stream rooms

const allRooms = database.prepare("SELECT * FROM rooms").all();
const sseMap = new Map();

for (const room of allRooms) {
  sseMap.set(room.id, {});
}

console.log(sseMap);

const server = http.createServer(async (req, res) => {
  console.log("======== a new request =========");
  // console.log(req.url);
  // console.log(req.method);
  const publicDir = path.join(__dirname, "public");

  // handles api calls
  if (req.url.startsWith("/api")) {
    const filePathSeg = req.url.split("/");
    const route = filePathSeg[2];
    console.log(filePathSeg);

    console.log(" === within api called ===");
    if (route === "auth") {
      switch (req.method) {
        case "GET": {
          res.writeHead(200, { "Content-Type": "application/json" });

          const testJson = {
            auth: "this is the auth route",
            username: "tunable",
            password: "qwerty123",
          };

          res.end(JSON.stringify(testJson));

          break;
        }
        case "POST": {
          console.log("============ POSTING ACTION ================");
          const chucks = [];
          let body;
          req.on("data", (chunk) => {
            chucks.push(chunk);
          });
          req.on("end", () => {
            const buffer = Buffer.concat(chucks).toString("utf8");
            body = JSON.parse(buffer);
            console.log("body from requesting client", body);
            const id = randomUUID();
            //error handling needed username must be unique
            inputUserIntoDb.run(body.username, body.password, id);
            const returnUserInDb = database
              .prepare("SELECT * FROM users WHERE username = ?")
              .get(body.username);
            console.log(returnUserInDb, "===== new user ==== ");
            if (returnUserInDb) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  username: returnUserInDb.username,
                  id: returnUserInDb.id,
                }),
              );
              return;
            }
          });

          break;
        }
        case "PATCH": {
          break;
        }
        case "DELETE": {
          break;
        }
        default: {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "method not allowed" }));
        }
      }
      return;
    }

    if (route === "room") {
      switch (req.method) {
        case "GET": {
          console.log(req.url);

          const allRooms = database.prepare("SELECT * FROM rooms").all();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(allRooms));
          return;
        }
        default: {
          res.writeHead(200, { "Content-Type": "application/json" });

          console.log(req.url);
          const testJson = {
            room: "this is the room route",
          };

          res.end(JSON.stringify(testJson));

          return;
        }
      }
    }
    if (route === "messages") {
      switch (req.method) {
        case "GET": {
          console.log(req.url);
          const segments = req.url.split("/");
          const roomId = segments[3];
          console.log(segments);
          //sse listening
          //no res.end to keep the sse listening for updates
          if (req.headers["accept"] === "text/event-stream") {
            console.log("within events =====");
            const url = new URL(req.url, "http://localhost");
            const userId = url.searchParams.get("userId");

            console.log(userId);
            const roomUsers = sseMap.get(roomId);
            roomUsers[userId] = res;
            sseMap.set(roomId, roomUsers);
            req.on("close", () => {
              delete roomUsers[userId];
            });
            return;
          } else {
            const getAllMessages = database
              .prepare("SELECT * FROM messages WHERE room_id = ?")
              .all(roomId);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ messages: getAllMessages }));
            return;
          }
        }
        case "POST": {
          const roomId = req.url.split("/")[3];
          console.log("==== CREATING MESSAGES =====");
          // gather all chunks coming from stream
          const chunks = [];
          req.on("data", (chunk) => {
            chunks.push(chunk);
          });
          req.on("end", () => {
            let body = Buffer.concat(chunks).toString("utf8");
            const bufferMessage = body;
            body = JSON.parse(body);
            console.log(body);
            const messageInsert = database.prepare(
              "INSERT INTO messages (text, timestamp, user_id, room_id, id) VALUES(?, ?, ?, ?, ?)",
            );
            messageInsert.run(
              body.msg,
              body.timestamp,
              body.userId,
              body.roomId,
              randomUUID(),
            );

            const roomUsers = sseMap.get(roomId);
            for (const users in roomUsers) {
              console.log("within the sse map updating");
              const res = roomUsers[users];
              res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              });
              res.write(`data: ${bufferMessage}\n\n`);
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ msg: body.msg }));
          });
          return;
        }
        default: {
          console.log("===== DEFAULT MESSAGING CASE ===");
          res.writeHead(200, { "Content-Type": "application/json" });

          console.log(req.url);
          const testJson = {
            messages: "this is the messages route",
          };

          res.end(JSON.stringify(testJson));

          return;
        }
      }
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }

  //handle page resources calls

  let filePath = path.join(
    __dirname,
    "public",
    req.url === "/" ? "index.html" : req.url,
  );
  //ensure path leads to public dir
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const segments = req.url.split("/");
  //routing chatrooms
  if (segments[1] === "chatroom") {
    const roomId = segments[segments.length - 1];
    filePath = path.join(publicDir, "chatroom.html");
  }

  let ext = path.extname(filePath);
  if (!ext) {
    filePath += ".html";
    ext = ".html";
  }

  const contentType = MIME_TYPES[ext] || "text/plain";

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(3000, () => {
  console.log(`server is running on http://localhost:3000`);
});
