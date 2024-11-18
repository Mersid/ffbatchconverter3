import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const tabSlice = createSlice({
    name: "tabs",
    initialState: [] as Tab[],
    reducers: {
        addTitle: (state, action: PayloadAction<Tab>) => {
            state.push(action.payload);
        },
        removeTitle: (state, action: PayloadAction<number>) => {
            return state.filter(tab => tab.id !== action.payload);
        }
    }
});

export const { addTitle, removeTitle } = tabSlice.actions;
