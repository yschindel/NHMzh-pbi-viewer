import powerbi from "powerbi-visuals-api";
import * as OBC from "@thatopen/components";
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

  //   highlighter!: OBC.FragmentHighlighter;
  //   highlightMaterial!: THREE.MeshBasicMaterial;
  //   boundingBox!: THREE.Box3;

  //   private readonly target: any | HTMLDivElement;
  private _selectionManager: ISelectionManager;
  private _events: IVisualEventService;
  private _options: VisualUpdateOptions;
  private _selectionIds!: DataPoint[];
  private _world: OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>;

  constructor() // options: VisualUpdateOptions // events: IVisualEventService, // selectionIds: DataPoint[], // selectionManager: ISelectionManager // target: any | HTMLDivElement,
  {
    // this.target = target;
    // this._selectionManager = selectionManager;
    // this._selectionIds = selectionIds;
    // this._events = events;
    // this._options = options;
    this.initScene();
    // this.initFragment();
  }

  /**
   * init scene
   */
  private initScene() {
    this.container = document.createElement("div");

    const worlds = this.components.get(OBC.Worlds);
    this._world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();

    this._world.scene = new OBC.SimpleScene(this.components);
    this._world.renderer = new OBC.SimpleRenderer(this.components, this.container);
    this._world.camera = new OBC.SimpleCamera(this.components);

    this.components.init();

    this._world.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);
    this._world.scene.setup();

    const grids = this.components.get(OBC.Grids);
    grids.create(this._world);
  }

  update(options: VisualUpdateOptions) {
    this._options = options;
    // this.container.addEventListener("click", this.highlightOnClick);
    // this._events.renderingFinished(options);
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

  async loadModel(fileName: string, baseUrl: string = "") {
    const loader = new ModelLoader(fileName, baseUrl);
    const file = await loader.load();
    const group = this.fragmentManager.load(file);
    this._world.scene.three.add(group);
  }

  //   lastSelection!: any;
  //   singleSelection: any = {
  //     value: true,
  //   };

  //   private highlightOnClick = async (event: MouseEvent) => {
  //     event.preventDefault();
  //     const result = await this.highlighter.highlight("default", this.singleSelection.value, true);
  //     if (result) {
  //       this.lastSelection = {};

  //       for (const fragment of result.fragments) {
  //         const fragmentID = fragment.id;
  //         this.lastSelection[fragmentID] = [result.id];
  //       }
  //       // find the selection by expressID
  //       const selection = this._selectionIds.find((s: DataPoint) => s.expressID.toString() === result.id);
  //       // if found notify to another visual
  //       await this._selectionManager.select(selection.selectionId);
  //     }
  //   };
}

/**
 * define data point
 */
export interface DataPoint {
  expressID: string | number;
  selectionId: ISelectionId;
}
