precision highp float;

varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec4 vPositionClip;
varying vec2 vUV;
varying vec2 vTileUV0;
varying vec2 vTileUV1;
varying vec2 vTileUV2;

uniform vec3 cameraPositionW;
uniform vec3 lightDirection;

uniform sampler2D depthSampler;
uniform sampler2D textureSampler;
uniform samplerCube reflectionSampler;
uniform sampler2D normalMapOverlay;
uniform float showNormalMapOverlay;
uniform float showTileBorders;

float edgeDist(vec2 uv) {
    return min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
}

void main() {
    vec3 normal = vNormalW;

    vec2 screenUV = vPositionClip.xy / vPositionClip.w;
    screenUV = screenUV * 0.5 + 0.5;

    vec3 backgroundColor = texture2D(textureSampler, screenUV).rgb;

    float surfaceDepth = vPositionClip.z;
    float backgroundDepth = texture2D(depthSampler, screenUV).r;

    float distanceThroughWater = max(surfaceDepth - backgroundDepth, 0.0);

    float ndl = max(0.0, dot(normal, -lightDirection));

    vec3 deepColor = vec3(0.02, 0.1, 0.24);
    vec3 shallowColor = vec3(0.05, 0.25, 0.4);
    vec3 diffuseColor = mix(deepColor, shallowColor, ndl);
    diffuseColor = mix(diffuseColor, backgroundColor, exp(-distanceThroughWater * 0.15));

    if (showNormalMapOverlay > 0.5) {
        vec2 uv = vUV;
        vec2 normalSample = texture2D(normalMapOverlay, uv).rg;
        float nx = clamp(normalSample.r, -1.0, 1.0);
        float nz = clamp(normalSample.g, -1.0, 1.0);
        diffuseColor = vec3(nx * 0.5 + 0.5, 0.5, nz * 0.5 + 0.5);
        gl_FragColor = vec4(diffuseColor, 0.2);
        return;
    }

    vec3 viewRayW = normalize(vPositionW - cameraPositionW);
    vec3 viewRayReflectedW = reflect(viewRayW, normal);

    float fresnel = 0.02 + 0.98 * pow(1.0 - dot(-viewRayW, normal), 5.0);

    vec3 reflectedColor = textureCube(reflectionSampler, viewRayReflectedW).rgb;

    float specular = pow(max(0.0, dot(reflect(-lightDirection, normal), viewRayW)), 720.0) * 210.0;

    vec3 finalColor = mix(diffuseColor * ndl, reflectedColor + specular, fresnel);

    if (showTileBorders > 0.5) {
        vec3 c0 = vec3(1.0, 1.0, 0.0);
        vec3 c1 = vec3(0.0, 1.0, 1.0);
        vec3 c2 = vec3(1.0, 0.0, 1.0);

        float a = 1.0;
        finalColor = mix(finalColor, c2, smoothstep(0.02, 0.0, edgeDist(vTileUV2)) * a);
        finalColor = mix(finalColor, c1, smoothstep(0.02, 0.0, edgeDist(vTileUV1)) * a);
        finalColor = mix(finalColor, c0, smoothstep(0.02, 0.0, edgeDist(vTileUV0)) * a);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}