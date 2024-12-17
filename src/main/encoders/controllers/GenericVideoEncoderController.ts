import { GenericVideoEncoder } from "../encoders/GenericVideoEncoder";
import { getFilesRecursive } from "../misc/Helpers";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { v4 as uuid4 } from "uuid";
import { Emitter } from "strict-event-emitter";
import { GenericVideoEncoderReport } from "@shared/types/GenericVideoEncoderReport";

type Events = {
    /**
     * Event that is emitted whenever the encoder receives new information. This is a good time for listeners to check the state.
     * The ID of the encoder is given as an argument.
     */
    update: [encoderId: string];
};

// TODO: Reorganize the methods. This is a mess!
export class GenericVideoEncoderController extends Emitter<Events> {
    /**
     * Output directory relative to the input file. Do not use absolute paths!
     */
    public outputSubdirectory: string = "";
    /**
     * Extension of the output file.
     */
    public extension: string = "";
    public ffmpegArguments: string = "";
    private readonly _controllerId: string;
    private encoders: GenericVideoEncoder[] = [];

    private constructor(ffprobePath: string, ffmpegPath: string) {
        super();
        this._controllerId = uuid4();
        this._ffprobePath = ffprobePath;
        this._ffmpegPath = ffmpegPath;
    }

    public get controllerId(): string {
        return this._controllerId;
    }

    private _isEncoding: boolean = false;

    public get isEncoding(): boolean {
        return this._isEncoding;
    }

    private _concurrency: number = 1;

    public get concurrency(): number {
        return this._concurrency;
    }

    public set concurrency(value: number) {
        this._concurrency = value;
        this.processActions().then(_r => {});
    }

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

    public static async createNew(ffprobePath: string, ffmpegPath: string): Promise<GenericVideoEncoderController> {
        return new GenericVideoEncoderController(ffprobePath, ffmpegPath);
    }

    /**
     * Starts encoding. This does not wait until all encoders are finished.
     */
    public async startEncoding() {
        this._isEncoding = true;
        await this.processActions();
    }

    public async stopEncoding() {
        this._isEncoding = false;
        await this.processActions();
    }

    public resetEncoders(encoderIds: string[]) {
        for (const encoderId of encoderIds) {
            const encoder = this.encoders.find(e => e.encoderId == encoderId);
            if (encoder == undefined) {
                throw new Error(`No encoder with ID ${encoderId} found.`);
            }

            encoder.reset();
        }
    }

    /**
     * Removes encoders from the controller. If the encoder is currently encoding, it will not be removed.
     * A list of encoder IDs that were successfully removed is returned.
     * @param encoderIds
     */
    public deleteEncoders(encoderIds: string[]): string[] {
        const removedIds: string[] = [];
        for (const encoderId of encoderIds) {
            const encoder = this.encoders.find(e => e.encoderId == encoderId);
            if (encoder == undefined) {
                throw new Error(`No encoder with ID ${encoderId} found.`);
            }

            if (encoder.state == "Encoding") {
                continue;
            }

            removedIds.push(encoderId);

            encoder.removeAllListeners();
            this.encoders = this.encoders.filter(e => e.encoderId != encoderId);
        }

        return removedIds;
    }

    /**
     * Produces a report for the encoder with the given ID. An error is thrown if no encoder with the given ID is found.
     * @param encoderId
     */
    public getReportFor(encoderId: string): GenericVideoEncoderReport {
        const encoder = this.encoders.find(e => e.encoderId == encoderId);
        if (encoder == undefined) {
            throw new Error(`No encoder with ID ${encoderId} found.`);
        }

        return <GenericVideoEncoderReport>{
            ...encoder.report,
            controllerId: this.controllerId
        };
    }

    public getLogsFor(encoderId: string): string {
        const encoder = this.encoders.find(e => e.encoderId == encoderId);
        if (encoder == undefined) {
            throw new Error(`No encoder with ID ${encoderId} found.`);
        }

        return encoder.log;
    }

    /**
     * Creates encoders for the file paths entered.
     * Directories will be recursively traversed and all files will be added.
     * Each file will generate an initial report that is returned.
     * @param entries
     */
    public async addEntries(entries: string[]): Promise<GenericVideoEncoderReport[]> {
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
                this.emit("update", encoder.encoderId);
            });
            this.encoders.push(encoder);
        }

        return encoders.map(t => {
            return <GenericVideoEncoderReport>{
                ...t.report,
                controllerId: this.controllerId
            };
        });
    }

    /**
     * Event loop for the controller that gets triggered by various actions.
     * @private
     */
    private async processActions() {
        if (!this._isEncoding) {
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

        // We don't need to wait for this to finish before finishing this function.
        // If we do it breaks the start/stop encoding calls, as it hangs until an encoder is done.
        encoder.start(this.ffmpegArguments, newFilePath).then(_ => {});
    }
}
