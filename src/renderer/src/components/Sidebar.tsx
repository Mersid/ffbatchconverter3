import { Sidebar as SidebarComponent, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { ReactElement } from "react";
import { Link } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import { IconContext } from "react-icons";

export default function Sidebar(): ReactElement {
    return (
        <IconContext.Provider value={{ color: "gray" }}>
            <SidebarComponent>
                <SidebarContent>
                    <ul>
                        <li>
                            <Link to={"/home"} className={"py-2 pl-4 hover:bg-gray-300 text-gray-600 flex items-center"}>
                                <FaHome className={"mr-2"} />
                                Home
                            </Link>

                            <button className={"py-2 pl-4 hover:bg-gray-300 text-gray-600 flex items-center w-full"} onClick={() => console.log("Hello world")}>
                                <FaHome className={"mr-2"} />
                                Click me!
                            </button>
                        </li>
                    </ul>
                </SidebarContent>
                <SidebarFooter>
                    <p>Put options here</p>
                </SidebarFooter>
            </SidebarComponent>
        </IconContext.Provider>
    );
}
