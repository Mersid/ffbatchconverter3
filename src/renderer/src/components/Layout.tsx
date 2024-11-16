import { ReactElement } from "react";
import Sidebar from "@renderer/components/Sidebar";
import { Outlet } from "react-router-dom";

export default function Layout(): ReactElement {
    return (
        <div>
            <Sidebar />
            <main className={"pl-64"}>
                <Outlet />
            </main>
        </div>
    );
}
