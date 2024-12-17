import { v4 as uuid4 } from "uuid";
import { Emitter } from "strict-event-emitter";
import { getFilesRecursive } from "../misc/Helpers";
import { EncodeAndScoreEncoder } from "../encoders/EncodeAndScoreEncoder";
import * as Events from "node:events";
import { EncodeAndScoreEncoderReport } from "@shared/types/EncodeAndScoreEncoderReport";

type Events = {
    /**
     * Event that is emitted whenever the encoder receives new information. This is a good time for listeners to check the state.
     * The ID of the encoder is given as an argument.
     */
    update: [encoderId: string];
};

export class EncodeAndScoreEncoderController extends Emitter<Events> {
    private _controllerId: string;
    private _ffprobePath: string;
    private _ffmpegPath: string;
    private _isEncoding: boolean = false;
    private _encoders: EncodeAndScoreEncoder[] = [];

    constructor(ffprobePath: string, ffmpegPath: string) {
        super();
        this._controllerId = uuid4();
        this._ffprobePath = ffprobePath;
        this._ffmpegPath = ffmpegPath;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string): Promise<EncodeAndScoreEncoderController> {
        return new EncodeAndScoreEncoderController(ffprobePath, ffmpegPath);
    }

    public async startEncoding() {
        this.isEncoding = true;
        await this.processActions();
    }

    public async stopEncoding() {
        this.isEncoding = false;
        await this.processActions();
    }

    /**
     * Takes an array of directory paths, and generates encoders.
     * For each directory, it is recursively traversed and an encoder will be created for each file.
     * Files themselves will have an encoder created according to the above rule.
     * An initial report is returned for each encoder created.
     * @param entries
     */
    public async addEncoders(entries: string[]): Promise<EncodeAndScoreEncoderReport[]> {
        const files: string[] = [];
        for (const entry of entries) {
            files.push(...(await getFilesRecursive(entry)));
        }

        const encoderPromises = files.map(async file => {
            return EncodeAndScoreEncoder.createNew(this.ffprobePath, this.ffmpegPath, file);
        })

        const encoders = await Promise.all(encoderPromises);
        encoders.sort(t => t.duration).reverse();

        for (const encoder of encoders) {
            encoder.on("update", () => {
                this.processActions();
                this.emit("update", encoder.encoderId);
            });
            this.encoders.push(encoder);
        }

        return encoders.map(t => {
            return <EncodeAndScoreEncoderReport>{
                ...t.report,
                controllerId: this.controllerId
            };
        });
    }

    /**
     * Takes an array of encoder IDs and resets them. If the encoder is currently encoding, it will not be reset.
     * A list of encoder IDs that were reset is returned; the rest are silently ignored.
     * @param encoderIds
     */
    public resetEncoders(encoderIds: string[]): string[] {
        const resetIds: string[] = [];
        for (const encoderId of encoderIds) {
            const encoder = this.encoders.find(e => e.encoderId == encoderId);
            if (encoder == undefined) {
                throw new Error(`No encoder with ID ${encoderId} found.`);
            }

            if (encoder.reset()) {
                resetIds.push(encoderId);
            }
        }

        return resetIds;
    }

    /**
     * Takes an array of encoder IDs and deletes them from the controller. If the encoder is currently encoding, it will not be removed.
     * A list of encoder IDs that were removed is returned; the rest are silently ignored.
     * @param encoderIds
     */
    public deleteEncoders(encoderIds: string[]): string[] {
        const removedIds: string[] = [];
        for (const encoderId of encoderIds) {
            const encoder = this.encoders.find(e => e.encoderId == encoderId);
            if (encoder == undefined) {
                throw new Error(`No encoder with ID ${encoderId} found.`);
            }

            if (encoder.state == "Encoding") {
                continue;
            }

            removedIds.push(encoderId);

            encoder.removeAllListeners();
            this.encoders = this.encoders.filter(e => e.encoderId != encoderId);
        }

        return removedIds;
    }

    /**
     * Produces a report for the encoder with the given ID. An error is thrown if no encoder with the given ID is found.
     * @param encoderId
     */
    public getReportFor(encoderId: string): EncodeAndScoreEncoderReport {
        const encoder = this.encoders.find(e => e.encoderId == encoderId);
        if (encoder == undefined) {
            throw new Error(`No encoder with ID ${encoderId} found.`);
        }

        return <EncodeAndScoreEncoderReport>{
            ...encoder.report,
            controllerId: this.controllerId
        };
    }

    /**
     * Collects the logs for the encoder with the given ID. An error is thrown if no encoder with the given ID is found.
     * @param encoderId
     */
    public getLogsFor(encoderId: string): string {
        const encoder = this.encoders.find(e => e.encoderId == encoderId);
        if (encoder == undefined) {
            throw new Error(`No encoder with ID ${encoderId} found.`);
        }

        return encoder.log;
    }

    /**
     * Event loop for the controller that gets triggered by various actions.
     * @private
     */
    private async processActions() {
        // TODO
    }

    private get controllerId(): string {
        return this._controllerId;
    }

    private set controllerId(value: string) {
        this._controllerId = value;
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

    private get isEncoding(): boolean {
        return this._isEncoding;
    }

    private set isEncoding(value: boolean) {
        this._isEncoding = value;
    }

    private get encoders(): EncodeAndScoreEncoder[] {
        return this._encoders;
    }

    private set encoders(value: EncodeAndScoreEncoder[]) {
        this._encoders = value;
    }
}
