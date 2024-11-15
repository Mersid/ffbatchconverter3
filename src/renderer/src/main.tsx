import "./assets/main.css";

import React from "react";
import ReactDOM from "react-dom/client";
import EncoderBase from "./pages/EncoderBase";
import { createHashRouter, RouterProvider } from "react-router-dom";
import Layout from "@renderer/Layout";

const router = createHashRouter([
    {
        path: "/",
        element: <Layout />,
        children: [
            {
                path: "/",
                element: <EncoderBase />
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
        <RouterProvider router={router} />
    </React.StrictMode>
);
