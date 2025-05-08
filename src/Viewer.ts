import powerbi from "powerbi-visuals-api";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import { Metadata, ModelLoader } from "./ModelLoader";
import { FragmentIdMap } from "@thatopen/fragments";

/**
 * The Viewer class is responsible for rendering the 3D model in the Power BI visual.
 */
export class Viewer {
	components: OBC.Components;
	container: HTMLDivElement;
	fragmentManager: OBC.FragmentsManager;
	// allFragmentsIdMap: FragmentIdMap;
	fileName: string; // The name of the file to be loaded from the server
	modelLoaded: boolean = false;
	selectionIdMap: Map<string, ISelectionId> = new Map(); // map of GUID to selectionId
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.WebGLRenderer;
	controls: OrbitControls;
	errorMessage: string;

	private world: OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>;
	private target: HTMLElement;
	private selectionManager: ISelectionManager;

	private selectionColor: THREE.Color = new THREE.Color("#00639c");
	private hoverColor: THREE.Color = new THREE.Color("#328da8");
	private highlighter: OBF.Highlighter;
	private hider: OBC.Hider;

	/**
	 * Constructor for the Viewer class. Sets up the viewer ready to load a model.
	 * Does not load a model.
	 * @param target The target element to render the viewer in
	 */
	constructor(target: HTMLElement, selectionManager: ISelectionManager) {
		console.log("Viewer constructor");
		this.components = new OBC.Components();
		this.fragmentManager = this.components.get(OBC.FragmentsManager);

		// this.highlighter = this.components.get(OBF.Highlighter);
		this.hider = this.components.get(OBC.Hider);
		this.target = target;
		this.selectionManager = selectionManager;
		this.initScene();
	}

	dispose() {
		this.components.dispose();
	}

	/**
	 * Sets up the scene and adds an empty world to the container
	 * We have to setup using OBC to be able to use the hider and highlighter
	 * But we override the camere, renderer and scene to make it easier to manage
	 * OBC exposes the threejs object by setting the 'three' property
	 */
	private initScene() {
		console.log("initScene");
		this.container = document.createElement("div");
		this.container.className = "full-screen";
		this.container.style.zIndex = "2000";
		this.target.appendChild(this.container);

		const worlds = this.components.get(OBC.Worlds);
		this.world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();
		this.world.scene = new OBC.SimpleScene(this.components);
		this.world.renderer = new OBC.SimpleRenderer(this.components, this.container, {
			powerPreference: "high-performance",
			antialias: false,
			alpha: false,
		});
		this.world.camera = new OBC.SimpleCamera(this.components);

		this.components.init();

		this.world.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);
		this.world.scene.setup();
		this.world.scene.three.background = new THREE.Color("#ffffff");

		const controls = this.world.camera.controls;
		// disable the controls from that open company
		controls.enabled = false;
		// Get the underlying THREE.js elements
		const camera = this.world.camera.three;
		const renderer = this.world.renderer.three;

		// Create our own OrbitControls instance
		this.controls = new OrbitControls(camera, renderer.domElement);
		this.controls.enableDamping = false;
		this.controls.minDistance = 1;
		this.controls.maxDistance = 500;

		// Performance optimizations for renderer
		renderer.setPixelRatio(window.devicePixelRatio || 1);
		renderer.setSize(this.container.clientWidth, this.container.clientHeight);

		// Only render when needed
		let needsUpdate = true;
		this.controls.addEventListener("change", () => {
			needsUpdate = true;
		});

		// Optimized animation loop
		const animate = () => {
			requestAnimationFrame(animate);

			// Only update and render if something changed
			// This prevents the renderer from rendering still images
			if (needsUpdate) {
				this.controls.update();
				renderer.render(this.world.scene.three, camera);
				needsUpdate = false;
			}
		};
		animate();

		this.setupHighlighter();
	}

	private createResetButton() {
		// check if the button already exists
		const existingButton = document.querySelector(".reset-button");
		if (existingButton) return;

		const resetButton = document.createElement("button");
		resetButton.innerHTML = "Reset View";
		resetButton.style.position = "absolute";
		resetButton.style.top = "10px";
		resetButton.style.left = "10px";
		resetButton.style.zIndex = "2001";
		resetButton.style.padding = "5px 10px";
		resetButton.style.backgroundColor = "#ffffff";
		resetButton.style.border = "none";
		resetButton.style.borderRadius = "3px";
		resetButton.style.cursor = "pointer";
		resetButton.style.fontSize = "10px";

		// Add hover effect
		resetButton.addEventListener("mouseover", () => {
			resetButton.style.backgroundColor = "#f0f0f0";
		});
		resetButton.addEventListener("mouseout", () => {
			resetButton.style.backgroundColor = "#ffffff";
		});

		// Add click handler
		resetButton.addEventListener("click", () => {
			this.reset();
		});

		this.container.appendChild(resetButton);
	}

	private createMetadataFooter(metadata: Metadata) {
		const existingFooter = document.querySelector(".metadata-footer");
		if (existingFooter) {
			existingFooter.remove();
		}

		//use format dd/mm/yyyy HH:mm:ss (24h)
		const formattedTimestamp = new Date(metadata.timestamp).toLocaleString("en-GB", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});

		const metadataFooter = document.createElement("div");
		metadataFooter.className = "metadata-footer";
		metadataFooter.style.position = "absolute";
		metadataFooter.style.bottom = "0";
		metadataFooter.style.left = "0";
		metadataFooter.style.right = "0";
		metadataFooter.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
		metadataFooter.style.padding = "8px";
		metadataFooter.style.display = "flex";
		metadataFooter.style.justifyContent = "space-around";
		metadataFooter.style.borderTop = "1px solid #cccccc";
		metadataFooter.style.fontSize = "12px";
		metadataFooter.innerHTML = `
			<span>File: ${metadata.file}</span>
			<span>Project: ${metadata.project}</span>
			<span>Timestamp: ${formattedTimestamp}</span>
		`;

		this.container.appendChild(metadataFooter);
	}
	/**
	 * Sets up the highlighter for the model to allow user selection
	 */
	private setupHighlighter() {
		console.log("setupHighlighter");
		if (!this.world) return;

		this.highlighter = this.components.get(OBF.Highlighter);
		this.highlighter.zoomToSelection = true;

		// const randomSelectionName = Math.random().toString(36).substring(2, 15);
		this.highlighter.config.hoverColor = this.hoverColor;
		this.highlighter.config.selectionColor = this.selectionColor;
		console.log("setting up highlighter");

		const config: Partial<OBF.HighlighterConfig> = {
			world: this.world,
		};
		this.highlighter.setup(config);
		console.log("highlighter was setup");

		// this is hardcoded into the library
		const selectEvent = this.highlighter.events["select"];

		selectEvent.onHighlight.add(async (fragmentIdMap) => {
			// no need to clear selection here, as it will be cleared each time before this event is called
			await this.setPowerBiSelection(fragmentIdMap);
		});

		selectEvent.onClear.add(async () => {
			await this.clearPowerBiSelection();
		});
	}

	/**
	 * Highlights the selection in the viewer
	 * @param globalIds The global IDs of the objects to highlight
	 */
	highlight(globalIds: string[]) {
		console.log("highlight");
		console.log("incoming ids: ", globalIds.length);
		const fragmentIdMap = this.fragmentManager.guidToFragmentIdMap(globalIds);

		// Count the number of fragments (keys in the map)
		const count = fragmentIdMap ? Object.keys(fragmentIdMap).length : 0;
		console.log("corresponding fragments found: ", count);
		if (!fragmentIdMap) return; // temp solution to workaround async loadModel not finished yet
		// this.addSelection("select");
		// this._highlighter.highlightByID("select", fragmentIdMap);
		this.hider.isolate(fragmentIdMap);
	}

	/**
	 * Resets the selection in the viewer
	 */
	reset() {
		// this.clearSelection("select");
		this.hider.set(true);
	}

	/**
	 * Sets the selection in Power BI based on a fragmentIdMap. This will filter the dashboard based on the selected objects.
	 * @param fragmentIdMap The fragmentIdMap to set the selection from
	 */
	async setPowerBiSelection(fragmentIdMap: FragmentIdMap) {
		console.log("setPowerBiSelection");
		if (!fragmentIdMap) return;
		const globalIds = this.fragmentManager.fragmentIdMapToGuids(fragmentIdMap);

		if (globalIds) {
			const filteredGlobalIds = globalIds.filter((id) => this.selectionIdMap.has(id));
			const selectionIds = filteredGlobalIds.map((globalId) => this.selectionIdMap.get(globalId));
			if (selectionIds.length > 0) {
				await this.selectionManager.select(selectionIds);
				// console.log("selectionIds", selectionIds);
			}
		}
	}

	/**
	 * Clears the selection in Power BI. This will remove any filters applied to the dashboard.
	 */
	async clearPowerBiSelection() {
		console.log("clearPowerBiSelection");
		await this.selectionManager.clear();
	}

	/**
	 * Load the model from the server and add it to the scene
	 * @param fileName The name of the file to be loaded from the server
	 * @param ifc If true, the model is an IFC file
	 * @param apiKey The API key to be used to authenticate the request
	 * @param serverUrl The server URL to be used to load the file
	 */
	async loadModel(fileName: string, apiKey: string, serverUrl: string) {
		console.log("Starting model load for file:", fileName);
		const loader = new ModelLoader(fileName, apiKey, serverUrl);

		let fileData;
		try {
			fileData = await loader.loadFragments();
		} catch (error) {
			console.error("Failed to load fragments:", error);
			this.errorMessage = loader.errorMessage;
			throw error;
		}
		if (fileData) {
			console.log("Fragments loaded, creating fragments group");
			const fragmentsGroup = this.fragmentManager.load(fileData.file);

			if (!fragmentsGroup) {
				console.error("Failed to create fragments group");
				return;
			}

			// Log the fragments group details
			console.log("Fragments group created:", {
				items: fragmentsGroup.items.length,
				coordinationMatrix: fragmentsGroup.coordinationMatrix,
			});

			// Reset camera position to default
			this.world.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);

			// Clear any existing fragments from the scene
			this.world.scene.three.children.forEach((child) => {
				if (child instanceof THREE.Group) {
					console.log("removing child", child);
					this.world.scene.three.remove(child);
				}
			});

			// Add the fragments group to the scene
			this.world.scene.three.add(fragmentsGroup);

			// this.setupHighlighter();

			this.modelLoaded = true;
			console.log("Loading model finished, fragments group added to scene");
			console.log("Scene children count:", this.world.scene.three.children.length);
			console.log("Scene children:", this.world.scene.three.children);
			this.createResetButton();
			this.createMetadataFooter(fileData.metadata);
		} else {
			console.error("Failed to load fragments");
		}
	}

	async unloadModel() {
		this.world.scene.three.children.forEach((child) => {
			if (child instanceof THREE.Group) {
				this.world.scene.three.remove(child);
			}
		});
	}
}
