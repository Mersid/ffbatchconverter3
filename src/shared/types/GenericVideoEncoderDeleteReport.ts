/**
 * Report that contains the controller and encoder ID for a generic video encoder that was deleted.
 * This is sent from the main process to the encoder.
 * The reason for this report being separate from GenericVideoEncoderDeleteEncodersInfo is because encoders that
 * are encoding will not be deleted. The main process will tell the renderer which encoders were deleted.
 */
export type GenericVideoEncoderDeleteReport = {
    controllerId: string;
    encoderId: string;
};
