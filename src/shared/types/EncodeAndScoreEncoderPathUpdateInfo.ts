/**
 * Request structure to request one or more file paths to be added to an encode and score encoder controller.
 * Updates, including additions but not deletions, will be sent via a separate channel using EncodeAndScoreEncoderReport.
 */
export type EncodeAndScoreEncoderPathUpdateInfo = {
    /**
     * The controller ID of the encoder to add the paths to.
     */
    controllerId: string;

    /**
     * The paths to add to the encoder.
     */
    paths: string[];
};
