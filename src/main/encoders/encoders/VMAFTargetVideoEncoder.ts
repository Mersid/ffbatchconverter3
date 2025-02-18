import { Emitter } from "strict-event-emitter";
import { EncodeAndScoreEncoder } from "./EncodeAndScoreEncoder";
import { probeAsync } from "../misc/Helpers";
import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { CRFToVMAFMapping } from "../misc/CRFToVMAFMapping";
import { EncodingState } from "@shared/types/EncodingState";
import { v4 as uuidv4 } from "uuid";
import { VMAFTargetVideoEncoderReport } from "@shared/types/VMAFTargetVideoEncoderReport";
import { log } from "../misc/Logger";
import { Attempt } from "../misc/Result";

type Events = {
    log: [tag: string, data: string, internal: boolean];
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
    private _encoderId: string;
    private _ffprobePath: string;
    private _ffmpegPath: string;
    private _inputFilePath: string;
    private _outputFilePath: string = "";
    private _h265: boolean = false;
    private _tempDirectory: string;
    private _log: string = "";
    /**
     * Size of the input file in bytes.
     */
    private _fileSize: number = 0;
    private _crfToVMAF: CRFToVMAFMapping[] = [];
    private _encoder: EncodeAndScoreEncoder | undefined = undefined;
    /**
     * Function that resolves the promise provided by the start method. This is undefined until the start method is called.
     */
    private _resolve: ((value: void | PromiseLike<void>) => void) | undefined = undefined;
    private _currentDuration: number = 0;
    private _duration: number = 0;
    private _state: EncodingState = "Pending";

    private _lastVMAF: number = 0;
    private _lowCRF: number = 0;
    private _highCRF: number = 51;
    private _thisCRF: number = 0;

    private constructor(ffprobePath: string, ffmpegPath: string, inputFilePath: string, tempDirectory: string) {
        super();
        this._encoderId = uuidv4();
        this._ffprobePath = ffprobePath;
        this._ffmpegPath = ffmpegPath;
        this._inputFilePath = inputFilePath;
        this._tempDirectory = tempDirectory;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string, inputFilePath: string, tempDirectory: string): Promise<VMAFTargetVideoEncoder> {
        const encoder = new VMAFTargetVideoEncoder(ffprobePath, ffmpegPath, inputFilePath, tempDirectory);
        const probeData = await probeAsync(ffprobePath, inputFilePath);

        try {
            encoder._fileSize = (await stat(inputFilePath)).size;
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
        this._outputFilePath = outputFilePath;
        this._h265 = h265;

        if (this.state != "Pending") {
            this.logLine(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
            throw new Error(`Cannot start encoding when the state is not pending. Current state: ${this.state}`);
        }

        this.state = "Encoding";

        this.lowCRF = 0;
        this.highCRF = 51;
        this.thisCRF = 0;
        this.lastVMAF = 0;
        let stage: Stage = "ValidateUpperBound";

        const errorWithMessage = (message: string) => {
            this.logLine(message);
            this.state = "Error";
            this.emit("update");
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            // If we have a previous encoder, remove all listeners to avoid memory leaks.
            this._encoder?.removeAllListeners();
            this._encoder = await EncodeAndScoreEncoder.createNew(this._ffprobePath, this._ffmpegPath, this._inputFilePath);
            this._encoder.on("log", (tag, data, internal) => this.onChildLog(tag, data, internal));
            this._encoder.on("update", () => this.onChildUpdate());

            if (this._encoder.state == "Error") {
                errorWithMessage("Could not create the encoder. Exiting.");
                return;
            }

            // Run an encode based on our algorithm.
            if (stage == "ValidateUpperBound") {
                // Step 0. Run with CRF 0 to get upper range of VMAF score.
                this.thisCRF = 0;
                this.logLine("Executing step 0: Validate upper bound.");
                const result = await this.encodeVideoWithCRF(ffmpegArguments, this.thisCRF);
                if (this._encoder.vmafScoreZero < targetVMAF) {
                    // If the VMAF score is less than the target, we can't find a CRF that will work.
                    errorWithMessage(`VMAF with CRF 0 is ${this._encoder.vmafScore}. It needs to be greater than ${targetVMAF}.`);
                    return;
                }
                if (result.type == "failure") {
                    errorWithMessage("Video failed to encode. Exiting.");
                    return;
                }

                this._crfToVMAF.push({
                    filePath: result.value,
                    crf: this.thisCRF,
                    vmaf: this._encoder.vmafScoreZero
                });

                this.lastVMAF = this._encoder.vmafScoreZero;
                stage = "ValidateLowerBound";
            } else if (stage == "ValidateLowerBound") {
                // Step 1. Run with max CRF to get lower range of VMAF score.
                this.thisCRF = 51;
                this.logLine("Executing step 1: Validate lower bound.");
                const result = await this.encodeVideoWithCRF(ffmpegArguments, this.thisCRF);
                if (targetVMAF < this._encoder.vmafScoreZero) {
                    // If the VMAF score is greater than the target, we can't find a CRF that will work.
                    errorWithMessage(`VMAF with CRF 51 is ${this._encoder.vmafScore}. It needs to be less than ${targetVMAF}.`);
                    return;
                }
                if (result.type == "failure") {
                    errorWithMessage("Video failed to encode. Exiting.");
                    return;
                }

                this._crfToVMAF.push({
                    filePath: result.value,
                    crf: this.thisCRF,
                    vmaf: this._encoder.vmafScoreZero
                });

                this.lastVMAF = this._encoder.vmafScoreZero;
                stage = "NarrowDown";
            } else if (stage == "NarrowDown") {
                // Step 2. Narrow down the range to about 4 CRF values.
                const crfRange = this.highCRF - this.lowCRF;
                this.logLine(`Executing step 2: Narrow down. High CRF: ${this.highCRF}, Low CRF: ${this.lowCRF}, Range: ${crfRange}.`);

                // The narrowing algorithm does a binary search to find the correct CRF.
                // It doesn't quite work if the range is less than 4.
                // If we get to that point, do a linear scan in the next stage.
                if (crfRange <= 4) {
                    stage = "IterateSubset";
                    this.thisCRF = this.lowCRF;
                    continue;
                }

                // Also previously called midCrf.
                this.thisCRF = Math.floor((this.highCRF + this.lowCRF) / 2);

                const result = await this.encodeVideoWithCRF(ffmpegArguments, this.thisCRF);
                if (result.type == "failure") {
                    errorWithMessage("Video failed to encode. Exiting.");
                    return;
                }

                this.logLine(`VMAF with CRF ${this.thisCRF} is ${this._encoder.vmafScoreZero}.`);
                if (this._encoder.vmafScoreZero > targetVMAF) {
                    // Too high. Decrease VMAF, increase CRF range.
                    this.lowCRF = this.thisCRF - 1;
                } else {
                    // Too low. Increase VMAF, decrease CRF range.
                    this.highCRF = this.thisCRF;
                }

                this._crfToVMAF.push({
                    filePath: result.value,
                    crf: this.thisCRF,
                    vmaf: this._encoder.vmafScoreZero
                });
                this.lastVMAF = this._encoder.vmafScoreZero;
            } else if (stage == "IterateSubset") {
                // Step 3. Iterate over the subset of CRF values found in step 2 to find the best one.
                this.logLine("Executing step 3: Iterate subset.");
                if (this.thisCRF > this.highCRF) {
                    // We've iterated over the subset and was unable to find a match. Move to the next stage.
                    stage = "LinearWalk";
                    continue;
                }

                const result = await this.encodeVideoWithCRF(ffmpegArguments, this.thisCRF);
                if (result.type == "failure") {
                    errorWithMessage("Video failed to encode. Exiting.");
                    return;
                }
                this.logLine(`VMAF with CRF ${this.thisCRF} is ${this._encoder.vmafScoreZero}.`);
                this._crfToVMAF.push({
                    filePath: result.value,
                    crf: this.thisCRF,
                    vmaf: this._encoder.vmafScoreZero
                });

                this.lastVMAF = this._encoder.vmafScoreZero;
                this.thisCRF++;
            } else if (stage == "LinearWalk") {
                // Step 4. Walk linearly over the CRF values to find the best one.
                this.logLine("Executing step 4: Linear walk.");
                if (this.lastVMAF < targetVMAF) {
                    this.thisCRF--;
                } else {
                    this.thisCRF++;
                }

                const result = await this.encodeVideoWithCRF(ffmpegArguments, this.thisCRF);
                if (result.type == "failure") {
                    errorWithMessage("Video failed to encode. Exiting.");
                    return;
                }
                this.logLine(`VMAF with CRF ${this.thisCRF} is ${this._encoder.vmafScoreZero}.`);
                this._crfToVMAF.push({
                    filePath: result.value,
                    crf: this.thisCRF,
                    vmaf: this._encoder.vmafScoreZero
                });

                this.lastVMAF = this._encoder.vmafScoreZero;
            }

            // We did an encoding. Check the table to see if we have a good match.
            this._crfToVMAF.sort(t => t.crf);
            for (let i = 1; i < this._crfToVMAF.length; i++) {
                if (
                    this._crfToVMAF[i].vmaf < targetVMAF &&
                    this._crfToVMAF[i - 1].vmaf >= targetVMAF &&
                    this._crfToVMAF[i].crf - this._crfToVMAF[i - 1].crf == 1
                ) {
                    // Found the boundary. Should also note that there's an inverse relationship between CRF and VMAF.
                    const target = this._crfToVMAF[i - 1];

                    this.logLine(`Found the boundary. CRF: ${target.crf}, VMAF: ${target.vmaf}.`);

                    // This call should overwrite any existing file.
                    await copyFile(target.filePath, outputFilePath);
                    this.state = "Success";
                    this.lastVMAF = target.vmaf;
                    this.thisCRF = target.crf;

                    // Cleanup the temporary files.
                    for (const mapping of this.crfToVMAF) {
                        await rm(mapping.filePath, {
                            force: true
                        });
                    }

                    this.emit("update");
                    return;
                }
            }
        }
    }

    /**
     * Resets the encoder into the initial state. This command is silently ignored if the encoder is currently encoding.
     * @returns True if the encoder was reset; false if the encoder is currently encoding and will not be reset.
     */
    public reset(): boolean {
        if (this.state == "Encoding") {
            return false;
        }

        this.currentDuration = 0;
        this.state = "Pending";
        this.crfToVMAF = [];
        this.encoder = undefined;
        this.resolve = undefined;

        this.lastVMAF = 0;
        this.lowCRF = 0;
        this.highCRF = 51;
        this.thisCRF = 0;

        this.logLine("Reset encoder to pending state.");
        this.emit("update");
        return true;
    }

    /**
     * Encodes the video with the specified arguments and CRF value. Other required data is pulled from the class.
     * @param ffmpegArguments The regular FFmpeg arguments to encode the video with. Do NOT specify the codec or CRF here.
     * @param crf The CRF value to use. The range is 0-51, with 0 being lossless and 51 being the worst quality.
     * @returns The path to the temporary file that the video was encoded to.
     * @private
     */
    private async encodeVideoWithCRF(ffmpegArguments: string, crf: number): Promise<Attempt<string, void>> {
        const tempFile = await this.requestTempFilePath(this._tempDirectory, crf, this._outputFilePath);
        const args = this.generateAugmentedFFmpegArguments(ffmpegArguments, this._h265, crf);
        if (this._encoder == undefined) {
            throw new Error("Encoder is undefined.");
        }

        await this._encoder.start(args, tempFile);
        if (this._encoder.state == "Error") {
            return {
                type: "failure"
            };
        }

        return {
            type: "success",
            value: tempFile
        };
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
        return `${ffmpegArguments} -c:v ${h265 ? "libx265" : "libx264"} -crf ${crf}`;
    }

    /**
     * Requests a temporary file path for the encoder to write temporary files to. tempDir will be created if necessary.
     * @param tempDir The base directory to store the files.
     * @param crf The CRF value to use in the file name.
     * @param outputFilePath The output file path of the original video, to ensure the extension matches.
     * @private
     */
    private async requestTempFilePath(tempDir: string, crf: number, outputFilePath: string): Promise<string> {
        await mkdir(tempDir, { recursive: true });
        return path.join(tempDir, `${crf}-${uuidv4()}${path.extname(outputFilePath)}`);
    }

    private onChildUpdate() {
        this.currentDuration = this._encoder?.currentDuration ?? 0;
        this.emit("update");
    }

    private onChildLog(tag: string, data: string, internal: boolean) {
        if (internal) {
            this.logInternal(data, tag);
        } else {
            this.logLine(data, tag);
        }
    }

    /**
     * Logs a line to the log. Use this for log data that does not come from ffmpeg or ffprobe.
     * @param data Data to log.
     * @param tag Tag to use for the log. A default one will be set if this is undefined.
     * @private
     */
    private logLine(data: string, tag: string | undefined = undefined): void {
        if (tag == undefined) {
            tag = "VMAF Target Encoder/Log";
        }
        this.log += log.custom(tag, data);
        this.emit("log", tag, data, false);
    }

    /**
     * Logs data to the log. Use this for log data that comes from ffmpeg or ffprobe.
     * @param data Data to log.
     * @param tag Tag to use for the log. A default one will be set if this is undefined.
     * @private
     */
    private logInternal(data: string, tag: string | undefined = undefined): void {
        if (tag == undefined) {
            tag = "VMAF Target Encoder/FFmpeg";
        }
        this.log += log.custom(tag, data);
        this.emit("log", tag, data, true);
    }

    public get lastVMAF(): number {
        return this._lastVMAF;
    }

    private set lastVMAF(value: number) {
        this._lastVMAF = value;
    }

    public get lowCRF(): number {
        return this._lowCRF;
    }

    private set lowCRF(value: number) {
        this._lowCRF = value;
    }

    public get highCRF(): number {
        return this._highCRF;
    }

    private set highCRF(value: number) {
        this._highCRF = value;
    }

    public get thisCRF(): number {
        return this._thisCRF;
    }

    private set thisCRF(value: number) {
        this._thisCRF = value;
    }

    public get encoderId(): string {
        return this._encoderId;
    }

    public set encoderId(value: string) {
        this._encoderId = value;
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

    public get report(): VMAFTargetVideoEncoderReport {
        return {
            controllerId: "Added at controller level!",
            encoderId: this.encoderId,
            inputFilePath: this._inputFilePath,
            fileSize: this._fileSize,
            currentDuration: this.currentDuration,
            duration: this.duration,
            encodingState: this.state,
            thisCRF: this.thisCRF,
            lowCRF: this.lowCRF,
            highCRF: this.highCRF,
            lastVMAF: this.lastVMAF,
            encodingPhase: this.encoder?.encodingPhase ?? "Encoding"
        };
    }

    public get inputFilePath(): string {
        return this._inputFilePath;
    }

    private set inputFilePath(value: string) {
        this._inputFilePath = value;
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

    private get h265(): boolean {
        return this._h265;
    }

    private set h265(value: boolean) {
        this._h265 = value;
    }

    private get tempDirectory(): string {
        return this._tempDirectory;
    }

    private set tempDirectory(value: string) {
        this._tempDirectory = value;
    }

    private get fileSize(): number {
        return this._fileSize;
    }

    private set fileSize(value: number) {
        this._fileSize = value;
    }

    private get crfToVMAF(): CRFToVMAFMapping[] {
        return this._crfToVMAF;
    }

    private set crfToVMAF(value: CRFToVMAFMapping[]) {
        this._crfToVMAF = value;
    }

    private get encoder(): EncodeAndScoreEncoder | undefined {
        return this._encoder;
    }

    private set encoder(value: EncodeAndScoreEncoder | undefined) {
        this._encoder = value;
    }

    private get resolve(): ((value: void | PromiseLike<void>) => void) | undefined {
        return this._resolve;
    }

    private set resolve(value: ((value: void | PromiseLike<void>) => void) | undefined) {
        this._resolve = value;
    }
}
