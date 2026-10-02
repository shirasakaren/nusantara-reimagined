// Toon sea. Shallow turquoise near the island, deep blue far out, foam that laps the
// beach in hand drawn bands, and sparkles that turn to moonlight at night.
import * as THREE from 'three';
import { uTime, uNight } from '../core/toon.js';

export function buildWater(scene) {
  const geo = new THREE.PlaneGeometry(1400, 1400, 180, 180);
  geo.rotateX(-Math.PI / 2);
  geo.deleteAttribute('uv');
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uShallow: { value: new THREE.Color(0x63d6e0) },
    uMid: { value: new THREE.Color(0x3fa7d6) },
    uDeep: { value: new THREE.Color(0x2a6fb0) },
    uFoam: { value: new THREE.Color(0xffffff) },
  }]);
  uniforms.uTime = uTime;
  uniforms.uNight = uNight;
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: true,
    vertexShader: `
      uniform float uTime;
      varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){
        vec3 p = position;
        float w = sin(p.x * 0.07 + uTime * 0.9) * 0.18 + sin(p.z * 0.09 + uTime * 1.2) * 0.14 + sin((p.x + p.z) * 0.15 + uTime * 1.7) * 0.06;
        float r = length(p.xz);
        p.y += w * smoothstep(95.0, 130.0, r);
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uShallow, uMid, uDeep, uFoam; uniform float uTime, uNight;
      varying vec3 vW;
      #include <fog_pars_fragment>
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float coastR(float th){ return 103.0 + 7.0*sin(3.0*th+0.4) + 4.0*sin(7.0*th+1.3) + 2.5*sin(13.0*th+2.1); }
      void main(){
        float r = length(vW.xz);
        float th = atan(vW.z, vW.x);
        float d = r - coastR(th) - 2.2; // distance from the shoreline
        vec3 c = mix(uShallow, uMid, smoothstep(2.0, 26.0, d));
        c = mix(c, uDeep, smoothstep(30.0, 140.0, d));
        // toon banding of depth
        float band = floor(smoothstep(0.0, 40.0, d) * 4.0) / 4.0;
        c *= 0.96 + band * 0.04;
        // shore foam: a solid lip plus waves rolling in
        float lip = 1.0 - smoothstep(0.0, 1.6, d + sin(th * 30.0 + uTime * 1.5) * 0.4);
        float wave = sin(d * 1.1 - uTime * 1.6 + sin(th * 9.0) * 1.5);
        float rings = step(0.86, wave) * (1.0 - smoothstep(2.0, 11.0, d));
        float foam = max(lip, rings);
        // drifting sparkles
        vec2 g = floor(vW.xz * 0.55 + vec2(uTime * 0.25, uTime * 0.1));
        float s = hash(g);
        float tw = step(0.993, s) * (0.5 + 0.5 * sin(uTime * 4.0 + s * 50.0));
        c = mix(c, uFoam, foam * 0.9);
        c += vec3(1.0, 0.98, 0.9) * tw * 0.8;
        // night: deeper and bluer, sparkles become moonlight glints
        c = mix(c, c * vec3(0.32, 0.38, 0.62), uNight * 0.85);
        c += vec3(0.6, 0.7, 1.0) * tw * uNight * 0.6;
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.6;
  mesh.name = 'water';
  scene.add(mesh);
  return mesh;
}
