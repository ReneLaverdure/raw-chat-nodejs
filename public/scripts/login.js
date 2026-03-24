console.log("login");
import displayError from "./util/errorMessage.js";

const loginForm = document.querySelector("#loginForm");
const errorText = document.querySelector(".error");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    username: e.target.username.value,
    password: e.target.password.value,
  };
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (response.ok) {
      window.location.href = "http://localhost:3000/";
    } else {
      console.log("error message", result);
      displayError(result.msg, errorText);
    }
  } catch (err) {
    displayError(err.message, errorText);
  }
});

console.log("LOGIN IN");
