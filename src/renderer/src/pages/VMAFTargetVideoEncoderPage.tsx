import { createColumnHelper } from "@tanstack/react-table";
import { formatTime } from "@renderer/misc/TimeFormatter";
import React, { DragEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@renderer/redux/Store";
import { EncoderStatus } from "@shared/types/EncoderStatus";
import { VMAFTargetVideoEncoderSettings } from "@shared/types/VMAFTargetVideoEncoderSettings";
import { setVMAFTargetVideoEncoderSettings } from "@renderer/redux/VMAFTargetVideoEncoderSettingsSlice";
import EncoderDisplayTable from "@renderer/components/EncoderDisplayTable";
import { Item, Separator } from "react-contexify";
import { setEncoderStatus } from "@renderer/redux/EncoderStatusSlice";
import { EncodeAndScoreEncoderPhase } from "@shared/types/EncodeAndScoreEncoderPhase";

const columnHelper = createColumnHelper<VMAFTargetVideoEncoderRow>();
const columns = [
    columnHelper.accessor(row => row.fileName, {
        header: "File Name",
        cell: props => <div>{props.getValue()}</div>,
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
    columnHelper.accessor(row => (row.minRange, row.maxRange), {
        header: "Range",
        cell: props => <p>{props.getValue()}</p>,
        size: 100
    }),
    columnHelper.accessor(row => row.size, {
        header: "CRF",
        cell: props => <p>{props.getValue()}</p>,
        size: 100
    }),
    columnHelper.accessor(row => row.vmafScore, {
        header: "VMAF",
        // The null check should catch undefined values, but for some reason the compiler complains still...
        cell: props => <p>{props.getValue() == undefined ? "-" : props.getValue()?.toFixed(3)}</p>,
        size: 100
    }),
    columnHelper.accessor(row => row.phase, {
        header: "Phase",
        cell: props => <p>{props.getValue()}</p>,
        size: 100
    }),
    columnHelper.accessor(row => row.status, {
        header: "Status",
        cell: props => <p>{props.getValue()}</p>,
        size: 100
    })
]

type VMAFTargetVideoEncoderRow = {
    encoderId: string;
    fileName: string;
    duration: number;
    size: number;

    minRange: number;
    maxRange: number;

    crf: number;
    vmafScore?: number;

    phase: EncodeAndScoreEncoderPhase;
    status: string;
}

export default function VMAFTargetVideoEncoderPage() {
    const params = useParams();
    const id = params.id;
    const controllerId = useSelector((state: RootState) => state.encoderMapData).find(data => data.pageId === id)?.controllerId as string;
    const encoderStatus = useSelector((state: RootState) => state.encoderStatus).find(status => status.controllerId === controllerId) as EncoderStatus;
    const settings = useSelector((state: RootState) => state.vmafTargetVideoEncoderSettings).find(settings => settings.controllerId === controllerId);
    const dispatch = useDispatch();

    const [concurrency, setConcurrency] = useState(settings ? settings.concurrency.toString() : "1");
    const [subdirectory, setSubdirectory] = useState(settings ? settings.subdirectory : "FFBatch");
    const [extension, setExtension] = useState(settings ? settings.extension : "mkv");
    const [encoder, setEncoder] = useState(settings ? settings.encoder : "x265");
    const [vmaf, setVmaf] = useState(settings ? settings.vmafTarget.toString() : "86");
    const [ffmpegArguments, setFFmpegArguments] = useState(settings ? settings.ffmpegArguments : "-c:v libx265 -c:a aac");

    const storeData = useSelector((state: RootState) => state.vmafTargetVideoEncoderReports).filter(data => data.controllerId === controllerId);
    const data = useMemo(() =>
        storeData
            .filter(data => data.controllerId === controllerId)
            .map(data => {
                return {
                    encoderId: data.encoderId,
                    fileName: data.inputFilePath,
                    duration: data.duration,
                    size: data.fileSize,
                    vmafScore: data.vmafScore,
                    phase: data.encodingPhase,
                    status: data.encodingState == "Encoding" ? ((data.currentDuration / data.duration) * 100).toFixed(2) + "%" : data.encodingState,
                    minRange: data.minCRF,
                    maxRange: data.maxCRF,
                    crf: data.crf

            } as VMAFTargetVideoEncoderRow})
    , [storeData]);

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

        window.api.send.vmafTargetVideoEncoderAddPaths({
            controllerId,
            paths: filePaths
        });
    };

    /**
     * Push settings to Redux store and send to main process.
     */
    const updateSettings = () => {
        const c = parseInt(concurrency);
        const c2 = parseInt(vmaf);
        const settings: VMAFTargetVideoEncoderSettings = {
            controllerId,
            concurrency: isNaN(c) ? 1 : c,
            extension,
            ffmpegArguments,
            subdirectory,
            encoder,
            vmafTarget: isNaN(c2) ? 86 : c2
        };

        dispatch(setVMAFTargetVideoEncoderSettings(settings));
        window.api.send.vmafTargetVideoEncoderUpdateSettings(settings);
    };

    // On change, replicate changes to backing store and send to main process.
    useEffect(() => {
        updateSettings();
    }, [concurrency, subdirectory, extension, encoder, vmaf, ffmpegArguments]);

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    };

    return (
        <div className={"pl-1 flex flex-col h-screen"}>
            <div className={"flex-1 overflow-y-auto"} onDragOver={event => handleDragOver(event)} onDrop={event => handleDrop(event)}>
                <p>Encode and score encoder page! ID: {id}</p>
                <p>Controller ID: {controllerId}</p>
                <EncoderDisplayTable<VMAFTargetVideoEncoderRow>
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
                                        window.api.send.vmafTargetVideoEncoderCopyLogsToClipboard({
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
                                        window.api.send.vmafTargetVideoEncoderOpenLogs({
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
                                        window.api.send.vmafTargetVideoEncoderDeleteEncoders({
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
                                        window.api.send.vmafTargetVideoEncoderResetEncoders({
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
                            <div className={"flex items-center pr-[187px]"}>
                                <label className={"pr-2 inline-block min-w-24"}>Encoder</label>
                                <select
                                    id={"encoder"}
                                    name={"encoder"}
                                    value={encoder}
                                    onChange={e => {
                                        if (e.target.value == "x265") {
                                            setEncoder(() => "x265");
                                        } else {
                                            setEncoder(() => "x264");
                                        }
                                    }}
                                    className={`px-2 py-1 min-w-80 w-full text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block`}
                                >
                                    <option value={"x265"}>x265 (High Efficiency Video Coding)</option>
                                    <option value={"x264"}>x264 (Advanced Video Coding)</option>
                                </select>
                            </div>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block"}>CRF</label>
                                <input
                                    type={"text"}
                                    value={vmaf}
                                    onChange={e => setVmaf(() => e.target.value)}
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
                    <div className={"bg-green-300 w-full flex flex-col-reverse justify-end items-end"}>
                        <button className={"bg-white hover:bg-gray-300 py-0 px-2 rounded"}>Add folders</button>
                        <button className={"bg-white hover:bg-gray-300 py-0 px-2 rounded"}>Add files</button>
                        <button
                            className={"bg-white hover:bg-gray-300 py-0 px-2 rounded"}
                            onClick={async () => {
                                const result = await window.api.fetch.vmafTargetVideoEncoderSetEncoderActive({
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
