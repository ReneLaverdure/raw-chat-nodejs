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

const PORT = process.env.PORT || 3000;

// ==== database query ====
const inputUserIntoDb = database.prepare(
  "INSERT INTO users (username, password, id) VALUES(?, ?, ?)",
);
const createSession = database.prepare(
  "INSERT INTO sessions (session, expires_at, user_id) VALUES(?, ?, ?)",
);

const getUserByUsername = database.prepare(
  "SELECT * FROM users WHERE username = ?",
);

function generateSession(userId, expires_at = Date.now() + 5 * 60 * 1000) {}
const returnSession = database.prepare(
  "SELECT * FROM sessions WHERE session = ?",
);
const getSessionByUserId = database.prepare(
  "SELECT * FROM sessions WHERE user_id = ?",
);
const deleteSession = database.prepare(
  "DELETE FROM sessions WHERE session = ?",
);

function parseCookie(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((cookies) => {
      const [key, value] = cookies.trim().split("=");
      return [key, value];
    }),
  );
}

function validateSessionToken(cookieHeader) {
  const cookies = parseCookie(cookieHeader);
  const sessionToken = cookies.token;
  console.log(sessionToken);
  if (!sessionToken) {
    return false;
  }

  const session = returnSession.get(sessionToken);
  console.log("======on session======", session);
  if (!session) {
    return false;
  }
  if (session.expires_at < Date.now()) {
    deleteSession.run(sessionToken);
    return false;
  }

  return session;
}

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
          console.log(filePathSeg[3]);
          const chucks = [];
          let body;
          //login route
          if (filePathSeg[3] === "login") {
            console.log("login routing =====");

            req.on("data", (chunk) => {
              chucks.push(chunk);
            });
            req.on("end", () => {
              const buffer = Buffer.concat(chucks).toString("utf8");
              body = JSON.parse(buffer);
              console.log("body from requesting client", body);

              //error handling needed username must be unique

              try {
                const user = getUserByUsername.get(body.username);
                if (!user) {
                  res.writeHead(401, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ msg: "Invalid credentials" }));
                  return;
                }

                if (user.password === body.password) {
                  const isSessionDup = getSessionByUserId.get(user.id);
                  if (isSessionDup) {
                    console.log("===== deleting dup session =====");
                    deleteSession.run(isSessionDup.session);
                  }

                  const session = randomUUID();
                  const now = Date.now();
                  const expires_at = now + 5 * 60 * 1000;
                  createSession.run(session, expires_at, user.id);
                  res.writeHead(200, {
                    "Content-Type": "application/json",
                    "Set-Cookie": `token=${session}; HttpOnly; SameSite=Secure; Max-Age=300; Path=/`,
                  });
                  res.end(JSON.stringify({ success: true }));
                  return;
                } else {
                  res.writeHead(401, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ msg: "invalid credentials" }));
                  return;
                }
              } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ msg: err.message }));
              }
            });
          }

          if (filePathSeg[3] === "register") {
            console.log("register =======");
            req.on("data", (chunk) => {
              chucks.push(chunk);
            });

            req.on("end", () => {
              const buffer = Buffer.concat(chucks).toString("utf8");
              body = JSON.parse(buffer);
              console.log("body from requesting client", body);
              const userId = randomUUID();
              const session = randomUUID();
              const now = Date.now();
              const expires_at = now + 5 * 60 * 1000;

              //error handling needed username must be unique
              try {
                inputUserIntoDb.run(body.username, body.password, userId);
                createSession.run(session, expires_at, userId);
                res.writeHead(200, {
                  "Content-Type": "application/json",
                  "Set-Cookie": `token=${session}; HttpOnly; SameSite=Secure; Max-Age=300; Path=/`,
                });
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                const isDuplicate = err.message.includes(
                  "UNIQUE constraint failed",
                );
                res.writeHead(isDuplicate ? 409 : 500, {
                  "Content-Type": "application/json",
                });
                res.end(
                  JSON.stringify({
                    msg: isDuplicate
                      ? "username already taken"
                      : "Server error",
                  }),
                );
              }

              return;
            });
          }

          break;
        }
        case "PATCH": {
          break;
        }
        case "DELETE": {
          console.log("=========== this is the delete route ======");
          const session = validateSessionToken(req.headers.cookie);
          if (!session) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "method not allowed" }));
            return;
          }

          const token = session.session;
          deleteSession.run(token);
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Set-Cookie":
              "token=; HttpOnly; SameSite=Secure; Max-Age=0; Path=/",
          });
          res.end(JSON.stringify({ success: true }));
          return;
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
          const session = validateSessionToken(req.headers.cookie);
          if (!session) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ msg: "session does not exist" }));
            return;
          }

          //sse listening
          //no res.end to keep the sse listening for updates
          if (req.headers["accept"] === "text/event-stream") {
            console.log("within events =====");

            const roomUsers = sseMap.get(roomId);
            if (!roomUsers) {
              res.writeHead(404, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ msg: "Room not found" }));
              return;
            }
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            });
            roomUsers[session.user_id] = res;
            sseMap.set(roomId, roomUsers);
            req.on("close", () => {
              delete roomUsers[session.user_id];
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
          const session = validateSessionToken(req.headers.cookie);
          if (!session) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ msg: "session does not exist" }));
            return;
          }
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
              Date.now(),
              session.user_id,
              roomId,
              randomUUID(),
            );

            const roomUsers = sseMap.get(roomId);
            for (const users in roomUsers) {
              console.log("within the sse map updating");
              const clientRes = roomUsers[users];

              clientRes.write(`data: ${bufferMessage}\n\n`);
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

server.listen(PORT, () => {
  console.log(`server is running on http://localhost:3000`);
});
