console.log("login");

const form = document.querySelector("form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    username: e.target.username.value,
    password: e.target.password.value,
  };
  console.log(data);
  const response = await fetch("/api/auth", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await response.json();
  console.log(result);
  localStorage.setItem("userId", result.id);
  localStorage.setItem("username", result.username);
  if (result.id) {
    window.location.href = "http://localhost:3000/";
  }
});
console.log(form, "asdf");
