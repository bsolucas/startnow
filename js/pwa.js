/* pwa.js — registra o service worker (deixa o app abrir sem internet e instalar no celular). */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("service-worker.js").catch(function () { /* sem service worker: o app funciona igual */ });
  });
}
