import { Emitter } from "strict-event-emitter";
import { EncodeAndScoreEncoder } from "./EncodeAndScoreEncoder";
import { probe } from "../misc/Helpers";
import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { CRFToVMAFMapping } from "../misc/CRFToVMAFMapping";
import { EncodingState } from "@shared/types/EncodingState";
import { v4 as uuidv4 } from "uuid";
import { VMAFTargetVideoEncoderReport } from "@shared/types/VMAFTargetVideoEncoderReport";

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
        const probeData = probe(ffprobePath, inputFilePath);

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

        let lowCRF = 0;
        let highCRF = 51;
        let thisCrf = 0;
        let lastVMAF = 0;
        let stage: Stage = "ValidateUpperBound";

        // eslint-disable-next-line no-constant-condition
        while (true) {
            // If we have a previous encoder, remove all listeners to avoid memory leaks.
            this._encoder?.removeAllListeners();
            this._encoder = await EncodeAndScoreEncoder.createNew(this._ffprobePath, this._ffmpegPath, this._inputFilePath);
            this._encoder.on("log", (data, internal) => this.onChildLog(data, internal));
            this._encoder.on("update", () => this.onChildUpdate());

            if (this._encoder.state == "Error") {
                this.logLine("Could not create the encoder. Exiting.");
                this.state = "Error";
                return;
            }

            // Run an encode based on our algorithm.
            if (stage == "ValidateUpperBound") {
                // Step 0. Run with CRF 0 to get upper range of VMAF score.
                thisCrf = 0;
                const tempFile = await this.encodeVideoWithCRF(ffmpegArguments, thisCrf);
                if (this._encoder.vmafScore < targetVMAF) {
                    // If the VMAF score is less than the target, we can't find a CRF that will work.
                    this.logLine(`VMAF with CRF 0 is ${this._encoder.vmafScore}. It needs to be greater than ${targetVMAF}.`);
                    this.state = "Error";
                    return;
                }

                this._crfToVMAF.push({
                    filePath: tempFile,
                    crf: thisCrf,
                    vmaf: this._encoder.vmafScore
                });

                lastVMAF = this._encoder.vmafScore;
                stage = "ValidateLowerBound";
            } else if (stage == "ValidateLowerBound") {
                // Step 1. Run with max CRF to get lower range of VMAF score.
                thisCrf = 51;
                const tempFile = await this.encodeVideoWithCRF(ffmpegArguments, thisCrf);
                if (targetVMAF < this._encoder.vmafScore) {
                    // If the VMAF score is greater than the target, we can't find a CRF that will work.
                    this.logLine(`VMAF with CRF 51 is ${this._encoder.vmafScore}. It needs to be less than ${targetVMAF}.`);
                    this.state = "Error";
                    return;
                }

                this._crfToVMAF.push({
                    filePath: tempFile,
                    crf: thisCrf,
                    vmaf: this._encoder.vmafScore
                });

                lastVMAF = this._encoder.vmafScore;
                stage = "NarrowDown";
            } else if (stage == "NarrowDown") {
                // Step 2. Narrow down the range to about 4 CRF values.
                const crfRange = highCRF - lowCRF;

                // The narrowing algorithm does a binary search to find the correct CRF.
                // It doesn't quite work if the range is less than 4.
                // If we get to that point, do a linear scan in the next stage.
                if (crfRange <= 4) {
                    stage = "IterateSubset";
                    thisCrf = lowCRF;
                    continue;
                }

                // Also previously called midCrf.
                thisCrf = Math.floor((highCRF + lowCRF) / 2);

                const tempFile = await this.encodeVideoWithCRF(ffmpegArguments, thisCrf);
                // TODO: Test this.
                if (this._encoder.vmafScore > targetVMAF) {
                    // Too high. Decrease VMAF, increase CRF range.
                    lowCRF = thisCrf - 1;
                } else {
                    // Too low. Increase VMAF, decrease CRF range.
                    highCRF = thisCrf;
                }

                this._crfToVMAF.push({
                    filePath: tempFile,
                    crf: thisCrf,
                    vmaf: this._encoder.vmafScore
                });
                lastVMAF = this._encoder.vmafScore;
            } else if (stage == "IterateSubset") {
                // Step 3. Iterate over the subset of CRF values found in step 2 to find the best one.
                if (thisCrf > highCRF) {
                    // We've iterated over the subset and was unable to find a match. Move to the next stage.
                    stage = "LinearWalk";
                    continue;
                }

                const tempFile = await this.encodeVideoWithCRF(ffmpegArguments, thisCrf);

                this._crfToVMAF.push({
                    filePath: tempFile,
                    crf: thisCrf,
                    vmaf: this._encoder.vmafScore
                });

                lastVMAF = this._encoder.vmafScore;
                thisCrf++;
            } else if (stage == "LinearWalk") {
                // Step 4. Walk linearly over the CRF values to find the best one.
                if (lastVMAF < targetVMAF) {
                    thisCrf--;
                } else {
                    thisCrf++;
                }

                const tempFile = await this.encodeVideoWithCRF(ffmpegArguments, thisCrf);

                this._crfToVMAF.push({
                    filePath: tempFile,
                    crf: thisCrf,
                    vmaf: this._encoder.vmafScore
                });

                lastVMAF = this._encoder.vmafScore;
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

                    // This call should overwrite any existing file.
                    await copyFile(target.filePath, outputFilePath);
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
        this.crfToVMAF = [];
        this.encoder = undefined;
        this.resolve = undefined;

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
    private async encodeVideoWithCRF(ffmpegArguments: string, crf: number): Promise<string> {
        const tempFile = await this.requestTempFilePath(this._tempDirectory, crf, this._outputFilePath);
        const args = this.generateAugmentedFFmpegArguments(ffmpegArguments, this._h265, crf);
        if (this._encoder == undefined) {
            throw new Error("Encoder is undefined.");
        }

        await this._encoder.start(args, tempFile);
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
            encodingState: this.state
        };
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

    public get log(): string {
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
