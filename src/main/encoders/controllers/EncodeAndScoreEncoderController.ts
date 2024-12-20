import { v4 as uuid4 } from "uuid";
import { Emitter } from "strict-event-emitter";
import { getFilesRecursive } from "../misc/Helpers";
import { EncodeAndScoreEncoder } from "../encoders/EncodeAndScoreEncoder";
import { EncodeAndScoreEncoderReport } from "@shared/types/EncodeAndScoreEncoderReport";
import path from "node:path";
import { mkdir } from "node:fs/promises";

type Events = {
    /**
     * Event that is emitted whenever the encoder receives new information. This is a good time for listeners to check the state.
     * The ID of the encoder is given as an argument.
     */
    update: [encoderId: string];
};

export class EncodeAndScoreEncoderController extends Emitter<Events> {
    private _controllerId: string;
    private _ffprobePath: string;
    private _ffmpegPath: string;
    private _isEncoding: boolean = false;
    private _encoders: EncodeAndScoreEncoder[] = [];
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

    constructor(ffprobePath: string, ffmpegPath: string) {
        super();
        this._controllerId = uuid4();
        this._ffprobePath = ffprobePath;
        this._ffmpegPath = ffmpegPath;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string): Promise<EncodeAndScoreEncoderController> {
        return new EncodeAndScoreEncoderController(ffprobePath, ffmpegPath);
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
    public async addEncoders(entries: string[]): Promise<EncodeAndScoreEncoderReport[]> {
        const files: string[] = [];
        for (const entry of entries) {
            files.push(...(await getFilesRecursive(entry)));
        }

        const encoderPromises = files.map(async file => {
            return EncodeAndScoreEncoder.createNew(this.ffprobePath, this.ffmpegPath, file);
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
            return <EncodeAndScoreEncoderReport>{
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
    public getReportFor(encoderId: string): EncodeAndScoreEncoderReport {
        const encoder = this.encoders.find(e => e.encoderId == encoderId);
        if (encoder == undefined) {
            throw new Error(`No encoder with ID ${encoderId} found.`);
        }

        return <EncodeAndScoreEncoderReport>{
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
        // TODO: Verify this
        if (!this._isEncoding) {
            return;
        }

        if (this._encoders.filter(e => e.state == "Encoding").length >= this.concurrency) {
            return;
        }

        // Note: There is a potential race condition here. Observe that there is an await between getting an encoder
        // and starting it, which will set its state. As such, it is possible that in the await mkdir call,
        // we process another encoder, which will find the same encoder. As such, we end up with two encoders
        // in the same critical section. To remedy this, the encoder.start() call contains an internal check
        // to allow the encoder to proceed only if it is in the "Pending" state. If we omit this call,
        // we end up with multiple ffmpeg processes encoding the same video.
        const encoder = this._encoders.find(e => e.state == "Pending");
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

    public get concurrency(): number {
        return this._concurrency;
    }

    public set concurrency(value: number) {
        this._concurrency = value;
        this.processActions().then(_r => {});
    }

    public get controllerId(): string {
        return this._controllerId;
    }

    private set controllerId(value: string) {
        this._controllerId = value;
    }

    private get ffprobePath(): string {
        return this._ffprobePath;
    }

    private set ffprobePath(value: string) {
        this._ffprobePath = value;
    }

    private get ffmpegPath(): string {
        return this._ffmpegPath;
    }

    private set ffmpegPath(value: string) {
        this._ffmpegPath = value;
    }

    public get isEncoding(): boolean {
        return this._isEncoding;
    }

    public set isEncoding(value: boolean) {
        this._isEncoding = value;
    }

    private get encoders(): EncodeAndScoreEncoder[] {
        return this._encoders;
    }

    private set encoders(value: EncodeAndScoreEncoder[]) {
        this._encoders = value;
    }
}