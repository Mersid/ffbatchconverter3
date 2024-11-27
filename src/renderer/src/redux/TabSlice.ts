import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Tab } from "@renderer/misc/Tab";

/**
 * Tracks all the tabs in the sidebar.
 */
export const tabSlice = createSlice({
    name: "tabs",
    initialState: [] as Tab[],
    reducers: {
        addTitle: (state, action: PayloadAction<Tab>) => {
            state.push(action.payload);
        },
        removeTitle: (state, action: PayloadAction<number>) => {
            return state.filter(tab => tab.id !== action.payload);
        },
        // I sincerely advise against altering the id using this.
        updateTitle: (state, action: PayloadAction<Tab>) => {
            const index = state.findIndex(tab => tab.id === action.payload.id);
            state[index] = action.payload;
        }
    }
});

export const { addTitle, removeTitle, updateTitle } = tabSlice.actions;
