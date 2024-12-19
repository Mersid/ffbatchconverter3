/**
 * Not a particularly descriptive name, but this is the class that tracks all the controllers and handles
 * interfacing those with the IPC.
 */

import { ExternalLibraryPathsInfo } from "@shared/types/ExternalLibraryPathsInfo";
import { GenericVideoEncoderController } from "../controllers/GenericVideoEncoderController";
import { GenericVideoEncoderPathUpdateInfo } from "@shared/types/GenericVideoEncoderPathUpdateInfo";
import { sendToRenderer } from "../../../preload/registerMain";
import { EncoderStatus } from "@shared/types/EncoderStatus";
import { GenericVideoEncoderSettings } from "@shared/types/GenericVideoEncoderSettings";
import { GenericVideoEncoderCopyLogsToClipboardInfo } from "@shared/types/GenericVideoEncoderCopyLogsToClipboardInfo";
import { GenericVideoEncoderOpenLogsInfo } from "@shared/types/GenericVideoEncoderOpenLogsInfo";
import { clipboard } from "electron";
import { openLog } from "./LogHelper";
import { GenericVideoEncoderResetEncodersInfo } from "@shared/types/GenericVideoEncoderResetEncodersInfo";
import { EncodeAndScoreEncoderController } from "../controllers/EncodeAndScoreEncoderController";
import { VMAFTargetVideoEncoderController } from "../controllers/VMAFTargetVideoEncoderController";

const genericVideoEncoders = new Map<string, GenericVideoEncoderController>();
const encodeAndScoreEncoders = new Map<string, EncodeAndScoreEncoderController>();
const vmafTargetVideoEncoders = new Map<string, VMAFTargetVideoEncoderController>();

export const lord = {
    /**
     * Creates a new GenericVideoEncoderController and registers it. The ID of the controller is returned.
     */
    createNewGenericVideoEncoderController: async ({ ffprobePath, ffmpegPath }: ExternalLibraryPathsInfo): Promise<string> => {
        const controller = await GenericVideoEncoderController.createNew(ffprobePath, ffmpegPath);
        controller.on("update", reportId => {
            sendToRenderer("genericVideoEncoderUpdate", controller.getReportFor(reportId));
        });

        const id = controller.controllerId;
        genericVideoEncoders.set(id, controller);
        return id;
    },
    genericVideoEncoderAddPaths: async (info: GenericVideoEncoderPathUpdateInfo): Promise<void> => {
        const controller = getGenericVideoEncoderControllerById(info.controllerId);

        const reports = await controller.addEncoders(info.paths);
        // Send the initial reports to the renderer. This allows the UI to generate initial rows for the encoders.
        reports.forEach(report => {
            sendToRenderer("genericVideoEncoderUpdate", report);
        });
    },
    genericVideoEncoderDeleteEncoders: async (info: GenericVideoEncoderResetEncodersInfo) => {
        const controller = getGenericVideoEncoderControllerById(info.controllerId);

        const removedIds = controller.deleteEncoders(info.encoderIds);

        const deleteInfo: GenericVideoEncoderResetEncodersInfo = {
            controllerId: info.controllerId,
            encoderIds: removedIds
        };

        sendToRenderer("genericVideoEncoderDelete", deleteInfo);
    },
    genericVideoEncoderUpdateSettings: async (settings: GenericVideoEncoderSettings): Promise<void> => {
        const controller = getGenericVideoEncoderControllerById(settings.controllerId);

        controller.concurrency = settings.concurrency;
        controller.outputSubdirectory = settings.subdirectory;
        controller.extension = settings.extension;
        controller.ffmpegArguments = settings.ffmpegArguments;
    },
    genericVideoEncoderResetEncoders: async (info: GenericVideoEncoderResetEncodersInfo) => {
        const controller = getGenericVideoEncoderControllerById(info.controllerId);

        controller.resetEncoders(info.encoderIds);
    },
    genericVideoEncoderCopyLogsToClipboard: async (info: GenericVideoEncoderCopyLogsToClipboardInfo) => {
        const controller = getGenericVideoEncoderControllerById(info.controllerId);

        const logs = controller.getLogsFor(info.encoderId);
        clipboard.write({ text: logs });
    },
    genericVideoEncoderOpenLogs: async (info: GenericVideoEncoderOpenLogsInfo) => {
        const controller = getGenericVideoEncoderControllerById(info.controllerId);

        for (const encoderId of info.encoderIds) {
            const logs = controller.getLogsFor(encoderId);
            openLog(logs).then(() => {});
        }
    },
    genericVideoEncoderSetEncoderActive: async (status: EncoderStatus): Promise<EncoderStatus> => {
        const controller = getGenericVideoEncoderControllerById(status.controllerId);

        if (status.encoderActive) {
            await controller.startEncoding();
        } else {
            await controller.stopEncoding();
        }

        return {
            controllerId: controller.controllerId,
            encoderActive: controller.isEncoding
        };
    },

    createNewEncodeAndScoreEncoderController: async ({ ffprobePath, ffmpegPath }: ExternalLibraryPathsInfo): Promise<string> => {
        const controller = await EncodeAndScoreEncoderController.createNew(ffprobePath, ffmpegPath);
        controller.on("update", reportId => {
            sendToRenderer("encodeAndScoreEncoderUpdate", controller.getReportFor(reportId));
        });

        const id = controller.controllerId;
        encodeAndScoreEncoders.set(id, controller);
        return id;
    },
    encodeAndScoreEncoderAddPaths: async (info: GenericVideoEncoderPathUpdateInfo): Promise<void> => {
        const controller = getEncodeAndScoreEncoderControllerById(info.controllerId);

        const reports = await controller.addEncoders(info.paths);
        // Send the initial reports to the renderer. This allows the UI to generate initial rows for the encoders.
        reports.forEach(report => {
            sendToRenderer("encodeAndScoreEncoderUpdate", report);
        });
    },
    encodeAndScoreEncoderDeleteEncoders: async (info: GenericVideoEncoderResetEncodersInfo) => {
        const controller = getEncodeAndScoreEncoderControllerById(info.controllerId);

        const removedIds = controller.deleteEncoders(info.encoderIds);

        const deleteInfo: GenericVideoEncoderResetEncodersInfo = {
            controllerId: info.controllerId,
            encoderIds: removedIds
        };

        sendToRenderer("encodeAndScoreEncoderDelete", deleteInfo);
    },
    encodeAndScoreEncoderUpdateSettings: async (settings: GenericVideoEncoderSettings): Promise<void> => {
        const controller = getEncodeAndScoreEncoderControllerById(settings.controllerId);

        controller.concurrency = settings.concurrency;
        controller.outputSubdirectory = settings.subdirectory;
        controller.extension = settings.extension;
        controller.ffmpegArguments = settings.ffmpegArguments;
    },
    encodeAndScoreEncoderResetEncoders: async (info: GenericVideoEncoderResetEncodersInfo) => {
        const controller = getEncodeAndScoreEncoderControllerById(info.controllerId);

        controller.resetEncoders(info.encoderIds);
    },
    encodeAndScoreEncoderCopyLogsToClipboard: async (info: GenericVideoEncoderCopyLogsToClipboardInfo) => {
        const controller = getEncodeAndScoreEncoderControllerById(info.controllerId);

        const logs = controller.getLogsFor(info.encoderId);
        clipboard.write({ text: logs });
    },
    encodeAndScoreEncoderOpenLogs: async (info: GenericVideoEncoderOpenLogsInfo) => {
        const controller = getEncodeAndScoreEncoderControllerById(info.controllerId);

        for (const encoderId of info.encoderIds) {
            const logs = controller.getLogsFor(encoderId);
            openLog(logs).then(() => {});
        }
    },
    encodeAndScoreEncoderSetEncoderActive: async (status: EncoderStatus): Promise<EncoderStatus> => {
        const controller = getEncodeAndScoreEncoderControllerById(status.controllerId);

        if (status.encoderActive) {
            await controller.startEncoding();
        } else {
            await controller.stopEncoding();
        }

        return {
            controllerId: controller.controllerId,
            encoderActive: controller.isEncoding
        };
    }
};

function getGenericVideoEncoderControllerById(id: string): GenericVideoEncoderController {
    const controller = genericVideoEncoders.get(id);
    if (!controller) {
        throw new Error(`No controller with ID ${id} found.`);
    }

    return controller;
}

function getEncodeAndScoreEncoderControllerById(id: string): EncodeAndScoreEncoderController {
    const controller = encodeAndScoreEncoders.get(id);
    if (!controller) {
        throw new Error(`No controller with ID ${id} found.`);
    }

    return controller;
}

function getVMAFTargetVideoEncoderControllerById(id: string): VMAFTargetVideoEncoderController {
    const controller = vmafTargetVideoEncoders.get(id);
    if (!controller) {
        throw new Error(`No controller with ID ${id} found.`);
    }

    return controller;
}
