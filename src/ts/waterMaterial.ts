import fragment from "../shaders/waterMaterial/fragment.glsl";
import vertex from "../shaders/waterMaterial/vertex.glsl";

import { Scene } from "@babylonjs/core/scene";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { IFFT } from "./utils/IFFT";
import { createStorageTexture } from "./utils/utils";
import { DynamicSpectrum } from "./spectrum/dynamicSpectrum";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Effect } from "@babylonjs/core/Materials/effect";
import { Constants } from "@babylonjs/core/Engines/constants";
import { InitialSpectrum } from "./spectrum/initialSpectrum";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import { DepthRenderer } from "@babylonjs/core/Rendering/depthRenderer";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";

import TropicalSunnyDay_px from "../assets/skybox/TropicalSunnyDay_px.jpg";
import TropicalSunnyDay_py from "../assets/skybox/TropicalSunnyDay_py.jpg";
import TropicalSunnyDay_pz from "../assets/skybox/TropicalSunnyDay_pz.jpg";
import TropicalSunnyDay_nx from "../assets/skybox/TropicalSunnyDay_nx.jpg";
import TropicalSunnyDay_ny from "../assets/skybox/TropicalSunnyDay_ny.jpg";
import TropicalSunnyDay_nz from "../assets/skybox/TropicalSunnyDay_nz.jpg";

/**
 * The material that makes all the magic happen. Its vertex shader deforms the water mesh according to the height map
 * computed using IFFT. The fragment shader makes is look like water.
 */
export class WaterMaterial extends ShaderMaterial {
    /**
     * The size of the textures used in the simulation. Higher values are more accurate but slower to compute.
     */
    readonly textureSize: number;

    readonly reflectionTexture: CubeTexture;

    private spectra: InitialSpectrum[];
    private dynamics: DynamicSpectrum[] = [];
    private iffts: IFFT[] = [];

    readonly heightMap: BaseTexture;

    /**
     * The gradient map is used to compute the normals of the water mesh in order to shade it properly.
     * It is computed using the IFFT of the dynamic spectrum.
     */
    readonly gradientMap: BaseTexture;
    readonly gradientMap1: BaseTexture;
    readonly gradientMap2: BaseTexture;
    /**
     * The displacement map is used to achieve the "Choppy waves" effect described in Tessendorf's paper.
     * It helps to make sharper wave crests and smoother troughs.
     * It is computed using the IFFT of the dynamic spectrum.
     */
    readonly displacementMap: BaseTexture;

    readonly heightMap1: BaseTexture;
    readonly displacementMap1: BaseTexture;
    readonly heightMap2: BaseTexture;
    readonly displacementMap2: BaseTexture;

    readonly depthRenderer: DepthRenderer;

    readonly screenRenderTarget: RenderTargetTexture;

    /**
     * The elapsed time in seconds since the simulation started.
     * Starting at 0 creates some visual artefacts, so we start at 1 min to avoid them.
     * @private
     */
    private elapsedSeconds = 60;

    constructor(name: string, spectra: InitialSpectrum[], scene: Scene, engine: WebGPUEngine) {
        if (Effect.ShadersStore["oceanVertexShader"] === undefined) {
            Effect.ShadersStore["oceanVertexShader"] = vertex;
        }
        if (Effect.ShadersStore["oceanFragmentShader"] === undefined) {
            Effect.ShadersStore["oceanFragmentShader"] = fragment;
        }

        super(name, scene, "ocean", {
            attributes: ["position", "normal", "uv"],
            uniforms: [
                "world", "worldView", "worldViewProjection", "view", "projection",
                "cameraPositionW", "lightDirection",
                "uTiles", "uAmps",
                "showNormalMapOverlay"
            ],
            samplers: [
                "heightMap", "displacementMap",
                "heightMap1", "displacementMap1",
                "heightMap2", "displacementMap2",
                "reflectionSampler", "depthSampler", "textureSampler",
                "normalMapOverlay"
            ]
        });

        this.spectra = spectra;
        this.textureSize = spectra[0].textureSize;

        for (let i = 0; i < 3; i++) {
            const dyn = new DynamicSpectrum(spectra[i], engine);
            const ifft = new IFFT(engine, spectra[i].textureSize);
            this.dynamics.push(dyn);
            this.iffts.push(ifft);
        }

        this.heightMap = createStorageTexture("heightBuffer0", engine, this.textureSize, this.textureSize, Constants.TEXTUREFORMAT_RG);
        this.gradientMap = createStorageTexture("gradientBuffer0", engine, this.textureSize, this.textureSize, Constants.TEXTUREFORMAT_RG);
        this.displacementMap = createStorageTexture("displacementBuffer0", engine, this.textureSize, this.textureSize, Constants.TEXTUREFORMAT_RG);

        this.heightMap1 = createStorageTexture("heightBuffer1", engine, this.textureSize, this.textureSize, Constants.TEXTUREFORMAT_RG);
        this.gradientMap1 = createStorageTexture("gradientBuffer1", engine, this.textureSize, this.textureSize, Constants.TEXTUREFORMAT_RG);
        this.displacementMap1 = createStorageTexture("displacementBuffer1", engine, this.textureSize, this.textureSize, Constants.TEXTUREFORMAT_RG);
        
        this.heightMap2 = createStorageTexture("heightBuffer2", engine, this.textureSize, this.textureSize, Constants.TEXTUREFORMAT_RG);
        this.gradientMap2 = createStorageTexture("gradientBuffer2", engine, this.textureSize, this.textureSize, Constants.TEXTUREFORMAT_RG);
        this.displacementMap2 = createStorageTexture("displacementBuffer2", engine, this.textureSize, this.textureSize, Constants.TEXTUREFORMAT_RG);


        this.heightMap.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.heightMap.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.gradientMap.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.gradientMap.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.displacementMap.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.displacementMap.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
        
        this.heightMap1.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.heightMap1.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.gradientMap1.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.gradientMap1.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.displacementMap1.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.displacementMap1.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
        
        this.heightMap2.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.heightMap2.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.gradientMap2.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.gradientMap2.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.displacementMap2.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.displacementMap2.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;

        this.setTexture("heightMap", this.heightMap);
        this.setTexture("displacementMap", this.displacementMap);
        this.setTexture("heightMap1", this.heightMap1);
        this.setTexture("displacementMap1", this.displacementMap1);
        this.setTexture("heightMap2", this.heightMap2);
        this.setTexture("displacementMap2", this.displacementMap2);

        this.depthRenderer = scene.enableDepthRenderer(scene.activeCamera, false, true);
        this.setTexture("depthSampler", this.depthRenderer.getDepthMap());

        this.screenRenderTarget = new RenderTargetTexture("screenTexture", { ratio: engine.getRenderWidth() / engine.getRenderHeight() }, scene);
        scene.customRenderTargets.push(this.screenRenderTarget);
        this.setTexture("textureSampler", this.screenRenderTarget);

        this.reflectionTexture = new CubeTexture("", scene, null, false, [
            TropicalSunnyDay_px, TropicalSunnyDay_py, TropicalSunnyDay_pz,
            TropicalSunnyDay_nx, TropicalSunnyDay_ny, TropicalSunnyDay_nz
        ]);
        this.setTexture("reflectionSampler", this.reflectionTexture);

        this.setVector3("uTiles", new Vector3(
            spectra[0].tileSize,
            spectra[1].tileSize,
            spectra[2].tileSize
        ));
        this.setVector3("uAmps", new Vector3(0.02, 0.02, 0.02));
    }

    public setWaveParams(tile0: number, tile1: number, tile2: number, amp0: number, amp1: number, amp2: number): void {
        this.setVector3("uTiles", new Vector3(tile0, tile1, tile2));
        this.setVector3("uAmps", new Vector3(amp0, amp1, amp2));
    }

    public update(deltaSeconds: number, lightDirection: Vector3) {
        this.elapsedSeconds += deltaSeconds;

        for (let i = 0; i < 3; i++) {
            this.dynamics[i].generate(this.elapsedSeconds);
        }

        this.iffts[0].applyToTexture(this.dynamics[0].ht, this.heightMap);
        this.iffts[0].applyToTexture(this.dynamics[0].dht, this.gradientMap);
        this.iffts[0].applyToTexture(this.dynamics[0].displacement, this.displacementMap);

        this.iffts[1].applyToTexture(this.dynamics[1].ht, this.heightMap1);
        this.iffts[1].applyToTexture(this.dynamics[1].dht, this.gradientMap1);
        this.iffts[1].applyToTexture(this.dynamics[1].displacement, this.displacementMap1);
        
        this.iffts[2].applyToTexture(this.dynamics[2].ht, this.heightMap2);
        this.iffts[2].applyToTexture(this.dynamics[2].dht, this.gradientMap2);
        this.iffts[2].applyToTexture(this.dynamics[2].displacement, this.displacementMap2);

        const allNonWaterMeshes = this.getScene().meshes.filter(m => m.material !== this);
        this.depthRenderer.getDepthMap().renderList = allNonWaterMeshes;
        this.screenRenderTarget.renderList = allNonWaterMeshes;

        const activeCamera = this.getScene().activeCamera;
        if (activeCamera === null) throw new Error("No active camera");
        this.setVector3("cameraPositionW", activeCamera.globalPosition);
        this.setVector3("lightDirection", lightDirection);
    }

    public dispose(forceDisposeEffect?: boolean, forceDisposeTextures?: boolean, notBoundToMesh?: boolean) {
        this.dynamics.forEach(d => d.dispose());
        this.iffts.forEach(i => i.dispose());
        this.heightMap.dispose();
        this.gradientMap.dispose();
        this.displacementMap.dispose();
        this.heightMap1.dispose();
        this.gradientMap1.dispose();
        this.displacementMap1.dispose();
        this.heightMap2.dispose();
        this.gradientMap2.dispose();
        this.displacementMap2.dispose();
        super.dispose(forceDisposeEffect, forceDisposeTextures, notBoundToMesh);
    }
}