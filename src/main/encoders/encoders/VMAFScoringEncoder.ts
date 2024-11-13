import { EncodingState } from "../misc/EncodingState";
import { ChildProcessWithoutNullStreams } from "child_process";
import { probe } from "../misc/Helpers";
import { stat } from "fs/promises";
import { spawn } from "node:child_process";
import { formatFFmpegTimeToSeconds } from "../misc/TimeFormatter";
import { Emitter } from "strict-event-emitter";

type Events = {
    log: [data: string, internal: boolean];
};

/**
 * FFmpeg encoder that uses the built-in VMAF scoring model to score the quality of the encoded video,
 * given a reference video and a distorted (encoded) video.
 */
export class VMAFScoringEncoder extends Emitter<Events> {
    private ffprobePath: string;
    private ffmpegPath: string;

    private referenceFilePath: string;
    private distortedFilePath: string = "";

    private log: string = "";

    private _currentDuration: number = 0;
    private _duration: number = 0;

    /**
     * Size of the input file in bytes.
     */
    private fileSize: number = 0;

    private _state: EncodingState = "Pending";

    /**
     * The VMAF score of the encoded video.
     */
    private _vmafScore: number = 0;

    /**
     * Function that resolves the promise provided by the start method. This is undefined until the start method is called.
     */
    private resolve: ((value: void | PromiseLike<void>) => void) | undefined = undefined;

    private process: ChildProcessWithoutNullStreams | undefined = undefined;

    /**
     * Callback that is called whenever the encoder receives new information. This is a good time for listeners to check the state.
     */
    public readonly updateCallback: () => void;

    private constructor(ffprobePath: string, ffmpegPath: string, referenceFilePath: string, updateCallback: () => void) {
        super();
        this.ffprobePath = ffprobePath;
        this.ffmpegPath = ffmpegPath;
        this.referenceFilePath = referenceFilePath;
        this.updateCallback = updateCallback;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string, referenceFilePath: string, updateCallback: () => void) {
        const encoder = new VMAFScoringEncoder(ffprobePath, ffmpegPath, referenceFilePath, updateCallback);

        const probeData = probe(ffprobePath, referenceFilePath);

        try {
            encoder.fileSize = (await stat(referenceFilePath)).size;
        } catch (e) {
            encoder.logLine("Could not determine the size of the input file. It is likely that the file does not exist.");
            encoder.logLine((e as Error).stack ?? "No stack trace!");
            encoder.state = "Error";
            return encoder;
        }

        encoder.logInternal(probeData + "\n");

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
            this.resolve = resolve;
        });

        this.distortedFilePath = distortedFilePath;

        if (this.state != "Pending") {
            this.logLine(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
            throw new Error(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
        }

        this.process = spawn(
            `"${this.ffmpegPath}" -y -i "${this.referenceFilePath}" -i "${this.distortedFilePath}" -filter_complex "[0:v]setpts=PTS-STARTPTS[reference]; [1:v]setpts=PTS-STARTPTS[distorted]; [distorted][reference]libvmaf=model=version=vmaf_v0.6.1:n_threads=30" -f null -"`,
            {
                shell: true
            }
        );

        this.state = "Encoding";

        this.process.stdout.on("data", data => this.onProcessReceivedData(data.toString()));
        this.process.stderr.on("data", data => this.onProcessReceivedData(data.toString()));
        this.process.on("close", code => this.onProcessExit(code as number));

        return promise;
    }

    private onProcessReceivedData(data: string) {
        if (this.state != "Encoding") {
            return;
        }

        // Extract timestamp
        if (data.includes("time=")) {
            const time = data.split("time=")[1].split(" ")[0];

            this.currentDuration = formatFFmpegTimeToSeconds(time);

            if (isNaN(this.currentDuration)) {
                this.logLine("Could not parse the current duration of the video.");
            }
        }

        this.logInternal(data);

        this.updateCallback();
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

        this.updateCallback();
        this.resolve?.();
    }

    private getVMAFScore(): number {
        const regex = /(?<=VMAF score: )[0-9.]+/;
        const vmafScoreString = this.log.match(regex)?.[0];
        const vmafScore = parseFloat(vmafScoreString ?? "0");
        return vmafScore;
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

    public get state(): EncodingState {
        return this._state;
    }

    private set state(value: EncodingState) {
        this._state = value;
    }

    public get duration(): number {
        return this._duration;
    }

    private set duration(value: number) {
        this._duration = value;
    }

    public get currentDuration(): number {
        return this._currentDuration;
    }

    private set currentDuration(value: number) {
        this._currentDuration = value;
    }

    public get vmafScore(): number {
        return this._vmafScore;
    }

    private set vmafScore(value: number) {
        this._vmafScore = value;
    }
}
