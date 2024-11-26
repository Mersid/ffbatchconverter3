import { EncodingState } from "../../main/encoders/misc/EncodingState";

export type GenericVideoEncoderReport = {
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
