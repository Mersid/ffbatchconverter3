type Events = {
    /**
     * Event that is emitted whenever the encoder receives new information. This is a good time for listeners to check the state.
     * The ID of the encoder is given as an argument.
     */
    update: [encoderId: string];
};

import { Emitter } from 'strict-event-emitter';

export class VMAFTargetVideoEncoderController extends Emitter<Events> {
    private _ffprobePath: string;
    private _ffmpegPath: string;

    constructor(ffprobePath: string, ffmpegPath: string) {
        super();
        this._ffprobePath = ffprobePath;
        this._ffmpegPath = ffmpegPath;
    }

    public static async createNew(ffprobePath: string, ffmpegPath: string): Promise<VMAFTargetVideoEncoderController> {
        return new VMAFTargetVideoEncoderController(ffprobePath, ffmpegPath);
    }

    public async startEncoding() {
        // TODO
    }

    public async stopEncoding() {
        // TODO
    }

    /**
     * Takes an array of directory paths, and generates encoders.
     * For each directory, it is recursively traversed and an encoder will be created for each file.
     * Files themselves will have an encoder created according to the above rule.
     * An initial report is returned for each encoder created.
     * @param entries
     */
    public async addEncoders(entries: string[]): string[] {
        // TODO: and update type
    }

    /**
     * Takes an array of encoder IDs and resets them. If the encoder is currently encoding, it will not be reset.
     * A list of encoder IDs that were reset is returned; the rest are silently ignored.
     * @param encoderIds
     */
    public resetEncoders(encoderIds: string[]): string[] {
        // TODO
    }

    /**
     * Takes an array of encoder IDs and deletes them from the controller. If the encoder is currently encoding, it will not be removed.
     * A list of encoder IDs that were removed is returned; the rest are silently ignored.
     * @param encoderIds
     */
    public deleteEncoders(encoderIds: string[]): string[] {
        // TODO
    }

    /**
     * Produces a report for the encoder with the given ID. An error is thrown if no encoder with the given ID is found.
     * @param encoderId
     */
    public getReportFor(encoderId: string): string {
        // TODO: and update type
    }

    /**
     * Collects the logs for the encoder with the given ID. An error is thrown if no encoder with the given ID is found.
     * @param encoderId
     */
    public getLogsFor(encoderId: string): string {
        // TODO: and update type
    }

    /**
     * Event loop for the controller that gets triggered by various actions.
     * @private
     */
    private async processActions() {
        // TODO
    }
}
