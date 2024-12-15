import {
    AccessorFnColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    Row,
    RowSelectionState,
    SortingState,
    Table,
    useReactTable
} from "@tanstack/react-table";
import React, { MouseEvent, ReactNode, useState } from "react";
import { Item, Menu, Separator, useContextMenu } from "react-contexify";
import "react-contexify/ReactContexify.css";

export type EncoderDisplayTableProps<TRowType> = {
    columns: AccessorFnColumnDef<TRowType, any>[];
    data: TRowType[];
    contextMenuItems?: (table: Table<TRowType>, lastSelectedID: string | undefined) => ReactNode;
};

export default function EncoderDisplayTable<TRowType>(props: EncoderDisplayTableProps<TRowType>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    // Contains the row ID of the last selected row.
    const [lastSelected, setLastSelected] = useState<string | undefined>(undefined);

    const table = useReactTable({
        data: props.data,
        columns: props.columns,
        getCoreRowModel: getCoreRowModel<TRowType>(),
        getSortedRowModel: getSortedRowModel<TRowType>(),
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
        id: menuId
    });

    function handleContextMenu(event: MouseEvent) {
        show({
            event,
            props: {
                key: "value"
            }
        });
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
                {props.contextMenuItems && props.contextMenuItems(table, lastSelected)}
            </Menu>
        </div>
    );
}
