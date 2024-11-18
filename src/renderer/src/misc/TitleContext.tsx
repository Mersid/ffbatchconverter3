import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";

type Tab = {
    id: number;
    title: string;
    url: string;
};

const tabSlice = createSlice({
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

export const store = configureStore({
    reducer: {
        tabs: tabSlice.reducer
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const { addTitle, removeTitle } = tabSlice.actions;
