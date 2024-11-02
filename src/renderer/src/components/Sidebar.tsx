import {
    Sidebar as ShadcnSidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu
} from "@/components/ui/sidebar"
import { ReactElement } from "react"

export default function Sidebar(): ReactElement {
    return (
        <ShadcnSidebar>
            <SidebarHeader>
                <h1>Header</h1>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <p>Group 1</p>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>Group 2</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <p>Menu 1</p>
                            <p>Menu 2</p>
                            <p>Menu 3</p>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <p>Footer</p>
            </SidebarFooter>
        </ShadcnSidebar>
    )
}
