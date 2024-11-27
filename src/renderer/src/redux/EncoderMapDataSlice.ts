import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EncoderMap } from "@renderer/misc/EncoderMap";

/**
 * Tracks the mappings between the page IDs in the renderer and the IDs of the controllers in the main process.
 */
export const encoderMapDataSlice = createSlice({
    name: "encoderMapData",
    initialState: [] as EncoderMap[],
    reducers: {
        addEncoderMap: (state, action: PayloadAction<EncoderMap>) => {
            state.push(action.payload);
        }
    }
});

export const { addEncoderMap } = encoderMapDataSlice.actions;
