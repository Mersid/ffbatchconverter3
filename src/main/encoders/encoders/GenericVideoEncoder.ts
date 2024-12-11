import { spawn } from "node:child_process";
import { probeAsync } from "../misc/Helpers";
import { ChildProcessWithoutNullStreams } from "child_process";
import { formatFFmpegTimeToSeconds } from "../misc/TimeFormatter";
import { Emitter } from "strict-event-emitter";
import { v4 as uuid4 } from "uuid";
import { stat } from "fs/promises";
import { GenericVideoEncoderReport } from "@shared/types/GenericVideoEncoderReport";
import { EncodingState } from "@shared/types/EncodingState";

type Events = {
    log: [data: string, internal: boolean];

    /**
     * Event that is emitted whenever the encoder receives new information. This is a good time for listeners to check the state.
     */
    update: [];
};

export class GenericVideoEncoder extends Emitter<Events> {
    private ffprobePath: string;
    private readonly ffmpegPath: string;
    private outputFilePath: string = "";
    private _log: string = "";
    public get log(): string {
        return this._log;
    }

    private set log(value: string) {
        this._log = value;
    }

    /**
     * Size of the input file in bytes.
     */
    private fileSize: number = 0;
    /**
     * Function that resolves the promise provided by the start method. This is undefined until the start method is called.
     */
    private resolve: ((value: void | PromiseLike<void>) => void) | undefined = undefined;
    private process: ChildProcessWithoutNullStreams | undefined = undefined;
    private readonly _encoderId: string;
    private readonly _inputFilePath: string;

    private constructor(ffprobePath: string, ffmpegPath: string, inputFilePath: string) {
        super();
        this._encoderId = uuid4();
        this.ffprobePath = ffprobePath;
        this.ffmpegPath = ffmpegPath;
        this._inputFilePath = inputFilePath;
    }

    public get encoderId(): string {
        return this._encoderId;
    }

    public get inputFilePath(): string {
        return this._inputFilePath;
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

    public get report(): GenericVideoEncoderReport {
        return {
            controllerId: "Added at controller level!",
            encoderId: this.encoderId,
            inputFilePath: this.inputFilePath,
            fileSize: this.fileSize,
            currentDuration: this.currentDuration,
            duration: this.duration,
            encodingState: this.state
        };
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string, inputFilePath: string): Promise<GenericVideoEncoder> {
        const encoder = new GenericVideoEncoder(ffprobePath, ffmpegPath, inputFilePath);
        const probeData = await probeAsync(ffprobePath, inputFilePath);

        try {
            encoder.fileSize = (await stat(inputFilePath)).size;
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
            encoder.state = "Pending";
        }

        return encoder;
    }

    /**
     * Starts encoding the video with the given ffmpeg arguments. The promise resolves when the encoding is complete.
     */
    public async start(ffmpegArguments: string, outputFilePath: string): Promise<void> {
        const promise = new Promise<void>((resolve, _) => {
            this.resolve = resolve;
        });

        this.outputFilePath = outputFilePath;

        if (this.state != "Pending") {
            this.logLine(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
            throw new Error(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
        }

        this.process = spawn(`"${this.ffmpegPath}" -y -i "${this._inputFilePath}" ${ffmpegArguments} "${outputFilePath}"`, {
            shell: true
        });

        this.state = "Encoding";

        this.process.stdout.on("data", data => this.onProcessReceivedData(data.toString()));
        this.process.stderr.on("data", data => this.onProcessReceivedData(data.toString()));
        this.process.on("close", async code => {
            this.state = code == 0 ? "Success" : "Error";
            this.logLine(`Process exited with code ${code}`);
            this.emit("update");
            this.resolve?.();
        });

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

    /**
     * Logs a line to the log. Use this for log data that does not come from ffmpeg or ffprobe.
     * @param data Data to log.
     * @private
     */
    private logLine(data: string): void {
        this.log += `[Generic Encoder/Log] ${data}\n`;
        this.emit("log", data, false);
    }

    /**
     * Logs data to the log. Use this for log data that comes from ffmpeg or ffprobe.
     * @param data Data to log.
     * @private
     */
    private logInternal(data: string): void {
        this.log += `[Generic Encoder/FFmpeg] ${data}\n`;
        this.emit("log", data, true);
    }
}
