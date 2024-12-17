export type EncodeAndScoreEncoderSettings = {
    controllerId: string;
    concurrency: number;
    subdirectory: string;
    extension: string;
    encoder: string; // TODO: Alter this to x264/5
    crf: number;
    ffmpegArguments: string;
}
