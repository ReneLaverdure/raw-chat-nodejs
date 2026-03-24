const registerForm = document.querySelector("#registerForm");
const errorText = document.querySelector(".error");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("REGISTER FORM");
  const password = e.target.password.value;
  const confirmPassword = e.target.confirmPassword.value;

  if (password !== confirmPassword) {
    errorText.classList.add("display");
    setTimeout(() => {
      errorText.classList.remove("display");
    }, 3000);
    return;
  }

  const data = {
    username: e.target.username.value,
    password: password,
  };
  console.log(data);
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (response.ok) {
      window.location.href = "/";
    } else {
      const result = await response.json();
      errorText.classList.add("display");
      errorText.textContent = result.msg;
      setTimeout(() => {
        errorText.classList.remove("display");
      }, 3000);
    }
  } catch (err) {
    errorText.classList.add("display");
    errorText.textContent = err.message;
    setTimeout(() => {
      errorText.classList.remove("display");
    }, 3000);
  }
});
