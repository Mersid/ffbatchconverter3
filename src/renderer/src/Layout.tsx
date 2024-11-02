import { ReactElement } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import Sidebar from "@renderer/components/Sidebar"
import { Outlet } from "react-router-dom"

export default function Layout(): ReactElement {
    return (
        <SidebarProvider>
            <Sidebar />
            <main>
                <SidebarTrigger />
                <Outlet />
            </main>
        </SidebarProvider>
    )
}
