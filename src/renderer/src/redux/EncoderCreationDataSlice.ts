import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EncoderCreationPageSerializationData } from "@renderer/misc/EncoderCreationPageSerializationData";

/**
 * Tracks the data on the encoder creation page (the intro page when the add button is clicked).
 */
export const encoderCreationDataSlice = createSlice({
    name: "encoderCreationData",
    initialState: [] as EncoderCreationPageSerializationData[],
    reducers: {
        addEncoderCreationData: (state, action: PayloadAction<EncoderCreationPageSerializationData>) => {
            // If the data already exists, update it. Otherwise, add it.
            const existingIndex = state.findIndex(data => data.id === action.payload.id);
            if (existingIndex != -1) {
                state[existingIndex] = action.payload;
                return;
            }
            state.push(action.payload);
        }
    }
});

export const { addEncoderCreationData } = encoderCreationDataSlice.actions;
