import { RootState } from "@renderer/redux/Store";
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, Row, RowSelectionState, SortingState, useReactTable } from "@tanstack/react-table";
import React, { MouseEvent, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { formatTime } from "@renderer/misc/TimeFormatter";

import { Menu, Item, Separator, Submenu, useContextMenu, ItemParams } from "react-contexify";
import 'react-contexify/ReactContexify.css';

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
        cell: props => <p>{formatTime(props.getValue())}</p>
    }),
    columnHelper.accessor(row => row.size, {
        header: "Size",
        cell: props => <p>{(props.getValue() / (1024 * 1024)).toFixed(2)} MiB</p>
    }),
    columnHelper.accessor(row => row.status, {
        header: "Status",
        cell: props => <p>{props.getValue()}</p>
    })
];

export default function GenericVideoEncoderTable() {
    const [sorting, setSorting] = useState<SortingState>([]);
    const params = useParams();
    const id = params.id;
    const controllerId = useSelector((state: RootState) => state.encoderMapData).find(data => data.pageId === id)?.controllerId as string;
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    // Contains the row ID of the last selected row.
    const [lastSelected, setLastSelected] = useState<string | undefined>(undefined);

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

    const table = useReactTable({
        data: data,
        columns: columns,
        getCoreRowModel: getCoreRowModel<GenericVideoEncoderRow>(),
        getSortedRowModel: getSortedRowModel<GenericVideoEncoderRow>(),
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            rowSelection
        },
        columnResizeMode: "onChange"
    });

    // https://github.com/TanStack/table/discussions/3068#discussioncomment-5052258, but I heavily modified it.
    const getRowRange = <T,>(rows: Row<T>[], fromId: string, toId: string): Row<T>[] => {
        let rangeStart = rows.findIndex(row => row.id === fromId);
        let rangeEnd = rows.findIndex(row => row.id === toId);

        if (rangeStart == -1 || rangeEnd == -1) {
            console.error("Range start or end is not found!");
            return [];
        }

        // Swap the values if the range is backwards.
        if (rangeStart > rangeEnd) {
            [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
        }

        return rows.slice(rangeStart, rangeEnd + 1);
    };

    const menuId = "menuId";

    const { show } = useContextMenu({
        id: menuId,
    });

    function handleContextMenu(event: MouseEvent) {
        show({
            event,
            props: {
                key: "value"
            }
        });
    }

    // I'm using a single event handler for all items,
    // but you don't have too :)
    const handleItemClick = ({ id, event, props }: ItemParams) => {
        switch (id) {
            case "copy":
                console.log(event, props)
                console.log("Ayo!")
                break;
            case "cut":
                console.log(event, props);
                break;
            //etc...
        }
    }

    return (
        // The overflow doesn't seem necessary.
        <div style={{ overflowX: "auto" }}>
            <p>
                Sorting: {sorting[0]?.id}, desc {sorting[0]?.desc == true ? "true" : "false"}
                Sort data: {JSON.stringify(table.getState().rowSelection)}
                Last over: {lastSelected}
            </p>
            {/* If we exclude the width style, the table will refuse to extend beyond the size of the screen. Took me way too long to discover! */}
            <table style={{ width: table.getCenterTotalSize() }} className={"table-fixed"} onContextMenu={handleContextMenu}>
                <thead>
                    <tr>
                        {table.getHeaderGroups().map(headerGroup =>
                            headerGroup.headers.map(header => (
                                // Relative here doesn't do anything for itself, but is important because the absolute in the resizer div
                                // requires this to set its own absolute position relative to. This acts as an anchor for that.
                                // The group is to enable the resizer's group-hover to set the opacity when the th element is moused over
                                <th
                                    style={{ width: header.getSize() }}
                                    key={header.id}
                                    className={"hover:cursor-pointer border-gray-400 relative border group select-none"}
                                >
                                    <div onClick={header.column.getToggleSortingHandler()}>
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </div>

                                    {/* The absolute, right, and top fixes the resizer div to the right and top of the <th> element containing the div. */}
                                    <div
                                        id={"resizer"}
                                        onDoubleClick={() => header.column.resetSize()}
                                        onMouseDown={header.getResizeHandler()}
                                        onTouchStart={header.getResizeHandler()}
                                        className={
                                            "absolute right-0 top-0 h-full w-0.5 bg-blue-300 cursor-col-resize select-none touch-none opacity-0 group-hover:opacity-100"
                                        }
                                    />
                                </th>
                            ))
                        )}
                    </tr>
                </thead>
                <tbody>
                    {table.getRowModel().rows.map(row => (
                        <tr
                            key={row.id}
                            className={"group"}
                            onClick={event => {
                                // https://github.com/TanStack/table/discussions/2224#discussioncomment-3893549
                                // setLastSelected(() => table.getSortedRowModel().rows.indexOf(row)?.toString());

                                const batchSelectMode = event.shiftKey;
                                const appendMode = event.ctrlKey;

                                if (batchSelectMode && lastSelected) {
                                    // Get the range of rows between our selection.
                                    const rows = getRowRange(table.getSortedRowModel().rows, lastSelected, row.id);

                                    // If we're in append mode, tack the new rows onto the existing selection. Otherwise, replace it.
                                    table.setRowSelection(selection => {
                                        const newSelection = rows.reduce((acc, row) => {
                                            acc[row.id] = true;
                                            return acc;
                                        }, {} as RowSelectionState);

                                        if (appendMode) {
                                            return {
                                                ...selection,
                                                ...newSelection
                                            };
                                        } else {
                                            return {
                                                ...newSelection
                                            };
                                        }
                                    });
                                    return;
                                }

                                if (appendMode) {
                                    table.setRowSelection(selection => {
                                        return {
                                            ...selection,
                                            [row.id]: !selection[row.id]
                                        };
                                    });
                                    setLastSelected(row.id);
                                    return;
                                }

                                table.setRowSelection(_ => {
                                    return {
                                        [row.id]: true
                                    };
                                });

                                setLastSelected(row.id);
                                // row.getToggleSelectedHandler()(event);
                            }}
                        >
                            {row.getVisibleCells().map(cell => (
                                <td
                                    key={cell.id}
                                    className={`border border-gray-200 select-none group-hover:bg-blue-200 cursor-pointer whitespace-nowrap overflow-hidden overflow-ellipsis ${cell.row.getIsSelected() ? "bg-blue-300" : ""}`}
                                >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <Menu id={menuId}>
                <Item id={"copyLog"} onClick={() => {
                    if (lastSelected == undefined) {
                        return;
                    }

                    const lastSelectedEncoderId = table.getSelectedRowModel().rowsById[lastSelected].original.encoderId;
                    window.api.send.copyLogsToClipboard({
                        controllerId: controllerId,
                        encoderId: lastSelectedEncoderId,
                    });
                }}>Copy log</Item>
                <Item id={"openLog"} onClick={() => {
                    const selectedEncoderIds = table.getSelectedRowModel().rows.map(row => row.original.encoderId);
                    window.api.send.openLogs({
                        controllerId: controllerId,
                        encoderIds: selectedEncoderIds,
                    });
                }}>Open log in text editor</Item>
                <Separator />
                <Item id={"remove"} onClick={() => {}}>Remove</Item>
                <Item id={"reset"} onClick={() => {}}>Reset to pending</Item>
            </Menu>
        </div>
    );
}

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
