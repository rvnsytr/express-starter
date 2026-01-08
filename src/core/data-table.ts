import {
  Expression,
  ReferenceExpression,
  SelectQueryBuilder,
  SqlBool,
} from "kysely";
import z from "zod";
import { dataTableSchema } from "./schema.zod";

type DataTableState = z.infer<typeof dataTableSchema>;

type ConfigParserValue = string | number | Date;

type WDTColumnConfig<DB, TB extends keyof DB> = {
  column: ReferenceExpression<DB, TB>;
} & (
  | { type: "string"; parser?: (value: ConfigParserValue) => string }
  | { type: "number"; parser?: (value: ConfigParserValue) => number }
  | { type: "date"; parser?: (value: ConfigParserValue) => Date }
  | { type: "boolean"; parser: (value: ConfigParserValue) => boolean }
);

type WithDataTable<DB, TB extends keyof DB, O> = {
  queryBuilder: SelectQueryBuilder<DB, TB, O>;
  config: {
    disabled?: (keyof DataTableState)[];
    columns: Record<string, WDTColumnConfig<DB, TB>>;
    defaultOrderBy: { column: ReferenceExpression<DB, TB>; desc: boolean };
  };
};

export const defineWDT = <DB, TB extends keyof DB, O>(
  config: WithDataTable<DB, TB, O>,
) => config;

export function withDataTable<DB, TB extends keyof DB, O>(
  state: DataTableState,
  definition: WithDataTable<DB, TB, O>,
) {
  let qb = definition.queryBuilder;
  const { config } = definition;

  // #region Global Filter
  const columnValues = Object.values(config.columns);
  const globalFilterCols = columnValues.filter((v) => v.type === "string");

  if (
    !config.disabled?.includes("globalFilter") &&
    state.globalFilter &&
    globalFilterCols.length
  ) {
    const value = `%${state.globalFilter}%`;
    qb = qb.where((eb) => {
      const ors: Expression<SqlBool>[] = [];
      globalFilterCols.forEach((c) => ors.push(eb(c.column, "like", value)));
      return eb.or(ors);
    });
  }
  // #endregion

  // TODO: Column Filters
  // if (!config.disabled?.includes("columnFilters") && state.columnFilters) {
  //   const ilikeOperators: FilterOperators[] = ["contains"];
  //   const notIlikeOperators: FilterOperators[] = ["does not contain"];

  //   const eqOperators: FilterOperators[] = ["is"];
  //   const notEqOperators: FilterOperators[] = ["is not"];

  //   const ltOperators: FilterOperators[] = ["is less than", "is before"];
  //   const lteOperators: FilterOperators[] = [
  //     "is less than or equal to",
  //     "is on or before",
  //   ];
  //   const gtOperators: FilterOperators[] = ["is greater than", "is after"];
  //   const gteOperators: FilterOperators[] = [
  //     "is greater than or equal to",
  //     "is on or after",
  //   ];

  //   const betweenOperators: FilterOperators[] = ["is between"];
  //   const notBetweenOperators: FilterOperators[] = ["is not between"];

  //   const inArrayOperators: FilterOperators[] = ["is any of"];
  //   const notInArrayOperators: FilterOperators[] = ["is none of"];

  //   const includeAnyOperators: FilterOperators[] = [
  //     "include",
  //     "include any of",
  //   ];
  //   const excludeAnyOperators: FilterOperators[] = [
  //     "exclude",
  //     "exclude if any of",
  //   ];
  //   const includeAllOperators: FilterOperators[] = ["include all of"];
  //   const excludeAllOperators: FilterOperators[] = ["exclude if all"];
  // }

  // #region Sorting
  const applySorting = () => {
    if (!config.disabled?.includes("sorting") && state.sorting.length) {
      const isSorted = state.sorting
        .map(({ id, desc: isDesc }) => {
          const columnConfig = config.columns[id] ?? null;
          if (!columnConfig) return null;
          const { column } = columnConfig;
          qb = qb.orderBy(column, (ob) => (isDesc ? ob.desc() : ob.asc()));
          return true;
        })
        .some((v) => !!v);
      if (isSorted) return;
    }

    const { column, desc: isDesc } = config.defaultOrderBy;
    qb = qb.orderBy(column, (ob) => (isDesc ? ob.desc() : ob.asc()));
  };

  if (!config.disabled?.includes("pagination")) applySorting();
  // #endregion

  // #region Pagination
  if (!config.disabled?.includes("pagination")) {
    const { pageIndex, pageSize } = state.pagination;
    qb = qb.offset(pageIndex * pageSize).fetch(pageSize);
  }
  // #endregion

  return qb;
}
