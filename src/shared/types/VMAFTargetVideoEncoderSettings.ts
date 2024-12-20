import { EncodeAndScoreEncoderSelection } from "@shared/types/EncodeAndScoreEncoderSelection";

export type VMAFTargetVideoEncoderSettings = {
    controllerId: string;
    concurrency: number;
    subdirectory: string;
    extension: string;
    encoder: EncodeAndScoreEncoderSelection
    vmafTarget: number;
    ffmpegArguments: string;
}
