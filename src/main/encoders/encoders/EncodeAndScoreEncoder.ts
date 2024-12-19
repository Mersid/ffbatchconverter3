import { probe } from "../misc/Helpers";
import { stat } from "node:fs/promises";
import { GenericVideoEncoder } from "./GenericVideoEncoder";
import { VMAFScoringEncoder } from "./VMAFScoringEncoder";
import { Emitter } from "strict-event-emitter";
import { EncodingState } from "@shared/types/EncodingState";
import { v4 as uuid4 } from "uuid";
import { EncodeAndScoreEncoderReport } from "@shared/types/EncodeAndScoreEncoderReport";
import { EncodeAndScoreEncoderPhase } from "@shared/types/EncodeAndScoreEncoderPhase";

type Events = {
    log: [data: string, internal: boolean];

    /**
     * Event that is emitted whenever the encoder receives new information. This is a good time for listeners to check the state.
     */
    update: [];
};

export class EncodeAndScoreEncoder extends Emitter<Events> {
    private _log: string = "";
    private _ffprobePath: string;
    private _ffmpegPath: string;
    private _inputFilePath: string;
    private _outputFilePath: string = "";
    /**
     * Size of the input file in bytes.
     */
    private _fileSize: number = 0;
    /**
     * Function that resolves the promise provided by the start method. This is undefined until the start method is called.
     */
    private _resolve: ((value: void | PromiseLike<void>) => void) | undefined = undefined;
    private _encoder: GenericVideoEncoder | undefined = undefined;
    /**
     * Scorer is undefined until the encoding is complete.
     */
    private _scorer: VMAFScoringEncoder | undefined = undefined;

    private _encoderId: string;
    private _currentDuration: number = 0;
    private _duration: number = 0;
    private _state: EncodingState = "Pending";
    /**
     * The VMAF score of the encoded video. This is undefined until the scoring is complete.
     * @private
     */
    private _vmafScore?: number = undefined;

    private constructor(ffprobePath: string, ffmpegPath: string, inputFilePath: string) {
        super();
        this._encoderId = uuid4();
        this._ffprobePath = ffprobePath;
        this._ffmpegPath = ffmpegPath;
        this._inputFilePath = inputFilePath;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string, inputFilePath: string): Promise<EncodeAndScoreEncoder> {
        const encoder = new EncodeAndScoreEncoder(ffprobePath, ffmpegPath, inputFilePath);
        const probeData = probe(ffprobePath, inputFilePath);

        try {
            encoder._fileSize = (await stat(inputFilePath)).size;
        } catch (e) {
            encoder.logLine("Could not determine the size of the input file. It is likely that the file does not exist.");
            encoder.logLine((e as Error).stack ?? "No stack trace!");
            encoder.state = "Error";
            return encoder;
        }

        encoder._log += probeData + "\n";

        const json = JSON.parse(probeData);
        const duration = json.format?.duration as string | undefined;

        if (duration == undefined) {
            encoder.logLine("Could not determine the duration of the input file.");
            encoder.state = "Error";
            return encoder;
        }

        encoder.duration = parseFloat(duration);
        return encoder;
    }

    public async start(ffmpegArguments: string, outputFilePath: string): Promise<void> {
        if (this.state != "Pending") {
            console.log(">> This is not pending!")
            return;
        }

        this._outputFilePath = outputFilePath;
        this.state = "Encoding";

        this._encoder = await GenericVideoEncoder.createNew(this._ffprobePath, this._ffmpegPath, this._inputFilePath);
        this._encoder.on("update", () => this.onChildUpdate());
        this._encoder.on("log", (data, internal) => this.onChildLog(data, internal));

        console.log(">> Hello world!")

        await this._encoder.start(ffmpegArguments, outputFilePath);

        if (this._encoder.state != "Success") {
            this.state = "Error";
            return;
        }

        this._scorer = await VMAFScoringEncoder.createNew(this._ffprobePath, this._ffmpegPath, outputFilePath);
        this._scorer.on("log", (data, internal) => this.onChildLog(data, internal));
        this._scorer.on("update", () => this.onChildUpdate());

        await this._scorer.start(this._inputFilePath);

        if (this._scorer.state != "Success") {
            this.state = "Error";
            return;
        }

        this.vmafScore = this._scorer.vmafScore;

        this.logLine(`Encoding and scoring complete. Score is ${this._scorer.vmafScore}.`);

        this.state = "Success";
        this.emit("update");
    }

    /**
     * Resets the encoder into the initial state. This command is silently ignored if the encoder is currently encoding.
     * @returns True if the encoder was reset; false if the encoder is currently encoding and will not be reset.
     */
    public reset(): boolean {
        // TODO: Verify that the reset works!!!
        if (this.state == "Encoding") {
            return false;
        }

        this.currentDuration = 0;
        this.state = "Pending";
        this.resolve = undefined;
        this.encoder = undefined;
        this.scorer = undefined;
        this.vmafScore = undefined;

        this.emit("update");
        return true;
    }

    private onChildUpdate() {
        this.currentDuration = this._scorer?.currentDuration ?? this._encoder?.currentDuration ?? 0;
        this.emit("update");
    }

    private onChildLog(data: string, internal: boolean) {
        if (internal) {
            this.logInternal(data);
        } else {
            this.logLine(data);
        }
    }

    /**
     * Logs a line to the log. Use this for log data that does not come from ffmpeg or ffprobe.
     * @param data Data to log.
     * @private
     */
    private logLine(data: string): void {
        this._log += `>> ${data}\n`;
        this.emit("log", data, false);
    }

    /**
     * Logs data to the log. Use this for log data that comes from ffmpeg or ffprobe.
     * @param data Data to log.
     * @private
     */
    private logInternal(data: string): void {
        this._log += data;
        this.emit("log", data, true);
    }

    get encoderId(): string {
        return this._encoderId;
    }

    public get currentDuration(): number {
        return this._currentDuration;
    }

    private set currentDuration(value: number) {
        this._currentDuration = value;
    }

    public get duration(): number {
        return this._duration;
    }

    private set duration(value: number) {
        this._duration = value;
    }

    public get state(): EncodingState {
        return this._state;
    }

    private set state(value: EncodingState) {
        this._state = value;
    }

    public get vmafScore(): number | undefined {
        return this._vmafScore;
    }

    private set vmafScore(value: number | undefined) {
        this._vmafScore = value;
    }

    public get report(): EncodeAndScoreEncoderReport {
        return {
            controllerId: "Added at controller level!",
            encoderId: this.encoderId,
            inputFilePath: this._inputFilePath,
            fileSize: this._fileSize,
            currentDuration: this.currentDuration,
            duration: this.duration,
            encodingState: this.state,
            encodingPhase: this.encodingPhase,
            vmafScore: this.vmafScore
        };
    }

    public get log(): string {
        return this._log;
    }

    private set log(value: string) {
        this._log = value;
    }

    private get outputFilePath(): string {
        return this._outputFilePath;
    }

    private set outputFilePath(value: string) {
        this._outputFilePath = value;
    }

    private get fileSize(): number {
        return this._fileSize;
    }

    private set fileSize(value: number) {
        this._fileSize = value;
    }

    private get resolve(): ((value: void | PromiseLike<void>) => void) | undefined {
        return this._resolve;
    }

    private set resolve(value: ((value: void | PromiseLike<void>) => void) | undefined) {
        this._resolve = value;
    }

    private get encoder(): GenericVideoEncoder | undefined {
        return this._encoder;
    }

    private set encoder(value: GenericVideoEncoder | undefined) {
        this._encoder = value;
    }

    private get scorer(): VMAFScoringEncoder | undefined {
        return this._scorer;
    }

    private set scorer(value: VMAFScoringEncoder | undefined) {
        this._scorer = value;
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

    public get inputFilePath(): string {
        return this._inputFilePath;
    }

    private set inputFilePath(value: string) {
        this._inputFilePath = value;
    }

    public get encodingPhase(): EncodeAndScoreEncoderPhase {
        if (this.state == "Success") {
            return "Done";
        }

        if (this.scorer != undefined) {
            return "Scoring";
        }

        return "Encoding";
    }
}
