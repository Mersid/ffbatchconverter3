import { ChildProcessWithoutNullStreams } from "child_process";
import { probe } from "../misc/Helpers";
import { spawn } from "node:child_process";
import { formatFFmpegTimeToSeconds } from "../misc/TimeFormatter";
import { Emitter } from "strict-event-emitter";
import { EncodingState } from "@shared/types/EncodingState";
import { stat } from "node:fs/promises";
import { v4 as uuid4 } from "uuid";
import { log } from "../misc/Logger";

type Events = {
    log: [tag: string, data: string, internal: boolean];

    /**
     * Event that is emitted whenever the encoder receives new information. This is a good time for listeners to check the state.
     */
    update: [];
};

/**
 * FFmpeg encoder that uses the built-in VMAF scoring model to score the quality of the encoded video,
 * given a reference video and a distorted (encoded) video.
 */
export class VMAFScoringEncoder extends Emitter<Events> {
    private _encoderId: string;
    private _ffprobePath: string;
    private _ffmpegPath: string;
    private _referenceFilePath: string;
    private _distortedFilePath: string = "";
    private _log: string = "";
    /**
     * Size of the input file in bytes.
     */
    private _fileSize: number = 0;
    /**
     * Function that resolves the promise provided by the start method. This is undefined until the start method is called.
     */
    private _resolve: ((value: void | PromiseLike<void>) => void) | undefined = undefined;
    private _process: ChildProcessWithoutNullStreams | undefined = undefined;
    private _currentDuration: number = 0;
    private _duration: number = 0;
    private _state: EncodingState = "Pending";
    /**
     * The VMAF score of the encoded video.
     */
    private _vmafScore: number = 0;

    private constructor(ffprobePath: string, ffmpegPath: string, referenceFilePath: string) {
        super();
        this._encoderId = uuid4();
        this._ffprobePath = ffprobePath;
        this._ffmpegPath = ffmpegPath;
        this._referenceFilePath = referenceFilePath;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string, referenceFilePath: string) {
        const encoder = new VMAFScoringEncoder(ffprobePath, ffmpegPath, referenceFilePath);

        const probeData = probe(ffprobePath, referenceFilePath);

        try {
            encoder._fileSize = (await stat(referenceFilePath)).size;
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
        }

        return encoder;
    }

    public async start(distortedFilePath: string): Promise<void> {
        const promise = new Promise<void>((resolve, _) => {
            this._resolve = resolve;
        });

        this._distortedFilePath = distortedFilePath;

        if (this.state != "Pending") {
            this.logLine(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
            throw new Error(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
        }

        const ffmpegCommand = `"${this._ffmpegPath}" -y -i "${this._referenceFilePath}" -i "${this._distortedFilePath}" -filter_complex "[0:v]setpts=PTS-STARTPTS[reference]; [1:v]setpts=PTS-STARTPTS[distorted]; [distorted][reference]libvmaf=model=version=vmaf_v0.6.1:n_threads=30" -f null -`;

        this.logLine(`Starting encoding with command: ${ffmpegCommand}`);

        this._process = spawn(ffmpegCommand, {
            shell: true
        });

        this.state = "Encoding";

        this._process.stdout.on("data", data => this.onProcessReceivedData(data.toString()));
        this._process.stderr.on("data", data => this.onProcessReceivedData(data.toString()));
        this._process.on("close", code => this.onProcessExit(code as number));

        return promise;
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

    private onProcessExit(code: number) {
        this.state = code == 0 ? "Success" : "Error";
        this.logLine(`Process exited with code ${code}`);

        const vmafScore = this.getVMAFScore();
        if (isNaN(vmafScore)) {
            this.logLine("Could not parse the VMAF score from the output.");
            this.state = "Error";
        } else {
            this.logLine(`VMAF score: ${vmafScore}`);
            this.vmafScore = vmafScore;
        }

        this.emit("update");
        this._resolve?.();
    }

    private getVMAFScore(): number {
        const regex = /(?<=VMAF score: )[0-9.]+/;
        const vmafScoreString = this._log.match(regex)?.[0];
        return parseFloat(vmafScoreString ?? "0");
    }

    /**
     * Logs a line to the log. Use this for log data that does not come from ffmpeg or ffprobe.
     * @param data Data to log.
     * @private
     */
    private logLine(data: string): void {
        const tag = "VMAF Scoring Encoder/Log";
        this.log += log.custom(tag, data);
        this.emit("log", tag, data, false);
    }

    /**
     * Logs data to the log. Use this for log data that comes from ffmpeg or ffprobe.
     * @param data Data to log.
     * @private
     */
    private logInternal(data: string): void {
        const tag = "VMAF Scoring Encoder/FFmpeg";
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

    public get vmafScore(): number {
        return this._vmafScore;
    }

    private set vmafScore(value: number) {
        this._vmafScore = value;
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

    private get referenceFilePath(): string {
        return this._referenceFilePath;
    }

    private set referenceFilePath(value: string) {
        this._referenceFilePath = value;
    }

    private get distortedFilePath(): string {
        return this._distortedFilePath;
    }

    private set distortedFilePath(value: string) {
        this._distortedFilePath = value;
    }

    private get log(): string {
        return this._log;
    }

    private set log(value: string) {
        this._log = value;
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
