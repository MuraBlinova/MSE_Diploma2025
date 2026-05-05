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

varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec4 vPositionClip;
varying vec2 vUV;

float scalingFactor;
const float TILE_SIZE = 10.0;

vec3 sampleHeightAndGradient(vec2 point) {
    float height = texture(heightMap, point).r;
    vec2 gradient = texture(gradientMap, point).rg;
    vec3 heightAndGradient = vec3(height, gradient);

    return heightAndGradient * scalingFactor * 0.5;
}

vec3 sampleHeightAndGradientSmooth(vec2 worldXZ) {
    vec2 uv = worldXZ / TILE_SIZE;
    vec2 uv_floor = floor(uv);
    vec2 uv_fract = fract(uv);
    
    vec2 center = uv_fract;
    
    vec2 blend = smoothstep(0.0, 0.1, uv_fract) * (1.0 - smoothstep(0.9, 1.0, uv_fract));
    
    // Сэмплируем центр и 4 соседних тайла
    vec3 hg_center = sampleHeightAndGradient(center);
    vec3 hg_right = sampleHeightAndGradient(center - vec2(1.0, 0.0));
    vec3 hg_left  = sampleHeightAndGradient(center + vec2(1.0, 0.0));
    vec3 hg_up    = sampleHeightAndGradient(center - vec2(0.0, 1.0));
    vec3 hg_down  = sampleHeightAndGradient(center + vec2(0.0, 1.0));
    
    // Смешиваем
    vec3 result = hg_center;
    result = mix(hg_right, result, blend.x);
    result = mix(hg_left, result, blend.x);
    result = mix(hg_up, result, blend.y);
    result = mix(hg_down, result, blend.y);
    
    return result;
}

vec2 sampleDisplacementSmooth(vec2 worldXZ) {
    vec2 uv = worldXZ / TILE_SIZE;
    vec2 uv_fract = fract(uv);
    
    vec2 center = uv_fract;
    vec2 blend = smoothstep(0.0, 0.1, uv_fract) * (1.0 - smoothstep(0.9, 1.0, uv_fract));
    
    vec2 d_center = texture(displacementMap, center).rg * scalingFactor;
    vec2 d_right = texture(displacementMap, center - vec2(1.0, 0.0)).rg * scalingFactor;
    vec2 d_left  = texture(displacementMap, center + vec2(1.0, 0.0)).rg * scalingFactor;
    vec2 d_up    = texture(displacementMap, center - vec2(0.0, 1.0)).rg * scalingFactor;
    vec2 d_down  = texture(displacementMap, center + vec2(0.0, 1.0)).rg * scalingFactor;
    
    vec2 result = d_center;
    result = mix(d_right, result, blend.x);
    result = mix(d_left, result, blend.x);
    result = mix(d_up, result, blend.y);
    result = mix(d_down, result, blend.y);
    
    return result;
}

void main() {
    scalingFactor = 1.0 / TILE_SIZE;

    vec2 worldXZ = position.xz;
    float baseY = position.y;

    vec2 displacement = sampleDisplacementSmooth(worldXZ);
    vec2 displacedXZ = worldXZ + displacement;

    vec3 heightAndGradient = sampleHeightAndGradientSmooth(worldXZ);
    float waveHeight = heightAndGradient.x;

    vec3 waterPosition = vec3(displacedXZ.x, baseY + waveHeight, displacedXZ.y);

    float eps = 0.1;
    float hL = sampleHeightAndGradientSmooth(worldXZ + vec2(-eps, 0.0)).x;
    float hR = sampleHeightAndGradientSmooth(worldXZ + vec2(+eps, 0.0)).x;
    float hD = sampleHeightAndGradientSmooth(worldXZ + vec2(0.0, -eps)).x;
    float hU = sampleHeightAndGradientSmooth(worldXZ + vec2(0.0, +eps)).x;

    vec3 normal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));

    vPositionW = vec3(world * vec4(waterPosition, 1.0));
    vNormalW = vec3(world * vec4(normal, 0.0));
    vPositionClip = worldViewProjection * vec4(waterPosition, 1.0);
    vUV = fract(worldXZ / TILE_SIZE);

    gl_Position = vPositionClip;
}