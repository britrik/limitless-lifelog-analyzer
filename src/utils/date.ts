import { parseISO } from 'date-fns';

export const safeParseISO = (dateStr: string, sourceId: string): Date | null => {
  try {
    const date = parseISO(dateStr);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date "${dateStr}" for ${sourceId}. Skipping.`);
      return null;
    }
    return date;
  } catch (error) {
    console.warn(`Error parsing date "${dateStr}" for ${sourceId}: ${error}. Skipping.`);
    return null;
  }
};
