export type EncoderCreationPageSerializationData = {
    /**
     * True if the page's submit button was clicked and the encoder was created.
     * This flag ensures once the encoder is created, the page will not be shown again.
     */
    encoderCreated: boolean;

    /**
     * The ID of the encoder that was created. Mostly for debugging here.
     */
    id: string;

    taskName: string;
    taskType: number;
    ffmpegPath: string;
    ffprobePath: string;
};
