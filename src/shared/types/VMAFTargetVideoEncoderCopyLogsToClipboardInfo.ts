export type VMAFTargetVideoEncoderCopyLogsToClipboardInfo = {
    controllerId: string;
    /**
     * Can only copy one video encoder's logs to the clipboard at a time. This is the ID of the encoder whose logs should be copied.
     */
    encoderId: string;
};
