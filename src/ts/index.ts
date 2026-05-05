let showWireframe = false;

const wireframeToggle = document.createElement("button");
wireframeToggle.textContent = "wireframe";
wireframeToggle.style.position = "fixed";
wireframeToggle.style.top = "50px";
wireframeToggle.style.right = "10px";
wireframeToggle.style.zIndex = "1001";
wireframeToggle.style.padding = "8px 16px";
wireframeToggle.style.background = "#222";
wireframeToggle.style.color = "#fff";
wireframeToggle.style.border = "none";
wireframeToggle.style.borderRadius = "6px";
wireframeToggle.style.cursor = "pointer";
wireframeToggle.onclick = () => {
    showWireframe = !showWireframe;
    scene.meshes.forEach(mesh => {
        if (mesh.material === waterMaterial) {
            mesh.material.wireframe = showWireframe;
        }
    });
};
document.body.appendChild(wireframeToggle);
import "../styles/index.css";

// FPS overlay
const fpsOverlay = document.createElement("div");
fpsOverlay.style.position = "fixed";
fpsOverlay.style.top = "10px";
fpsOverlay.style.left = "10px";
fpsOverlay.style.background = "rgba(0,0,0,0.7)";
fpsOverlay.style.color = "#0f0";
fpsOverlay.style.font = "bold 16px monospace";
fpsOverlay.style.padding = "4px 10px";
fpsOverlay.style.zIndex = "1000";
fpsOverlay.style.borderRadius = "6px";
fpsOverlay.textContent = "FPS: ...";
document.body.appendChild(fpsOverlay);

import { Scene } from "@babylonjs/core/scene";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/core/Loading/loadingScreen";
import { WebGPUEngine } from "@babylonjs/core/Engines";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";

import { WaterMaterial } from "./waterMaterial";
import { PhillipsSpectrum } from "./spectrum/phillipsSpectrum";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

let showNormalMapOverlay = false;

// UI-переключатель
const normalMapToggle = document.createElement("button");
normalMapToggle.textContent = "normal map";
normalMapToggle.style.position = "fixed";
normalMapToggle.style.top = "10px";
normalMapToggle.style.right = "10px";
normalMapToggle.style.zIndex = "1001";
normalMapToggle.style.padding = "8px 16px";
normalMapToggle.style.background = "#222";
normalMapToggle.style.color = "#fff";
normalMapToggle.style.border = "none";
normalMapToggle.style.borderRadius = "6px";
normalMapToggle.style.cursor = "pointer";
normalMapToggle.onclick = () => {
    showNormalMapOverlay = !showNormalMapOverlay;
    if (waterMaterial) {
        waterMaterial.setFloat("showNormalMapOverlay", showNormalMapOverlay ? 1.0 : 0.0);
    }
};
document.body.appendChild(normalMapToggle);

// Color map of normals (gradientMap) in bottom right corner (HTML overlay)
const normalCanvas = document.createElement("canvas");
const normalSize = 200;
normalCanvas.width = normalSize;
normalCanvas.height = normalSize;
normalCanvas.style.position = "fixed";
normalCanvas.style.right = "10px";
normalCanvas.style.bottom = "10px";
normalCanvas.style.border = "2px solid #333";
normalCanvas.style.background = "#111";
normalCanvas.style.zIndex = "1001";
document.body.appendChild(normalCanvas);
const normalCtx = normalCanvas.getContext("2d");

// FPS counter (console + overlay)
let lastFpsPrint = performance.now();
let frameCount = 0;
let lastFps = 0;

// WebGPU GPUQuerySet (timing)

// WebGPU types fallback for TS

function startRenderLoop() {
    engine.runRenderLoop(() => {
        scene.render();
    });
}

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    engine.resize(true);
});

import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { Effect } from "@babylonjs/core/Materials/effect";

import "@babylonjs/core/Rendering/depthRendererSceneComponent";

import postProcessCode from "../shaders/smallPostProcess.glsl";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

if (!(await WebGPUEngine.IsSupportedAsync)) {
    alert("WebGPU is not supported in your browser. Please check the compatibility here: https://github.com/gpuweb/gpuweb/wiki/Implementation-Status#implementation-status");
}

const engine = new WebGPUEngine(canvas, { antialias: true });
engine.loadingScreen.displayLoadingUI();
await engine.initAsync();

const scene = new Scene(engine);

const camera = new ArcRotateCamera("camera", 3.14 / 3, 0.02 + 3.14 / 2, 15, new Vector3(0, 1.5, 0), scene);
camera.wheelPrecision = 100;
camera.angularSensibilityX = 3000;
camera.angularSensibilityY = 3000;
camera.lowerRadiusLimit = 2;
//camera.upperBetaLimit = 3.14 / 2;
camera.attachControl();

const light = new DirectionalLight("light", new Vector3(1, -1, 3).normalize(), scene);

const textureSize = 128;
const tileSize = 10;

const depthRenderer = scene.enableDepthRenderer(camera, false, true);
const initialSpectrum = new PhillipsSpectrum(textureSize, tileSize, engine);

const waterMaterial = new WaterMaterial("waterяяMaterial", initialSpectrum, scene, engine);
waterMaterial.setFloat("showNormalMapOverlay", showNormalMapOverlay ? 1.0 : 0.0);
waterMaterial.setTexture("normalMapOverlay", waterMaterial.gradientMap);

const skybox = MeshBuilder.CreateBox("skyBox", { size: camera.maxZ / 2 }, scene);
const skyboxMaterial = new StandardMaterial("skyBox", scene);
skyboxMaterial.backFaceCulling = false;
skyboxMaterial.reflectionTexture = waterMaterial.reflectionTexture;
skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
skyboxMaterial.disableLighting = true;
skybox.material = skyboxMaterial;

const radius = 3;

const waterGridCount = radius * 2 + 1;
const totalSize = tileSize * waterGridCount;
const totalSubdivisions = textureSize * waterGridCount;

const water = MeshBuilder.CreateGround(
    "water",
    {
        width: totalSize,
        height: totalSize,
        subdivisions: totalSubdivisions
    },
    scene
);
water.material = waterMaterial;

waterMaterial.setFloat("tileSize", tileSize);
waterMaterial.setWorldTexSize(tileSize);
waterMaterial.setWorldOffset(new Vector2(0, 0));
waterMaterial.setFloat("gridScale", totalSize / totalSubdivisions);

waterMaterial.setFloat("showNormalMapOverlay", showNormalMapOverlay ? 1.0 : 0.0);
waterMaterial.setTexture("normalMapOverlay", waterMaterial.gradientMap);

Effect.ShadersStore[`PostProcess1FragmentShader`] = postProcessCode;
const postProcess = new PostProcess(
    "postProcess1",
    "PostProcess1",
    ["cameraInverseView", "cameraInverseProjection", "cameraPosition"],
    ["textureSampler", "depthSampler"],
    1,
    camera,
    Texture.BILINEAR_SAMPLINGMODE,
    engine
);
postProcess.onApplyObservable.add((effect) => {
    effect.setTexture("depthSampler", depthRenderer.getDepthMap());
    effect.setMatrix("cameraInverseView", camera.getViewMatrix().clone().invert());
    effect.setMatrix("cameraInverseProjection", camera.getProjectionMatrix().clone().invert());
});

function updateScene() {
    const deltaSeconds = engine.getDeltaTime() / 1000;
    waterMaterial.update(deltaSeconds, light.direction);
}

scene.executeWhenReady(() => {

    engine.loadingScreen.hideLoadingUI();
    scene.registerBeforeRender(() => updateScene());

    // Color map of normals (gradientMap) in bottom right corner (HTML overlay)
    const normalCanvas = document.createElement("canvas");
    const normalSize = 200;
    normalCanvas.width = normalSize;
    normalCanvas.height = normalSize;
    normalCanvas.style.position = "fixed";
    normalCanvas.style.right = "10px";
    normalCanvas.style.bottom = "10px";
    normalCanvas.style.border = "2px solid #333";
    normalCanvas.style.background = "#111";
    normalCanvas.style.zIndex = "1001";
    document.body.appendChild(normalCanvas);
    const normalCtx = normalCanvas.getContext("2d");

    // FPS counter (console + overlay)
    let lastFpsPrint = performance.now();
    let frameCount = 0;
    let lastFps = 0;

    // WebGPU GPUQuerySet (timing)

    // WebGPU types fallback for TS
    const gpu = (navigator as any).gpu || (window as any).gpu;
    const GPUBufferUsage = gpu?.BufferUsage || {
        MAP_READ: 0x0001,
        COPY_SRC: 0x0004,
        QUERY_RESOLVE: 0x8000
    };
    const GPUMapMode = gpu?.MapMode || { READ: 0x0001 };

    let gpuQuerySet: GPUQuerySet | null = null;
    let gpuDevice: GPUDevice | null = null;
    if (engine._device && "createQuerySet" in engine._device) {
        gpuDevice = engine._device as GPUDevice;
        try {
            gpuQuerySet = gpuDevice.createQuerySet({ type: "timestamp", count: 2 });
        } catch {}
    }
    let queryBuffer: GPUBuffer | null = null;
    if (gpuDevice && gpuQuerySet) {
        queryBuffer = gpuDevice.createBuffer({ size: 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_READ, mappedAtCreation: false });
    }
    let gpuTimeMs = 0;

    engine.runRenderLoop(async () => {
        // WebGPU timestamp start
        if (gpuDevice && gpuQuerySet && gpuDevice.createCommandEncoder) {
            const encoder = gpuDevice.createCommandEncoder();
            if (encoder.writeTimestamp) encoder.writeTimestamp(gpuQuerySet, 0);
            if (gpuDevice.queue && gpuDevice.queue.submit) gpuDevice.queue.submit([encoder.finish()]);
        }

        scene.render();
        frameCount++;

        // Draw normal map overlay
        if (normalCtx && waterMaterial.gradientMap.isReady()) {
            (async () => {
                const size = waterMaterial.gradientMap.getSize().width;
                // Await the pixel data from the texture
                const buffer = (await waterMaterial.gradientMap.readPixels(0, 0, null, true, true)) as Float32Array;
                if (!buffer) return;
                const imageData = normalCtx.createImageData(normalSize, normalSize);
                for (let y = 0; y < normalSize; y++) {
                    for (let x = 0; x < normalSize; x++) {
                        // Билинейная интерполяция из gradientMap
                        const u = x / (normalSize - 1);
                        const v = y / (normalSize - 1);
                        const ix = Math.floor(u * (size - 1));
                        const iy = Math.floor(v * (size - 1));
                        const idx = (iy * size + ix) * 2;
                        // gradientMap хранит производные по x и z, нормализуем в [0,1]
                        let nx = buffer[idx];
                        let nz = buffer[idx + 1];
                        nx = Math.max(-1, Math.min(1, nx));
                        nz = Math.max(-1, Math.min(1, nz));
                        const r = Math.floor((nx * 0.5 + 0.5) * 255);
                        const g = 128;
                        const b = Math.floor((nz * 0.5 + 0.5) * 255);
                        const a = 255;
                        const id = (y * normalSize + x) * 4;
                        imageData.data[id] = r;
                        imageData.data[id + 1] = g;
                        imageData.data[id + 2] = b;
                        imageData.data[id + 3] = a;
                    }
                }
                normalCtx.putImageData(imageData, 0, 0);
            })();
        }

        // WebGPU timestamp end
        if (gpuDevice && gpuQuerySet && queryBuffer && gpuDevice.createCommandEncoder) {
            const encoder = gpuDevice.createCommandEncoder();
            if (encoder.writeTimestamp) encoder.writeTimestamp(gpuQuerySet, 1);
            if (encoder.resolveQuerySet) encoder.resolveQuerySet(gpuQuerySet, 0, 2, queryBuffer, 0);
            if (gpuDevice.queue && gpuDevice.queue.submit) gpuDevice.queue.submit([encoder.finish()]);
            try {
                if (queryBuffer.mapAsync) {
                    await queryBuffer.mapAsync(GPUMapMode.READ);
                    const arr = new BigUint64Array(queryBuffer.getMappedRange());
                    const t0 = Number(arr[0]);
                    const t1 = Number(arr[1]);
                    gpuTimeMs = (t1 - t0) / 1e6;
                    if (queryBuffer.unmap) queryBuffer.unmap();
                }
            } catch {}
        }

        const now = performance.now();
        if (now - lastFpsPrint > 1000) {
            lastFps = frameCount;
            console.log("FPS:", lastFps, gpuTimeMs ? `| GPU frame: ${gpuTimeMs.toFixed(2)} ms` : "");
            fpsOverlay.textContent = `FPS: ${lastFps}` + (gpuTimeMs ? ` | GPU: ${gpuTimeMs.toFixed(2)} ms` : "");
            frameCount = 0;
            lastFpsPrint = now;
        }
    });
});

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    engine.resize(true);
});
