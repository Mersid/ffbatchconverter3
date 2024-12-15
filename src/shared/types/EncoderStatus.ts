/**
 * This is used to set whether the encoder controller specified should be processing videos or not.
 * A copy of this is returned from the main process, with the updated encoder status.
 */
export type EncoderStatus = {
    controllerId: string;
    encoderActive: boolean;
};
