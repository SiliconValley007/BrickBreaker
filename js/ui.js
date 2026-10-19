export function $(id) {
  return document.getElementById(id);
}
export function setPanel(panels, overlay, name) {
  var k;
  for (k in panels) {
    if (panels[k]) panels[k].classList.toggle("show", k === name);
  }
  if (overlay) overlay.classList.toggle("hidden", !name);
}
export function syncSwitch(btn, on) {
  if (!btn) return;
  btn.classList.toggle("on", on);
  btn.textContent = on ? "On" : "Off";
  btn.setAttribute("aria-pressed", on ? "true" : "false");
}
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}
export function trapFocus(root) {
  if (!root) return;
  var list = root.querySelectorAll(
    "button, input, [tabindex]:not([tabindex='-1'])",
  );
  if (!list.length) return;
  var first = list[0],
    last = list[list.length - 1];
  if (document.activeElement && root.contains(document.activeElement)) return;
  try {
    first.focus();
  } catch (e) {}
  root.onkeydown = function (e) {
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
}
