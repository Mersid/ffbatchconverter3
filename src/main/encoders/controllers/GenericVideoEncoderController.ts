import { GenericVideoEncoder } from "../encoders/GenericVideoEncoder";
import { computeOutputPaths, getFilesRecursive } from "../misc/Helpers";
import { mkdir } from "node:fs/promises";
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

export class GenericVideoEncoderController extends Emitter<Events> {
    /**
     * Output directory relative to the input file. Do not use absolute paths!
     */
    private _outputSubdirectory: string = "";
    /**
     * Extension of the output file.
     */
    private _extension: string = "";
    private _ffmpegArguments: string = "";
    private _controllerId: string;
    private _encoders: GenericVideoEncoder[] = [];
    private _isEncoding: boolean = false;
    private _concurrency: number = 1;
    private _ffmpegPath: string;
    private _ffprobePath: string;

    private constructor(ffprobePath: string, ffmpegPath: string) {
        super();
        this._controllerId = uuid4();
        this._ffprobePath = ffprobePath;
        this._ffmpegPath = ffmpegPath;
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

    /**
     * Takes an array of directory paths, and generates encoders.
     * For each directory, it is recursively traversed and an encoder will be created for each file.
     * Files themselves will have an encoder created according to the above rule.
     * An initial report is returned for each encoder created.
     * @param entries
     */
    public async addEncoders(entries: string[]): Promise<GenericVideoEncoderReport[]> {
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
            this._encoders.push(encoder);
        }

        return encoders.map(t => {
            return <GenericVideoEncoderReport>{
                ...t.report,
                controllerId: this.controllerId
            };
        });
    }

    /**
     * Takes an array of encoder IDs and resets them. If the encoder is currently encoding, it will not be reset.
     * A list of encoder IDs that were reset is returned; the rest are silently ignored.
     * @param encoderIds
     */
    public resetEncoders(encoderIds: string[]) {
        for (const encoderId of encoderIds) {
            const encoder = this._encoders.find(e => e.encoderId == encoderId);
            if (encoder == undefined) {
                throw new Error(`No encoder with ID ${encoderId} found.`);
            }

            encoder.reset();
        }
    }

    /**
     * Takes an array of encoder IDs and deletes them from the controller. If the encoder is currently encoding, it will not be removed.
     * A list of encoder IDs that were removed is returned; the rest are silently ignored.
     * @param encoderIds
     */
    public deleteEncoders(encoderIds: string[]): string[] {
        const removedIds: string[] = [];
        for (const encoderId of encoderIds) {
            const encoder = this._encoders.find(e => e.encoderId == encoderId);
            if (encoder == undefined) {
                throw new Error(`No encoder with ID ${encoderId} found.`);
            }

            if (encoder.state == "Encoding") {
                continue;
            }

            removedIds.push(encoderId);

            encoder.removeAllListeners();
            this._encoders = this._encoders.filter(e => e.encoderId != encoderId);
        }

        return removedIds;
    }

    /**
     * Produces a report for the encoder with the given ID. An error is thrown if no encoder with the given ID is found.
     * @param encoderId
     */
    public getReportFor(encoderId: string): GenericVideoEncoderReport {
        const encoder = this._encoders.find(e => e.encoderId == encoderId);
        if (encoder == undefined) {
            throw new Error(`No encoder with ID ${encoderId} found.`);
        }

        return <GenericVideoEncoderReport>{
            ...encoder.report,
            controllerId: this.controllerId
        };
    }

    /**
     * Collects the logs for the encoder with the given ID. An error is thrown if no encoder with the given ID is found.
     * @param encoderId
     */
    public getLogsFor(encoderId: string): string {
        const encoder = this._encoders.find(e => e.encoderId == encoderId);
        if (encoder == undefined) {
            throw new Error(`No encoder with ID ${encoderId} found.`);
        }

        return encoder.log;
    }

    /**
     * Event loop for the controller that gets triggered by various actions.
     * @private
     */
    private async processActions() {
        if (!this._isEncoding) {
            return;
        }

        if (this._encoders.filter(e => e.state == "Encoding").length >= this.concurrency) {
            return;
        }

        const encoder = this._encoders.find(e => e.state == "Pending");
        if (encoder == undefined) {
            return;
        }

        const outputDirInfo = computeOutputPaths(encoder.inputFilePath, this.outputSubdirectory, this.extension);

        // Create output directory if it doesn't exist
        await mkdir(outputDirInfo.absoluteContainingDirectory, { recursive: true });

        // We don't need to wait for this to finish before finishing this function.
        // If we do it breaks the start/stop encoding calls, as it hangs until an encoder is done.
        encoder.start(this._ffmpegArguments, outputDirInfo.absoluteFilePath).then(_ => {});
    }

    public get controllerId(): string {
        return this._controllerId;
    }

    public get isEncoding(): boolean {
        return this._isEncoding;
    }

    public get concurrency(): number {
        return this._concurrency;
    }

    public set concurrency(value: number) {
        this._concurrency = value;
        this.processActions().then(_r => {});
    }

    public get ffmpegPath(): string {
        return this._ffmpegPath;
    }

    private set ffmpegPath(value: string) {
        this._ffmpegPath = value;
    }

    public get ffprobePath(): string {
        return this._ffprobePath;
    }

    private set ffprobePath(value: string) {
        this._ffprobePath = value;
    }

    public get outputSubdirectory(): string {
        return this._outputSubdirectory;
    }

    public set outputSubdirectory(value: string) {
        this._outputSubdirectory = value;
    }

    public get extension(): string {
        return this._extension;
    }

    public set extension(value: string) {
        this._extension = value;
    }

    public get ffmpegArguments(): string {
        return this._ffmpegArguments;
    }

    public set ffmpegArguments(value: string) {
        this._ffmpegArguments = value;
    }

    private get encoders(): GenericVideoEncoder[] {
        return this._encoders;
    }

    private set encoders(value: GenericVideoEncoder[]) {
        this._encoders = value;
    }
}
