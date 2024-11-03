import "./assets/main.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { createHashRouter, RouterProvider } from "react-router-dom";
import Layout from "@renderer/Layout";
import App2 from "@renderer/App2";

const router = createHashRouter([
    {
        path: "/",
        element: <Layout />,
        children: [
            {
                path: "/",
                element: <App />
            },
            {
                path: "/home",
                element: <App2 />
            }
        ]
    }
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);
