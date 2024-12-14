/**
 * Request structure to submit data from the renderer to the main process to remove one or more
 * generic video encoders from a controller.
 */
export type GenericVideoEncoderDeleteEncodersInfo = {
    controllerId: string;
    encoderIds: string[];
};
