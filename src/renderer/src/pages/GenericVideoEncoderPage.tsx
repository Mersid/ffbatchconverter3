import React, { DragEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@renderer/redux/Store";
import { setEncoderStatus } from "@renderer/redux/EncoderStatusSlice";
import { setGenericVideoEncoderSettings } from "@renderer/redux/GenericVideoEncoderSettingsSlice";
import { GenericVideoEncoderSettings } from "@shared/types/GenericVideoEncoderSettings";
import { EncoderStatus } from "@shared/types/EncoderStatus";
import EncoderDisplayTable from "@renderer/components/EncoderDisplayTable";
import { createColumnHelper } from "@tanstack/react-table";
import { formatTime } from "@renderer/misc/TimeFormatter";
import { Item, Separator } from "react-contexify";

const columnHelper = createColumnHelper<GenericVideoEncoderRow>();
const columns = [
    columnHelper.accessor(row => row.fileName, {
        id: "fileName",
        header: "File Name",
        cell: props => <p>{props.getValue()}</p>,
        size: 650
    }),
    columnHelper.accessor(row => row.duration, {
        header: "Duration",
        cell: props => <p>{formatTime(props.getValue())}</p>,
        size: 100
    }),
    columnHelper.accessor(row => row.size, {
        header: "Size",
        cell: props => <p>{(props.getValue() / (1024 * 1024)).toFixed(2)} MiB</p>,
        size: 100
    }),
    columnHelper.accessor(row => row.status, {
        header: "Status",
        cell: props => <p>{props.getValue()}</p>,
        size: 100
    })
];

type GenericVideoEncoderRow = {
    encoderId: string;
    fileName: string;
    duration: number;
    size: number;

    /**
     * This is a string because we can put different data here depending on context.
     */
    status: string;
};

export default function GenericVideoEncoderPage() {
    const params = useParams();
    const id = params.id;
    const controllerId = useSelector((state: RootState) => state.encoderMapData).find(data => data.pageId === id)?.controllerId as string;
    const encoderStatus = useSelector((state: RootState) => state.encoderStatus).find(status => status.controllerId === controllerId) as EncoderStatus;
    const settings = useSelector((state: RootState) => state.genericVideoEncoderSettings).find(s => s.controllerId === controllerId);
    const dispatch = useDispatch();

    const [concurrency, setConcurrency] = useState(settings ? settings.concurrency.toString() : "1");
    const [subdirectory, setSubdirectory] = useState(settings ? settings.subdirectory : "FFBatch");
    const [extension, setExtension] = useState(settings ? settings.extension : "mkv");
    const [ffmpegArguments, setFFmpegArguments] = useState(settings ? settings.ffmpegArguments : "-c:v libx265 -c:a aac");

    const storeData = useSelector((state: RootState) => state.genericVideoEncoderReports);
    const data = useMemo(
        () =>
            storeData
                // https://hiteshmishra.hashnode.dev/useselector-hook-in-react
                .filter(data => data.controllerId === controllerId)
                .map(r => {
                    return {
                        encoderId: r.encoderId,
                        fileName: r.inputFilePath,
                        size: r.fileSize,
                        duration: r.duration,
                        status: r.encodingState == "Encoding" ? ((r.currentDuration / r.duration) * 100).toFixed(2) + "%" : r.encodingState
                    } as GenericVideoEncoderRow;
                }),
        [storeData]
    );

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        window.api.send.log(`Dropped ${files.length} files!\n${JSON.stringify(files)}`);

        const filePaths: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            if (file) {
                filePaths.push(file.path);
            } else {
                throw new Error(`File ${i} is null!`);
            }
        }

        window.api.send.genericVideoEncoderAddPaths({
            controllerId,
            paths: filePaths
        });
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    };

    console.log(controllerId);

    /**
     * Push settings to Redux store and send to main process.
     */
    const updateSettings = () => {
        const c = parseInt(concurrency);
        const settings: GenericVideoEncoderSettings = {
            controllerId,
            concurrency: isNaN(c) ? 1 : c,
            extension,
            ffmpegArguments,
            subdirectory
        };

        dispatch(setGenericVideoEncoderSettings(settings));
        window.api.send.genericVideoEncoderUpdateSettings(settings);
    };

    // On change, replicate changes to backing store and send to main process.
    useEffect(() => {
        updateSettings();
    }, [concurrency, subdirectory, extension, ffmpegArguments]);

    return (
        <div className={"pl-1 flex flex-col h-screen"}>
            <div className={"flex-1 overflow-y-auto"} onDragOver={event => handleDragOver(event)} onDrop={event => handleDrop(event)}>
                <p>Generic video encoder page! ID: {id}</p>
                <p>Controller ID: {controllerId}</p>
                {/*<GenericVideoEncoderTable />*/}
                <EncoderDisplayTable<GenericVideoEncoderRow>
                    data={data}
                    columns={columns}
                    contextMenuItems={(table, lastSelectedID) => {
                        return (
                            <>
                                <Item
                                    id={"copyLog"}
                                    onClick={() => {
                                        if (lastSelectedID == undefined) {
                                            return;
                                        }

                                        const lastSelectedEncoderId = table.getSelectedRowModel().rowsById[lastSelectedID].original.encoderId;
                                        window.api.send.genericVideoEncoderCopyLogsToClipboard({
                                            controllerId: controllerId,
                                            encoderId: lastSelectedEncoderId
                                        });
                                    }}
                                >
                                    Copy log
                                </Item>
                                <Item
                                    id={"openLog"}
                                    onClick={() => {
                                        const selectedEncoderIds = table.getSelectedRowModel().rows.map(row => row.original.encoderId);
                                        window.api.send.genericVideoEncoderOpenLogs({
                                            controllerId: controllerId,
                                            encoderIds: selectedEncoderIds
                                        });
                                    }}
                                >
                                    Open log in text editor
                                </Item>
                                <Separator />
                                <Item
                                    id={"remove"}
                                    onClick={() => {
                                        const selectedEncoderIds = table.getSelectedRowModel().rows.map(row => row.original.encoderId);
                                        window.api.send.genericVideoEncoderDeleteEncoders({
                                            controllerId: controllerId,
                                            encoderIds: selectedEncoderIds
                                        });

                                        table.resetRowSelection();
                                    }}
                                >
                                    Remove
                                </Item>
                                <Item
                                    id={"reset"}
                                    onClick={() => {
                                        const selectedEncoderIds = table.getSelectedRowModel().rows.map(row => row.original.encoderId);
                                        window.api.send.genericVideoEncoderResetEncoders({
                                            controllerId: controllerId,
                                            encoderIds: selectedEncoderIds
                                        });
                                    }}
                                >
                                    Reset to pending
                                </Item>
                            </>
                        );
                    }}
                />
            </div>
            <div className={"bg-gray-50 sticky bottom-0"}>
                <div className={"min-h-0.5 bg-gray-300"} />
                <div className={"flex flex-row"}>
                    <div className={""}>
                        <div className={"flex items-center space-x-4"}>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block min-w-24"}>Concurrency</label>
                                <input
                                    type={"text"}
                                    value={concurrency}
                                    onChange={e => setConcurrency(() => e.target.value)}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-24`}
                                />
                            </div>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block"}>Subdirectory</label>
                                <input
                                    type={"text"}
                                    value={subdirectory}
                                    onChange={e => setSubdirectory(() => e.target.value)}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-64`}
                                />
                            </div>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block"}>Extension</label>
                                <input
                                    type={"text"}
                                    value={extension}
                                    onChange={e => setExtension(() => e.target.value)}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-24`}
                                />
                            </div>
                        </div>
                        <div className={"flex items-center space-x-4"}>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block min-w-24"}>Arguments</label>
                                <input
                                    type={"text"}
                                    value={ffmpegArguments}
                                    onChange={e => setFFmpegArguments(() => e.target.value)}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-[654px]`}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={"w-full flex flex-col justify-end items-end"}>
                        {/*<button className={"bg-white hover:bg-gray-300 py-0 px-2 rounded"}>Add folders</button>*/}
                        {/*<button className={"bg-white hover:bg-gray-300 py-0 px-2 rounded"}>Add files</button>*/}
                        <button
                            className={"bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded mx-2 my-2"}
                            onClick={async () => {
                                const result = await window.api.fetch.genericVideoEncoderSetEncoderActive({
                                    controllerId,
                                    encoderActive: !encoderStatus?.encoderActive
                                });

                                console.log(result);
                                dispatch(setEncoderStatus(result));
                            }}
                        >
                            {encoderStatus?.encoderActive ? "Stop" : "Start"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
