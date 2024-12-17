import { EncodingState } from "@shared/types/EncodingState";

/**
 * An update report sent from the main process to the renderer to indicate that a encode and score encoder has been created
 * or updated. The same report is used for both cases; use the controller/encoder ID to check if a new entry needs to
 * be created in the renderer's tables.
 */
export type EncodeAndScoreEncoderReport = {
    controllerId: string;
    encoderId: string;
    encodingState: EncodingState;
    inputFilePath: string;

    /**
     * Size of the original file, in bytes.
     */
    fileSize: number;
    currentDuration: number;
    duration: number;
}
