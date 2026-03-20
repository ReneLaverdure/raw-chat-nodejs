const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const { promises: fs } = require("fs");

const pathToDb = path.join(__dirname, "db");
async function reset() {
  try {
    await fs.unlink(pathToDb);
    console.log("db reseted");
  } catch (err) {
    console.log("no db file found", err);
  }
}
reset();

const database = new DatabaseSync(pathToDb);

database.exec(`
    CREATE TABLE data(
    key INTEGER PRIMARY KEY,
    value TEXT 
) STRICT
`);

database.exec(`
    CREATE TABLE users(
    seq INTEGER UNIQUE,
    username TEXT UNIQUE, 
    password TEXT,
    id TEXT PRIMARY KEY
) STRICT
`);

database.exec(`
    CREATE TABLE rooms(
    name TEXT,
    id TEXT PRIMARY KEY, 
)
`);

database.exec(`
    CREATE TABLE messages(
    id TEXT PRIMARY KEY, 
    text TEXT,
    timestamp TEXT,
    user_id TEXT, 
    room_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
    FOREIGN KEY (room_id) REFERENCES rooms(id)
)
`);
const insert = database.prepare("INSERT INTO data (key, value) VALUES(?, ?)");
insert.run(1, "hello");
insert.run(2, "world");
