/**
 * Request structure to submit data from the renderer to the main process to remove one or more
 * encode and score encoders from a controller.
 */
export type EncodeAndScoreEncoderDeleteEncodersInfo = {
    controllerId: string;
    encoderIds: string[];
};
