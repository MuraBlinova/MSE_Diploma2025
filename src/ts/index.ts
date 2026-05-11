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
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { Effect } from "@babylonjs/core/Materials/effect";
import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import { WaterMaterial } from "./waterMaterial";
import { PhillipsSpectrum } from "./spectrum/phillipsSpectrum";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import postProcessCode from "../shaders/smallPostProcess.glsl";

// ───────────────────────────────────
// UI: Normal map toggle
// ───────────────────────────────────
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

// ───────────────────────────────────
// UI: Tile borders toggle
// ───────────────────────────────────
let showTileBorders = false;
const tileBorderToggle = document.createElement("button");
tileBorderToggle.textContent = "tile borders";
tileBorderToggle.style.position = "fixed";
tileBorderToggle.style.top = "90px";
tileBorderToggle.style.right = "10px";
tileBorderToggle.style.zIndex = "1001";
tileBorderToggle.style.padding = "8px 16px";
tileBorderToggle.style.background = "#222";
tileBorderToggle.style.color = "#fff";
tileBorderToggle.style.border = "none";
tileBorderToggle.style.borderRadius = "6px";
tileBorderToggle.style.cursor = "pointer";
tileBorderToggle.onclick = () => {
    showTileBorders = !showTileBorders;
    if (waterMaterial) {
        waterMaterial.setFloat("showTileBorders", showTileBorders ? 1.0 : 0.0);
    }
};
document.body.appendChild(tileBorderToggle);

// ───────────────────────────────────
// UI: Normal map overlay (bottom-right)
// ───────────────────────────────────
// const normalSize = 200;
// const normalCanvas = document.createElement("canvas");
// normalCanvas.width = normalSize;
// normalCanvas.height = normalSize;
// normalCanvas.style.position = "fixed";
// normalCanvas.style.right = "10px";
// normalCanvas.style.bottom = "10px";
// normalCanvas.style.border = "2px solid #333";
// normalCanvas.style.background = "#111";
// normalCanvas.style.zIndex = "1001";
// document.body.appendChild(normalCanvas);
// const normalCtx = normalCanvas.getContext("2d")!;

// ───────────────────────────────────
// Canvas & Engine
// ───────────────────────────────────
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

// ───────────────────────────────────
// Camera
// ───────────────────────────────────
const camera = new ArcRotateCamera("camera", 3.14 / 3, 0.02 + 3.14 / 2, 15, new Vector3(0, 1.5, 0), scene);
camera.wheelPrecision = 100;
camera.angularSensibilityX = 3000;
camera.angularSensibilityY = 3000;
camera.lowerRadiusLimit = 2;
camera.attachControl();

// WASD movement
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
    let moveX = 0, moveZ = 0;
    if (keys["w"]) { moveX -= forwardX; moveZ -= forwardZ; }
    if (keys["s"]) { moveX += forwardX; moveZ += forwardZ; }
    if (keys["a"]) { moveX -= rightX; moveZ -= rightZ; }
    if (keys["d"]) { moveX += rightX; moveZ += rightZ; }
    if (moveX !== 0 || moveZ !== 0) {
        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        camera.target.addInPlaceFromFloats(moveX / len * speed, 0, moveZ / len * speed);
    }
});

// ───────────────────────────────────
// Light
// ───────────────────────────────────
const light = new DirectionalLight("light", new Vector3(1, -1, 3).normalize(), scene);

// ───────────────────────────────────
// Water mesh settings
// ───────────────────────────────────
const gridCount = 5;
const tileWorldSize = 20;
const totalSize = tileWorldSize * gridCount;    
const textureSize = 128;
const totalSubdivisions = textureSize * gridCount;

// ───────────────────────────────────
// Spectra
// ───────────────────────────────────
const spectra = [
    new PhillipsSpectrum(textureSize, 10, engine),
    new PhillipsSpectrum(textureSize, 10, engine),
    new PhillipsSpectrum(textureSize, 10, engine),
];
spectra[0].settings.windSpeed = 2;
spectra[1].settings.windSpeed = 3;
spectra[2].settings.windSpeed = 1;
spectra[0].settings.windTheta = 0;
spectra[1].settings.windTheta = 0.785;
spectra[2].settings.windTheta = 1.57 * 3;
spectra.forEach(s => s.updateSettingsGPU());

// ───────────────────────────────────
// Water material
// ───────────────────────────────────
const waterMaterial = new WaterMaterial("water", spectra, scene, engine);
waterMaterial.setFloat("showNormalMapOverlay", showNormalMapOverlay ? 1.0 : 0.0);
waterMaterial.setFloat("showTileBorders", showTileBorders ? 1.0 : 0.0);
waterMaterial.setTexture("normalMapOverlay", waterMaterial.gradientMap);

// ───────────────────────────────────
// Skybox
// ───────────────────────────────────
const skybox = MeshBuilder.CreateBox("skyBox", { size: camera.maxZ / 2 }, scene);
const skyboxMaterial = new StandardMaterial("skyBox", scene);
skyboxMaterial.backFaceCulling = false;
skyboxMaterial.reflectionTexture = waterMaterial.reflectionTexture;
skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
skyboxMaterial.disableLighting = true;
skybox.material = skyboxMaterial;

// ───────────────────────────────────
// Water mesh
// ───────────────────────────────────
const water = MeshBuilder.CreateGround("water", {
    width: totalSize,
    height: totalSize,
    subdivisions: totalSubdivisions
}, scene);
water.material = waterMaterial;

// ───────────────────────────────────
// Wave parameters
// ───────────────────────────────────

scene.registerBeforeRender(() => {
    const distToWater = Math.max(0.1, camera.globalPosition.y - water.position.y);

    let amp0 = 0.005;
    let amp1 = 0.003;
    let amp2 = 0.25;

    const t0 = 20.0 * Math.atan((distToWater - 500.0) / 100.0) + 30.0;
    const t1 = 20.0 * Math.atan((distToWater - 500.0) / 100.0) + 30.0;
    const t2 = 20.0 * Math.atan((distToWater - 500.0) / 100.0) + 30.0;
    waterMaterial.setAllWaveParams(
        t0, t0*2, t0*8,   amp0, amp1, amp2,
        t1, t1*2, t1*8,   amp0, amp1, amp2,
        t2, t2*2, t2*8,   amp0, amp1, amp2
    );
});

// ───────────────────────────────────
// Post process
// ───────────────────────────────────
const depthRenderer = scene.enableDepthRenderer(camera, false, true);
Effect.ShadersStore[`PostProcess1FragmentShader`] = postProcessCode;
const postProcess = new PostProcess(
    "postProcess1", "PostProcess1",
    ["cameraInverseView", "cameraInverseProjection", "cameraPosition"],
    ["textureSampler", "depthSampler"],
    1, camera, Texture.BILINEAR_SAMPLINGMODE, engine
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

// ───────────────────────────────────
// Render loop
// ───────────────────────────────────
scene.executeWhenReady(() => {
    engine.loadingScreen.hideLoadingUI();
    scene.registerBeforeRender(() => updateScene());

    let lastFpsPrint = performance.now();
    let frameCount = 0;

    engine.runRenderLoop(() => {
        scene.render();
        frameCount++;

        // if (normalCtx && waterMaterial.gradientMap.isReady() && frameCount % 60 === 0) {
        //     (async () => {
        //         const size = waterMaterial.gradientMap.getSize().width;
        //         const buffer = (await waterMaterial.gradientMap.readPixels(0, 0, null, true, true)) as Float32Array;
        //         if (!buffer) return;
        //         const imageData = normalCtx.createImageData(normalSize, normalSize);
        //         for (let y = 0; y < normalSize; y++) {
        //             for (let x = 0; x < normalSize; x++) {
        //                 const u = x / (normalSize - 1);
        //                 const v = y / (normalSize - 1);
        //                 const ix = Math.floor(u * (size - 1));
        //                 const iy = Math.floor(v * (size - 1));
        //                 const idx = (iy * size + ix) * 2;
        //                 let nx = buffer[idx];
        //                 let nz = buffer[idx + 1];
        //                 nx = Math.max(-1, Math.min(1, nx));
        //                 nz = Math.max(-1, Math.min(1, nz));
        //                 const r = Math.floor((nx * 0.5 + 0.5) * 255);
        //                 const g = 128;
        //                 const b = Math.floor((nz * 0.5 + 0.5) * 255);
        //                 const id = (y * normalSize + x) * 4;
        //                 imageData.data[id] = r;
        //                 imageData.data[id + 1] = g;
        //                 imageData.data[id + 2] = b;
        //                 imageData.data[id + 3] = 255;
        //             }
        //         }
        //         normalCtx.putImageData(imageData, 0, 0);
        //     })();
        // }

        const now = performance.now();
        if (now - lastFpsPrint > 1000) {
            console.log("FPS:", frameCount);
            fpsOverlay.textContent = `FPS: ${frameCount}`;
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
