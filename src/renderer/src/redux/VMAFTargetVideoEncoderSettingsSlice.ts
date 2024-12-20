import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { VMAFTargetVideoEncoderSettings } from "@shared/types/VMAFTargetVideoEncoderSettings";

/**
 * Tracks the settings for each encode and score encoder.
 */
export const vmafTargetVideoEncoderSettingsSlice = createSlice({
    name: "vmafTargetVideoEncoderSettings",
    initialState: [] as VMAFTargetVideoEncoderSettings[],
    reducers: {
        setVMAFTargetVideoEncoderSettings: (state, action: PayloadAction<VMAFTargetVideoEncoderSettings>) => {
            const index = state.findIndex(settings => settings.controllerId === action.payload.controllerId);
            if (index !== -1) {
                state[index] = action.payload;
            } else {
                state.push(action.payload);
            }
        }
    }
});

export const { setVMAFTargetVideoEncoderSettings } = vmafTargetVideoEncoderSettingsSlice.actions;
