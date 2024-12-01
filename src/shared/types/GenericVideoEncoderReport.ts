import { EncodingState } from "./EncodingState";

export type GenericVideoEncoderReport = {
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
};
