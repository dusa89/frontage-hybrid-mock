(function () {
  if (/(?:^|[?&])plain=1(?:&|$)/.test(location.search)) return;
  document.documentElement.setAttribute("data-grounds", "b");

  function add(sel, html) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.querySelector(":scope > .gnd")) return;
      el.insertAdjacentHTML("afterbegin", html);
    });
  }

  function wrapMarkWord() {
    var mark = document.querySelector("header .mark");
    if (!mark || mark.querySelector(".mark-word")) return null;
    var word = document.createElement("span");
    word.className = "mark-word";
    var found = null;
    mark.childNodes.forEach(function (n) {
      if (n.nodeType === 3 && n.textContent.trim()) found = n;
    });
    if (!found) return null;
    word.textContent = found.textContent.trim();
    mark.replaceChild(word, found);
    return word;
  }

  function go() {
    var B = window.FrontageBgs;
    if (!B) return;

    add(".moved", B.pathsHtml(-1));
    add(".price-full", '<div class="gnd gnd-mesh" aria-hidden="true"></div>');
    add(
      ".calls",
      '<div class="gnd gnd-silk" aria-hidden="true">' +
        '<div class="gnd-blob a"></div>' +
        '<div class="gnd-blob b"></div>' +
      "</div>"
    );
    add(".ninety", '<div class="gnd gnd-bars" aria-hidden="true"></div>');

    var word = wrapMarkWord();
    if (word) B.sparkUnder(word, "header");
    var closeH2 = document.querySelector("section.close h2");
    if (closeH2) B.sparkUnder(closeH2, "close");

    var barHost = document.querySelector(".ninety .gnd-bars");
    if (barHost) B.bars(barHost);

    if (window.FrontageMesh) {
      var meshHost = document.querySelector(".price-full .gnd-mesh");
      if (meshHost) window.FrontageMesh.mount(meshHost);
    }

    /* CSS path + silk: freeze while the section is off-screen. */
    if (B.pauseCssWhenOffscreen) {
      B.pauseCssWhenOffscreen(document.querySelectorAll(".moved, .calls"));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", go);
  } else {
    go();
  }
})();
