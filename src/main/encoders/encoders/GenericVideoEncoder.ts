import { spawn } from "node:child_process";
import { EncodingState } from "../misc/EncodingState";
import { probe } from "../misc/Helpers";
import { stat } from "node:fs/promises";
import { ChildProcessWithoutNullStreams } from "child_process";
import sleep from "../../../shared/functions/sleep";

export type GenericVideoEncoderOptions = {
    ffprobePath: string;
    ffmpegPath: string;
    inputFilePath: string;
};

export class GenericVideoEncoder {
    private ffprobePath: string;
    private ffmpegPath: string;

    private inputFilePath: string;
    private outputFilePath: string = "";

    private log: string = "";

    private currentDuration: number = 0;
    private duration: number = 0;

    /**
     * Size of the input file in bytes.
     */
    private fileSize: number = 0;

    private _state: EncodingState = "Pending";

    /**
     * Function that resolves the promise provided by the start method. This is undefined until the start method is called.
     */
    private resolve: ((value: void | PromiseLike<void>) => void) | undefined = undefined;

    private process: ChildProcessWithoutNullStreams | undefined = undefined;

    private constructor(ffprobePath: string, ffmpegPath: string, inputFilePath: string) {
        this.ffprobePath = ffprobePath;
        this.ffmpegPath = ffmpegPath;
        this.inputFilePath = inputFilePath;
    }

    public static async createNew(
        ffprobePath: string,
        ffmpegPath: string,
        inputFilePath: string
    ): Promise<GenericVideoEncoder> {
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

        encoder.log += probeData + "\n";

        const json = JSON.parse(probeData);
        const duration = json.format?.duration as number | undefined;

        if (duration == undefined) {
            encoder.logLine("Could not determine duration of the video.");
            encoder.state = "Error";
        } else {
            encoder.duration = duration;
            encoder.state = "Pending";
        }

        return encoder;
    }

    public async start(ffmpegArguments: string, outputFilePath: string): Promise<void> {
        const promise = new Promise<void>((resolve, reject) => {
            this.resolve = resolve;
        });

        if (this.state != "Pending") {
            this.logLine(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
            throw new Error(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
        }

        this.outputFilePath = outputFilePath;

        this.process = spawn(`"${this.ffmpegPath}" -y -i "${this.inputFilePath}" ${ffmpegArguments} "${outputFilePath}"`, {
            shell: true
        });

        this.state = "Encoding";

        this.process.stdout.on("data", data => this.onProcessReceivedData(data.toString()));
        this.process.stderr.on("data", data => this.onProcessReceivedData(data.toString()));
        this.process.on("close", async code => {
            this.state = code == 0 ? "Success" : "Error";
            this.logLine(`Process exited with code ${code}`);
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

            this.currentDuration = parseFloat(time);

            if (isNaN(this.currentDuration)) {
                this.logLine("Could not parse the current duration of the video.");
            }
        }

        this.log += data;
    }

    private logLine(data: string): void {
        this.log += `>> ${data}\n`;
    }

    private set state(value: EncodingState) {
        this._state = value;
    }

    public get state(): EncodingState {
        return this._state;
    }
}
