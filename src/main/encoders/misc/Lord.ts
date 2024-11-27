/**
 * Not a particularly descriptive name, but this is the class that tracks all the controllers and handles
 * interfacing those with the IPC.
 */

import { ExternalLibraryPathsInfo } from "../../../shared/types/ExternalLibraryPathsInfo";
import { GenericVideoEncoderController } from "../controllers/GenericVideoEncoderController";
import { GenericVideoEncoderPathUpdateInfo } from "../../../shared/types/GenericVideoEncoderPathUpdateInfo";
import { sendToRenderer } from "../../../preload/registerMain";

const genericVideoEncoders = new Map<string, GenericVideoEncoderController>();

export const lord = {
    createNewGenericVideoEncoderController,
    addPathsToGenericVideoEncoder
};

/**
 * Creates a new GenericVideoEncoderController and registers it. The ID of the controller is returned.
 */
async function createNewGenericVideoEncoderController({ ffprobePath, ffmpegPath }: ExternalLibraryPathsInfo): Promise<string> {
    const controller = await GenericVideoEncoderController.createNew(ffprobePath, ffmpegPath);
    controller.on("update", reportId => {
        sendToRenderer("genericVideoEncoderUpdate", controller.getReportFor(reportId));
    });

    const id = controller.controllerId;
    genericVideoEncoders.set(id, controller);
    return id;
}

async function addPathsToGenericVideoEncoder(info: GenericVideoEncoderPathUpdateInfo): Promise<void> {
    const controller = genericVideoEncoders.get(info.controllerId);
    if (!controller) {
        throw new Error(`No controller with ID ${info.controllerId} found.`);
    }

    const reports = await controller.addEntries(info.paths);
    // Send the initial reports to the renderer. This allows the UI to generate initial rows for the encoders.
    reports.forEach(report => {
        sendToRenderer("genericVideoEncoderUpdate", report);
    });
}
