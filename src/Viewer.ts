import powerbi from "powerbi-visuals-api";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import { ModelLoader } from "./ModelLoader";
import { FragmentIdMap } from "@thatopen/fragments";

/**
 * The Viewer class is responsible for rendering the 3D model in the Power BI visual.
 */
export class Viewer {
	components = new OBC.Components();
	container: HTMLDivElement;
	fragmentManager = this.components.get(OBC.FragmentsManager);
	// allFragmentsIdMap: FragmentIdMap;
	highlighter = this.components.get(OBF.Highlighter);
	hider = this.components.get(OBC.Hider);
	fileName: string; // The name of the file to be loaded from the server
	modelLoaded: boolean = false;
	selectionIdMap: Map<string, ISelectionId> = new Map(); // map of GUID to selectionId
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.WebGLRenderer;
	controls: OrbitControls;

	private _target: HTMLElement;
	private _selectionManager: ISelectionManager;

	private _selectionColor: THREE.Color = new THREE.Color("#00639c");
	private _hoverColor: THREE.Color = new THREE.Color("#328da8");

	/**
	 * Constructor for the Viewer class. Sets up the viewer ready to load a model.
	 * Does not load a model.
	 * @param target The target element to render the viewer in
	 */
	constructor(target: HTMLElement, selectionManager: ISelectionManager) {
		this._target = target;
		this._selectionManager = selectionManager;
		this.initScene();
		// this.setupHighlighter();
		// this.setupHider();
	}

	/**
	 * Sets up the scene and adds an empty world to the container
	 */
	private initScene() {
		console.log("initScene");
		this.container = document.createElement("div");
		this.container.className = "full-screen";
		this.container.style.zIndex = "2000";
		this._target.appendChild(this.container);

		this.scene = new THREE.Scene();
		// this.setupHighlighter();

		// Get container dimensions instead of window dimensions
		const width = this.container.clientWidth;
		const height = this.container.clientHeight;
		this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		this.camera.position.set(0, 0, 10);
		this.scene.add(this.camera);
		// transparent background
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(width, height);
		this.container.appendChild(this.renderer.domElement);

		// Add basic lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(0, 1, 0);
		this.scene.add(directionalLight);

		// Add OrbitControls
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = false; // adds smooth inertia effect
		this.controls.minDistance = 1;
		this.controls.maxDistance = 500;

		// Add window resize handler
		window.addEventListener("resize", this.onWindowResize.bind(this));

		this.animate();
	}

	private onWindowResize() {
		const width = this.container.clientWidth;
		const height = this.container.clientHeight;

		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize(width, height);
	}

	private animate() {
		requestAnimationFrame(this.animate.bind(this));

		// Update controls in animation loop
		this.controls.update();

		this.renderer.render(this.scene, this.camera);
	}

	/**
	 * Sets up the highlighter for the model to allow user selection
	 */
	private setupHighlighter() {
		console.log("setupHighlighter");
		if (!this.scene) return;

		this.highlighter.config.hoverColor = this._hoverColor;
		this.highlighter.config.selectionColor = this._selectionColor;
		this.highlighter.setup({ world: this.scene });

		this.highlighter.events.select.onHighlight.add(async (fragmentIdMap) => {
			// no need to clear selection here, as it will be cleared each time before this event is called
			await this.setPowerBiSelection(fragmentIdMap);
		});

		this.highlighter.events.select.onClear.add(async () => {
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
				await this._selectionManager.select(selectionIds);
				console.log("selectionIds", selectionIds);
			}
		}
	}

	/**
	 * Clears the selection in Power BI. This will remove any filters applied to the dashboard.
	 */
	async clearPowerBiSelection() {
		console.log("clearPowerBiSelection");
		await this._selectionManager.clear();
	}

	/**
	 * Load the model from the server and add it to the scene
	 * @param fileName The name of the file to be loaded from the server
	 * @param ifc If true, the model is an IFC file
	 * @param apiKey The API key to be used to authenticate the request
	 * @param serverUrl The server URL to be used to load the file
	 */
	async loadModel(fileId: string, apiKey: string, serverUrl: string) {
		const loader = new ModelLoader(fileId, apiKey, serverUrl);

		const file = await loader.loadFragments();
		if (file) {
			const fragmentsGroup = this.fragmentManager.load(file);
			this.scene.add(fragmentsGroup);
			console.log(this.scene);
			this.modelLoaded = true;
			console.log("Loading model finished");
		}
	}
}
