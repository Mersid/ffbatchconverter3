import { spawn } from "node:child_process";
import { probeAsync } from "../misc/Helpers";
import { ChildProcessWithoutNullStreams } from "child_process";
import { formatFFmpegTimeToSeconds } from "../misc/TimeFormatter";
import { Emitter } from "strict-event-emitter";
import { v4 as uuid4 } from "uuid";
import { GenericVideoEncoderReport } from "@shared/types/GenericVideoEncoderReport";
import { EncodingState } from "@shared/types/EncodingState";
import { stat } from "node:fs/promises";
import { log } from "../misc/Logger";

type Events = {
    log: [tag: string, data: string, internal: boolean];

    /**
     * Event that is emitted whenever the encoder receives new information. This is a good time for listeners to check the state.
     */
    update: [];
};

export class GenericVideoEncoder extends Emitter<Events> {
    private _ffprobePath: string;
    private _ffmpegPath: string;
    private _outputFilePath: string = "";
    /**
     * Size of the input file in bytes.
     */
    private _fileSize: number = 0;
    /**
     * Function that resolves the promise provided by the start method. This is undefined until the start method is called.
     */
    private _resolve: ((value: void | PromiseLike<void>) => void) | undefined = undefined;
    private _process: ChildProcessWithoutNullStreams | undefined = undefined;
    private _encoderId: string;
    private _inputFilePath: string;
    private _log: string = "";
    private _currentDuration: number = 0;
    private _duration: number = 0;
    private _state: EncodingState = "Pending";

    private constructor(ffprobePath: string, ffmpegPath: string, inputFilePath: string) {
        super();
        this._encoderId = uuid4();
        this._ffprobePath = ffprobePath;
        this._ffmpegPath = ffmpegPath;
        this._inputFilePath = inputFilePath;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string, inputFilePath: string): Promise<GenericVideoEncoder> {
        const encoder = new GenericVideoEncoder(ffprobePath, ffmpegPath, inputFilePath);
        const probeData = await probeAsync(ffprobePath, inputFilePath);

        try {
            encoder._fileSize = (await stat(inputFilePath)).size;
        } catch (e) {
            encoder.logLine("Could not determine the size of the input file. It is likely that the file does not exist.");
            encoder.logLine((e as Error).stack ?? "No stack trace!");
            encoder.state = "Error";
            return encoder;
        }

        encoder.logInternal(probeData);

        const json = JSON.parse(probeData);
        const duration = json.format?.duration as string | undefined;

        if (duration == undefined) {
            encoder.logLine("Could not determine duration of the video.");
            encoder.state = "Error";
        } else {
            encoder.duration = parseFloat(duration);
            encoder.state = "Pending";
        }

        return encoder;
    }

    /**
     * Starts encoding the video with the given ffmpeg arguments. The promise resolves when the encoding is complete.
     */
    public async start(ffmpegArguments: string, outputFilePath: string): Promise<void> {
        const promise = new Promise<void>((resolve, _) => {
            this._resolve = resolve;
        });

        this._outputFilePath = outputFilePath;

        if (this.state != "Pending") {
            this.logLine(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
            throw new Error(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
        }

        const ffmpegCommand = `"${this._ffmpegPath}" -y -i "${this._inputFilePath}" ${ffmpegArguments} "${outputFilePath}"`;

        this.logLine(`Starting encoding with command: ${ffmpegCommand}`);

        this._process = spawn(ffmpegCommand, {
            shell: true
        });

        this.state = "Encoding";

        this._process.stdout.on("data", data => this.onProcessReceivedData(data.toString()));
        this._process.stderr.on("data", data => this.onProcessReceivedData(data.toString()));
        this._process.on("close", async code => {
            this.state = code == 0 ? "Success" : "Error";
            this.logLine(`Process exited with code ${code}`);
            this.emit("update");
            this._resolve?.();
        });

        return promise;
    }

    /**
     * Resets the encoder into the initial state. This command is silently ignored if the encoder is currently encoding.
     */
    public reset() {
        if (this.state == "Encoding") {
            return;
        }

        this.currentDuration = 0;
        this.state = "Pending";

        this.logLine("Reset encoder to pending state.");
        this.emit("update");
    }

    private onProcessReceivedData(data: string) {
        if (this.state != "Encoding") {
            return;
        }

        // Extract timestamp
        if (data.includes("time=")) {
            const time = data.split("time=")[1].split(" ")[0];

            const currentDuration = formatFFmpegTimeToSeconds(time);

            if (isNaN(currentDuration)) {
                this.logLine(
                    "Could not parse the current duration of the video. Perhaps we've just started encoding, and the time is N/A, or the video is invalid."
                );
            } else {
                this.currentDuration = currentDuration;
            }
        }

        this.logInternal(data);

        this.emit("update");
    }

    /**
     * Logs a line to the log. Use this for log data that does not come from ffmpeg or ffprobe.
     * @param data Data to log.
     * @private
     */
    private logLine(data: string): void {
        const tag = "Generic Encoder/Log";
        this.log += log.custom(tag, data);
        this.emit("log", tag, data, false);
    }

    /**
     * Logs data to the log. Use this for log data that comes from ffmpeg or ffprobe.
     * @param data Data to log.
     * @private
     */
    private logInternal(data: string): void {
        const tag = "Generic Encoder/FFmpeg";
        this.log += log.custom(tag, data);
        this.emit("log", tag, data, true);
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

    public get report(): GenericVideoEncoderReport {
        return {
            controllerId: "Added at controller level!",
            encoderId: this.encoderId,
            inputFilePath: this.inputFilePath,
            fileSize: this._fileSize,
            currentDuration: this.currentDuration,
            duration: this.duration,
            encodingState: this.state
        };
    }

    public get encoderId(): string {
        return this._encoderId;
    }

    public get inputFilePath(): string {
        return this._inputFilePath;
    }

    public get log(): string {
        return this._log;
    }

    private set log(value: string) {
        this._log = value;
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

    private get process(): ChildProcessWithoutNullStreams | undefined {
        return this._process;
    }

    private set process(value: ChildProcessWithoutNullStreams | undefined) {
        this._process = value;
    }
}
