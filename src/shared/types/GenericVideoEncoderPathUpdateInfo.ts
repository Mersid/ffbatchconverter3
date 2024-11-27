export type GenericVideoEncoderPathUpdateInfo = {
    /**
     * The controller ID of the encoder to add the paths to.
     */
    controllerId: string;

    /**
     * The paths to add to the encoder.
     */
    paths: string[];
};
