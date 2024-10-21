import powerbi from "powerbi-visuals-api";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { FragmentIdMap } from "@thatopen/fragments";
import * as THREE from "three";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import { ModelLoader } from "./ModelLoader";

/**
 * The Viewer class is responsible for rendering the 3D model in the Power BI visual.
 */
export class Viewer {
  components = new OBC.Components();
  container: HTMLDivElement;
  fragmentManager = this.components.get(OBC.FragmentsManager);
  fileName: string; // The name of the file to be loaded from the server
  modelLoaded: boolean = false;
  selectionIdMap: Map<string, ISelectionId> = new Map(); // map of GlobalId to selectionId

  private _target: HTMLElement;
  private _world: OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>;
  private _selectionManager: ISelectionManager;

  private _highlighter: OBF.Highlighter;
  private _selectionColor: THREE.Color = new THREE.Color("#00639c");
  private _hoverColor: THREE.Color = new THREE.Color("#328da8");

  private _hider: OBC.Hider;

  /**
   * Constructor for the Viewer class. Sets up the viewer ready to load a model.
   * Does not load a model.
   * @param target The target element to render the viewer in
   */
  constructor(target: HTMLElement, selectionManager: ISelectionManager) {
    this._target = target;
    this._selectionManager = selectionManager;
    this.initScene();
    this.setupHighlighter();
    this.setupHider();
  }

  /**
   * Sets up the scene and adds an empty world to the container
   */
  private initScene() {
    this.container = document.createElement("div");
    this.container.className = "full-screen";
    this.container.style.zIndex = "2000";
    this._target.appendChild(this.container);

    const worlds = this.components.get(OBC.Worlds);
    this._world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();

    this._world.scene = new OBC.SimpleScene(this.components);
    this._world.renderer = new OBC.SimpleRenderer(this.components, this.container);
    this._world.camera = new OBC.SimpleCamera(this.components);

    this.components.init();

    this._world.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);
    this._world.scene.setup();
    this._world.scene.three.background = null;

    // const grids = this.components.get(OBC.Grids);
    // grids.create(this._world);
  }

  /**
   * Sets up the highlighter for the model to allow user selection
   */
  private setupHighlighter() {
    if (!this._world) return;

    this._highlighter = this.components.get(OBF.Highlighter);
    this._highlighter.config.hoverColor = this._hoverColor;
    this._highlighter.config.selectionColor = this._selectionColor;
    this._highlighter.setup({ world: this._world });

    this._highlighter.events.select.onHighlight.add(async (fragmentIdMap) => {
      // no need to clear selection here, as it will be cleared each time before this event is called
      await this.setPowerBiSelection(fragmentIdMap);
    });

    this._highlighter.events.select.onClear.add(async () => {
      await this.clearPowerBiSelection();
    });
  }

  private setupHider() {
    this._hider = this.components.get(OBC.Hider);
  }

  /**
   * Highlights the selection in the viewer
   * @param globalIds The global IDs of the objects to highlight
   */
  highlight(globalIds: string[]) {
    const fragmentIdMap = this.fragmentManager.guidToFragmentIdMap(globalIds);
    if (!fragmentIdMap) return; // temp solution to workaround async loadModel not finished yet
    // this.addSelection("select");
    // this._highlighter.highlightByID("select", fragmentIdMap);
    this._hider.isolate(fragmentIdMap);
  }

  /**
   * Resets the selection in the viewer
   */
  reset() {
    // this.clearSelection("select");
    this._hider.set(true);
  }

  /**
   * Sets the selection in Power BI based on a fragmentIdMap. This will filter the dashboard based on the selected objects.
   * @param fragmentIdMap The fragmentIdMap to set the selection from
   */
  async setPowerBiSelection(fragmentIdMap: FragmentIdMap) {
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
    await this._selectionManager.clear();
  }

  /**
   * Load the model from the server and add it to the scene
   * @param fileName The name of the file to be loaded from the server
   * @param ifc If true, the model is an IFC file
   * @param baseUrl The base URL of the server
   */
  async loadModel(fileName: string, baseUrl: string = "") {
    const loader = new ModelLoader(fileName, baseUrl);

    const file = await loader.loadFragments();
    if (file) {
      const fragmentsGroup = this.fragmentManager.load(file);
      this._world.scene.three.add(fragmentsGroup);
      this.modelLoaded = true;
      console.log("Loading model finished");
    }
  }
}
