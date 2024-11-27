export type EncoderMap = {
    /**
     * The ID of the page, used to track the encoder page in the renderer.
     */
    pageId: string;

    /**
     * The ID of the encoder, used to track the encoder in the main process.
     */
    encoderId: string;
};
