precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 world;
uniform mat4 worldViewProjection;

uniform sampler2D heightMap;
uniform sampler2D displacementMap;
uniform sampler2D heightMap1;
uniform sampler2D displacementMap1;
uniform sampler2D heightMap2;
uniform sampler2D displacementMap2;

uniform vec3 uTiles;
uniform vec3 uAmps;

varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec4 vPositionClip;
varying vec2 vUV;

float sampleHeightOctave(int octave, vec2 worldXZ, float tileSize) {
    vec2 texUV = fract(worldXZ / tileSize);
    
    if (octave == 0) return texture(heightMap, texUV).r;
    if (octave == 1) return texture(heightMap1, texUV).r;
    return texture(heightMap2, texUV).r;
}

vec2 sampleDisplacementOctave(int octave, vec2 worldXZ, float tileSize) {
    vec2 texUV = fract(worldXZ / tileSize);
    
    if (octave == 0) return texture(displacementMap, texUV).rg;
    if (octave == 1) return texture(displacementMap1, texUV).rg;
    return texture(displacementMap2, texUV).rg;
}

float totalHeight(vec2 worldXZ) {
    float h0 = sampleHeightOctave(0, worldXZ, uTiles.x);
    float h1 = sampleHeightOctave(1, worldXZ, uTiles.y);
    float h2 = sampleHeightOctave(2, worldXZ, uTiles.z);
    return (h0 * uAmps.x + h1 * uAmps.y + h2 * uAmps.z) * 0.5;
}

vec2 totalDisplacement(vec2 worldXZ) {
    vec2 d0 = sampleDisplacementOctave(0, worldXZ, uTiles.x);
    vec2 d1 = sampleDisplacementOctave(1, worldXZ, uTiles.y);
    vec2 d2 = sampleDisplacementOctave(2, worldXZ, uTiles.z);
    return d0 * uAmps.x + d1 * uAmps.y + d2 * uAmps.z;
}

void main() {
    vec2 worldXZ = position.xz;

    float waveHeight = totalHeight(worldXZ);
    vec2 displacement = totalDisplacement(worldXZ);
    vec2 displacedXZ = worldXZ + displacement;

    vec3 waterPosition = vec3(displacedXZ.x, waveHeight, displacedXZ.y);

    float eps = 0.1;
    float hL = totalHeight(worldXZ + vec2(-eps, 0.0));
    float hR = totalHeight(worldXZ + vec2(+eps, 0.0));
    float hD = totalHeight(worldXZ + vec2(0.0, -eps));
    float hU = totalHeight(worldXZ + vec2(0.0, +eps));

    vec3 normalW = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));

    vPositionW = vec3(world * vec4(waterPosition, 1.0));
    vNormalW = vec3(world * vec4(normalW, 0.0));
    vPositionClip = worldViewProjection * vec4(waterPosition, 1.0);
    vUV = fract(worldXZ / uTiles.y);

    gl_Position = vPositionClip;
}