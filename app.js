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
const query = database.prepare("SELECT * FROM data ORDER BY key");

const inputUserIntoDb = database.prepare(
  "INSERT INTO users (username, password, id) VALUES(?, ?, ?)",
);
console.log(query.all());

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "impage/png",
  ".jpg": "image/jpeg",
};

const server = http.createServer(async (req, res) => {
  console.log("======== a new request =========");
  // console.log(req.url);
  // console.log(req.method);
  const publicDir = path.join(__dirname, "public");

  if (req.url.startsWith("/api")) {
    const filePathSeg = req.url.split("/");
    const route = filePathSeg[2];
    console.log(filePathSeg);

    console.log(" === within api called ===");
    if (route === "auth") {
      switch (req.method) {
        case "GET": {
          res.writeHead(200, { "Content-Type": "application/json" });
          let incoming;
          req.on("data", (chunk) => {
            incoming += chunk.toString();
          });
          req.on("end", () => {
            console.log(incoming);
            console.log("done");
          });

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
            console.log(body);
            const id = randomUUID();
            //error handling needed username must be unique
            inputUserIntoDb.run(body.username, body.password, id);
            const returnUserInDb = database
              .prepare("SELECT * FROM users WHERE username = ?")
              .get(body.username);
            console.log(returnUserInDb.username);
            if (returnUserInDb) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ id: returnUserInDb.id }));
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

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }

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
