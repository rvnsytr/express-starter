export type ColumnDataType =
  | "text"
  | "number"
  | "date"
  | "option"
  | "multiOption";

export const allTextFilterOperators = ["contains", "does not contain"] as const;
export type TextFilterOperator = (typeof allTextFilterOperators)[number];

export const allNumberFilterOperators = [
  "is",
  "is not",
  "is less than",
  "is greater than or equal to",
  "is greater than",
  "is less than or equal to",
  "is between",
  "is not between",
] as const;
export type NumberFilterOperator = (typeof allNumberFilterOperators)[number];

export const allDateFilterOperators = [
  "is",
  "is not",
  "is before",
  "is on or after",
  "is after",
  "is on or before",
  "is between",
  "is not between",
] as const;
export type DateFilterOperator = (typeof allDateFilterOperators)[number];

export const allOptionFilterOperators = [
  "is",
  "is not",
  "is any of",
  "is none of",
] as const;
export type OptionFilterOperator = (typeof allOptionFilterOperators)[number];

export const allMultiOptionFilterOperators = [
  "include",
  "exclude",
  "include any of",
  "exclude if any of",
  "include all of",
  "exclude if all",
] as const;
export type MultiOptionFilterOperator =
  (typeof allMultiOptionFilterOperators)[number];

export const allFilterOperators = [
  ...allTextFilterOperators,
  ...allNumberFilterOperators,
  ...allDateFilterOperators,
  ...allOptionFilterOperators,
  ...allMultiOptionFilterOperators,
];
export type FilterOperators = (typeof allFilterOperators)[number];

export type FilterOperatorsMap = {
  text: TextFilterOperator;
  number: NumberFilterOperator;
  date: DateFilterOperator;
  option: OptionFilterOperator;
  multiOption: MultiOptionFilterOperator;
};

export type FilterTypes = {
  text: string;
  number: number;
  date: Date;
  option: string;
  multiOption: string[];
};
