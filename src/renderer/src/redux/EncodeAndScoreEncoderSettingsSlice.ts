import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EncodeAndScoreEncoderSettings } from "@shared/types/EncodeAndScoreEncoderSettings";

/**
 * Tracks the settings for each encode and score encoder.
 */
export const encodeAndScoreEncoderSettingsSlice = createSlice({
    name: "encodeAndScoreEncoderSettings",
    initialState: [] as EncodeAndScoreEncoderSettings[],
    reducers: {
        setEncodeAndScoreEncoderSettings: (state, action: PayloadAction<EncodeAndScoreEncoderSettings>) => {
            const index = state.findIndex(settings => settings.controllerId === action.payload.controllerId);
            if (index !== -1) {
                state[index] = action.payload;
            } else {
                state.push(action.payload);
            }
        }
    }
});

export const { setEncodeAndScoreEncoderSettings } = encodeAndScoreEncoderSettingsSlice.actions;
