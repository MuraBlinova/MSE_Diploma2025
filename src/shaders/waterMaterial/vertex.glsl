precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 world;
uniform mat4 worldViewProjection;

uniform sampler2D heightMap;
uniform sampler2D gradientMap;
uniform sampler2D displacementMap;

uniform float tileSize;
uniform vec2 worldOffset;
uniform float gridScale;

varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec4 vPositionClip;
varying vec2 vUV;

float scalingFactor;

vec3 sampleHeightAndGradient(vec2 point) {
    float height = texture(heightMap, point).r;
    vec2 gradient = texture(gradientMap, point).rg;
    vec3 heightAndGradient = vec3(height, gradient);

    return heightAndGradient * scalingFactor * 0.5;
}

vec2 worldToTexUV(vec2 worldXZ) {
    return (worldXZ - worldOffset) / tileSize + 0.5;
}

void main() {
    scalingFactor = 1.0 / tileSize;

    vec2 worldXZ = position.xz * gridScale + worldOffset;
    float baseY = position.y;

    vec2 texUV = worldToTexUV(worldXZ);

    vec2 displacement = texture(displacementMap, texUV).rg * scalingFactor * 1.0;
    vec2 displacedXZ = worldXZ + displacement;

    vec3 heightAndGradient = sampleHeightAndGradient(texUV);
    float waveHeight = heightAndGradient.x;

    vec3 waterPosition = vec3(displacedXZ.x, baseY + waveHeight, displacedXZ.y);

    float gradScale = tileSize;
    vec3 normal = normalize(vec3(-heightAndGradient.y * gradScale, 1.0, -heightAndGradient.z * gradScale));

    vPositionW = vec3(world * vec4(waterPosition, 1.0));
    vNormalW = vec3(world * vec4(normal, 0.0));
    vPositionClip = worldViewProjection * vec4(waterPosition, 1.0);
    vUV = texUV;

    gl_Position = vPositionClip;
}