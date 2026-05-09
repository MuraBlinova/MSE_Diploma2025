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
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/core/Loading/loadingScreen";
import { WebGPUEngine } from "@babylonjs/core/Engines";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";

import { WaterMaterial } from "./waterMaterial";
import { PhillipsSpectrum } from "./spectrum/phillipsSpectrum";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

let showNormalMapOverlay = false;

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

// const normalSize = 200;
// const normalCanvases: HTMLCanvasElement[] = [];
// const normalCtxs: CanvasRenderingContext2D[] = [];
// const octaveLabels = [" мелкая", "средняя", "крупная"];
// 
// for (let i = 0; i < 3; i++) {
//     const cnv = document.createElement("canvas");
//     cnv.width = normalSize;
//     cnv.height = normalSize;
//     cnv.style.position = "fixed";
//     cnv.style.right = `${10 + i * (normalSize + 5)}px`;
//     cnv.style.bottom = "10px";
//     cnv.style.border = "2px solid #333";
//     cnv.style.background = "#111";
//     cnv.style.zIndex = "1001";
//     document.body.appendChild(cnv);

//     const label = document.createElement("div");
//     label.textContent = octaveLabels[i];
//     label.style.position = "fixed";
//     label.style.right = `${10 + i * (normalSize + 5)}px`;
//     label.style.bottom = `${10 + normalSize + 4}px`;
//     label.style.zIndex = "1001";
//     label.style.color = "#fff";
//     label.style.font = "10px monospace";
//     label.style.width = `${normalSize}px`;
//     label.style.textAlign = "center";
//     document.body.appendChild(label);

//     normalCanvases.push(cnv);
//     normalCtxs.push(cnv.getContext("2d")!);
// }

import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { Effect } from "@babylonjs/core/Materials/effect";

import "@babylonjs/core/Rendering/depthRendererSceneComponent";

import postProcessCode from "../shaders/smallPostProcess.glsl";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

if (!(await WebGPUEngine.IsSupportedAsync)) {
    alert("WebGPU is not supported in your browser.");
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
camera.attachControl();

const keys: { [key: string]: boolean } = {};
window.addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

scene.registerBeforeRender(() => {
    const speed = 0.5;
    const alpha = camera.alpha;
    const forwardX = Math.cos(alpha);
    const forwardZ = Math.sin(alpha);
    const rightX = -Math.sin(alpha);
    const rightZ = Math.cos(alpha);

    let moveX = 0;
    let moveZ = 0;

    if (keys["w"]) { moveX -= forwardX; moveZ -= forwardZ; }
    if (keys["s"]) { moveX += forwardX; moveZ += forwardZ; }
    if (keys["a"]) { moveX -= rightX; moveZ -= rightZ; }
    if (keys["d"]) { moveX += rightX; moveZ += rightZ; }

    if (moveX !== 0 || moveZ !== 0) {
        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        moveX /= len;
        moveZ /= len;
        camera.target.addInPlaceFromFloats(moveX * speed, 0, moveZ * speed);
    }
});

const light = new DirectionalLight("light", new Vector3(1, -1, 3).normalize(), scene);

const gridCount = 10;
const tileWorldSize = 20;
const totalSize = tileWorldSize * gridCount;
const textureSize = 128;
const totalSubdivisions = textureSize * gridCount;

const depthRenderer = scene.enableDepthRenderer(camera, false, true);

const tileStep = tileWorldSize / 5;
const spectra = [
    new PhillipsSpectrum(textureSize, 200, engine),
    new PhillipsSpectrum(textureSize, 35, engine),
    new PhillipsSpectrum(textureSize, 10, engine),
];
spectra[0].settings.windSpeed = 20;
spectra[1].settings.windSpeed = 31;
spectra[2].settings.windSpeed = 10;
spectra[0].settings.windTheta = 0;
spectra[1].settings.windTheta = 1.57;
spectra[2].settings.windTheta = 1.57*3;
spectra.forEach(s => s.updateSettingsGPU());

const waterMaterial = new WaterMaterial("water", spectra, scene, engine);

waterMaterial.setFloat("showNormalMapOverlay", showNormalMapOverlay ? 1.0 : 0.0);
waterMaterial.setTexture("normalMapOverlay", waterMaterial.gradientMap);

const skybox = MeshBuilder.CreateBox("skyBox", { size: camera.maxZ / 2 }, scene);
const skyboxMaterial = new StandardMaterial("skyBox", scene);
skyboxMaterial.backFaceCulling = false;
skyboxMaterial.reflectionTexture = waterMaterial.reflectionTexture;
skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
skyboxMaterial.disableLighting = true;
skybox.material = skyboxMaterial;

const water = MeshBuilder.CreateGround("water", {
    width: totalSize,
    height: totalSize,
    subdivisions: totalSubdivisions
}, scene);
water.material = waterMaterial;

scene.registerBeforeRender(() => {
    const camPos = camera.globalPosition;;
    // const snapSize = totalSize / gridCount;

    const distToWater = Math.max(0.1, camPos.y - water.position.y);
    // water.position.x = Math.floor(camPos.x / snapSize) * snapSize + distToWater*Math.sin(camera.beta - camera.fov/2)*Math.sin(camera.alpha);
    // water.position.z = Math.floor(camPos.z / snapSize) * snapSize + distToWater*Math.sin(camera.beta - camera.fov/2)*Math.cos(camera.alpha);

    const waveScaleCoeff = 40;
    const waveScale = Math.floor(distToWater / waveScaleCoeff) + 1;

    // const t0 = tile0 + tileStep * waveScale;
    // const t1 = tile1 + tileStep * waveScale;
    // const t2 = tile2 + tileStep * waveScale;
    const mu = 25;      // матожидание — пик на 3 метрах
    const sigma = 10; // чем больше, тем шире колокол

    amp0 = Math.exp(-(distToWater+30)/10 - 0.01) / 50;
    amp1 = Math.exp(-0.5 * Math.pow((distToWater - mu) / sigma, 2)) / 50;
    amp2 = Math.log(distToWater + 1) / Math.log(1.2) / 50;
    // amp0 = 0;
    // amp2 = 0;

    // waterMaterial.setWaveParams(t0, t1, t2, amp0, amp1, amp2);
    waterMaterial.setWaveParams(tile0, tile1, tile2, amp0, amp1, amp2);
});

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

// const panel = document.createElement("div");
// panel.style.position = "fixed";
// panel.style.top = "90px";
// panel.style.right = "10px";
// panel.style.zIndex = "1001";
// panel.style.background = "rgba(0,0,0,0.8)";
// panel.style.color = "#fff";
// panel.style.padding = "12px";
// panel.style.borderRadius = "8px";
// panel.style.font = "12px monospace";
// panel.style.display = "flex";
// panel.style.flexDirection = "column";
// panel.style.gap = "6px";
// panel.style.width = "220px";
// document.body.appendChild(panel);

// const title = document.createElement("div");
// title.textContent = "Wave Params";
// title.style.fontWeight = "bold";
// title.style.marginBottom = "4px";
// panel.appendChild(title);

let tile0 = tileWorldSize-tileStep, tile1 = tileWorldSize, tile2 = tileWorldSize + tileStep;
let amp0 = 0.02, amp1 = 0.02, amp2 = 0.02;

// const sliderDefs = [
//     { label: "Tile 0 (small)", uniform: "tile0", min: 0, max: tileWorldSize/15, step: tileWorldSize/15, val: () => tile0, set: (v: number) => { tile0 = v; } },
//     { label: "Tile 1 (medium)", uniform: "tile1", min: tileWorldSize/3, max: tileWorldSize, step: tileWorldSize/3, val: () => tile1, set: (v: number) => { tile1 = v; } },
//     { label: "Tile 2 (large)", uniform: "tile2", min: tileWorldSize/2, max: tileWorldSize*10, step: tileWorldSize/2, val: () => tile2, set: (v: number) => { tile2 = v; } },
//     { label: "Amp 0 (small)", uniform: "amp0", min: 0, max: 0.5, step: 0.001, val: () => amp0, set: (v: number) => { amp0 = v; } },
//     { label: "Amp 1 (medium)", uniform: "amp1", min: 0, max: 0.05, step: 0.001, val: () => amp1, set: (v: number) => { amp1 = v; } },
//     { label: "Amp 2 (large)", uniform: "amp2", min: 0, max: 0.05, step: 0.001, val: () => amp2, set: (v: number) => { amp2 = v; } },
// ];
// 
// sliderDefs.forEach((def) => {
//     const row = document.createElement("div");
//     row.style.display = "flex";
//     row.style.alignItems = "center";
//     row.style.gap = "6px";

//     const label = document.createElement("label");
//     label.textContent = def.label;
//     label.style.width = "90px";
//     label.style.fontSize = "10px";

//     const input = document.createElement("input");
//     input.type = "range";
//     input.min = String(def.min);
//     input.max = String(def.max);
//     input.step = String(def.step);
//     input.value = String(def.val());
//     input.style.flex = "1";
//     input.style.height = "14px";

//     const valueDisplay = document.createElement("span");
//     valueDisplay.textContent = String(def.val());
//     valueDisplay.style.width = "36px";
//     valueDisplay.style.textAlign = "right";
//     valueDisplay.style.fontSize = "10px";

//     input.addEventListener("input", () => {
//         const v = parseFloat(input.value);
//         valueDisplay.textContent = String(v);
//         def.set(v);
//     });

//     row.appendChild(label);
//     row.appendChild(input);
//     row.appendChild(valueDisplay);
//     panel.appendChild(row);
// });

// const resetBtn = document.createElement("button");
// resetBtn.textContent = "Reset";
// resetBtn.style.marginTop = "4px";
// resetBtn.style.padding = "4px";
// resetBtn.style.background = "#444";
// resetBtn.style.color = "#fff";
// resetBtn.style.border = "none";
// resetBtn.style.borderRadius = "4px";
// resetBtn.style.cursor = "pointer";
// resetBtn.onclick = () => {
//     tile0 = tileWorldSize/3; tile1 = tileWorldSize/2; tile2 = tileWorldSize;
//     amp0 = 0.02; amp1 = 0.02; amp2 = 0.02;
//     const inputs = panel.querySelectorAll("input[type=range]");
//     inputs.forEach((inp, i) => {
//         (inp as HTMLInputElement).value = String(sliderDefs[i].val());
//         const span = (inp as HTMLInputElement).nextElementSibling as HTMLSpanElement;
//         if (span) span.textContent = String(sliderDefs[i].val());
//     });
// };
// panel.appendChild(resetBtn);

scene.executeWhenReady(() => {

    engine.loadingScreen.hideLoadingUI();
    scene.registerBeforeRender(() => updateScene());

    let lastFpsPrint = performance.now();
    let frameCount = 0;
    let lastFps = 0;

    // WebGPU GPUQuerySet (timing)

    // WebGPU types fallback for TS
    const gpu = (navigator as any).gpu || (window as any).gpu;
    const GPUBufferUsage = gpu?.BufferUsage || { MAP_READ: 0x0001, COPY_SRC: 0x0004, QUERY_RESOLVE: 0x8000 };
    const GPUMapMode = gpu?.MapMode || { READ: 0x0001 };

    let gpuQuerySet: GPUQuerySet | null = null;
    let gpuDevice: GPUDevice | null = null;
    if (engine._device && "createQuerySet" in engine._device) {
        gpuDevice = engine._device as GPUDevice;
        try { gpuQuerySet = gpuDevice.createQuerySet({ type: "timestamp", count: 2 }); } catch {}
    }
    let queryBuffer: GPUBuffer | null = null;
    if (gpuDevice && gpuQuerySet) {
        queryBuffer = gpuDevice.createBuffer({
            size: 16,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_READ,
            mappedAtCreation: false
        });
    }
    let gpuTimeMs = 0;

    engine.runRenderLoop(async () => {
        if (gpuDevice && gpuQuerySet && gpuDevice.createCommandEncoder) {
            const encoder = gpuDevice.createCommandEncoder();
            if ((encoder as any).writeTimestamp) (encoder as any).writeTimestamp(gpuQuerySet, 0);
            if (gpuDevice.queue && gpuDevice.queue.submit) gpuDevice.queue.submit([encoder.finish()]);
        }

        scene.render();
        frameCount++;

        // const gradientMaps = [
        //     waterMaterial.gradientMap,
        //     waterMaterial.gradientMap1,
        //     waterMaterial.gradientMap2,
        // ];

        // for (let i = 0; i < 3; i++) {
        //     const ctx = normalCtxs[i];
        //     const gmap = gradientMaps[i];
        //     if (ctx && gmap && gmap.isReady()) {
        //         (async () => {
        //             const size = gmap.getSize().width;
        //             const buffer = (await gmap.readPixels(0, 0, null, true, true)) as Float32Array;
        //             if (!buffer) return;
        //             const imageData = ctx.createImageData(normalSize, normalSize);
        //             for (let y = 0; y < normalSize; y++) {
        //                 for (let x = 0; x < normalSize; x++) {
        //                     const u = x / (normalSize - 1);
        //                     const v = y / (normalSize - 1);
        //                     const ix = Math.floor(u * (size - 1));
        //                     const iy = Math.floor(v * (size - 1));
        //                     const idx = (iy * size + ix) * 2;
        //                     let nx = buffer[idx];
        //                     let nz = buffer[idx + 1];
        //                     nx = Math.max(-1, Math.min(1, nx));
        //                     nz = Math.max(-1, Math.min(1, nz));
        //                     const r = Math.floor((nx * 0.5 + 0.5) * 255);
        //                     const g = 128;
        //                     const b = Math.floor((nz * 0.5 + 0.5) * 255);
        //                     const a = 255;
        //                     const id = (y * normalSize + x) * 4;
        //                     imageData.data[id] = r;
        //                     imageData.data[id + 1] = g;
        //                     imageData.data[id + 2] = b;
        //                     imageData.data[id + 3] = a;
        //                 }
        //             }
        //             ctx.putImageData(imageData, 0, 0);
        //         })();
        //     }
        // }

        if (gpuDevice && gpuQuerySet && queryBuffer && gpuDevice.createCommandEncoder) {
            const encoder = gpuDevice.createCommandEncoder();
            if ((encoder as any).writeTimestamp) (encoder as any).writeTimestamp(gpuQuerySet, 1);
            if ((encoder as any).resolveQuerySet) (encoder as any).resolveQuerySet(gpuQuerySet, 0, 2, queryBuffer, 0);
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
        const distToWater = camera.globalPosition.y - water.position.y;
        const waveScaleCoeff = 40;
        const waveScale = Math.floor(distToWater / waveScaleCoeff) + 1;

        if (now - lastFpsPrint > 1000) {
            lastFps = frameCount;
            console.log("FPS:", lastFps, gpuTimeMs ? `| GPU frame: ${gpuTimeMs.toFixed(2)} ms` : "");
            console.log("Высота:", distToWater.toFixed(1), "м | Scale:", waveScale);
            console.log("tile:", tile0 + tileStep * waveScale, tile1 * waveScale, tile2 * waveScale);
            console.log("amp:", amp0, amp1, amp2);
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
