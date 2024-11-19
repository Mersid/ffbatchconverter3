import {
    ColumnDef,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable
} from "@tanstack/react-table";

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
    const table = useReactTable({
        data: sampleData,
        columns: columns,
        getCoreRowModel: getCoreRowModel<GenericVideoEncoderRow>(),
        getSortedRowModel: getSortedRowModel<GenericVideoEncoderRow>(),
        state: {
            sorting: [
                {
                    id: "fileName",
                    desc: true
                }
            ]
        }
    });

    console.log(table.getState().sorting);

    return (
        <table>
            <thead>
                <tr>
                    {
                        table.getHeaderGroups().map(headerGroup => (
                            headerGroup.headers.map(header => (
                                <th key={header.id}>
                                    {/*{header.column.columnDef.header}*/}
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                    {/*<div className={"absolute opacity-0 top-0 right-0 h-full w-1 hover:cursor-col-resize"}>a</div>*/}
                                </th>
                            ))
                        ))
                    }
                </tr>
            </thead>
            <tbody>
            {
                table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                        {
                            row.getVisibleCells().map(cell => (
                                <td key={cell.id
                                } className={"border border-gray-200"}>
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
