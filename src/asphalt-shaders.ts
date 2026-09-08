// ShaderMaterial (not Raw): Three rewrites these for WebGL1/WebGL2.
export const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uLightMap;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uRoadOffset;
  uniform float uPointerStrength;
  uniform float uReflectionStrength;
  uniform float uQuality;
  uniform float uDebug;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.52;
    mat2 turn = mat2(0.82, -0.57, 0.57, 0.82);
    for (int i = 0; i < 3; i++) {
      value += amplitude * noise(p);
      p = turn * p * 2.03 + 13.7;
      amplitude *= 0.48;
    }
    return value;
  }

  vec3 sampleReflection(vec2 uv, vec2 distortion) {
    vec2 texel = 1.0 / max(uResolution, vec2(1.0));
    vec2 tap = vec2(texel.x * 2.0, texel.y * 5.5);
    vec2 p = clamp(uv + distortion, 0.002, 0.998);

    vec4 center = texture2D(uLightMap, p);
    vec4 blurred = center * 0.30;
    blurred += texture2D(uLightMap, p + tap * vec2(0.35, 0.75)) * 0.19;
    blurred += texture2D(uLightMap, p - tap * vec2(0.35, 0.75)) * 0.19;
    blurred += texture2D(uLightMap, p + tap * vec2(0.95, 1.75)) * 0.10;
    blurred += texture2D(uLightMap, p - tap * vec2(0.95, 1.75)) * 0.10;
    if (uQuality > 0.5) {
      blurred += texture2D(uLightMap, p + tap * vec2(-1.6, 3.0)) * 0.06;
      blurred += texture2D(uLightMap, p - tap * vec2(-1.6, 3.0)) * 0.06;
    } else {
      blurred += center * 0.12;
    }

    float split = texel.x * 1.15;
    float red = texture2D(uLightMap, p + vec2(split, 0.0)).r;
    float blue = texture2D(uLightMap, p - vec2(split, 0.0)).b;
    vec3 chroma = vec3(red, blurred.g, blue);
    float presence = max(blurred.a, center.a);
    return mix(blurred.rgb, chroma, 0.14) * (0.55 + presence * 0.9);
  }

  void main() {
    vec2 uv = vUv;
    if (uDebug > 0.5) {
      gl_FragColor = texture2D(uLightMap, uv);
      return;
    }

    float aspect = uResolution.x / max(uResolution.y, 1.0);

    // Nearly top-down road: grain opens slightly toward the viewer.
    float perspective = mix(0.84, 1.16, uv.y);
    vec2 roadUv = vec2((uv.x - 0.5) * aspect * perspective, uv.y * 1.85);
    roadUv.y += uRoadOffset;

    float broad = fbm(roadUv * 1.34 + vec2(3.1, 7.4));
    float broken = fbm(roadUv * 3.15 - vec2(9.4, 2.7));
    float puddleField = broad * 0.74 + broken * 0.26;
    float puddles = smoothstep(0.42, 0.64, puddleField);
    puddles *= 0.78 + 0.22 * smoothstep(0.35, 0.7, broken);

    float eps = 0.0035;
    float surface = noise(roadUv * 18.0) * 0.65 + noise(roadUv * 52.0) * 0.35;
    float surfaceX =
      noise((roadUv + vec2(eps, 0.0)) * 18.0) * 0.65 +
      noise((roadUv + vec2(eps, 0.0)) * 52.0) * 0.35;
    float surfaceY =
      noise((roadUv + vec2(0.0, eps)) * 18.0) * 0.65 +
      noise((roadUv + vec2(0.0, eps)) * 52.0) * 0.35;
    vec2 normal = vec2(surfaceX - surface, surfaceY - surface);

    float grit = noise(roadUv * 120.0);
    float pebble = smoothstep(0.82, 0.97, grit) * (1.0 - puddles);
    float damp = noise(roadUv * 7.2 + 11.0);

    // Night asphalt — dark cinema grade, bright enough to read as wet road.
    vec3 asphalt = vec3(0.10, 0.112, 0.128);
    asphalt += vec3(0.085, 0.092, 0.104) * surface;
    asphalt += vec3(0.045, 0.052, 0.062) * damp;
    asphalt += pebble * vec3(0.16, 0.165, 0.175);
    asphalt = mix(asphalt, asphalt * vec3(0.42, 0.55, 0.68), puddles * 0.78);

    float puddleEdge = smoothstep(0.08, 0.01, abs(puddleField - 0.55));
    asphalt += puddleEdge * vec3(0.05, 0.06, 0.07);

    float cyanPool = exp(-pow((uv.x - 0.22) * 3.2, 2.0)) * (0.35 + 0.65 * broken);
    float amberPool = exp(-pow((uv.x - 0.8) * 3.8, 2.0)) * (0.3 + 0.7 * broad);
    asphalt += puddles * cyanPool * vec3(0.045, 0.11, 0.16);
    asphalt += puddles * amberPool * vec3(0.11, 0.055, 0.022);

    vec2 pointerUv = vec2(uPointer.x, 1.0 - uPointer.y);
    vec2 pointerDelta = (uv - pointerUv) * vec2(aspect, 1.0);
    float pointerDistance = length(pointerDelta);
    float ripple = sin(pointerDistance * 118.0 - uTime * 7.0);
    ripple *= exp(-pointerDistance * 14.0) * uPointerStrength;
    vec2 rippleNormal = normalize(pointerDelta + vec2(0.0001)) * ripple * 0.0028;

    vec2 distortion = normal * mix(0.022, 0.008, puddles) + rippleNormal;
    vec3 reflection = sampleReflection(uv, distortion);
    float grazing = smoothstep(0.0, 0.82, 1.0 - abs(uv.y - 0.54));
    float reflectionMask = puddles * (0.88 + grazing * 0.35);
    reflectionMask += (1.0 - puddles) * 0.12;
    asphalt += reflection * reflectionMask * uReflectionStrength;

    float glint = pow(max(0.0, 1.0 - abs(normal.x * 28.0 + normal.y * 16.0)), 18.0);
    asphalt += glint * puddles * vec3(0.07, 0.08, 0.09);
    float wetStreak = pow(noise(vec2(roadUv.x * 36.0, roadUv.y * 7.0)), 12.0);
    asphalt += wetStreak * puddles * vec3(0.055, 0.06, 0.065);

    float vignette = smoothstep(1.05, 0.22, length((uv - 0.5) * vec2(0.78, 1.0)));
    asphalt *= mix(0.88, 1.0, vignette);

    gl_FragColor = vec4(asphalt, 1.0);
  }
`;
