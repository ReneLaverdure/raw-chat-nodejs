const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const { promises: fs } = require("fs");
const { randomUUID } = require("crypto");

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
    CREATE TABLE users(
    username TEXT UNIQUE, 
    password TEXT,
    id TEXT PRIMARY KEY
) STRICT
`);

database.exec(`
    CREATE TABLE rooms(
    name TEXT,
    id TEXT PRIMARY KEY 
)
`);

database.exec(`
    CREATE TABLE messages(
    text TEXT,
    timestamp TEXT,
    user_id TEXT, 
    room_id TEXT,
    id TEXT PRIMARY KEY, 
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
)
`);

database.exec(`
    CREATE TABLE sessions(
    session TEXT, 
    expires_at TEXT,
    user_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
`);

const userInsert = database.prepare(
  "INSERT INTO users (username, password, id) VALUES(?, ?, ?)",
);

userInsert.run("test-user-1", "qwerty", randomUUID());
userInsert.run("test-user-2", "12345", randomUUID());
userInsert.run("test-user-3", "qwerty123", randomUUID());

const roomInsert = database.prepare(
  "INSERT INTO rooms (name, id) VALUES(?, ?)",
);

roomInsert.run("first and best", randomUUID());
roomInsert.run("green and mean", randomUUID());
roomInsert.run("ausPol", randomUUID());

const getAllUsers = database.prepare("SELECT * FROM users");
const getAllRooms = database.prepare("SELECT * FROM rooms");
const getUsersByUsername = database.prepare(
  "SELECT * FROM users WHERE username = ?",
);
const getRoomByName = database.prepare("SELECT * FROM rooms WHERE name = ?");
const getAllMessages = database.prepare("SELECT * FROM messages");

const users = getAllUsers.all();
const rooms = getAllRooms.all();

console.log("users", users);
console.log("rooms", rooms);

const messageInsert = database.prepare(
  "INSERT INTO messages (text, timestamp, user_id, room_id, id) VALUES(?, ?, ?, ?, ?)",
);

messageInsert.run(
  "first is the worst",
  Date.now(),
  users[0].id,
  rooms[0].id,
  randomUUID(),
);
messageInsert.run(
  "first ever message",
  Date.now(),
  users[1].id,
  rooms[0].id,
  randomUUID(),
);
messageInsert.run("...", Date.now(), users[2].id, rooms[0].id, randomUUID());

messageInsert.run(
  "army tiktok",
  Date.now(),
  users[0].id,
  rooms[1].id,
  randomUUID(),
);
messageInsert.run(
  "greeeeeeeeeeennnnnnnnnnzzzzz",
  Date.now(),
  users[1].id,
  rooms[1].id,
  randomUUID(),
);
messageInsert.run(
  ".....................",
  Date.now(),
  users[2].id,
  rooms[1].id,
  randomUUID(),
);

messageInsert.run(
  "labor all the way",
  Date.now(),
  users[0].id,
  rooms[2].id,
  randomUUID(),
);
messageInsert.run(
  "libs for freedom ",
  Date.now(),
  users[1].id,
  rooms[2].id,
  randomUUID(),
);
messageInsert.run(
  "go one nation",
  Date.now(),
  users[2].id,
  rooms[2].id,
  randomUUID(),
);

const messages = getAllMessages.all();
console.log("messages", messages);
