import Link from "next/link";
import {
  ArrowRightIcon as ArrowRight,
} from "@heroicons/react/24/outline";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DashboardTableColumn = {
  label: string;
  className?: string;
};

/**
 * Card wrapper around a plain table used on the patient dashboard.
 * The caller decides how many rows to pass (the dashboard caps them at 3).
 */
export function DashboardTableCard({
  title,
  description,
  href,
  columns,
  rows,
  emptyMessage,
}: {
  title: string;
  description: string;
  href: string;
  columns: DashboardTableColumn[];
  rows: React.ReactNode[][];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-foreground hover:underline"
        >
          View all
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
              {columns.map((column) => (
                <TableHead key={column.label} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-20 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((cells, rowIndex) => (
                <TableRow key={rowIndex}>
                  {cells.map((cell, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      className={columns[cellIndex]?.className}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}