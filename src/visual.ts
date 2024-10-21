"use strict";
import "regenerator-runtime/runtime";
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataViewTableRow = powerbi.DataViewTableRow;
import ISelectionManager = powerbi.extensibility.ISelectionManager;

import { VisualFormattingSettingsModel } from "./settings";

import { Viewer } from "./Viewer";

export class Visual implements IVisual {
  private target: HTMLElement;
  private visualHost: IVisualHost;
  private formattingSettings: VisualFormattingSettingsModel;
  private formattingSettingsService: FormattingSettingsService;
  private selectionManager: ISelectionManager;
  private viewer: Viewer;

  constructor(options: VisualConstructorOptions) {
    this.target = options.element;
    this.visualHost = options.host;
    this.selectionManager = this.visualHost.createSelectionManager();
    this.viewer = new Viewer(this.target, this.selectionManager);
    this.viewer.loadModel("test");
  }

  public update(options: VisualUpdateOptions) {
    // @ts-ignore
    console.log("Update type", powerbi.VisualUpdateType[options.type]);

    switch (options.type) {
      case powerbi.VisualUpdateType.Resize:
      case powerbi.VisualUpdateType.ResizeEnd:
      case powerbi.VisualUpdateType.Style:
      case powerbi.VisualUpdateType.ViewMode:
      case powerbi.VisualUpdateType.Resize + powerbi.VisualUpdateType.ResizeEnd:
        return;
      default:
        break;
    }

    // build inital selectionIdMap to allow user selection in the viewer

    const dataView = options.dataViews[0];
    const table = dataView.table;
    table.rows.forEach((row: DataViewTableRow, rowIndex: number) => {
      const id = row[0] as string;
      const selectionId: ISelectionId = this.visualHost.createSelectionIdBuilder().withTable(table, rowIndex).createSelectionId();
      this.viewer.selectionIdMap.set(id, selectionId);
    });

    // this.selectionManager.clear();

    // make sure the viewer setup has finished it's async operation
    if (!this.viewer || !this.viewer.modelLoaded || !options.dataViews) return;

    // const dataView = options.dataViews[0];
    if (!dataView || !dataView.table || !dataView.table.rows || !dataView.table.columns) {
      console.log("Invalid data");
      this.target.innerHTML = "<p>Error</p>";
      return;
    }

    if (dataView.table.columns[0].displayName != "GlobalId") {
      console.log("Invalid id field");
      this.target.innerHTML = "<p>Use GlobalId as the id field</p>";
      return;
    }

    this.handleSelection(dataView);
  }

  /**
   * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
   * This method is called once every time we open properties pane or when the user edit any format property.
   */
  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
  }

  /**
   * Handles the selection part of the visual update
   * @param dataView The data view to handle
   */
  private handleSelection(dataView: powerbi.DataView) {
    const isFiltered = dataView.metadata.isDataFilterApplied !== undefined;
    // if (!isFiltered) {
    //   // handle the case where the dashboard is not filtered
    //   this.viewer.reset();
    //   return;
    // }
    const selectionIds = dataView.table.rows.map((row: DataViewTableRow) => row[0] as string);
    this.viewer.highlight(selectionIds);
  }
}
