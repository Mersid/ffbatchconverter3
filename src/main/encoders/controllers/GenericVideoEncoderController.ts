import { GenericVideoEncoder } from "../encoders/GenericVideoEncoder";
import { getFilesRecursive } from "../misc/Helpers";
import {mkdir} from "node:fs/promises";
import path from "node:path";

export class GenericVideoEncoderController {
    private _concurrency: number = 1;
    public get concurrency(): number {
        return this._concurrency;
    }
    public set concurrency(value: number) {
        this._concurrency = value;
        // TODO: If this becomes an issue, block until processActions() finishes.
        this.processActions().then(_r => {});
    }

    /**
     * Output directory relative to the input file. Do not use absolute paths!
     */
    public outputSubdirectory: string = "";

    /**
     * Extension of the output file.
     */
    public extension: string = "";

    private _ffmpegPath: string;
    public get ffmpegPath(): string {
        return this._ffmpegPath;
    }
    private set ffmpegPath(value: string) {
        this._ffmpegPath = value;
    }

    private _ffprobePath: string;
    public get ffprobePath(): string {
        return this._ffprobePath;
    }
    private set ffprobePath(value: string) {
        this._ffprobePath = value;
    }

    public ffmpegArguments: string = "";
    private encoders: GenericVideoEncoder[] = [];

    private isEncoding: boolean = false;

    private constructor(ffprobePath: string, ffmpegPath: string) {
        this._ffprobePath = ffprobePath;
        this._ffmpegPath = ffmpegPath;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string): Promise<GenericVideoEncoderController> {
        const controller = new GenericVideoEncoderController(ffprobePath, ffmpegPath);
        return controller;
    }

    /**
     * Starts encoding. This does not wait until all encoders are finished.
     */
    public async startEncoding() {
        this.isEncoding = true;
        await this.processActions();
    }

    public async stopEncoding() {
        this.isEncoding = false;
        await this.processActions();
    }

    public async addEntries(entries: string[]) {
        const files: string[] = [];
        for (const entry of entries) {
            files.push(...(await getFilesRecursive(entry)));
        }

        const encoderPromises = files.map(async file => {
            return GenericVideoEncoder.createNew(this.ffprobePath, this.ffmpegPath, file);
        });

        const encoders = await Promise.all(encoderPromises);
        encoders.sort(t => t.duration).reverse();

        for (const encoder of encoders) {
            encoder.on("update", () => {
                this.processActions();
                // TODO: Raise event
            });
            this.encoders.push(encoder);
        }
    }

    /**
     * Event loop for the controller that gets triggered by various actions.
     * @private
     */
    private async processActions() {
        if (!this.isEncoding) {
            return;
        }

        if (this.encoders.filter(e => e.state == "Encoding").length >= this.concurrency) {
            return;
        }

        const encoder = this.encoders.find(e => e.state == "Pending");
        if (encoder == undefined) {
            return;
        }
        const directory = path.dirname(encoder.inputFilePath);
        const outputSubdirectory = path.join(directory, this.outputSubdirectory);
        const fileName = path.parse(encoder.inputFilePath).name;
        const newFilePath = path.join(outputSubdirectory, `${fileName}.${this.extension}`);

        // Create output directory if it doesn't exist
        await mkdir(outputSubdirectory, { recursive: true });

        await encoder.start(this.ffmpegArguments, newFilePath);
    }
}
