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
	private configurationHtml: string = require("./templates/configuration.html").default;
	private messageOverlay: HTMLDivElement;

	constructor(options: VisualConstructorOptions) {
		console.log("Creating Visual");
		console.log("constructor options", options);
		this.target = options.element;
		this.visualHost = options.host;
		this.selectionManager = this.visualHost.createSelectionManager();
		this.createMessageOverlay();
		this.showMessage(this.configurationHtml);
	}

	private createMessageOverlay() {
		this.messageOverlay = document.createElement("div");
		this.messageOverlay.style.position = "absolute";
		this.messageOverlay.style.width = "90%";
		this.messageOverlay.style.top = "50%";
		this.messageOverlay.style.left = "50%";
		this.messageOverlay.style.transform = "translate(-50%, -50%)";
		this.messageOverlay.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
		this.messageOverlay.style.color = "black";
		this.messageOverlay.style.padding = "20px";
		this.messageOverlay.style.borderRadius = "8px";
		this.messageOverlay.style.zIndex = "2002";
		this.messageOverlay.style.display = "none";
		this.messageOverlay.style.textAlign = "center";

		this.target.appendChild(this.messageOverlay);
	}

	public showMessage(htmlContent: string) {
		this.messageOverlay.innerHTML = htmlContent;
		this.messageOverlay.style.display = "block";
	}

	public hideMessage() {
		this.messageOverlay.style.display = "none";
	}

	async update(options: VisualUpdateOptions) {
		try {
			switch (options.type) {
				case powerbi.VisualUpdateType.Resize:
				case powerbi.VisualUpdateType.ResizeEnd:
				case powerbi.VisualUpdateType.Style:
				case powerbi.VisualUpdateType.ViewMode:
				case powerbi.VisualUpdateType.Resize + powerbi.VisualUpdateType.ResizeEnd:
					// @ts-ignore
					console.log("Ignoring update type", powerbi.VisualUpdateType[options.type]);
					return;
				default:
					// @ts-ignore
					console.log("Processing update type", powerbi.VisualUpdateType[options.type]);
					break;
			}
			console.log("options", options);

			const dataView = options.dataViews[0];

			if (!this.ensureConfig(dataView)) return;

			// Show loading message while loading model
			const fileId = dataView.table.rows[0][this.getColumnIndex(dataView, "First model_blob_id")] as string;
			const apiKey = dataView.table.rows[0][this.getColumnIndex(dataView, "api_key")] as string;
			const serverUrl = dataView.table.rows[0][this.getColumnIndex(dataView, "server_url")] as string;
			if (this.fileId !== fileId) {
				this.showMessage("Loading model...");

				console.log("creating viewer");
				if (!this.viewer) {
					this.viewer = new Viewer(this.target, this.selectionManager);
				}
				console.log("Loading model", fileId);
				if (this.viewer.modelLoaded) {
					await this.viewer.unloadModel();
				}
				await this.viewer.loadModel(fileId, apiKey, serverUrl);
				this.fileId = fileId;
				this.hideMessage();
			}

			// build inital selectionIdMap to allow user selection in the viewer
			const uniqueIds = new Set();
			const idsTable = dataView.table;
			console.log("building selectionIdMap");
			idsTable.rows.forEach((row: DataViewTableRow, rowIndex: number) => {
				const id = row[this.getColumnIndex(dataView, "id")] as string;
				if (uniqueIds.has(id)) return;
				uniqueIds.add(id);
				const selectionId: ISelectionId = this.visualHost.createSelectionIdBuilder().withTable(idsTable, rowIndex).createSelectionId();
				this.viewer.selectionIdMap.set(id, selectionId);
			});

			// make sure the viewer setup has finished it's async operation
			if (!this.viewer || !this.viewer.modelLoaded || !options.dataViews) return;

			if (!dataView || !dataView.table || !dataView.table.rows || !dataView.table.columns) {
				console.log("Invalid data");
				this.showMessage("Error loading model");
				return;
			}

			// this.handleSelectionFromPBI(dataView);
		} catch (error) {
			console.error("Error updating visual", error);
		}
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
	private handleSelectionFromPBI(dataView: powerbi.DataView) {
		console.log("handleSelectionFromPBI", dataView);
		const idColumnIndex = this.getColumnIndex(dataView, "id");
		if (idColumnIndex === -1) return;

		const selectionIds = dataView.table.rows.map((row: DataViewTableRow) => row[idColumnIndex] as string);
		this.viewer.highlight(selectionIds);
	}

	private ensureConfig(dataView: powerbi.DataView) {
		console.log("ensureConfig", dataView);
		if (!dataView) {
			console.log("No data view");
			return false;
		}

		if (!dataView.table || !dataView.table.columns) {
			console.log("No table or columns");
			this.showMessage(this.configurationHtml);
			return false;
		}

		const idColumnIndex = this.getColumnIndex(dataView, "id");
		if (idColumnIndex === -1) {
			console.log("Invalid id field");
			this.showMessage("Drag <b>id</b> from the 'Data_Latest' table into the <b>Ids</b> field");
			return false;
		}

		const fileIdColumnIndex = this.getColumnIndex(dataView, "First model_blob_id");
		if (fileIdColumnIndex === -1) {
			console.log("Invalid model_blob_id field");
			this.showMessage("Drag <b>model_blob_id</b> measure from the 'All Files' table into the <b>Model Blob Id</b> field");
			return false;
		}

		const apiKeyColumnIndex = this.getColumnIndex(dataView, "api_key");
		if (apiKeyColumnIndex === -1) {
			console.log("Invalid api_key field");
			this.showMessage("Drag <b>api_key</b> measure from the 'Measure Table' into the <b>API Key</b> field");
			return false;
		}

		const serverUrlColumnIndex = this.getColumnIndex(dataView, "server_url");
		if (serverUrlColumnIndex === -1) {
			console.log("Invalid server_url field");
			this.showMessage("Drag <b>server_url</b> measure from the 'Measure Table' into the <b>Server URL</b> field");
			return false;
		}

		this.hideMessage();
		return true;
	}

	private getColumnIndex(dataView: powerbi.DataView, columnName: string) {
		const column = dataView.table.columns.find((col) => col.displayName === columnName);
		return column ? column.index : -1;
	}
}
