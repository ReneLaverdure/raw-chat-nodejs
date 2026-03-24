console.log("front end");
const BASEURL = "/api";
const roomList = document.querySelector("#roomList");
const chatroomMessages = document.querySelector("#chatroom-messages");
const messageForm = document.querySelector("#messageForm");
const errorText = document.querySelector(".error");
const logout = document.querySelector("#logout");

let currentRoom = undefined;
function displayError(errorMessage, element) {
  element.textContent = errorMessage;
  element.classList.add("display");
  setTimeout(() => {
    element.classList.remove("display");
  }, 3000);
}
async function getAuth() {
  let response = await fetch(BASEURL + "/auth");
  let data = await response.json();
  return data;
}

async function getAllRoomId() {
  let response = await fetch(BASEURL + "/room");
  let data = await response.json();

  for (const item of data) {
    const linkDiv = document.createElement("div");
    const newLink = document.createElement("button");

    newLink.textContent = item.name;
    newLink.setAttribute("id", item.id);
    newLink.classList.add("chatroom-button");
    linkDiv.appendChild(newLink);
    roomList.appendChild(linkDiv);
  }

  return data;
}

logout.addEventListener("click", async (e) => {
  e.preventDefault();
  const response = await fetch(BASEURL + "/auth", {
    method: "DELETE",
  });
  const data = await response.json();
  if (data.success) {
    window.location.href = "/login";
  }
});

const data = await getAuth();
const room = await getAllRoomId();
console.log(room);
console.log(data);

let currentEventSource = undefined;

const chatroomButtons = document.querySelectorAll(".chatroom-button");
for (const button of chatroomButtons) {
  button.addEventListener("click", async (e) => {
    console.log("clicking room ");
    chatroomMessages.innerHTML = "";
    const roomId = e.target.id;
    currentRoom = roomId;
    try {
      const response = await fetch(BASEURL + "/messages" + "/" + roomId);
      const data = await response.json();
      if (!response.ok) {
        displayError(data.msg, errorText);
        return;
      }

      displayMessages(data.messages);
      if (currentEventSource) {
        currentEventSource.close();
      }
      currentEventSource = new EventSource(
        `${BASEURL}/messages/${roomId}/events`,
      );

      currentEventSource.onmessage = (e) => {
        console.log(e);
        const messageStream = JSON.parse(e.data);
        const msgDiv = document.createElement("div");
        const p = document.createElement("p");
        p.textContent = messageStream.msg;
        msgDiv.appendChild(p);
        chatroomMessages.appendChild(msgDiv);
      };
      currentEventSource.onerror = (err) => {
        displayError(err.message, errorText);
      };
    } catch (err) {
      displayError(err.message, errorText);
    }
  });
}

function displayMessages(messages) {
  console.log(messages);
  for (const message of messages) {
    const msgDiv = document.createElement("div");
    const p = document.createElement("p");
    p.textContent = message.text;
    msgDiv.appendChild(p);
    chatroomMessages.appendChild(msgDiv);
  }
}

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentRoom) {
    return;
  }
  let message = e.target.message.value;

  console.log(message);
  console.log("current room id", currentRoom);
  console.log("sending message");
  console.log(localStorage.getItem("userId"));
  let sendingMessage = await fetch(BASEURL + "/messages" + "/" + currentRoom, {
    method: "POST",
    body: JSON.stringify({
      msg: message,
    }),
  });
  // const data = await sendingMessage.json();
  // console.log(data);
  // if (data.msg === message) {
  //   console.log("message has been recivied ");
  //   const msgDiv = document.createElement("div");
  //   const p = document.createElement("p");
  //   p.textContent = data.msg;
  //   msgDiv.appendChild(p);
  //   chatroomMessages.appendChild(msgDiv);
  //   console.log(data);
  // }
});
