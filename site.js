const SITE_STATUS = "Sitio en Construcción";
const SITE_VERSION = "V. 0.2.4";

document.querySelectorAll(".site-status").forEach(el => {
  el.textContent = SITE_STATUS;
});

document.querySelectorAll(".site-version").forEach(el => {
  el.textContent = SITE_VERSION;
});