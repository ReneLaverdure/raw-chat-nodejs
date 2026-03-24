export default function displayError(errorMessage, element) {
  element.textContent = errorMessage;
  element.classList.add("display");
  setTimeout(() => {
    element.classList.remove("display");
  }, 3000);
}
