import { RootState } from "@renderer/redux/Store";
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";

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
    const params = useParams();
    const id = params.id;
    const controllerId = useSelector((state: RootState) => state.encoderMapData).find(data => data.pageId === id)?.controllerId as string;

    const data0 = useSelector((state: RootState) => state.genericVideoEncoderReports);
    const data = useMemo(
        () =>
            data0
                // https://hiteshmishra.hashnode.dev/useselector-hook-in-react
                .filter(data => data.controllerId === controllerId)
                .map(r => {
                    return {
                        fileName: r.inputFilePath,
                        size: r.fileSize.toString(),
                        duration: r.duration.toString(),
                        status: r.encodingState.toString()
                    } as GenericVideoEncoderRow;
                }),
        [data0]
    );

    const table = useReactTable({
        data: data,
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
