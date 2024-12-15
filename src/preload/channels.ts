import { ExternalLibraryPathsInfo } from "@shared/types/ExternalLibraryPathsInfo";
import { GenericVideoEncoderReport } from "@shared/types/GenericVideoEncoderReport";
import { GenericVideoEncoderPathUpdateInfo } from "@shared/types/GenericVideoEncoderPathUpdateInfo";
import { GenericVideoEncoderSettings } from "@shared/types/GenericVideoEncoderSettings";
import { EncoderStatus } from "@shared/types/EncoderStatus";
import { GenericVideoEncoderCopyLogsToClipboardInfo } from "@shared/types/GenericVideoEncoderCopyLogsToClipboardInfo";
import { GenericVideoEncoderOpenLogsInfo } from "@shared/types/GenericVideoEncoderOpenLogsInfo";
import { GenericVideoEncoderResetEncodersInfo } from "@shared/types/GenericVideoEncoderResetEncodersInfo";
import { GenericVideoEncoderDeleteEncodersInfo } from "@shared/types/GenericVideoEncoderDeleteEncodersInfo";

/**
 * Declares the names of channels that can be used to send messages from the renderer to the main process.
 */
export type SendChannel = keyof SendChannelTypes;

/**
 * Declares the types of data that can be sent through the channels declared in SendChannel.
 */
type SendChannelTypes = {
    ping: void;
    log: unknown;
    genericVideoEncoderAddPaths: GenericVideoEncoderPathUpdateInfo;
    genericVideoEncoderUpdateSettings: GenericVideoEncoderSettings;
    genericVideoEncoderCopyLogsToClipboard: GenericVideoEncoderCopyLogsToClipboardInfo;
    genericVideoEncoderOpenLogs: GenericVideoEncoderOpenLogsInfo;
    genericVideoEncoderResetEncoders: GenericVideoEncoderResetEncodersInfo;
    genericVideoEncoderDeleteEncoders: GenericVideoEncoderDeleteEncodersInfo;
};

export type SendChannelArgumentsType<T extends SendChannel> = SendChannelTypes[T];

/**
 * Declares the names of channels that can be used to listen for messages sent from the main process to the renderer.
 */
export type EventChannel = keyof EventChannelTypes;

type EventChannelTypes = {
    genericVideoEncoderUpdate: GenericVideoEncoderReport;
    genericVideoEncoderDelete: GenericVideoEncoderDeleteEncodersInfo;
};

export type EventChannelArgumentsType<T extends EventChannel> = EventChannelTypes[T];

/**
 * Declares the names of channels that can be used to fetch data from the main process.
 */
export type FetchChannel = keyof FetchChannelTypes;

type FetchChannelTypes = {
    getExternalLibraryPaths: [void, ExternalLibraryPathsInfo];
    createGenericVideoEncoder: [ExternalLibraryPathsInfo, string];
    setEncoderActive: [EncoderStatus, EncoderStatus];
};

export type FetchChannelRequestArgumentsType<T extends FetchChannel> = FetchChannelTypes[T][0];
export type FetchChannelResponseArgumentsType<T extends FetchChannel> = FetchChannelTypes[T][1];
