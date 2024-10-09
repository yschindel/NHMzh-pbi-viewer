"use strict";
import "regenerator-runtime/runtime";
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";

import { Viewer } from "./Viewer";

export class Visual implements IVisual {
  private target: HTMLElement;
  private updateCount: number;
  private textNode: Text;
  private formattingSettings: VisualFormattingSettingsModel;
  private formattingSettingsService: FormattingSettingsService;
  viewer: Viewer;

  constructor(options: VisualConstructorOptions) {
    this.target = options.element;
    this.viewer = new Viewer(this.target);
    this.viewer.loadModel("test");
  }

  public update(options: VisualUpdateOptions) {
    this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
      VisualFormattingSettingsModel,
      options.dataViews[0]
    );

    console.log("Visual update", options);
    if (this.textNode) {
      this.textNode.textContent = (this.updateCount++).toString();
    }
  }

  /**
   * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
   * This method is called once every time we open properties pane or when the user edit any format property.
   */
  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
  }
}
