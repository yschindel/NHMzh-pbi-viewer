import powerbi from "powerbi-visuals-api";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
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
  //   highlighter!: OBC.FragmentHighlighter;
  //   highlightMaterial!: THREE.MeshBasicMaterial;
  //   boundingBox!: THREE.Box3;

  //   private readonly target: any | HTMLDivElement;
  private _firstUpdate: boolean = true;
  private _selectionManager: ISelectionManager;
  private _highlightColor: THREE.Color = new THREE.Color(0, 0, 0);
  private _highlighter: OBF.Highlighter;
  private _events: IVisualEventService;
  private _options: VisualUpdateOptions;
  private _selectionIds!: DataPoint[];
  private _world: OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>;
  private _target: HTMLElement;
  private POWERBI = "powerbi";

  /**
   * Constructor for the Viewer class. Sets up the viewer ready to load a model.
   * Does not load a model.
   * @param target The target element to render the viewer in
   */
  constructor(
    target: HTMLElement // options: VisualUpdateOptions // events: IVisualEventService, // selectionIds: DataPoint[], // selectionManager: ISelectionManager // target: any | HTMLDivElement,
  ) {
    this._target = target;
    // this._selectionManager = selectionManager;
    // this._selectionIds = selectionIds;
    // this._events = events;
    // this._options = options;
    this.initScene();
    this.setupHighlighter();
    // this.initFragment();
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

    const grids = this.components.get(OBC.Grids);
    grids.create(this._world);
  }

  /**
   * Sets up the highlighter for the model to allow user selection
   */
  private setupHighlighter() {
    if (!this._world) return;

    this._highlighter = this.components.get(OBF.Highlighter);
    this._highlighter.config.hoverColor = new THREE.Color("#328da8");
    this._highlighter.config.selectionColor = new THREE.Color("#00639c");
    this._highlighter.setup({ world: this._world });

    this._highlighter.events.select.onHighlight.add(() => {
      this.clearSelection(this.POWERBI);
      console.log(this._highlighter.selection);
    });
  }

  highlight(selectionIds: string[]) {
    const fragmentIdMap = this.fragmentManager.guidToFragmentIdMap(selectionIds);
    if (!fragmentIdMap) return; // temp solution to workaround async loadModel not finished yet
    this.clearSelection("select");
    this.addSelection(this.POWERBI);
    this._highlighter.highlightByID(this.POWERBI, fragmentIdMap);
    console.log(this._highlighter.selection);
  }

  reset() {
    this.clearSelection(this.POWERBI);
  }

  /**
   * Workaround because clear() throws an error if arguemt does not exist... WHYYY???
   */
  private clearSelection(name: string) {
    if (this._highlighter.selection[name]) {
      this._highlighter.clear(name);
    }
  }

  /**
   * Workaround because add() throws an error if arguemt already exists... WHYYY???
   */
  private addSelection(name: string) {
    if (!this._highlighter.selection[name]) {
      this._highlighter.add(name, new THREE.Color("#00639c"));
    }
  }

  // private fitToZoom() {
  //     const { max, min } = this.boundingBox;
  //     if ( !max || !min ) return;
  //     // define vector from max to min
  //     const dir = max.clone().sub( min.clone() ).normalize();
  //     // distance max to min
  //     const dis = max.distanceTo( min );
  //     // center

  //     const center = max.clone().add( dir.clone().multiplyScalar( -0.5 * dis ) );

  //     // camera position
  //     const pos = max.clone().add( dir.clone().multiplyScalar( 0.5 * dis ) );
  //     // set true mean we can animate
  //     ( this.components.camera as OBC.SimpleCamera ).controls.setLookAt( pos.x, pos.y, pos.z, center.x, center.y, center.z, true );
  // }

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

/**
 * define data point
 */
export interface DataPoint {
  expressID: string | number;
  selectionId: ISelectionId;
}
