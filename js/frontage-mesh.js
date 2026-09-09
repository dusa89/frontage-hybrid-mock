/* kk / Mesh drift seed (21st @lbertoni115/kk). Frontage palette. No cursor warp. */
window.FrontageMesh = (function () {
  var VERT = "attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}";
  var FRAG = [
    "precision mediump float;",
    "uniform vec3 u_colors[4];",
    "uniform vec4 u_scene;",
    "uniform vec4 u_shape;",
    "uniform vec4 u_finish;",
    "#define u_resolution u_scene.xy",
    "#define u_time u_scene.z",
    "#define u_scale u_shape.x",
    "#define u_intensity u_shape.y",
    "#define u_warp u_shape.z",
    "#define u_detail u_shape.w",
    "#define u_vignette u_finish.x",
    "#define u_grain u_finish.y",
    "float hash21(vec2 p){p=fract(p*vec2(234.34,435.345));p+=dot(p,p+34.23);return fract(p.x*p.y);}",
    "float grainHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}",
    "float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1.0,0.0)),u.x),mix(hash21(i+vec2(0.0,1.0)),hash21(i+vec2(1.0,1.0)),u.x),u.y);}",
    "float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(17.0,9.2);a*=0.5;}return v;}",
    "vec3 shade(vec2 p,float t){vec3 acc=u_colors[0]*0.18;float total=0.18;for(int i=0;i<4;i++){float fi=float(i);vec2 c=vec2(sin(t*(0.21+fi*0.071)+fi*2.4),cos(t*(0.17+fi*0.093)+fi*1.7))*(0.42+u_intensity*0.32);float w=exp(-dot(p-c,p-c)*6.0);acc+=u_colors[i]*w;total+=w;}return acc/total;}",
    "void main(){vec2 uv=gl_FragCoord.xy/u_resolution.xy;vec2 p=(gl_FragCoord.xy-0.5*u_resolution.xy)/min(u_resolution.x,u_resolution.y);p*=u_scale;p+=0.12*vec2(sin(u_time*0.31),cos(u_time*0.23));if(u_warp>0.0){p+=u_warp*(vec2(fbm(p*u_detail),fbm(p*u_detail+vec2(5.2,1.3)))-0.5);}vec3 col=shade(p,u_time);float vd=length(uv-0.5)*1.414;col*=1.0-u_vignette*smoothstep(0.35,1.0,vd);col+=(grainHash(gl_FragCoord.xy)-0.5)*u_grain;gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);}"
  ].join("\n");

  /* Price mesh: asphalt + cyan + kicker + logo lime. Only ground that carries lime. */
  var COLORS = new Float32Array([
    0.039, 0.039, 0.047,
    0.353, 0.675, 0.820,
    0.706, 0.451, 0.773,
    0.773, 0.910, 0.416
  ]);

  function mount(host) {
    if (!host || host.querySelector("canvas.frontage-mesh")) return;
    var canvas = document.createElement("canvas");
    canvas.className = "frontage-mesh";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    var gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    var program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    gl.useProgram(program);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(gl.getUniformLocation(program, "u_colors"), COLORS);
    var uScene = gl.getUniformLocation(program, "u_scene");
    gl.uniform4f(gl.getUniformLocation(program, "u_shape"), 1.15, 0.58, 0.16, 1.8);
    gl.uniform4f(gl.getUniformLocation(program, "u_finish"), 0.28, 0.08, 0, 0);
    var start = performance.now();
    var raf = 0;
    var inView = false;
    var margin = 80;
    function resize() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = Math.max(1, Math.round(r.width * dpr));
      var h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    function frame(now) {
      raf = 0;
      if (!inView) return;
      resize();
      gl.uniform4f(uScene, canvas.width, canvas.height, (now - start) / 1000 * 0.35, 4);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }
    function setInView(on) {
      inView = !!on;
      if (inView && raf === 0) raf = requestAnimationFrame(frame);
    }
    function visible() {
      var r = host.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      return r.bottom >= -margin && r.top <= vh + margin && r.width > 0 && r.height > 0;
    }
    function emit() {
      setInView(visible());
    }
    emit();
    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(function () {
        emit();
      }, { root: null, rootMargin: margin + "px 0px", threshold: 0 });
      io.observe(host);
    }
    document.addEventListener("scroll", emit, { passive: true, capture: true });
    window.addEventListener("resize", emit, { passive: true });
    window.setInterval(emit, 200);
  }

  return { mount: mount };
})();
