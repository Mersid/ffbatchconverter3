import { Emitter } from "strict-event-emitter";
import { EncodingState } from "../misc/EncodingState";
import { EncodeAndScoreEncoder } from "./EncodeAndScoreEncoder";
import { probe } from "../misc/Helpers";
import fs, { stat } from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { CRFToVMAFMapping } from "../misc/CRFToVMAFMapping";
import * as Events from "node:events";
import { data } from "autoprefixer";
import internal from "node:stream";
import { i } from "vite/dist/node/types.d-aGj9QkWt";

type Events = {
    log: [data: string, internal: boolean];
    /**
     * Called when update data is received from a process or child encoder.
     */
    update: [];
};

/**
 * Step 0 - Validate upper bound: Run with CRF 0 to get the upper bound of the VMAF score
 * Step 1 - Validate lower bound: Run with max CRF to get the lower bound of the VMAF score.
 * Step 2 - Narrow down: Use divide/conquer to narrow the range down to about 4 CRF values.
 * Step 3 - Iterate subset: Iterate over the subset of CRF values found in step 2 to find the best one.
 * Step 4 - Linear walk: Walk linearly over the CRF values to find the best one, in case the subset iteration failed.
 */
type Stage = "ValidateUpperBound" | "ValidateLowerBound" | "NarrowDown" | "IterateSubset" | "LinearWalk";

export class VMAFTargetVideoEncoder extends Emitter<Events> {
    private ffprobePath: string;
    private ffmpegPath: string;

    private inputFilePath: string;
    private outputFilePath: string = "";
    private h265: boolean = false;

    private tempDirectory: string;

    private log: string = "";

    private _currentDuration: number = 0;
    private _duration: number = 0;

    /**
     * Size of the input file in bytes.
     */
    private fileSize: number = 0;

    private crfToVMAF: CRFToVMAFMapping[] = [];

    private _state: EncodingState = "Pending";

    private encoder: EncodeAndScoreEncoder | undefined = undefined;

    /**
     * Function that resolves the promise provided by the start method. This is undefined until the start method is called.
     */
    private resolve: ((value: void | PromiseLike<void>) => void) | undefined = undefined;

    private constructor(ffprobePath: string, ffmpegPath: string, inputFilePath: string, tempDirectory: string) {
        super();
        this.ffprobePath = ffprobePath;
        this.ffmpegPath = ffmpegPath;
        this.inputFilePath = inputFilePath;
        this.tempDirectory = tempDirectory;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string, inputFilePath: string, tempDirectory: string): Promise<VMAFTargetVideoEncoder> {
        const encoder = new VMAFTargetVideoEncoder(ffprobePath, ffmpegPath, inputFilePath, tempDirectory);
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
        }

        return encoder;
    }

    public async start(ffmpegArguments: string, h265: boolean, targetVMAF: number, outputFilePath: string): Promise<void> {
        this.outputFilePath = outputFilePath;
        this.h265 = h265;

        if (this.state != "Pending") {
            this.logLine(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
            throw new Error(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
        }

        this.state = "Encoding";

        let lowCRF = 0;
        let highCRF = 51;
        let thisCrf = 0;
        let lastVMAF = 0;
        let stage: Stage = "ValidateUpperBound";

        // eslint-disable-next-line no-constant-condition
        while (true) {
            // If we have a previous encoder, remove all listeners to avoid memory leaks.
            this.encoder?.removeAllListeners();
            this.encoder = await EncodeAndScoreEncoder.createNew(this.ffprobePath, this.ffmpegPath, this.inputFilePath, () => this.onChildUpdate());
            this.encoder.on("log", (data, internal) => this.onChildLog(data, internal));

            if (this.encoder.state == "Error") {
                this.logLine("Could not create the encoder. Exiting.");
                this.state = "Error";
                return;
            }

            // Run an encode based on our algorithm.
            if (stage == "ValidateUpperBound") {
                // Step 0. Run with CRF 0 to get upper range of VMAF score.
                thisCrf = 0;
                const tempFile = await this.encodeVideoWithCRF(ffmpegArguments, thisCrf);
                if (this.encoder.vmafScore < targetVMAF) {
                    // If the VMAF score is less than the target, we can't find a CRF that will work.
                    this.logLine(`VMAF with CRF 0 is ${this.encoder.vmafScore}. It needs to be greater than ${targetVMAF}.`);
                    this.state = "Error";
                    return;
                }

                this.crfToVMAF.push({
                    filePath: tempFile,
                    crf: thisCrf,
                    vmaf: this.encoder.vmafScore
                });

                lastVMAF = this.encoder.vmafScore;
                stage = "ValidateLowerBound";
            } else if (stage == "ValidateLowerBound") {
                // Step 1. Run with max CRF to get lower range of VMAF score.
                thisCrf = 51;
                const tempFile = await this.encodeVideoWithCRF(ffmpegArguments, thisCrf);
                if (targetVMAF < this.encoder.vmafScore) {
                    // If the VMAF score is greater than the target, we can't find a CRF that will work.
                    this.logLine(`VMAF with CRF 51 is ${this.encoder.vmafScore}. It needs to be less than ${targetVMAF}.`);
                    this.state = "Error";
                    return;
                }

                this.crfToVMAF.push({
                    filePath: tempFile,
                    crf: thisCrf,
                    vmaf: this.encoder.vmafScore
                });

                lastVMAF = this.encoder.vmafScore;
                stage = "NarrowDown";
            } else if (stage == "NarrowDown") {
                // Step 2. Narrow down the range to about 4 CRF values.
                const crfRange = highCRF - lowCRF;

                // The narrowing algorithm does a binary search to find the correct CRF.
                // It doesn't quite work if the range is less than 4.
                // If we get to that point, do a linear scan in the next stage.
                if (crfRange <= 4) {
                    stage = "IterateSubset";
                    continue;
                }

                const midCRF = Math.floor((highCRF + lowCRF) / 2);
                thisCrf = midCRF;
                const tempFile = await this.encodeVideoWithCRF(ffmpegArguments, thisCrf);
                // TODO: Test this.
                if (this.encoder.vmafScore > targetVMAF) {
                    // Too high. Decrease VMAF, increase CRF range.
                    lowCRF = thisCrf - 1;
                } else {
                    // Too low. Increase VMAF, decrease CRF range.
                    highCRF = thisCrf;
                }

                this.crfToVMAF.push({
                    filePath: tempFile,
                    crf: thisCrf,
                    vmaf: this.encoder.vmafScore
                });
                lastVMAF = this.encoder.vmafScore;
            } else if (stage == "IterateSubset") {
                // Step 3. Iterate over the subset of CRF values found in step 2 to find the best one.
                if (thisCrf > highCRF) {
                    // We've iterated over the subset and was unable to find a match. Move to the next stage.
                    stage = "LinearWalk";
                    continue;
                }

                const tempFile = await this.encodeVideoWithCRF(ffmpegArguments, thisCrf);

                this.crfToVMAF.push({
                    filePath: tempFile,
                    crf: thisCrf,
                    vmaf: this.encoder.vmafScore
                });

                lastVMAF = this.encoder.vmafScore;
                thisCrf++;
            } else if (stage == "LinearWalk") {
                // Step 4. Walk linearly over the CRF values to find the best one.
                if (lastVMAF < targetVMAF) {
                    thisCrf--;
                } else {
                    thisCrf++;
                }

                const tempFile = await this.encodeVideoWithCRF(ffmpegArguments, thisCrf);

                this.crfToVMAF.push({
                    filePath: tempFile,
                    crf: thisCrf,
                    vmaf: this.encoder.vmafScore
                });

                lastVMAF = this.encoder.vmafScore;
            }

            // We did an encoding. Check the table to see if we have a good match.
            this.crfToVMAF.sort(t => t.crf);
            for (let i = 1; i < this.crfToVMAF.length; i++) {
                if (this.crfToVMAF[i].vmaf < targetVMAF && this.crfToVMAF[i - 1].vmaf >= targetVMAF && this.crfToVMAF[i].crf - this.crfToVMAF[i - 1].crf == 1) {
                    // Found the boundary. Should also note that there's an inverse relationship between CRF and VMAF.
                    const target = this.crfToVMAF[i - 1];

                    // This call should ovewrite any existing file.
                    await fs.copyFile(target.filePath, outputFilePath);
                    this.state = "Success";
                    lastVMAF = target.vmaf;
                    thisCrf = target.crf;
                    this.emit("update");
                    return; // TODO: Cleanup!
                }
            }
        }
    }

    /**
     * Encodes the video with the specified arguments and CRF value. Other required data is pulled from the class.
     * @param ffmpegArguments The regular FFmpeg arguments to encode the video with. Do NOT specify the codec or CRF here.
     * @param crf The CRF value to use. The range is 0-51, with 0 being lossless and 51 being the worst quality.
     * @returns The path to the temporary file that the video was encoded to.
     * @private
     */
    private async encodeVideoWithCRF(ffmpegArguments: string, crf: number): Promise<string> {
        const tempFile = await this.requestTempFilePath(this.tempDirectory, crf, this.outputFilePath);
        const args = this.generateAugmentedFFmpegArguments(ffmpegArguments, this.h265, crf);
        if (this.encoder == undefined) {
            throw new Error("Encoder is undefined.");
        }

        await this.encoder.start(args, tempFile);
        return tempFile;
    }

    /**
     * Generates the augmented FFmpeg arguments with the CRF and codec specified. This is because in addition to
     * the regular FFmpeg arguments, we need to specify the codec and CRF specially, as we currently only support
     * libx264 and libx265.
     * @param ffmpegArguments The regular FFmpeg arguments to encode the video with. Do NOT specify the codec or CRF here.
     * @param h265 Whether to use the H.265 codec. If this is false, H.264 will be used.
     * @param crf The CRF value to use. The range is 0-51, with 0 being lossless and 51 being the worst quality.
     * @private
     */
    private generateAugmentedFFmpegArguments(ffmpegArguments: string, h265: boolean, crf: number): string {
        const args = `${ffmpegArguments} -c:v ${h265 ? "libx265" : "libx264"} -crf ${crf}`;
        return args;
    }

    /**
     * Requests a temporary file path for the encoder to write temporary files to. tempDir will be created if necessary.
     * @param tempDir The base directory to store the files.
     * @param crf The CRF value to use in the file name.
     * @param outputFilePath The output file path of the original video, to ensure the extension matches.
     * @private
     */
    private async requestTempFilePath(tempDir: string, crf: number, outputFilePath: string): Promise<string> {
        await fs.mkdir(tempDir, { recursive: true });
        return path.join(tempDir, `${crf}-${uuidv4()}${path.extname(outputFilePath)}`);
    }

    private onChildUpdate() {
        this.currentDuration = this.encoder?.currentDuration ?? 0;
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
}
