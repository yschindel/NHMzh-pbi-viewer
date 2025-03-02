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
	private fileId: string = "";

	constructor(options: VisualConstructorOptions) {
		console.log("constructor options", options);
		this.target = options.element;
		this.visualHost = options.host;
		this.selectionManager = this.visualHost.createSelectionManager();
		this.target.innerHTML = "<p>User 'id' as the GUID field and 'LatestFragmentsFile' as the file path field</p>";
	}

	public update(options: VisualUpdateOptions) {
		// @ts-ignore
		console.log("Update type", powerbi.VisualUpdateType[options.type]);
		console.log("options", options);

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

		const dataView = options.dataViews[0];

		if (!dataView) return;
		if (dataView.table.columns[0].displayName != "id") {
			console.log("Invalid id field");
			this.target.innerHTML = "<p>Use id as the id field</p>";
			return;
		}

		if (dataView.table.columns[1].displayName != "fileid") {
			console.log("Invalid File Path field");
			this.target.innerHTML = "<p>Use fileid as the file id field</p>";
			return;
		}

		// load or reload the model
		const fileId = dataView.table.rows[0][1] as string;
		if (this.fileId !== fileId) {
			if (!fileId) {
				console.log("No file id found");
				return;
			}
			this.target.innerHTML = "";
			console.log("creating viewer");
			this.viewer = new Viewer(this.target, this.selectionManager);
			console.log("Loading model", fileId);
			this.viewer.loadModel(fileId);
			this.fileId = fileId;
		}

		// build inital selectionIdMap to allow user selection in the viewer
		const uniqueIds = new Set();
		const idsTable = dataView.table;
		idsTable.rows.forEach((row: DataViewTableRow, rowIndex: number) => {
			const id = row[0] as string;
			if (uniqueIds.has(id)) return;
			uniqueIds.add(id);
			const selectionId: ISelectionId = this.visualHost.createSelectionIdBuilder().withTable(idsTable, rowIndex).createSelectionId();
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
		const selectionIds = dataView.table.rows.map((row: DataViewTableRow) => row[0] as string);
		this.viewer.highlight(selectionIds);
	}
}
