---
name: ui-table
description: Bouw een data-table met TanStack Table + shadcn — pagination, sorting, filtering, row-selection, row-actions, column visibility, CSV-export. Volgt PT-conventies. Gebruik wanneer Juan vraagt "maak een tabel voor X", bij admin-views, dashboards, lead-overzichten, etc.
trigger: /ui-table
---

# /ui-table

Data-table-component bouwen volgens Juan's PT/HMB-conventies. TanStack Table v8 + shadcn `<Table>` primitives.

## Usage

```
/ui-table <naam> <data-bron>
/ui-table <naam> --columns "<csv>"          # bv "datum,naam,email,status,actions"
/ui-table <naam> --features "<csv>"          # paginate,sort,filter,select,export
/ui-table <naam> --stack <pt|hmb|generic>
/ui-table <naam> --data <static|tanstack-query|server-component>
```

## Hard rules

- **TanStack Table v8** — `useReactTable`, niet de oude v7 API
- **shadcn `<Table>` primitives** — `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
- **Server-side filter/sort/page** voor >500 rows (TanStack Query + Supabase RPC)
- **Client-side OK** voor <500 rows
- **Geen `<table>` nested in card-padding** — gebruik `<Card>` zonder padding rondom `<Table>`
- **Empty-state** verplicht (geen lege `<tbody>`)
- **Loading-state** verplicht (skeleton-rows of spinner)
- **Mobile-fallback** voor breed: cards-stacked op `<md`

## Standaard column-types

```ts
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const columns: ColumnDef<Lead>[] = [
  // Selectable: checkbox header + per-row
  {
    id: "select",
    header: ({ table }) => <SelectAllCheckbox table={table} />,
    cell: ({ row }) => <SelectRowCheckbox row={row} />,
    enableSorting: false,
    enableHiding: false,
  },
  // Sorteerbaar text
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>Naam</SortableHeader>
    ),
  },
  // Datum (formatter via Intl)
  {
    accessorKey: "created_at",
    header: "Aangemaakt",
    cell: ({ getValue }) => formatDate(getValue() as string),
  },
  // Status badge
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
  },
  // Actions kolom
  {
    id: "actions",
    cell: ({ row }) => <RowActions row={row.original} />,
    enableSorting: false,
    enableHiding: false,
  },
];
```

## Features per flag

| Flag | Wat | Code-toevoeging |
|---|---|---|
| `paginate` | 10/25/50/100-per-page selector + page indicator | `getPaginationRowModel`, `<TablePagination>` |
| `sort` | klik op header → asc/desc/none | `getSortedRowModel`, `column.getCanSort()` |
| `filter` | per-column tekst-filter + global search | `getFilteredRowModel`, `<TableFilter>` |
| `select` | rij-selectie checkbox + bulk-actions | `enableRowSelection`, `state.rowSelection` |
| `export` | CSV-download van zichtbare/geselecteerde rijen | helper `exportToCsv()` |
| `column-visibility` | dropdown om kolommen te verbergen | `enableHiding`, `<ColumnVisibilityMenu>` |
| `pinning` | sticky eerste/laatste kolom | `enableColumnPinning` |

## Server-side data-flow (PT, dashboards)

Voor >500 rijen: laat de DB filteren/sorteren/pagineren. Pattern:

```ts
const { data, isLoading } = useQuery({
  queryKey: ["leads", { sorting, filters, pagination }],
  queryFn: async () => {
    const { data, error, count } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .order(sorting.id, { ascending: sorting.dir === "asc" })
      .range(pagination.from, pagination.to)
      .ilike("name", `%${filters.name || ""}%`);
    if (error) throw error;
    return { rows: data, total: count };
  },
  placeholderData: keepPreviousData,
});
```

Plus `manualPagination`, `manualSorting`, `manualFiltering` op `useReactTable`.

## Empty-state

```tsx
{rows.length === 0 && !isLoading && (
  <TableRow>
    <TableCell colSpan={columns.length} className="h-32 text-center text-gray-500">
      Geen resultaten gevonden.
      {filtersActive && " Probeer je filters aan te passen."}
    </TableCell>
  </TableRow>
)}
```

## Loading-state

```tsx
{isLoading && (
  Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={`skel-${i}`}>
      {columns.map((c, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
)}
```

## Row-actions pattern

```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

function RowActions({ row }: { row: Lead }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Acties">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(row)}>Bekijk</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(row)}>Bewerk</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(row)}
          className="text-red-600 focus:text-red-700"
        >
          Verwijder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Bij `Verwijder`: ALTIJD `<AlertDialog>` confirmation gebruiken — niet direct deleten.

## CSV-export helper

```ts
function exportToCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

## Mobile-fallback (verplicht voor brede tabellen)

```tsx
<div className="hidden md:block"><Table>...</Table></div>
<div className="md:hidden space-y-3">
  {rows.map((r) => <MobileCard key={r.id} row={r} />)}
</div>
```

## Output flow
1. **Brief** — bevestig kolommen, features, data-bron, expected row-count
2. **Type definition** voor row-data
3. **Columns array** met `ColumnDef<T>[]`
4. **Hook of fetch-functie**
5. **Table-component** met alle gevraagde features
6. **Sub-componenten** (RowActions, StatusBadge) als nodig
7. **Gebruiksvoorbeeld** in parent

## Combineer met
- `/ui-component` — voor sub-components (StatusBadge, RowActions)
- `/api-route` — als data-bron eigen endpoint nodig heeft
- `/db-migration` — als nieuwe view of RPC nodig is voor server-side filter
- `/test-write` — vooral filter/sort/empty-state
