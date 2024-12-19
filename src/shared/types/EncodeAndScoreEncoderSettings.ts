import { EncodeAndScoreEncoderSelection } from "@shared/types/EncodeAndScoreEncoderSelection";

export type EncodeAndScoreEncoderSettings = {
    controllerId: string;
    concurrency: number;
    subdirectory: string;
    extension: string;
    encoder: EncodeAndScoreEncoderSelection;
    crf: number;
    ffmpegArguments: string;
}
