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

uniform mat3 uTiles;
uniform mat3 uAmps;

varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec4 vPositionClip;
varying vec2 vUV;
varying vec2 vTileUV0;
varying vec2 vTileUV1;
varying vec2 vTileUV2;

float sampleHeightOctave(int octave, vec2 worldXZ, float tileSize) {
    vec2 texUV = fract(worldXZ / tileSize);
    if (octave >= 6) return texture(heightMap2, texUV).r;
    if (octave >= 3) return texture(heightMap1, texUV).r;
    return texture(heightMap, texUV).r;
}

vec2 sampleDisplacementOctave(int octave, vec2 worldXZ, float tileSize) {
    vec2 texUV = fract(worldXZ / tileSize);
    if (octave >= 6) return texture(displacementMap2, texUV).rg;
    if (octave >= 3) return texture(displacementMap1, texUV).rg;
    return texture(displacementMap, texUV).rg;
}

float totalHeight(vec2 worldXZ) {
    return (
        sampleHeightOctave(0, worldXZ, uTiles[0][0]) * uAmps[0][0] +
        sampleHeightOctave(1, worldXZ, uTiles[0][1]) * uAmps[0][1] +
        sampleHeightOctave(2, worldXZ, uTiles[0][2]) * uAmps[0][2] +
        sampleHeightOctave(3, worldXZ, uTiles[1][0]) * uAmps[1][0] +
        sampleHeightOctave(4, worldXZ, uTiles[1][1]) * uAmps[1][1] +
        sampleHeightOctave(5, worldXZ, uTiles[1][2]) * uAmps[1][2] +
        sampleHeightOctave(6, worldXZ, uTiles[2][0]) * uAmps[2][0] +
        sampleHeightOctave(7, worldXZ, uTiles[2][1]) * uAmps[2][1] +
        sampleHeightOctave(8, worldXZ, uTiles[2][2]) * uAmps[2][2]
    ) * 0.5;
}

vec2 totalDisplacement(vec2 worldXZ) {
    return (
        sampleDisplacementOctave(0, worldXZ, uTiles[0][0]) * uAmps[0][0] +
        sampleDisplacementOctave(1, worldXZ, uTiles[0][1]) * uAmps[0][1] +
        sampleDisplacementOctave(2, worldXZ, uTiles[0][2]) * uAmps[0][2] +
        sampleDisplacementOctave(3, worldXZ, uTiles[1][0]) * uAmps[1][0] +
        sampleDisplacementOctave(4, worldXZ, uTiles[1][1]) * uAmps[1][1] +
        sampleDisplacementOctave(5, worldXZ, uTiles[1][2]) * uAmps[1][2] +
        sampleDisplacementOctave(6, worldXZ, uTiles[2][0]) * uAmps[2][0] +
        sampleDisplacementOctave(7, worldXZ, uTiles[2][1]) * uAmps[2][1] +
        sampleDisplacementOctave(8, worldXZ, uTiles[2][2]) * uAmps[2][2]
    );
}

void main() {
    vec2 worldXZ = position.xz;

    float waveHeight = totalHeight(worldXZ);
    vec2 displacedXZ = worldXZ + totalDisplacement(worldXZ);
    vec3 waterPosition = vec3(displacedXZ.x, waveHeight, displacedXZ.y);

    const float eps = 0.1;
    float hL = totalHeight(worldXZ + vec2(-eps, 0.0));
    float hR = totalHeight(worldXZ + vec2(+eps, 0.0));
    float hD = totalHeight(worldXZ + vec2(0.0, -eps));
    float hU = totalHeight(worldXZ + vec2(0.0, +eps));
    vec3 normalW = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));

    vPositionW = vec3(world * vec4(waterPosition, 1.0));
    vNormalW = vec3(world * vec4(normalW, 0.0));
    vPositionClip = worldViewProjection * vec4(waterPosition, 1.0);
    vUV = fract(worldXZ / uTiles[1][1]);

    vTileUV0 = fract(worldXZ / uTiles[0][0]);
    vTileUV1 = fract(worldXZ / uTiles[0][1]);
    vTileUV2 = fract(worldXZ / uTiles[0][2]);   

    gl_Position = vPositionClip;
}