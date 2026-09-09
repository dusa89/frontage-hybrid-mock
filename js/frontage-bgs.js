/* 21st seeds: sparkles, floating-paths, fluid-particles, sliding-ease. No gradient-wave.
   Same logo family, different mix per ground so sections do not share one wash. */
window.FrontageBgs = (function () {
  var PALETTE = {
    sparkHeader: ["#ede6d6", "#C8D0D8", "#86BFD8"],
    sparkClose: ["#ede6d6", "#B473C5", "#86BFD8"],
    paths: ["#3883A8", "#2E93C0", "#5AACD1", "#86BFD8"],
    dust: ["#B473C5", "#ff3b6a", "#bd9c51", "#5AACD1"],
    bars: ["#bd9c51", "#ede6d6", "#C8D0D8", "#3883A8"]
  };
  var sparkSeq = 0;
  var slimReady = null;

  function reduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* Pause heavy work while the host is off-screen.
     Geometry check runs immediately (IO alone can miss the first paint).
     A shared ticker covers scroll containers / programmatic scroll that skip events. */
  var viewWatchers = [];
  var viewTick = 0;
  function pumpViews() {
    for (var i = 0; i < viewWatchers.length; i++) viewWatchers[i]();
  }
  function ensureViewTick() {
    if (viewTick) return;
    viewTick = window.setInterval(pumpViews, 200);
  }
  function watchInView(el, onChange) {
    if (!el) return;
    var margin = 80;
    var last = null;
    function visible() {
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      return r.bottom >= -margin && r.top <= vh + margin && r.width > 0 && r.height > 0;
    }
    function emit() {
      var on = visible();
      if (on === last) return;
      last = on;
      onChange(on);
    }
    emit();
    viewWatchers.push(emit);
    ensureViewTick();
    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(
        function () {
          emit();
        },
        { root: null, rootMargin: margin + "px 0px", threshold: 0 }
      );
      io.observe(el);
    }
    document.addEventListener("scroll", emit, { passive: true, capture: true });
    window.addEventListener("resize", emit, { passive: true });
  }

  function readySlim() {
    if (slimReady) return slimReady;
    slimReady = (async function () {
      if (typeof tsParticles === "undefined") throw new Error("tsParticles missing");
      if (typeof loadSlim === "function") await loadSlim(tsParticles);
    })();
    return slimReady;
  }

  function sparkOptions(colors, dense) {
    return {
      background: { color: { value: "transparent" } },
      fullScreen: { enable: false, zIndex: 0 },
      fpsLimit: 120,
      detectRetina: true,
      interactivity: {
        events: {
          onClick: { enable: true, mode: "push" },
          onHover: { enable: false, mode: "repulse" },
          resize: { enable: true }
        },
        modes: {
          push: { quantity: 4 },
          repulse: { distance: 200, duration: 0.4 }
        }
      },
      particles: {
        number: dense
          ? { value: 1200, density: { enable: true, width: 400, height: 400, area: 160000 } }
          : { value: 160, density: { enable: false } },
        color: { value: (colors || PALETTE.sparkHeader).slice() },
        shape: { type: "circle" },
        opacity: {
          value: { min: 0.1, max: 1 },
          animation: {
            enable: true,
            speed: 4,
            decay: 0,
            delay: 0,
            sync: false,
            startValue: "random",
            destroy: "none"
          }
        },
        size: { value: { min: 0.4, max: 1 } },
        move: {
          enable: true,
          direction: "none",
          random: false,
          straight: false,
          speed: { min: 0.1, max: 1 },
          outModes: { default: "out" },
          attract: { enable: false, rotate: { x: 3000, y: 3000 } }
        }
      }
    };
  }

  function pathsHtml(position, colors) {
    var ink = colors || PALETTE.paths;
    var parts = [];
    for (var i = 0; i < 16; i++) {
      var a = 380 - i * 5 * position;
      var b = 189 + i * 6;
      var c = 312 - i * 5 * position;
      var d = 216 - i * 6;
      var e = 152 - i * 5 * position;
      var f = 343 - i * 6;
      var g = 616 - i * 5 * position;
      var h = 470 - i * 6;
      var j = 684 - i * 5 * position;
      var k = 875 - i * 6;
      var dPath =
        "M-" + a + " -" + b +
        "C-" + a + " -" + b +
        " -" + c + " " + d + " " + e + " " + f +
        "C" + g + " " + h + " " + j + " " + k + " " + j + " " + k;
      var col = ink[i % ink.length];
      parts.push(
        '<path d="' + dPath +
        '" stroke="' + col +
        '" fill="none" stroke-linecap="round" stroke-width="' +
        (2.2 + i * 0.16).toFixed(2) +
        '" stroke-opacity="' +
        (0.28 + i * 0.03).toFixed(3) +
        '" style="animation-duration:' +
        (18 + i * 0.7).toFixed(1) +
        's"/>'
      );
    }
    return (
      '<div class="gnd gnd-paths" aria-hidden="true">' +
      '<svg viewBox="0 0 696 316" preserveAspectRatio="xMidYMid slice">' +
      parts.join("") +
      "</svg></div>"
    );
  }

  function sparkUnder(el, variant) {
    if (!el || el.querySelector(".word-spark")) return;
    el.classList.add("has-spark");
    sparkSeq += 1;
    var id = "frontage-spark-" + sparkSeq;
    var key = variant === "close" ? "close" : "header";
    var wrap = document.createElement("span");
    wrap.className = "word-spark word-spark--" + key;
    wrap.setAttribute("aria-hidden", "true");
    var lines =
      key === "header"
        ? ""
        : '<span class="word-spark-line word-spark-line--wide"></span>' +
          '<span class="word-spark-line word-spark-line--wide-blur"></span>' +
          '<span class="word-spark-line word-spark-line--hot"></span>' +
          '<span class="word-spark-line word-spark-line--hot-blur"></span>';
    wrap.innerHTML =
      lines +
      '<div class="word-spark-core" id="' + id + '"></div>';
    el.appendChild(wrap);
    var sparkColors = key === "close" ? PALETTE.sparkClose : PALETTE.sparkHeader;
    readySlim()
      .then(function () {
        return tsParticles.load({ id: id, options: sparkOptions(sparkColors, key === "close") });
      })
      .then(function (container) {
        if (!container) return;
        try {
          container.pause();
        } catch (e) {}
        watchInView(wrap, function (on) {
          try {
            if (on) container.play();
            else container.pause();
          } catch (e2) {}
        });
      })
      .catch(function (err) {
        console.warn("sparkles", err);
      });
  }

  function hexRgb(hex) {
    var h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16)
    ];
  }

  function particles(host, count, colors) {
    if (!host || host.querySelector("canvas.frontage-dust")) return;
    var ink = colors || PALETTE.dust;
    var canvas = document.createElement("canvas");
    canvas.className = "frontage-dust";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var n = count || 1200;
    var pts = [];
    var t = 0;
    function resize() {
      var r = host.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      canvas.style.width = r.width + "px";
      canvas.style.height = r.height + "px";
    }
    resize();
    for (var i = 0; i < n; i++) {
      pts.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 0.5 + Math.random() * 1.5,
        life: Math.random() * 100,
        max: 100 + Math.random() * 50,
        rgb: hexRgb(ink[i % ink.length])
      });
    }
    function n3(x, y, z) {
      return Math.sin(x * 0.003 + z) * Math.cos(y * 0.003 + z * 0.7) +
        Math.sin(x * 0.0011 - z * 0.4) * Math.cos(y * 0.002 + z);
    }
    var inView = true;
    var raf = 0;
    function frame() {
      raf = 0;
      if (!inView || reduced()) return;
      var w = canvas.width;
      var h = canvas.height;
      ctx.fillStyle = "rgba(10,10,12,0.08)";
      ctx.fillRect(0, 0, w, h);
      t += 0.0001;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.life += 1;
        if (p.life > p.max) {
          p.life = 0;
          p.x = Math.random() * w;
          p.y = Math.random() * h;
        }
        var ang = n3(p.x, p.y, Date.now() * t) * Math.PI * 4;
        p.x += Math.cos(ang) * 2;
        p.y += Math.sin(ang) * 2;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        var op = Math.sin((p.life / p.max) * Math.PI) * 0.42;
        ctx.fillStyle = "rgba(" + p.rgb[0] + "," + p.rgb[1] + "," + p.rgb[2] + "," + op.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    watchInView(host, function (on) {
      inView = on;
      if (inView && raf === 0) raf = requestAnimationFrame(frame);
    });
    window.addEventListener("resize", resize, { passive: true });
  }

  function bars(host, colors) {
    if (!host || host.querySelector("canvas.frontage-bars")) return;
    var ink = colors || PALETTE.bars;
    var canvas = document.createElement("canvas");
    canvas.className = "frontage-bars";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var time = 0;
    var rgbs = ink.map(hexRgb);
    function resize() {
      var r = host.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width));
      canvas.height = Math.max(1, Math.round(r.height));
    }
    resize();
    function noise(x, y, seed) {
      return (Math.sin(x * 0.02 + seed) * Math.cos(y * 0.02 + seed) +
        Math.sin(x * 0.03 - seed) * Math.cos(y * 0.01 + seed) + 2) / 4;
    }
    var inView = true;
    var raf = 0;
    function frame() {
      raf = 0;
      if (!inView || reduced()) return;
      var w = canvas.width;
      var h = canvas.height;
      ctx.fillStyle = "#0a0a0c";
      ctx.fillRect(0, 0, w, h);
      time += 0.005;
      var n = Math.max(20, Math.floor(w / 15));
      var gap = w / n;
      var cycle = time % (Math.PI * 2);
      var ease = 0;
      if (cycle > Math.PI * 0.1 && cycle < Math.PI * 0.9) {
        ease = (cycle - Math.PI * 0.1) / (Math.PI * 0.8);
      } else if (cycle >= Math.PI * 0.9 && cycle < Math.PI * 1.1) {
        ease = 1;
      } else if (cycle >= Math.PI * 1.1 && cycle < Math.PI * 1.9) {
        ease = 1 - (cycle - Math.PI * 1.1) / (Math.PI * 0.8);
      }
      var smooth = ease < 0.5 ? 4 * ease * ease * ease : 1 - Math.pow(-2 * ease + 2, 3) / 2;
      for (var i = 0; i < n; i++) {
        var x = i * gap + gap / 2;
        var line = rgbs[i % rgbs.length];
        ctx.strokeStyle = "rgba(" + line[0] + "," + line[1] + "," + line[2] + ",0.10)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
        var y = 0;
        var j = 0;
        while (y < h) {
          var nv = noise(x, y, 0);
          var nv2 = noise(x, y, 5);
          if (nv > 0.5 || nv2 > 0.5) {
            var h1 = 10 + nv * 30;
            var h2 = 10 + nv2 * 30;
            var bh = h1 + (h2 - h1) * smooth;
            var bw = 2 + nv * 3;
            var wave = Math.sin(i * 0.3 + j * 0.5 + time * 2) * 10 * (smooth * (1 - smooth) * 4);
            var rgb = rgbs[(i + j) % rgbs.length];
            ctx.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.22)";
            ctx.fillRect(x - bw / 2, y + wave, bw, bh);
            y += bh + 15;
            j += 1;
          } else {
            y += 15;
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }
    watchInView(host, function (on) {
      inView = on;
      if (inView && raf === 0) raf = requestAnimationFrame(frame);
    });
    window.addEventListener("resize", resize, { passive: true });
  }

  /* CSS path / silk motion: toggle play-state via class on the section. */
  function pauseCssWhenOffscreen(hosts) {
    var list = Array.prototype.slice.call(hosts || []);
    list.forEach(function (el) {
      if (!el) return;
      watchInView(el, function (on) {
        el.classList.toggle("gnd-paused", !on);
      });
    });
  }

  return {
    pathsHtml: pathsHtml,
    sparkUnder: sparkUnder,
    particles: particles,
    bars: bars,
    pauseCssWhenOffscreen: pauseCssWhenOffscreen
  };
})();
