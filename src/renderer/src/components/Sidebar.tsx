import { ReactElement, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEdit } from "react-icons/fa";
import { IconContext } from "react-icons";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@renderer/redux/Store";
import { addTitle, removeTitle } from "@renderer/redux/TabSlice";

export default function Sidebar(): ReactElement {
    const [nextId, setNextId] = useState(0);
    // const [tabs, setTabs] = useState<Tab[]>([]);
    const [selectedTabId, setSelectedTabId] = useState<number | undefined>(undefined);

    const tabs = useSelector((state: RootState) => state.tabs);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    return (
        <IconContext.Provider value={{ color: "gray" }}>
            <nav className={"w-64 bg-gray-100 fixed top-0 left-0 h-screen"}>
                <header className={"pb-0.5 pl-2"}>
                    <div className={"flex"}>
                        <button
                            className={"p-1"}
                            onClick={async () => {
                                const id = nextId;
                                setNextId(() => id + 1);
                                dispatch(addTitle({ id, title: `New task ${id}`, url: `/${id}` }));
                                navigate(`/${id}`);
                            }}
                        >
                            <FaPlus color={"#00dc00"} className={"block"} />
                        </button>
                        <button
                            className={"p-1"}
                            onClick={() => {
                                if (selectedTabId != undefined) {
                                    dispatch(removeTitle(selectedTabId));
                                    setSelectedTabId(() => undefined);
                                    navigate("/");
                                }
                            }}
                        >
                            <FaMinus color={"#FF0000"} className={"block"} />
                        </button>
                        <button className={"p-1"}>
                            <FaEdit color={"#38c0ff"} className={"block"} />
                        </button>
                    </div>
                </header>
                <div>
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
                </div>
            </nav>
        </IconContext.Provider>
    );
}
