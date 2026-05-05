precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 world;
uniform mat4 worldViewProjection;

uniform sampler2D heightMap;
uniform sampler2D displacementMap;

varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec4 vPositionClip;
varying vec2 vUV;

const float TILE_0 = 5.0;
const float TILE_1 = 20.0;
const float TILE_2 = 50.0;
const float AMP_0 = 0.1;
const float AMP_1 = 0.5;
const float AMP_2 = 0.5;

float sampleHeightOctave(vec2 worldXZ, float tileSize) {
    vec2 texUV = fract(worldXZ / tileSize);
    return texture(heightMap, texUV).r;
}

vec2 sampleDisplacementOctave(vec2 worldXZ, float tileSize) {
    vec2 texUV = fract(worldXZ / tileSize);
    return texture(displacementMap, texUV).rg;
}

float totalHeight(vec2 worldXZ) {
    float h0 = sampleHeightOctave(worldXZ, TILE_0);
    float h1 = sampleHeightOctave(worldXZ, TILE_1);
    float h2 = sampleHeightOctave(worldXZ, TILE_2);
    return (h0 * AMP_0 + h1 * AMP_1 + h2 * AMP_2) * 0.5;
}

vec2 totalDisplacement(vec2 worldXZ) {
    vec2 d0 = sampleDisplacementOctave(worldXZ, TILE_0);
    vec2 d1 = sampleDisplacementOctave(worldXZ, TILE_1);
    vec2 d2 = sampleDisplacementOctave(worldXZ, TILE_2);
    return d0 * AMP_0 + d1 * AMP_1 + d2 * AMP_2;
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
    vUV = fract(worldXZ / TILE_1);

    gl_Position = vPositionClip;
}