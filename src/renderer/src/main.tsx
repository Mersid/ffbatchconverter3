import "./assets/main.css";

import React from "react";
import ReactDOM from "react-dom/client";
import EncoderBase from "./pages/EncoderBase";
import { createHashRouter, RouterProvider } from "react-router-dom";
import Layout from "@renderer/components/Layout";
import { Provider } from "react-redux";
import { store } from "@renderer/redux/Store";

const router = createHashRouter([
    {
        path: "/",
        element: <Layout />,
        children: [
            {
                path: "/",
                element: <></>
            },
            {
                path: "/:id",
                element: <EncoderBase />
            }
        ]
    }
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <Provider store={store}>
            <RouterProvider router={router} />
        </Provider>
    </React.StrictMode>
);
