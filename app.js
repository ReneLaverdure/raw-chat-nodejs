const http = require("http");
const fs = require("fs");
const path = require("path");

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "impage/png",
  ".jpg": "image/jpeg",
};

const publicDir = path.join(__dirname, "public");

const server = http.createServer((req, res) => {
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

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Context-Type": contentType });
    res.end(data);
  });
});

server.listen(3000, () => {
  console.log(`server is running on http://localhost:3000`);
});
