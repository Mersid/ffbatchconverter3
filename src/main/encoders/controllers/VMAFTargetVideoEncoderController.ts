import { Emitter } from "strict-event-emitter";
import { v4 as uuid4 } from "uuid";
import { VMAFTargetVideoEncoder } from "../encoders/VMAFTargetVideoEncoder";
import { computeOutputPaths, getFilesRecursive } from "../misc/Helpers";
import { VMAFTargetVideoEncoderReport } from "@shared/types/VMAFTargetVideoEncoderReport";
import { mkdir } from "node:fs/promises";

type Events = {
    /**
     * Event that is emitted whenever the encoder receives new information. This is a good time for listeners to check the state.
     * The ID of the encoder is given as an argument.
     */
    update: [encoderId: string];
};

export class VMAFTargetVideoEncoderController extends Emitter<Events> {
    private _controllerId: string;
    private _ffprobePath: string;
    private _ffmpegPath: string;
    private _tempDirectory: string;
    private _isEncoding: boolean = false;
    private _encoders: VMAFTargetVideoEncoder[] = [];
    private _concurrency: number = 1;
    /**
     * Output directory relative to the input file. Do not use absolute paths!
     */
    private _outputSubdirectory: string = "";
    /**
     * Extension of the output file.
     */
    private _extension: string = "";
    private _ffmpegArguments: string = "";
    private _h265: boolean = false;
    private _targetVMAF: number = 86;

    constructor(ffprobePath: string, ffmpegPath: string, tempDirectory: string) {
        super();
        this._controllerId = uuid4();
        this._ffprobePath = ffprobePath;
        this._ffmpegPath = ffmpegPath;
        this._tempDirectory = tempDirectory;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string, tempDirectory: string): Promise<VMAFTargetVideoEncoderController> {
        return new VMAFTargetVideoEncoderController(ffprobePath, ffmpegPath, tempDirectory);
    }

    public async startEncoding() {
        this.isEncoding = true;
        await this.processActions();
    }

    public async stopEncoding() {
        this.isEncoding = false;
        await this.processActions();
    }

    /**
     * Takes an array of directory paths, and generates encoders.
     * For each directory, it is recursively traversed and an encoder will be created for each file.
     * Files themselves will have an encoder created according to the above rule.
     * An initial report is returned for each encoder created.
     * @param entries
     */
    public async addEncoders(entries: string[]): Promise<VMAFTargetVideoEncoderReport[]> {
        const files: string[] = [];
        for (const entry of entries) {
            files.push(...(await getFilesRecursive(entry)));
        }

        const encoderPromises = files.map(async file => {
            return VMAFTargetVideoEncoder.createNew(this.ffprobePath, this.ffmpegPath, file, this.tempDirectory);
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
            return <VMAFTargetVideoEncoderReport>{
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
    public resetEncoders(encoderIds: string[]): string[] {
        const resetIds: string[] = [];
        for (const encoderId of encoderIds) {
            const encoder = this.encoders.find(e => e.encoderId == encoderId);
            if (encoder == undefined) {
                throw new Error(`No encoder with ID ${encoderId} found.`);
            }

            if (encoder.reset()) {
                resetIds.push(encoderId);
            }
        }

        return resetIds;
    }

    /**
     * Takes an array of encoder IDs and deletes them from the controller. If the encoder is currently encoding, it will not be removed.
     * A list of encoder IDs that were removed is returned; the rest are silently ignored.
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
    public getReportFor(encoderId: string): VMAFTargetVideoEncoderReport {
        const encoder = this.encoders.find(e => e.encoderId == encoderId);
        if (encoder == undefined) {
            throw new Error(`No encoder with ID ${encoderId} found.`);
        }

        return <VMAFTargetVideoEncoderReport>{
            ...encoder.report,
            controllerId: this.controllerId
        };
    }

    /**
     * Collects the logs for the encoder with the given ID. An error is thrown if no encoder with the given ID is found.
     * @param encoderId
     */
    public getLogsFor(encoderId: string): string {
        const encoder = this.encoders.find(e => e.encoderId == encoderId);
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
        encoder.start(this.ffmpegArguments, this.h265, this.targetVMAF, outputDirInfo.absoluteFilePath).then(_ => {});
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

    public get h265(): boolean {
        return this._h265;
    }

    private set h265(value: boolean) {
        this._h265 = value;
    }

    public get targetVMAF(): number {
        return this._targetVMAF;
    }

    public set targetVMAF(value: number) {
        this._targetVMAF = value;
    }

    public get ffmpegArguments(): string {
        return this._ffmpegArguments;
    }

    public set ffmpegArguments(value: string) {
        this._ffmpegArguments = value;
    }

    public get concurrency(): number {
        return this._concurrency;
    }

    public set concurrency(value: number) {
        this._concurrency = value;
        this.processActions().then(_r => {});
    }

    public get tempDirectory(): string {
        return this._tempDirectory;
    }

    private set tempDirectory(value: string) {
        this._tempDirectory = value;
    }

    public get encoders(): VMAFTargetVideoEncoder[] {
        return this._encoders;
    }

    public set encoders(value: VMAFTargetVideoEncoder[]) {
        this._encoders = value;
    }

    public get controllerId(): string {
        return this._controllerId;
    }

    private set controllerId(value: string) {
        this._controllerId = value;
    }

    public get ffprobePath(): string {
        return this._ffprobePath;
    }

    private set ffprobePath(value: string) {
        this._ffprobePath = value;
    }

    public get ffmpegPath(): string {
        return this._ffmpegPath;
    }

    private set ffmpegPath(value: string) {
        this._ffmpegPath = value;
    }

    public get isEncoding(): boolean {
        return this._isEncoding;
    }

    private set isEncoding(value: boolean) {
        this._isEncoding = value;
    }
}
