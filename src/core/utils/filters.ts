export type DataFilterType = (typeof allDataFilterType)[number];
export const allDataFilterType = [
  /* The column value is a string that should be searchable. */
  "text",
  "number",
  "date",
  /* The column value can be a single value from a list of options. */
  "option",
  /* The column value can be zero or more values from a list of options. */
  "multiOption",
] as const;

/* Operators for text data */
export type TextFilterOperator = (typeof allTextFilterOperators)[number];
export const allTextFilterOperators = ["contains", "does not contain"] as const;

/* Operators for number data */
export type NumberFilterOperator = (typeof allNumberFilterOperators)[number];
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

/* Operators for date data */
export type DateFilterOperator = (typeof allDateFilterOperators)[number];
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

/* Operators for option data */
export type OptionFilterOperator = (typeof allOptionFilterOperators)[number];
export const allOptionFilterOperators = [
  "is",
  "is not",
  "is any of",
  "is none of",
] as const;

/* Operators for multi-option data */
export type MultiOptionFilterOperator =
  (typeof allMultiOptionFilterOperators)[number];
export const allMultiOptionFilterOperators = [
  "include",
  "exclude",
  "include any of",
  "exclude if any of",
  "include all of",
  "exclude if all",
] as const;

export type FilterOperators = (typeof allFilterOperators)[number];
export const allFilterOperators = [
  ...allTextFilterOperators,
  ...allNumberFilterOperators,
  ...allDateFilterOperators,
  ...allOptionFilterOperators,
  ...allMultiOptionFilterOperators,
];

/* Maps filter operators to their respective data types */
export type FilterOperatorsMap = {
  text: TextFilterOperator;
  number: NumberFilterOperator;
  date: DateFilterOperator;
  option: OptionFilterOperator;
  multiOption: MultiOptionFilterOperator;
};

/* Maps filter values to their respective data types */
export type FilterTypes = {
  text: string;
  number: number;
  date: Date;
  option: string;
  multiOption: string[];
};
