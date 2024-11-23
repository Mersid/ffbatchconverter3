import { EncodingState } from "../misc/EncodingState";
import { probe } from "../misc/Helpers";
import { stat } from "node:fs/promises";
import { GenericVideoEncoder } from "./GenericVideoEncoder";
import { VMAFScoringEncoder } from "./VMAFScoringEncoder";
import { Emitter } from "strict-event-emitter";

type Events = {
    log: [data: string, internal: boolean];
};

export class EncodeAndScoreEncoder extends Emitter<Events> {
    /**
     * Callback that is called whenever the encoder receives new information. This is a good time for listeners to check the state.
     */
    public readonly updateCallback: () => void;
    private ffprobePath: string;
    private ffmpegPath: string;
    private inputFilePath: string;
    private outputFilePath: string = "";
    private log: string = "";
    /**
     * Size of the input file in bytes.
     */
    private fileSize: number = 0;
    /**
     * Function that resolves the promise provided by the start method. This is undefined until the start method is called.
     */
    private resolve: ((value: void | PromiseLike<void>) => void) | undefined = undefined;
    private encoder: GenericVideoEncoder | undefined = undefined;
    /**
     * Scorer is undefined until the encoding is complete.
     */
    private scorer: VMAFScoringEncoder | undefined = undefined;

    private constructor(ffprobePath: string, ffmpegPath: string, inputFilePath: string, updateCallback: () => void) {
        super();
        this.ffprobePath = ffprobePath;
        this.ffmpegPath = ffmpegPath;
        this.inputFilePath = inputFilePath;
        this.updateCallback = updateCallback;
    }

    private _currentDuration: number = 0;

    public get currentDuration(): number {
        return this._currentDuration;
    }

    private set currentDuration(value: number) {
        this._currentDuration = value;
    }

    private _duration: number = 0;

    public get duration(): number {
        return this._duration;
    }

    private set duration(value: number) {
        this._duration = value;
    }

    private _state: EncodingState = "Pending";

    public get state(): EncodingState {
        return this._state;
    }

    private set state(value: EncodingState) {
        this._state = value;
    }

    /**
     * The VMAF score of the encoded video. This is zero until the scoring is complete.
     * @private
     */
    private _vmafScore: number = 0;

    public get vmafScore(): number {
        return this._vmafScore;
    }

    private set vmafScore(value: number) {
        this._vmafScore = value;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string, inputFilePath: string, updateCallback: () => void): Promise<EncodeAndScoreEncoder> {
        const encoder = new EncodeAndScoreEncoder(ffprobePath, ffmpegPath, inputFilePath, updateCallback);
        const probeData = probe(ffprobePath, inputFilePath);

        try {
            encoder.fileSize = (await stat(inputFilePath)).size;
        } catch (e) {
            encoder.logLine("Could not determine the size of the input file. It is likely that the file does not exist.");
            encoder.logLine((e as Error).stack ?? "No stack trace!");
            encoder.state = "Error";
            return encoder;
        }

        encoder.log += probeData + "\n";

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
        this.outputFilePath = outputFilePath;

        this.encoder = await GenericVideoEncoder.createNew(this.ffprobePath, this.ffmpegPath, this.inputFilePath);
        this.encoder.on("update", () => this.onChildUpdate());
        this.encoder.on("log", (data, internal) => this.onChildLog(data, internal));

        await this.encoder.start(ffmpegArguments, outputFilePath);

        if (this.encoder.state != "Success") {
            this.state = "Error";
            return;
        }

        this.scorer = await VMAFScoringEncoder.createNew(this.ffprobePath, this.ffmpegPath, outputFilePath, () => this.onChildUpdate());
        this.scorer.on("log", (data, internal) => this.onChildLog(data, internal));

        await this.scorer.start(this.inputFilePath);

        if (this.scorer.state != "Success") {
            this.state = "Error";
            return;
        }

        this.vmafScore = this.scorer.vmafScore;

        this.logLine(`Encoding and scoring complete. Score is ${this.scorer.vmafScore}.`);

        this.state = "Success";
        this.updateCallback();
    }

    private onChildUpdate() {
        this.currentDuration = this.scorer?.currentDuration ?? this.encoder?.currentDuration ?? 0;
        this.updateCallback();
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
        this.log += `>> ${data}\n`;
        this.emit("log", data, false);
    }

    /**
     * Logs data to the log. Use this for log data that comes from ffmpeg or ffprobe.
     * @param data Data to log.
     * @private
     */
    private logInternal(data: string): void {
        this.log += data;
        this.emit("log", data, true);
    }
}
