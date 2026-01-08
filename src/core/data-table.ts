import { isValid } from "date-fns";
import {
  Expression,
  ReferenceExpression,
  SelectQueryBuilder,
  SqlBool,
} from "kysely";
import z from "zod";
import { FilterOperators } from "./constants/filter";
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
  if (!config.disabled?.includes("columnFilters") && state.columnFilters) {
    const ilikeOperators: FilterOperators[] = ["contains"];
    const notIlikeOperators: FilterOperators[] = ["does not contain"];

    const eqOperators: FilterOperators[] = ["is"];
    const notEqOperators: FilterOperators[] = ["is not"];

    const ltOperators: FilterOperators[] = ["is less than", "is before"];
    const lteOperators: FilterOperators[] = [
      "is less than or equal to",
      "is on or before",
    ];
    const gtOperators: FilterOperators[] = ["is greater than", "is after"];
    const gteOperators: FilterOperators[] = [
      "is greater than or equal to",
      "is on or after",
    ];

    const betweenOperators: FilterOperators[] = ["is between"];
    const notBetweenOperators: FilterOperators[] = ["is not between"];

    const inArrayOperators: FilterOperators[] = ["is any of"];
    const notInArrayOperators: FilterOperators[] = ["is none of"];

    const includeAnyOperators: FilterOperators[] = [
      "include",
      "include any of",
    ];
    const excludeAnyOperators: FilterOperators[] = [
      "exclude",
      "exclude if any of",
    ];
    const includeAllOperators: FilterOperators[] = ["include all of"];
    const excludeAllOperators: FilterOperators[] = ["exclude if all"];

    qb = qb.where((eb) => {
      const ands: Expression<SqlBool>[] = [];

      state.columnFilters.forEach(({ id, value: { operator, values } }) => {
        const columnConfig = config.columns[id];
        if (!columnConfig || !values.length) return;

        const { column, type, parser } = columnConfig;
        let parsedValues: (string | number | boolean | Date)[] = values;

        if (type === "date")
          parsedValues = values
            .map((v) => {
              const d = v instanceof Date ? v : new Date(v);
              if (!isValid(d)) return null;
              return d;
            })
            .filter((v) => !!v);

        if (type === "number")
          parsedValues = values
            .map((v) => {
              const n = Number(v);
              if (isNaN(n)) return null;
              return n;
            })
            .filter((v) => v !== null);

        if (type === "boolean")
          parsedValues = values
            .map((v) => {
              if (parser) return parser(v);
              if (typeof v !== "string") return null;
              const n = v.trim().toLowerCase();
              if (n === "true" || n === "1") return true;
              if (n === "false" || n === "0") return false;
              return null;
            })
            .filter((v) => v !== null);

        if (!parsedValues.length) return;

        if (ilikeOperators.includes(operator))
          return ands.push(eb(column, "like", `%${parsedValues[0]}%`));
        if (notIlikeOperators.includes(operator))
          return ands.push(eb(column, "not like", `%${parsedValues[0]}%`));

        if (eqOperators.includes(operator))
          return ands.push(eb(column, "=", parsedValues[0]));
        if (notEqOperators.includes(operator))
          return ands.push(eb(column, "!=", parsedValues[0]));

        if (ltOperators.includes(operator))
          return ands.push(eb(column, "<", parsedValues[0]));
        if (lteOperators.includes(operator))
          return ands.push(eb(column, "<=", parsedValues[0]));
        if (gtOperators.includes(operator))
          return ands.push(eb(column, ">", parsedValues[0]));
        if (gteOperators.includes(operator))
          return ands.push(eb(column, ">=", parsedValues[0]));

        if (betweenOperators.includes(operator)) {
          if (parsedValues.length < 2) return;
          const [v1, v2] = parsedValues;
          return ands.push(eb.between(column, v1, v2));
        }
        if (notBetweenOperators.includes(operator)) {
          if (parsedValues.length < 2) return;
          const [v1, v2] = parsedValues;
          return ands.push(eb.not(eb.between(column, v1, v2)));
        }

        if (inArrayOperators.includes(operator))
          return ands.push(eb(column, "in", parsedValues));
        if (notInArrayOperators.includes(operator))
          return ands.push(eb(column, "not in", parsedValues));

        if (includeAnyOperators.includes(operator))
          return ands.push(eb(column, "&&", parsedValues));
        if (excludeAnyOperators.includes(operator))
          return ands.push(eb.not(eb(column, "&&", parsedValues)));
        if (includeAllOperators.includes(operator))
          return ands.push(eb(column, "@>", parsedValues));
        if (excludeAllOperators.includes(operator))
          return ands.push(eb.not(eb(column, "@>", parsedValues)));
      });

      return eb.and(ands);
    });
  }

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
