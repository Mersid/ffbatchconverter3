import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

const columns = [
    {
        accessorKey: "fileName",
        header: "File Name",
        cell: props => <p>{props.getValue()}</p>
    },
    {
        accessorKey: "duration",
        header: "Duration",
        cell: props => <p>{props.getValue()}</p>
    },
    {
        accessorKey: "size",
        header: "Size",
        cell: props => <p>{props.getValue()}</p>
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: props => <p>{props.getValue()}</p>
    }
];

export default function GenericVideoEncoderTable() {
    const table = useReactTable({
        data: sampleData,
        columns,
        getCoreRowModel: getCoreRowModel<GenericVideoEncoderRow>()
    });

    console.log(table.getHeaderGroups());

    return (
        <table>
            <thead>
                <tr>
                    {
                        table.getHeaderGroups().map(headerGroup => (
                            headerGroup.headers.map(header => (
                                <th>
                                    {header.column.columnDef.header}
                                </th>
                            ))
                        ))
                    }
                </tr>
            </thead>
            <tbody>
            {
                table.getRowModel().rows.map(row => (
                    <tr>
                        {
                            row.getVisibleCells().map(cell => (
                                <td className={"border border-gray-200"}>
                                    {
                                        flexRender(cell.column.columnDef.cell, cell.getContext())
                                    }
                                </td>
                            ))
                        }
                    </tr>
                ))
            }
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
