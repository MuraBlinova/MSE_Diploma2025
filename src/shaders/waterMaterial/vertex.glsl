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
uniform float showSpectralMixing;
uniform float uGridStep;
uniform float uBlendSigma;
uniform float uLODSkip;
uniform float showPerlinNoise;
uniform float uPerlinStrength;

varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec4 vPositionClip;
varying vec2 vUV;
varying vec2 vTileUV0;
varying vec2 vTileUV1;
varying vec2 vTileUV2;
varying vec2 vWorldXZ;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float perlinNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float getWeight(vec2 worldXZ, float seed) {
    float L = uGridStep;
    float slope = sqrt(3.0);

    float m = (worldXZ.x / L + worldXZ.y / (L * slope)) / 2.0;
    float n = (worldXZ.x / L - worldXZ.y / (L * slope)) / 2.0;
    float m0 = floor(m);
    float n0 = floor(n);

    vec2 node0, node1, node2;
    if (m - m0 > n - n0) {
        node0 = vec2((m0 + n0) * L, (m0 - n0) * L * slope / 2.0);
        node1 = vec2((m0 + 1.0 + n0) * L, (m0 + 1.0 - n0) * L * slope / 2.0);
        node2 = vec2((m0 + 1.0 + n0 + 1.0) * L, (m0 + 1.0 - n0 - 1.0) * L * slope / 2.0);
    } else {
        node0 = vec2((m0 + n0) * L, (m0 - n0) * L * slope / 2.0);
        node1 = vec2((m0 + 1.0 + n0 + 1.0) * L, (m0 + 1.0 - n0 - 1.0) * L * slope / 2.0);
        node2 = vec2((m0 + n0 + 1.0) * L, (m0 - n0 - 1.0) * L * slope / 2.0);
    }

    float h0 = fract(hash(node0) + seed);
    float h1 = fract(hash(node1) + seed);
    float h2 = fract(hash(node2) + seed);

    float d0 = length(worldXZ - node0);
    float d1 = length(worldXZ - node1);
    float d2 = length(worldXZ - node2);

    float sigma = uGridStep * uBlendSigma;
    
    float w0 = 1.0 / (1.0 + exp((d0 - sigma) / (sigma * 0.25)));
    float w1 = 1.0 / (1.0 + exp((d1 - sigma) / (sigma * 0.25)));
    float w2 = 1.0 / (1.0 + exp((d2 - sigma) / (sigma * 0.25)));
    float total = w0 + w1 + w2;

    float raw = (h0 * w0 + h1 * w1 + h2 * w2) / total;
    float minWeight = 0.8;
    float maxWeight = 1.0;
    return minWeight + raw * (maxWeight - minWeight);
}

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
    float baseHeight;

    if (showSpectralMixing > 0.5) {
        float w0 = getWeight(worldXZ, 0.0);
        float w1 = getWeight(worldXZ, 0.33);
        float w2 = getWeight(worldXZ, 0.67);

        baseHeight = 
            sampleHeightOctave(0, worldXZ, uTiles[0][0]) * uAmps[0][0] * w0 +
            sampleHeightOctave(1, worldXZ, uTiles[0][1]) * uAmps[0][1] * w0 +
            sampleHeightOctave(2, worldXZ, uTiles[0][2]) * uAmps[0][2] * w0 +
            sampleHeightOctave(3, worldXZ, uTiles[1][0]) * uAmps[1][0] * w1 +
            sampleHeightOctave(4, worldXZ, uTiles[1][1]) * uAmps[1][1] * w1 +
            sampleHeightOctave(5, worldXZ, uTiles[1][2]) * uAmps[1][2] * w1 +
            sampleHeightOctave(6, worldXZ, uTiles[2][0]) * uAmps[2][0] * w2 +
            sampleHeightOctave(7, worldXZ, uTiles[2][1]) * uAmps[2][1] * w2 +
            sampleHeightOctave(8, worldXZ, uTiles[2][2]) * uAmps[2][2] * w2;
    } else {
        baseHeight =
            sampleHeightOctave(0, worldXZ, uTiles[0][0]) * uAmps[0][0] +
            sampleHeightOctave(1, worldXZ, uTiles[0][1]) * uAmps[0][1] +
            sampleHeightOctave(2, worldXZ, uTiles[0][2]) * uAmps[0][2] +
            sampleHeightOctave(3, worldXZ, uTiles[1][0]) * uAmps[1][0] +
            sampleHeightOctave(4, worldXZ, uTiles[1][1]) * uAmps[1][1] +
            sampleHeightOctave(5, worldXZ, uTiles[1][2]) * uAmps[1][2] +
            sampleHeightOctave(6, worldXZ, uTiles[2][0]) * uAmps[2][0] +
            sampleHeightOctave(7, worldXZ, uTiles[2][1]) * uAmps[2][1] +
            sampleHeightOctave(8, worldXZ, uTiles[2][2]) * uAmps[2][2];
    }

    if (showPerlinNoise > 0.5) {
        float perlin = perlinNoise(worldXZ * 0.3) * uPerlinStrength;
        baseHeight += perlin;
    }

    return baseHeight * 0.5;
}

vec2 totalDisplacement(vec2 worldXZ) {
    vec2 baseDisp;

    if (showSpectralMixing > 0.5) {
        float w0 = getWeight(worldXZ, 0.0);
        float w1 = getWeight(worldXZ, 0.33);
        float w2 = getWeight(worldXZ, 0.67);

        baseDisp =
            sampleDisplacementOctave(0, worldXZ, uTiles[0][0]) * uAmps[0][0] * w0 +
            sampleDisplacementOctave(1, worldXZ, uTiles[0][1]) * uAmps[0][1] * w0 +
            sampleDisplacementOctave(2, worldXZ, uTiles[0][2]) * uAmps[0][2] * w0 +
            sampleDisplacementOctave(3, worldXZ, uTiles[1][0]) * uAmps[1][0] * w1 +
            sampleDisplacementOctave(4, worldXZ, uTiles[1][1]) * uAmps[1][1] * w1 +
            sampleDisplacementOctave(5, worldXZ, uTiles[1][2]) * uAmps[1][2] * w1 +
            sampleDisplacementOctave(6, worldXZ, uTiles[2][0]) * uAmps[2][0] * w2 +
            sampleDisplacementOctave(7, worldXZ, uTiles[2][1]) * uAmps[2][1] * w2 +
            sampleDisplacementOctave(8, worldXZ, uTiles[2][2]) * uAmps[2][2] * w2;
    } else {
        baseDisp =
            sampleDisplacementOctave(0, worldXZ, uTiles[0][0]) * uAmps[0][0] +
            sampleDisplacementOctave(1, worldXZ, uTiles[0][1]) * uAmps[0][1] +
            sampleDisplacementOctave(2, worldXZ, uTiles[0][2]) * uAmps[0][2] +
            sampleDisplacementOctave(3, worldXZ, uTiles[1][0]) * uAmps[1][0] +
            sampleDisplacementOctave(4, worldXZ, uTiles[1][1]) * uAmps[1][1] +
            sampleDisplacementOctave(5, worldXZ, uTiles[1][2]) * uAmps[1][2] +
            sampleDisplacementOctave(6, worldXZ, uTiles[2][0]) * uAmps[2][0] +
            sampleDisplacementOctave(7, worldXZ, uTiles[2][1]) * uAmps[2][1] +
            sampleDisplacementOctave(8, worldXZ, uTiles[2][2]) * uAmps[2][2];
    }

    if (showPerlinNoise > 0.5) {
        float px = perlinNoise(worldXZ * 0.3 + vec2(100.0, 0.0));
        float pz = perlinNoise(worldXZ * 0.3 + vec2(0.0, 100.0));
        baseDisp += vec2(px, pz) * uPerlinStrength * 0.3;
    }

    return baseDisp;
}

void main() {
    float skip = log2(uLODSkip + 1.0) / log2(10.0);
    vec2 worldXZ = (position.xz / skip + 0.5) * skip;

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

    vWorldXZ = worldXZ;

    gl_Position = vPositionClip;
}