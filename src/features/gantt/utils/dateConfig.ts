import { isValid, parseISO } from "date-fns";

export const parseConfigDate = (value: string): Date | undefined => {
  const parsedDate = parseISO(value);
  return isValid(parsedDate) ? parsedDate : undefined;
};

export const toConfigDate = (value: Date): string => {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
