'use strict';
/* ============================================================
   FLEX RUSH  -  gl.js
   Küçük bir WebGL motoru: matris, mesh, gölgelendirici,
   deniz, gökyüzü, parçacık ve yazı dokuları
   ============================================================ */

const M4 = {
  ident(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  mul(o, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    o[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30; o[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    o[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32; o[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    o[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30; o[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    o[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32; o[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    o[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30; o[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    o[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32; o[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    o[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30; o[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    o[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32; o[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return o;
  },
  persp(o, fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f);
    o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) * nf; o[11] = -1; o[14] = 2 * f * n * nf; return o;
  },
  look(o, ex, ey, ez, cx, cy, cz) {
    let zx = ex - cx, zy = ey - cy, zz = ez - cz;
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = zz, xy = 0, xz = -zx;             // up(0,1,0) x z
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * ex + xy * ey + xz * ez); o[13] = -(yx * ex + yy * ey + yz * ez); o[14] = -(zx * ex + zy * ey + zz * ez); o[15] = 1;
    return o;
  },
  T(o, x, y, z) {
    o[12] += o[0] * x + o[4] * y + o[8] * z; o[13] += o[1] * x + o[5] * y + o[9] * z;
    o[14] += o[2] * x + o[6] * y + o[10] * z; o[15] += o[3] * x + o[7] * y + o[11] * z;
  },
  S(o, x, y, z) {
    o[0] *= x; o[1] *= x; o[2] *= x; o[3] *= x; o[4] *= y; o[5] *= y; o[6] *= y; o[7] *= y;
    o[8] *= z; o[9] *= z; o[10] *= z; o[11] *= z;
  },
  RX(o, r) {
    const c = Math.cos(r), s = Math.sin(r);
    const a10 = o[4], a11 = o[5], a12 = o[6], a13 = o[7], a20 = o[8], a21 = o[9], a22 = o[10], a23 = o[11];
    o[4] = a10 * c + a20 * s; o[5] = a11 * c + a21 * s; o[6] = a12 * c + a22 * s; o[7] = a13 * c + a23 * s;
    o[8] = a20 * c - a10 * s; o[9] = a21 * c - a11 * s; o[10] = a22 * c - a12 * s; o[11] = a23 * c - a13 * s;
  },
  RY(o, r) {
    const c = Math.cos(r), s = Math.sin(r);
    const a00 = o[0], a01 = o[1], a02 = o[2], a03 = o[3], a20 = o[8], a21 = o[9], a22 = o[10], a23 = o[11];
    o[0] = a00 * c - a20 * s; o[1] = a01 * c - a21 * s; o[2] = a02 * c - a22 * s; o[3] = a03 * c - a23 * s;
    o[8] = a00 * s + a20 * c; o[9] = a01 * s + a21 * c; o[10] = a02 * s + a22 * c; o[11] = a03 * s + a23 * c;
  },
  RZ(o, r) {
    const c = Math.cos(r), s = Math.sin(r);
    const a00 = o[0], a01 = o[1], a02 = o[2], a03 = o[3], a10 = o[4], a11 = o[5], a12 = o[6], a13 = o[7];
    o[0] = a00 * c + a10 * s; o[1] = a01 * c + a11 * s; o[2] = a02 * c + a12 * s; o[3] = a03 * c + a13 * s;
    o[4] = a10 * c - a00 * s; o[5] = a11 * c - a01 * s; o[6] = a12 * c - a02 * s; o[7] = a13 * c - a03 * s;
  },
  /* modelin sol-üst 3x3 kısmının ters devriği (normal matrisi) */
  normal(o, m) {
    const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
    const c00 = e * i - f * h, c01 = -(d * i - f * g), c02 = d * h - e * g;
    const c10 = -(b * i - c * h), c11 = a * i - c * g, c12 = -(a * h - b * g);
    const c20 = b * f - c * e, c21 = -(a * f - c * d), c22 = a * e - b * d;
    let det = a * c00 + b * c01 + c * c02; if (Math.abs(det) < 1e-9) det = 1e-9;
    const r = 1 / det;
    o[0] = c00 * r; o[3] = c01 * r; o[6] = c02 * r;
    o[1] = c10 * r; o[4] = c11 * r; o[7] = c12 * r;
    o[2] = c20 * r; o[5] = c21 * r; o[8] = c22 * r;
  }
};

const FSP = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';

const SH = {
  meshVS: `
attribute vec3 aPos; attribute vec3 aNrm;
uniform mat4 uMVP; uniform mat4 uModel; uniform mat3 uNrm;
varying vec3 vN; varying vec3 vW;
void main(){ vec4 wp = uModel*vec4(aPos,1.0); vW = wp.xyz; vN = uNrm*aNrm; gl_Position = uMVP*vec4(aPos,1.0); }`,
  meshFS: FSP + `
uniform vec3 uColor; uniform float uAlpha; uniform float uGloss; uniform float uEmit;
uniform vec3 uLight; uniform vec3 uCam; uniform vec3 uFog; uniform vec2 uFogRange;
uniform vec3 uSky; uniform vec3 uGround; uniform vec3 uSunC;
varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN); vec3 v = normalize(uCam - vW);
  float wrap = clamp(dot(n,uLight)*0.5+0.5, 0.0, 1.0);
  float dif = wrap*wrap;
  vec3 amb = mix(uGround, uSky, 0.5+0.5*n.y);
  vec3 col = uColor*(amb*0.60 + uSunC*dif*0.72);
  vec3 h = normalize(uLight+v);
  float sp = pow(max(dot(n,h),0.0), 54.0)*uGloss;
  float fr = pow(1.0-max(dot(n,v),0.0), 3.0);
  col += uSunC*sp*0.9 + mix(uColor, uSky, 0.5)*fr*(0.10+0.28*uGloss);
  col += uColor*uEmit;
  float dist = length(uCam - vW);
  float f = clamp((dist-uFogRange.x)/(uFogRange.y-uFogRange.x), 0.0, 1.0);
  col = mix(col, uFog, f*f);
  gl_FragColor = vec4(col*uAlpha, uAlpha);
}`,
  texVS: `
attribute vec3 aPos; attribute vec2 aUV; uniform mat4 uMVP; varying vec2 vUV;
void main(){ vUV = aUV; gl_Position = uMVP*vec4(aPos,1.0); }`,
  texFS: FSP + `
uniform sampler2D uTex; uniform vec4 uTint; uniform float uMask; varying vec2 vUV;
void main(){
  vec4 c = texture2D(uTex, vUV);
  if (uMask > 0.5) gl_FragColor = vec4(uTint.rgb*c.a, c.a)*uTint.a;
  else gl_FragColor = c*uTint.a;
}`,
  skyVS: `
attribute vec2 aP; varying vec2 vUV;
void main(){ vUV = aP*0.5+0.5; gl_Position = vec4(aP, 0.9999, 1.0); }`,
  skyFS: FSP + `
varying vec2 vUV; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uSunC;
uniform float uH; uniform vec2 uSun; uniform float uAsp; uniform float uTime;
void main(){
  float t = clamp((vUV.y-uH)/(1.0-uH), 0.0, 1.0);
  vec3 col = mix(uMid, uTop, pow(t, 0.65));
  vec2 d = (vUV-uSun)*vec2(uAsp,1.0);
  float r = length(d);
  col += uSunC*(exp(-r*4.2)*0.50 + exp(-r*14.0)*0.5);
  col = mix(col, uSunC*1.15, smoothstep(0.072,0.060,r));
  gl_FragColor = vec4(col, 1.0);
}`,
  oceanVS: `
attribute vec2 aP; uniform vec3 uC; uniform float uSize; uniform mat4 uVP; varying vec3 vW;
void main(){ vec3 w = vec3(uC.x + aP.x*uSize, uC.y, uC.z + aP.y*uSize); vW = w; gl_Position = uVP*vec4(w,1.0); }`,
  oceanFS: FSP + `
varying vec3 vW; uniform vec3 uCam; uniform float uTime; uniform vec3 uSunDir; uniform vec3 uSunC;
uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uTop; uniform vec3 uMid; uniform vec2 uFogRange;
void main(){
  vec2 p = vW.xz; float t = uTime;
  float a1 = p.x*0.42 + t*1.15, a2 = p.y*0.33 - t*0.85, a3 = (p.x*0.7 + p.y*0.55) + t*1.55, a4 = p.x*1.3 - p.y*1.1 + t*2.1;
  float h = sin(a1) + sin(a2) + 0.6*sin(a3) + 0.25*sin(a4);
  float dx = 0.42*cos(a1) + 0.6*0.7*cos(a3) + 0.25*1.3*cos(a4);
  float dz = 0.33*cos(a2) + 0.6*0.55*cos(a3) - 0.25*1.1*cos(a4);
  vec3 N = normalize(vec3(-dx*0.085, 1.0, -dz*0.085));
  vec3 V = normalize(uCam - vW);
  float dist = length(uCam - vW);
  float fr = pow(1.0 - max(dot(N,V),0.0), 3.0);
  vec3 R = reflect(-V, N);
  vec3 skyR = mix(uMid, uTop, clamp(R.y*1.6, 0.0, 1.0));
  vec3 base = mix(uDeep, uShallow, clamp(0.5 + h*0.12, 0.0, 1.0));
  base = mix(base, uDeep, smoothstep(30.0, 140.0, dist)*0.5);
  vec3 col = mix(base, skyR, clamp(fr*0.8 + 0.08, 0.0, 1.0));
  float sp = pow(max(dot(R, uSunDir), 0.0), 140.0);
  float sp2 = pow(max(dot(R, uSunDir), 0.0), 22.0);
  col += uSunC*(sp*2.6 + sp2*0.35);
  float sparkle = smoothstep(0.93, 1.0, sin(p.x*3.1 + t*2.3)*sin(p.y*2.7 - t*1.9));
  col += vec3(1.0)*sparkle*0.18*(1.0 - smoothstep(10.0, 70.0, dist));
  float foam = smoothstep(2.05, 2.5, h + 0.35*sin(a4*1.7));
  col = mix(col, vec3(1.0), foam*0.16*(1.0 - smoothstep(20.0, 90.0, dist)));
  float f = clamp((dist-uFogRange.x)/(uFogRange.y-uFogRange.x), 0.0, 1.0);
  col = mix(col, uMid, f*f);
  gl_FragColor = vec4(col, 1.0);
}`,
  floorVS: `
attribute vec2 aP; uniform vec4 uRect; uniform mat4 uVP; varying vec3 vW;
void main(){ vec3 w = vec3(mix(uRect.x,uRect.y,aP.x+0.5), 0.004, mix(uRect.z,uRect.w,aP.y+0.5)); vW = w; gl_Position = uVP*vec4(w,1.0); }`,
  floorFS: FSP + `
varying vec3 vW; uniform vec3 uCam; uniform vec3 uFog; uniform vec2 uFogRange; uniform vec3 uSky; uniform vec3 uSunC;
uniform vec3 uSunDir; uniform vec3 uAccent; uniform float uTime;
void main(){
  float x = vW.x, z = vW.z;
  vec3 col = vec3(0.975,0.985,1.0);
  float seg = mod(floor(z/6.0), 2.0);
  col *= 1.0 - 0.045*seg;
  float tile = abs(fract(z/6.0)-0.5)*2.0;
  col *= 1.0 - 0.07*smoothstep(0.96, 1.0, tile);
  float lane = smoothstep(0.045, 0.0, abs(x)-0.015) * step(0.5, fract(z/2.4));
  col = mix(col, vec3(0.78,0.88,1.0), lane*0.55);
  float edge = smoothstep(2.62, 2.7, abs(x));
  float blk = step(0.5, fract(z/2.0));
  vec3 curb = mix(uAccent, vec3(0.07,0.10,0.30), blk);
  col = mix(col, curb, edge);
  col = mix(col, vec3(1.0), smoothstep(2.58, 2.62, abs(x))*(1.0-edge)*0.9);
  vec3 V = normalize(uCam - vW);
  vec3 R = reflect(-V, vec3(0.0,1.0,0.0));
  float sh = pow(max(dot(R,uSunDir),0.0), 14.0);
  col = col*(0.86 + uSky*0.14) + uSunC*sh*0.22;
  float dist = length(uCam - vW);
  float f = clamp((dist-uFogRange.x)/(uFogRange.y-uFogRange.x), 0.0, 1.0);
  col = mix(col, uFog, f*f);
  gl_FragColor = vec4(col, 1.0);
}`,
  ptVS: `
attribute vec3 aPos; attribute vec4 aCol; attribute float aSize;
uniform mat4 uVP; uniform float uScale; varying vec4 vCol; varying float vSq;
void main(){
  vec4 p = uVP*vec4(aPos,1.0); gl_Position = p; vCol = aCol; vSq = aSize < 0.0 ? 1.0 : 0.0;
  gl_PointSize = clamp(abs(aSize)*uScale/max(p.w,0.1), 1.0, 64.0);
}`,
  ptFS: FSP + `
varying vec4 vCol; varying float vSq;
void main(){
  vec2 q = gl_PointCoord-0.5; float d = length(q)*2.0;
  float a = vSq > 0.5 ? 1.0 : 1.0 - smoothstep(0.55, 1.0, d);
  if (a <= 0.01) discard;
  gl_FragColor = vec4(vCol.rgb*vCol.a*a, vCol.a*a);
}`
};

const GLX = (() => {
  let canvas, gl;
  let W = 1, H = 1, scaleQ = 1;
  const view = new Float32Array(16), proj = new Float32Array(16), vp = new Float32Array(16);
  const stack = []; for (let i = 0; i < 16; i++) stack.push(new Float32Array(16));
  let sp = 0;
  const mvp = new Float32Array(16), nrm = new Float32Array(9);
  const cam = { x: 0, y: 5, z: 9, tx: 0, ty: 0, tz: -5, fov: 60 };
  const env = {
    top: [0.2, 0.5, 0.95], mid: [0.7, 0.9, 1], sunC: [1, 0.95, 0.8], sunDir: [0.3, 0.4, -0.86],
    deep: [0.02, 0.3, 0.6], shallow: [0.1, 0.75, 0.85], sky: [0.85, 0.93, 1], ground: [0.55, 0.65, 0.75],
    light: [-0.4, 0.8, 0.45], accent: [0.78, 1, 0.24], fogNear: 55, fogFar: 150, waterY: -7
  };
  let P = {}, curProg = null, lastMesh = null;
  let meshes = {}, quad = null, skyBuf = null;
  let time = 0;
  const labelCache = new Map();
  let ptBuf = null, ptData = null, ptN = 0;
  const PT_MAX = 700;

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs, attrs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    attrs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const inf = gl.getActiveUniform(p, i); u[inf.name.replace('[0]', '')] = gl.getUniformLocation(p, inf.name); }
    return { p, u, n: attrs.length };
  }
  function use(pr) {
    if (curProg === pr) return;
    curProg = pr; gl.useProgram(pr.p);
    for (let i = 0; i < 4; i++) { if (i < pr.n) gl.enableVertexAttribArray(i); else gl.disableVertexAttribArray(i); }
    lastMesh = null;
  }

  /* ---------- mesh üretimi ---------- */
  function buf(arr) {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
    return { vbo: b, n: arr.length / 6 };
  }
  function pushV(a, p, n) { a.push(p[0], p[1], p[2], n[0], n[1], n[2]); }
  function sphere(st, sl) {
    const a = [];
    const P3 = (la, lo) => { const cy = Math.cos(la); return [cy * Math.cos(lo), Math.sin(la), cy * Math.sin(lo)]; };
    for (let i = 0; i < st; i++) {
      const la0 = Math.PI * i / st - Math.PI / 2, la1 = Math.PI * (i + 1) / st - Math.PI / 2;
      for (let j = 0; j < sl; j++) {
        const lo0 = TAU * j / sl, lo1 = TAU * (j + 1) / sl;
        const p00 = P3(la0, lo0), p01 = P3(la0, lo1), p10 = P3(la1, lo0), p11 = P3(la1, lo1);
        pushV(a, p00, p00); pushV(a, p10, p10); pushV(a, p11, p11);
        pushV(a, p00, p00); pushV(a, p11, p11); pushV(a, p01, p01);
      }
    }
    return buf(a);
  }
  function cube() {
    const a = [];
    const faces = [[1, 0, 0, 0, 1, 0, 0, 0, 1], [-1, 0, 0, 0, 1, 0, 0, 0, -1], [0, 1, 0, 1, 0, 0, 0, 0, -1], [0, -1, 0, 1, 0, 0, 0, 0, 1], [0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, -1, -1, 0, 0, 0, 1, 0]];
    const ca = [-1, 1, 1, -1], cb = [-1, -1, 1, 1], ord = [0, 1, 2, 0, 2, 3];
    for (const f of faces) {
      const n = [f[0], f[1], f[2]];
      for (const k of ord) {
        const u = ca[k], v = cb[k];
        pushV(a, [f[0] * 0.5 + f[3] * 0.5 * u + f[6] * 0.5 * v, f[1] * 0.5 + f[4] * 0.5 * u + f[7] * 0.5 * v, f[2] * 0.5 + f[5] * 0.5 * u + f[8] * 0.5 * v], n);
      }
    }
    return buf(a);
  }
  function cylinder(seg, rTop) {      // yarıçap 1 (alt), yükseklik 1, y ekseninde ortalı
    const a = [], ny = 1 - rTop;
    for (let i = 0; i < seg; i++) {
      const a0 = TAU * i / seg, a1 = TAU * (i + 1) / seg;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      let n0 = [c0, ny, s0], n1 = [c1, ny, s1];
      let l = Math.hypot(n0[0], n0[1], n0[2]); n0 = [n0[0] / l, n0[1] / l, n0[2] / l];
      l = Math.hypot(n1[0], n1[1], n1[2]); n1 = [n1[0] / l, n1[1] / l, n1[2] / l];
      pushV(a, [c0, -0.5, s0], n0); pushV(a, [c1, -0.5, s1], n1); pushV(a, [c1 * rTop, 0.5, s1 * rTop], n1);
      pushV(a, [c0, -0.5, s0], n0); pushV(a, [c1 * rTop, 0.5, s1 * rTop], n1); pushV(a, [c0 * rTop, 0.5, s0 * rTop], n0);
      if (rTop > 0) { const up = [0, 1, 0]; pushV(a, [0, 0.5, 0], up); pushV(a, [c0 * rTop, 0.5, s0 * rTop], up); pushV(a, [c1 * rTop, 0.5, s1 * rTop], up); }
      const dn = [0, -1, 0]; pushV(a, [0, -0.5, 0], dn); pushV(a, [c1, -0.5, s1], dn); pushV(a, [c0, -0.5, s0], dn);
    }
    return buf(a);
  }
  function torus(sa, sb, r) {
    const a = [];
    const Pt = (u, v) => {
      const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
      return [[(1 + r * cv) * cu, r * sv, (1 + r * cv) * su], [cv * cu, sv, cv * su]];
    };
    for (let i = 0; i < sa; i++) for (let j = 0; j < sb; j++) {
      const u0 = TAU * i / sa, u1 = TAU * (i + 1) / sa, v0 = TAU * j / sb, v1 = TAU * (j + 1) / sb;
      const p00 = Pt(u0, v0), p01 = Pt(u0, v1), p10 = Pt(u1, v0), p11 = Pt(u1, v1);
      pushV(a, p00[0], p00[1]); pushV(a, p10[0], p10[1]); pushV(a, p11[0], p11[1]);
      pushV(a, p00[0], p00[1]); pushV(a, p11[0], p11[1]); pushV(a, p01[0], p01[1]);
    }
    return buf(a);
  }

  function init(cv) {
    canvas = cv;
    gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false })
      || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('WebGL yok');
    P.mesh = program(SH.meshVS, SH.meshFS, ['aPos', 'aNrm']);
    P.tex = program(SH.texVS, SH.texFS, ['aPos', 'aUV']);
    P.sky = program(SH.skyVS, SH.skyFS, ['aP']);
    P.ocean = program(SH.oceanVS, SH.oceanFS, ['aP']);
    P.floor = program(SH.floorVS, SH.floorFS, ['aP']);
    P.pt = program(SH.ptVS, SH.ptFS, ['aPos', 'aCol', 'aSize']);
    meshes.sphere = sphere(14, 20);
    meshes.sphereLo = sphere(8, 12);
    meshes.cube = cube();
    meshes.cyl = cylinder(24, 1);
    meshes.cone = cylinder(24, 0);
    meshes.frust = cylinder(24, 0.6);
    meshes.torus = torus(32, 12, 0.22);
    meshes.torusThin = torus(32, 10, 0.1);
    quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -0.5, -0.5, 0, 0, 1, 0.5, -0.5, 0, 1, 1, 0.5, 0.5, 0, 1, 0, -0.5, -0.5, 0, 0, 1, 0.5, 0.5, 0, 1, 0, -0.5, 0.5, 0, 0, 0]), gl.STATIC_DRAW);
    skyBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    // zemin / okyanus için birim kare (-0.5..0.5)
    meshes.unitQuad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, meshes.unitQuad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
    ptData = new Float32Array(PT_MAX * 8);
    ptBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
    gl.bufferData(gl.ARRAY_BUFFER, ptData.byteLength, gl.DYNAMIC_DRAW);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
  }

  function resize(q) {
    if (q) scaleQ = q;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.max(2, Math.round(window.innerWidth * dpr * scaleQ));
    const h = Math.max(2, Math.round(window.innerHeight * dpr * scaleQ));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    W = w; H = h;
    gl.viewport(0, 0, W, H);
  }

  /* ---------- kare başı ---------- */
  function begin(t) {
    time = t;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.depthMask(true);
    gl.clearColor(env.mid[0], env.mid[1], env.mid[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const asp = W / H;
    // dikey görüş açısı: dar ekranlarda yatay alan korunsun
    let fv = 2 * Math.atan(Math.tan(22 * DEG) / asp);
    fv = clamp(fv, 50 * DEG, 72 * DEG) * (cam.fov / 60);
    M4.persp(proj, fv, asp, 0.3, 320);
    M4.look(view, cam.x, cam.y, cam.z, cam.tx, cam.ty, cam.tz);
    M4.mul(vp, proj, view);
    cam.fovRad = fv;
    curProg = null; lastMesh = null; sp = 0; M4.ident(stack[0]);

    // gökyüzü
    use(P.sky);
    const horizon = project(cam.x, cam.y, cam.z - 1000);
    const sdx = env.sunDir[0], sdy = env.sunDir[1], sdz = env.sunDir[2];
    const sunP = project(cam.x + sdx * 1000, cam.y + sdy * 1000, cam.z + sdz * 1000);
    const u = P.sky.u;
    gl.disable(gl.DEPTH_TEST);
    gl.uniform3fv(u.uTop, env.top); gl.uniform3fv(u.uMid, env.mid); gl.uniform3fv(u.uSunC, env.sunC);
    gl.uniform1f(u.uH, horizon.y); gl.uniform2f(u.uSun, sunP.x, sunP.y); gl.uniform1f(u.uAsp, asp); gl.uniform1f(u.uTime, time);
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.DEPTH_TEST);

    // okyanus
    use(P.ocean);
    const o = P.ocean.u;
    gl.uniformMatrix4fv(o.uVP, false, vp); gl.uniform3f(o.uC, cam.x, env.waterY, cam.z - 120); gl.uniform1f(o.uSize, 700);
    gl.uniform3f(o.uCam, cam.x, cam.y, cam.z); gl.uniform1f(o.uTime, time);
    const sl = Math.hypot(sdx, sdy, sdz); gl.uniform3f(o.uSunDir, sdx / sl, sdy / sl, sdz / sl);
    gl.uniform3fv(o.uSunC, env.sunC); gl.uniform3fv(o.uDeep, env.deep); gl.uniform3fv(o.uShallow, env.shallow);
    gl.uniform3fv(o.uTop, env.top); gl.uniform3fv(o.uMid, env.mid); gl.uniform2f(o.uFogRange, env.fogNear, env.fogFar);
    gl.bindBuffer(gl.ARRAY_BUFFER, meshes.unitQuad); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // mesh programı ortak ayarlar
    use(P.mesh);
    const m = P.mesh.u;
    gl.uniform3f(m.uCam, cam.x, cam.y, cam.z);
    const ll = Math.hypot(env.light[0], env.light[1], env.light[2]);
    gl.uniform3f(m.uLight, env.light[0] / ll, env.light[1] / ll, env.light[2] / ll);
    gl.uniform3fv(m.uFog, env.mid); gl.uniform2f(m.uFogRange, env.fogNear, env.fogFar);
    gl.uniform3fv(m.uSky, env.sky); gl.uniform3fv(m.uGround, env.ground); gl.uniform3fv(m.uSunC, env.sunC);
    curProg = P.mesh;
  }

  function project(x, y, z) {
    const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
    const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
    const ww = w === 0 ? 1e-6 : w;
    return { x: cx / ww * 0.5 + 0.5, y: cy / ww * 0.5 + 0.5, w: w };
  }

  /* ---------- zemin ---------- */
  function floor(z0, z1) {
    use(P.floor);
    const u = P.floor.u;
    gl.uniformMatrix4fv(u.uVP, false, vp);
    gl.uniform4f(u.uRect, -2.75, 2.75, z0, z1);
    gl.uniform3f(u.uCam, cam.x, cam.y, cam.z); gl.uniform3fv(u.uFog, env.mid); gl.uniform2f(u.uFogRange, env.fogNear, env.fogFar);
    gl.uniform3fv(u.uSky, env.sky); gl.uniform3fv(u.uSunC, env.sunC); gl.uniform3fv(u.uAccent, env.accent);
    const sl = Math.hypot(env.sunDir[0], env.sunDir[1], env.sunDir[2]);
    gl.uniform3f(u.uSunDir, env.sunDir[0] / sl, env.sunDir[1] / sl, env.sunDir[2] / sl);
    gl.uniform1f(u.uTime, time);
    gl.bindBuffer(gl.ARRAY_BUFFER, meshes.unitQuad); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    use(P.mesh);
  }

  /* ---------- matris yığını ---------- */
  function cur() { return stack[sp]; }
  function push() { stack[sp + 1].set(stack[sp]); sp++; }
  function pop() { sp--; }
  function ident() { M4.ident(stack[sp]); }
  function setRoot(x, y, z) { M4.ident(stack[sp]); M4.T(stack[sp], x, y, z); }

  function draw(mesh, r, g, b, gloss, alpha, emit) {
    if (curProg !== P.mesh) use(P.mesh);
    const m = cur(), u = P.mesh.u;
    M4.mul(mvp, vp, m); M4.normal(nrm, m);
    gl.uniformMatrix4fv(u.uMVP, false, mvp); gl.uniformMatrix4fv(u.uModel, false, m); gl.uniformMatrix3fv(u.uNrm, false, nrm);
    gl.uniform3f(u.uColor, r, g, b);
    gl.uniform1f(u.uAlpha, alpha === undefined ? 1 : alpha);
    gl.uniform1f(u.uGloss, gloss || 0);
    gl.uniform1f(u.uEmit, emit || 0);
    if (lastMesh !== mesh) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      lastMesh = mesh;
    }
    gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
  }
  /* kısayol: ellipsoid / kutu çiz (matris yığınını bozmadan) */
  function part(mesh, x, y, z, sx, sy, sz, r, g, b, gloss, alpha, emit) {
    push(); const m = cur(); M4.T(m, x, y, z); M4.S(m, sx, sy, sz); draw(mesh, r, g, b, gloss, alpha, emit); pop();
  }

  /* ---------- doku çizimi (billboard / yer lekesi) ---------- */
  function makeTex(canvas2d, mips) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas2d);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const pot = (canvas2d.width & (canvas2d.width - 1)) === 0 && (canvas2d.height & (canvas2d.height - 1)) === 0;
    if (mips && pot) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  /* key -> {tex, aspect}; drawFn(ctx, w, h) */
  function label(key, w, h, drawFn) {
    let e = labelCache.get(key);
    if (e) { labelCache.delete(key); labelCache.set(key, e); return e; }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); drawFn(g, w, h);
    e = { tex: makeTex(c, true), aspect: w / h };
    labelCache.set(key, e);
    if (labelCache.size > 140) {
      const k = labelCache.keys().next().value; const old = labelCache.get(k);
      gl.deleteTexture(old.tex); labelCache.delete(k);
    }
    return e;
  }
  function permTex(key, w, h, drawFn) {      // silinmeyen dokular
    let e = labelCache.get('P' + key);
    if (e) return e;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); drawFn(g, w, h);
    e = { tex: makeTex(c, true), aspect: w / h, perm: true };
    labelCache.set('P' + key, e);
    return e;
  }
  /* quad: dikey (billboard) ya da yatay (yer) */
  function drawQuad(tex, mask, r, g, b, a) {
    if (curProg !== P.tex) { use(P.tex); }
    const m = cur(), u = P.tex.u;
    M4.mul(mvp, vp, m);
    gl.uniformMatrix4fv(u.uMVP, false, mvp);
    gl.uniform4f(u.uTint, r, g, b, a === undefined ? 1 : a);
    gl.uniform1f(u.uMask, mask ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uTex, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function billboard(e, x, y, z, w, h, a, tint) {
    push(); const m = cur(); M4.T(m, x, y, z);
    M4.RY(m, Math.atan2(cam.x - x, cam.z - z));
    M4.S(m, w, h, 1);
    drawQuad(e.tex, false, 1, 1, 1, a);
    pop(); if (curProg !== P.mesh) use(P.mesh);
  }
  function groundMask(e, x, y, z, w, d, r, g, b, a, rot) {
    push(); const m = cur(); M4.T(m, x, y, z); M4.RX(m, -Math.PI / 2); if (rot) M4.RZ(m, rot); M4.S(m, w, d, 1);
    drawQuad(e.tex, true, r, g, b, a);
    pop(); if (curProg !== P.mesh) use(P.mesh);
  }
  function backToMesh() { if (curProg !== P.mesh) use(P.mesh); }

  /* ---------- parçacıklar (tek çizimde) ---------- */
  function ptReset() { ptN = 0; }
  function ptAdd(x, y, z, r, g, b, a, size) {
    if (ptN >= PT_MAX) return;
    const o = ptN * 8; ptData[o] = x; ptData[o + 1] = y; ptData[o + 2] = z;
    ptData[o + 3] = r; ptData[o + 4] = g; ptData[o + 5] = b; ptData[o + 6] = a; ptData[o + 7] = size; ptN++;
  }
  function ptFlush() {
    if (!ptN) return;
    use(P.pt);
    const u = P.pt.u;
    gl.uniformMatrix4fv(u.uVP, false, vp);
    gl.uniform1f(u.uScale, H * 0.5 * proj[5]);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, ptData.subarray(0, ptN * 8));
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 12);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 28);
    gl.drawArrays(gl.POINTS, 0, ptN);
    ptN = 0;
    use(P.mesh);
  }

  return {
    init, resize, begin, floor, project, cam, env, meshes,
    push, pop, cur, ident, setRoot, draw, part, label, permTex, billboard, groundMask, drawQuad, backToMesh,
    ptReset, ptAdd, ptFlush,
    depthMask(v) { gl.depthMask(v); },
    get gl() { return gl; }, get W() { return W; }, get H() { return H; },
    get vp() { return vp; }
  };
})();
