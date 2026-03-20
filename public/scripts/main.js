console.log("front end");
const url = "http://localhost:3000/api/auth";

async function getAuth() {
  let response = await fetch(url);
  let data = await response.json();
  return data;
}

const data = await getAuth();
console.log(data);
