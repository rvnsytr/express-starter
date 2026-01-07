import {
  Expression,
  OrderByExpression,
  ReferenceExpression,
  SelectQueryBuilder,
  SqlBool,
} from "kysely";
import z from "zod";
import { dataTableStateSchema } from "./schema.zod";

type DataTableState = z.infer<typeof dataTableStateSchema>;

export type WDTConfig<DB, TB extends keyof DB, O> = {
  disabled?: (keyof DataTableState)[];
  globalFilter?: ReferenceExpression<DB, TB>[];
  defaultOrder: { id: OrderByExpression<DB, TB, O>; desc: boolean };
};

export function withDataTable<DB, TB extends keyof DB, O>(
  qb: SelectQueryBuilder<DB, TB, O>,
  state: DataTableState,
  config: WDTConfig<DB, TB, O>,
) {
  // * Global Filter
  if (
    !config.disabled?.includes("globalFilter") &&
    state.globalFilter &&
    config.globalFilter
  ) {
    const value = `%${state.globalFilter}%`;
    qb = qb.where((eb) => {
      const ors: Expression<SqlBool>[] = [];
      config.globalFilter?.forEach((id) => ors.push(eb(id, "like", value)));
      return eb.or(ors);
    });
  }

  // TODO: Column Filters
  // if (!config.disabled?.includes("columnFilter"))

  // TODO: Sorting
  const applySorting = () => {
    // if (!config.disabled?.includes("sorting") && state.sorting.length) {
    //   const conditions = state.sorting
    //     .map(({ id, desc: isDesc }) => {
    //       const col = config.columns[id] ?? null;
    //       if (!col) return null;
    //       return isDesc ? desc(col) : asc(col);
    //     })
    //     .filter((v) => !!v);

    //   // if (conditions.length) return (qb = qb.orderBy(...conditions));
    // }

    const { id, desc: isDesc } = config.defaultOrder;
    qb = qb.orderBy(id, (ob) => (isDesc ? ob.desc() : ob.asc()));
  };

  applySorting();

  // * Pagination
  if (!config.disabled?.includes("pagination"))
    qb = qb
      .offset(state.pagination.pageIndex * state.pagination.pageSize)
      .fetch(state.pagination.pageSize);

  return qb;
}
