import { spawn } from "node:child_process";
import { EncodingState } from "../misc/EncodingState";
import { probe } from "../misc/Helpers";
import { ChildProcessWithoutNullStreams } from "child_process";
import { formatFFmpegTimeToSeconds } from "../misc/TimeFormatter";
import { Emitter } from "strict-event-emitter";
import { v4 as uuid4 } from "uuid";
import * as Events from "node:events";
import { stat } from "fs/promises";

type Events = {
    log: [data: string, internal: boolean];

    /**
     * Event that is emitted whenever the encoder receives new information. This is a good time for listeners to check the state.
     */
    update: [];
};

export class GenericVideoEncoder extends Emitter<Events> {
    private ffprobePath: string;
    private ffmpegPath: string;
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
    private process: ChildProcessWithoutNullStreams | undefined = undefined;

    private constructor(ffprobePath: string, ffmpegPath: string, inputFilePath: string) {
        super();
        this._encoderId = uuid4();
        this.ffprobePath = ffprobePath;
        this.ffmpegPath = ffmpegPath;
        this._inputFilePath = inputFilePath;
    }

    private _encoderId: string;

    public get encoderId(): string {
        return this._encoderId;
    }

    private _inputFilePath: string;

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

    public static async createNew(ffprobePath: string, ffmpegPath: string, inputFilePath: string): Promise<GenericVideoEncoder> {
        const encoder = new GenericVideoEncoder(ffprobePath, ffmpegPath, inputFilePath);
        const probeData = probe(ffprobePath, inputFilePath);

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

            this.currentDuration = formatFFmpegTimeToSeconds(time);

            if (isNaN(this.currentDuration)) {
                this.logLine("Could not parse the current duration of the video.");
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
