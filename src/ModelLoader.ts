import { inflate } from "pako";
import * as OBC from "@thatopen/components";

export interface Metadata {
	file: string;
	project: string;
	timestamp: string;
}

export interface FileData {
	metadata: Metadata;
	file: Uint8Array;
}

/**
 * Class for loading compressed IFC fragments file from the server
 */
export class ModelLoader {
	fileName: string; // The id of the file to be loaded from the server
	apiKey: string;
	serverUrl: string;
	file: Uint8Array;
	metadata: Metadata;
	components: OBC.Components;
	ifcLoader: OBC.IfcLoader;
	errorMessage: string;

	/**
	 * Initialize the ModelLoader
	 * @param fileName The id of the file to be loaded from the server. This should be in the format:
	 * <project>/<filename>_<timestamp>.gz
	 * @param apiKey The API key to be used to authenticate the request
	 * @param serverUrl The server URL including the endpoint to be used to load the file. Example: https://pbi-server.com/files
	 */
	constructor(fileName: string, apiKey: string, serverUrl: string) {
		if (!fileName) {
			throw new Error("fileId is required");
		}

		if (!apiKey) {
			throw new Error("apiKey is required");
		}
		if (!serverUrl) {
			throw new Error("serverUrl is required");
		}
		this.fileName = fileName;
		this.apiKey = apiKey;
		this.serverUrl = serverUrl;
		this.components = new OBC.Components();
		this.ifcLoader = this.components.get(OBC.IfcLoader);
	}

	/**
	 * Load the compressed IFC fragments file from the server and decompress it
	 * @param maxRetries The maximum number of retries. Default is 3.
	 * @returns The decompressed file as a Uint8Array, or null if all retries fail.
	 */
	async loadFragments(maxRetries: number = 3): Promise<FileData | null> {
		let retries = 0;
		while (retries < maxRetries) {
			try {
				const file = await this.fetchFile();
				const decompressedFile = this.decompress(file);
				return {
					metadata: this.metadata,
					file: decompressedFile,
				};
			} catch (error) {
				console.error(`Attempt ${retries + 1} failed:`, error);
				retries++;
				if (retries >= maxRetries) {
					// Log the final error
					console.error("Max retries reached. Unable to load file.");
					return null;
				}
				// Wait for a short time before retrying
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}
		return null; // This line is technically unreachable, but TypeScript might expect it
	}

	/**
	 * Fetches the compressed IFC fragments file from the server
	 * @returns The compressed file as an ArrayBuffer
	 */
	async fetchFile(): Promise<ArrayBuffer> {
		const res = await fetch(`${this.serverUrl}?id=${this.fileName}`, {
			method: "GET",
			mode: "cors",
			headers: {
				"X-API-Key": this.apiKey,
			},
		});
		// check if the response is ok
		if (!res.ok) {
			const text = await res.text();
			this.errorMessage = `Failed to fetch file: ${res.statusText}, ${text}`;
			throw new Error(`Failed to fetch file: ${res.statusText}, ${text}`);
		}

		// Log all metadata headers
		const metadataHeaders: Record<string, string> = {};
		res.headers.forEach((value, key) => {
			if (key.toLowerCase().startsWith("x-metadata-")) {
				// Store with original header name but without the x-metadata- prefix
				const metadataKey = key.slice("x-metadata-".length);
				metadataHeaders[metadataKey] = value;
			}
		});
		console.log("File metadata:", metadataHeaders);

		const metadata: Metadata = {
			file: metadataHeaders["filename"],
			project: metadataHeaders["projectname"],
			timestamp: metadataHeaders["timestamp"],
		};

		this.metadata = metadata;

		console.log("file fetched");
		console.log("response", res);
		return await res.arrayBuffer();
	}

	/**
	 * Decompress the compressed file
	 * @param file The compressed file as an ArrayBuffer
	 * @returns The decompressed file as a Uint8Array
	 */
	decompress(file: ArrayBuffer): Uint8Array {
		return new Uint8Array(inflate(file));
	}

	async parseIfc(buffer: Uint8Array) {
		const ifc = await this.ifcLoader.load(buffer);
		return ifc;
	}
}
