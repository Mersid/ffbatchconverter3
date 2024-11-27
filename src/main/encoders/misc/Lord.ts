/**
 * Not a particularly descriptive name, but this is the class that tracks all the controllers and handles
 * interfacing those with the IPC.
 */

import { ExternalLibraryPathsInfo } from "../../../shared/types/ExternalLibraryPathsInfo";
import { GenericVideoEncoderController } from "../controllers/GenericVideoEncoderController";

const genericVideoEncoders = new Map<string, GenericVideoEncoderController>();

export const lord = {
    createNewGenericVideoEncoderController
};

/**
 * Creates a new GenericVideoEncoderController and registers it. The ID of the controller is returned.
 */
async function createNewGenericVideoEncoderController({ ffprobePath, ffmpegPath }: ExternalLibraryPathsInfo): Promise<string> {
    const controller = await GenericVideoEncoderController.createNew(ffprobePath, ffmpegPath);
    const id = controller.controllerId;
    genericVideoEncoders.set(id, controller);
    return id;
}
