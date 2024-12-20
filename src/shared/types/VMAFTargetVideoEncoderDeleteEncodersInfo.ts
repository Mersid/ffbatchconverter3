/**
 * Request structure to submit data from the renderer to the main process to remove one or more
 * VMAF target video encoders from a controller.
 */
export type VMAFTargetVideoEncoderDeleteEncodersInfo = {
    controllerId: string;
    encoderIds: string[];
};
