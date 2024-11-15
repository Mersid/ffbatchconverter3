import { Sidebar as SidebarComponent, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { ReactElement, useState } from "react";
import { Link } from "react-router-dom";
import { FaEdit } from "react-icons/fa";
import { IconContext } from "react-icons";
import { FaMinus, FaPlus } from "react-icons/fa6";

// TODO: Put in separate type
type Tab = {
    id: number;
    title: string;
    url: string;
};

export default function Sidebar(): ReactElement {
    const [nextId, setNextId] = useState(0);
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [selectedTabId, setSelectedTabId] = useState<number | undefined>(undefined);

    return (
        <IconContext.Provider value={{ color: "gray" }}>
            <SidebarComponent>
                <SidebarHeader className={""}>
                    <div className={"flex"}>
                        <button
                            className={"p-1"}
                            onClick={async () => {
                                const id = nextId;
                                setNextId(() => id + 1);
                                setTabs([...tabs, { id, title: `New task ${id}`, url: `/${id}` }]);
                            }}
                        >
                            <FaPlus color={"#00dc00"} className={"block"} />
                        </button>
                        <button
                            className={"p-1"}
                            onClick={() => {
                                if (selectedTabId != undefined) {
                                    setTabs(tabs.filter(tab => tab.id != selectedTabId));
                                    setSelectedTabId(() => undefined);
                                }
                            }}
                        >
                            <FaMinus color={"#FF0000"} className={"block"} />
                        </button>
                        <button className={"p-1"}>
                            <FaEdit color={"#38c0ff"} className={"block"} />
                        </button>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <ul>
                        {tabs.map(tab => {
                            return (
                                <li key={tab.id}>
                                    <Link
                                        to={tab.url}
                                        className={`py-2 pl-4 hover:bg-gray-200 text-gray-600 flex items-center ${
                                            selectedTabId === tab.id ? "bg-gray-300" : ""
                                        }`}
                                        onClick={() => setSelectedTabId(tab.id)}
                                    >
                                        {/*<FaHome className={"mr-2"} />*/}
                                        {tab.title}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </SidebarContent>
                <SidebarFooter>
                    <p>Put options here</p>
                </SidebarFooter>
            </SidebarComponent>
        </IconContext.Provider>
    );
}
