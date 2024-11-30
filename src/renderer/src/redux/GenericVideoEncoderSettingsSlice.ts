import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GenericVideoEncoderSettings } from "@renderer/misc/GenericVideoEncoderSettings";

export const genericVideoEncoderSettingsSlice = createSlice({
    name: "genericVideoEncoderSettings",
    initialState: [] as GenericVideoEncoderSettings[],
    reducers: {
        setGenericVideoEncoderSettings: (state, action: PayloadAction<GenericVideoEncoderSettings>) => {
            const index = state.findIndex(settings => settings.controllerId === action.payload.controllerId);
            if (index !== -1) {
                state[index] = action.payload;
            } else {
                state.push(action.payload);
            }
        }
    }
});

export const { setGenericVideoEncoderSettings } = genericVideoEncoderSettingsSlice.actions;
