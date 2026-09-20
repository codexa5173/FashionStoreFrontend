export function showAlert(message, title="Notice") {
  window.dispatchEvent(new CustomEvent("noorie:alert", { detail: { message: String(message || ""), title } }));
}
