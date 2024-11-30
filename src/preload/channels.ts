import { ExternalLibraryPathsInfo } from "../shared/types/ExternalLibraryPathsInfo";
import { GenericVideoEncoderReport } from "../shared/types/GenericVideoEncoderReport";
import { GenericVideoEncoderPathUpdateInfo } from "../shared/types/GenericVideoEncoderPathUpdateInfo";
import { EncoderStatus } from "../renderer/src/misc/EncoderStatus";
import { GenericVideoEncoderSettings } from "../renderer/src/misc/GenericVideoEncoderSettings";

/**
 * Declares the names of channels that can be used to send messages from the renderer to the main process.
 */
export type SendChannel = "ping" | "log" | "addPathsToGenericVideoEncoder" | "setSettingsForGenericVideoEncoder";

/**
 * Declares the types of data that can be sent through the channels declared in SendChannel.
 */
type SendChannelTypes = {
    ping: void;
    log: unknown;
    addPathsToGenericVideoEncoder: GenericVideoEncoderPathUpdateInfo;
    setSettingsForGenericVideoEncoder: GenericVideoEncoderSettings;
};

export type SendChannelArgumentsType<T extends SendChannel> = SendChannelTypes[T];

/**
 * Declares the names of channels that can be used to listen for messages sent from the main process to the renderer.
 */
export type EventChannel = "genericVideoEncoderUpdate";

type EventChannelTypes = {
    genericVideoEncoderUpdate: GenericVideoEncoderReport;
};

export type EventChannelArgumentsType<T extends EventChannel> = EventChannelTypes[T];

/**
 * Declares the names of channels that can be used to fetch data from the main process.
 */
export type FetchChannel = "getExternalLibraryPaths" | "createGenericVideoEncoder" | "setEncoderActive";

type FetchChannelTypes = {
    getExternalLibraryPaths: [void, ExternalLibraryPathsInfo];
    createGenericVideoEncoder: [ExternalLibraryPathsInfo, string];
    setEncoderActive: [EncoderStatus, EncoderStatus];
};

export type FetchChannelRequestArgumentsType<T extends FetchChannel> = FetchChannelTypes[T][0];
export type FetchChannelResponseArgumentsType<T extends FetchChannel> = FetchChannelTypes[T][1];
