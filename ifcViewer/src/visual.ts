/* eslint-disable @typescript-eslint/no-unused-vars */
"use strict";
import powerbi from "powerbi-visuals-api";
// use this for async function
import "regenerator-runtime/runtime";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataViewTableRow = powerbi.DataViewTableRow;
import "../style/visual.less";
import { Viewer } from "./Viewer";
// import { Viewer, DataPoint } from "./Viewer";

export class Visual implements IVisual {
  private _target: HTMLElement;
  private _visualHost: IVisualHost;
  private _events: IVisualEventService;
  private _selectionManager: ISelectionManager;
  private _viewer: Viewer;

  constructor(options: VisualConstructorOptions) {
    console.log("Visual constructor", options);
    this._target = options.element;
    this._visualHost = options.host;
    this._events = options.host.eventService;
    this._selectionManager = this._visualHost.createSelectionManager();
    this._viewer = new Viewer();
    this._viewer.loadModel("test");
  }

  update(options: VisualUpdateOptions): void {
    console.log("Visual update", options);
    // this._viewer.update(options);
  }

  //   public update(options: VisualUpdateOptions) {
  //     // first to start render
  //     this._events.renderingStarted(options);
  //     if (options.dataViews === undefined || options.dataViews === null) {
  //       return;
  //     }
  //     const dataViews = options.dataViews;

  //     if (!dataViews || !dataViews[0] || !dataViews[0].table || !dataViews[0].table.rows || !dataViews[0].table.columns) {
  //       console.log("Test 1 FAILED. No data to draw table.");
  //       // eslint-disable-next-line powerbi-visuals/no-inner-outer-html
  //       this._target.innerHTML = "<p>Error</p>";
  //       return;
  //     }

  //     const table = dataViews[0].table;
  //     // make sure first column is expressID
  //     const firstColExpressID = table.columns[0].displayName === "expressID";
  //     if (!firstColExpressID) return;

  //     const selectionIds: DataPoint[] = [];
  //     table.rows.forEach((row: DataViewTableRow, rowIndex: number) => {
  //       const expressID = row[0] as string;
  //       const selectionId: ISelectionId = this._visualHost.createSelectionIdBuilder().withTable(table, rowIndex).createSelectionId();
  //       selectionIds.push({ expressID, selectionId });
  //     });
  //     if (!this._viewer) this._viewer = new Viewer(this._target, this._selectionManager, selectionIds, this._events, options);
  //   }
}
