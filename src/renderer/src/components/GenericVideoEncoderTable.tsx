import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable
} from "@tanstack/react-table";
import { useState } from "react";

const columnHelper = createColumnHelper<GenericVideoEncoderRow>();
const columns = [
    columnHelper.accessor(row => row.fileName, {
        id: "fileName",
        header: "File Name",
        cell: props => <p>{props.getValue()}</p>
    }),
    columnHelper.accessor(row => row.duration, {
        header: "Duration",
        cell: props => <p>{props.getValue()}</p>
    }),
    columnHelper.accessor(row => row.size, {
        header: "Size",
        cell: props => <p>{props.getValue()}</p>
    }),
    columnHelper.accessor(row => row.status, {
        header: "Status",
        cell: props => <p>{props.getValue()}</p>
    })
];

export default function GenericVideoEncoderTable() {
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data: sampleData,
        columns: columns,
        getCoreRowModel: getCoreRowModel<GenericVideoEncoderRow>(),
        getSortedRowModel: getSortedRowModel<GenericVideoEncoderRow>(),
        onSortingChange: setSorting,
        state: {
            sorting
        }
    });

    console.log(table.getState().sorting);

    return (
        <table>
            <thead>
                <tr>
                    {table.getHeaderGroups().map(headerGroup =>
                        headerGroup.headers.map(header => (
                            <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={"hover:cursor-pointer hover:text-green-800"}>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                        ))
                    )}
                </tr>
            </thead>
            <tbody>
                {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className={"border border-gray-200"}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

type GenericVideoEncoderRow = {
    fileName: string;
    duration: string;
    size: string;
    status: string;
};

const sampleData: GenericVideoEncoderRow[] = [
    {
        fileName: "a",
        duration: "b",
        size: "c",
        status: "d"
    },
    {
        fileName: "e",
        duration: "f",
        size: "g",
        status: "h"
    },
    {
        fileName: "i",
        duration: "j",
        size: "k",
        status: "l"
    },
    {
        fileName: "m",
        duration: "n",
        size: "o",
        status: "p"
    }
];
