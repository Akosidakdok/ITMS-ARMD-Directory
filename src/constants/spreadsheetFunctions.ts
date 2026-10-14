export interface SpreadsheetFunctionDef {
  name: string;
  category: 'Math' | 'Date' | 'Logical' | 'Text' | 'Lookup';
  syntax: string;
  template: string;
  description: string;
  hasParams: boolean;
}

export const SPREADSHEET_FUNCTIONS: SpreadsheetFunctionDef[] = [
  // Math & Statistics
  { name: 'SUM', category: 'Math', syntax: 'SUM(number1, [number2], ...)', template: 'SUM(', description: 'Adds all the numbers in a range of cells.', hasParams: true },
  { name: 'AVERAGE', category: 'Math', syntax: 'AVERAGE(number1, [number2], ...)', template: 'AVERAGE(', description: 'Returns the average (arithmetic mean) of its arguments.', hasParams: true },
  { name: 'COUNT', category: 'Math', syntax: 'COUNT(value1, [value2], ...)', template: 'COUNT(', description: 'Counts the number of cells that contain numbers.', hasParams: true },
  { name: 'COUNTA', category: 'Math', syntax: 'COUNTA(value1, [value2], ...)', template: 'COUNTA(', description: 'Counts the number of cells that are not empty.', hasParams: true },
  { name: 'COUNTIF', category: 'Math', syntax: 'COUNTIF(range, criteria)', template: 'COUNTIF(', description: 'Counts the number of cells within a range that meet the given condition.', hasParams: true },
  { name: 'COUNTIFS', category: 'Math', syntax: 'COUNTIFS(criteria_range1, criteria1, ...)', template: 'COUNTIFS(', description: 'Counts cells that meet multiple criteria.', hasParams: true },
  { name: 'SUMIF', category: 'Math', syntax: 'SUMIF(range, criteria, [sum_range])', template: 'SUMIF(', description: 'Adds the cells specified by a given condition or criteria.', hasParams: true },
  { name: 'SUMIFS', category: 'Math', syntax: 'SUMIFS(sum_range, criteria_range1, criteria1, ...)', template: 'SUMIFS(', description: 'Adds cells that meet multiple criteria.', hasParams: true },
  { name: 'AVERAGEIF', category: 'Math', syntax: 'AVERAGEIF(range, criteria, [average_range])', template: 'AVERAGEIF(', description: 'Averages cells that meet a criterion.', hasParams: true },
  { name: 'AVERAGEIFS', category: 'Math', syntax: 'AVERAGEIFS(average_range, criteria_range1, criteria1, ...)', template: 'AVERAGEIFS(', description: 'Averages cells that meet multiple criteria.', hasParams: true },
  { name: 'MIN', category: 'Math', syntax: 'MIN(number1, [number2], ...)', template: 'MIN(', description: 'Returns the smallest number in a set of values.', hasParams: true },
  { name: 'MAX', category: 'Math', syntax: 'MAX(number1, [number2], ...)', template: 'MAX(', description: 'Returns the largest number in a set of values.', hasParams: true },
  { name: 'ROUND', category: 'Math', syntax: 'ROUND(number, num_digits)', template: 'ROUND(', description: 'Rounds a number to a specified number of digits.', hasParams: true },
  { name: 'ROUNDUP', category: 'Math', syntax: 'ROUNDUP(number, num_digits)', template: 'ROUNDUP(', description: 'Rounds a number away from zero.', hasParams: true },
  { name: 'ROUNDDOWN', category: 'Math', syntax: 'ROUNDDOWN(number, num_digits)', template: 'ROUNDDOWN(', description: 'Rounds a number toward zero.', hasParams: true },
  { name: 'ABS', category: 'Math', syntax: 'ABS(number)', template: 'ABS(', description: 'Returns the absolute value of a number.', hasParams: true },
  { name: 'MOD', category: 'Math', syntax: 'MOD(number, divisor)', template: 'MOD(', description: 'Returns the remainder after division.', hasParams: true },
  { name: 'INT', category: 'Math', syntax: 'INT(number)', template: 'INT(', description: 'Rounds a number down to the nearest integer.', hasParams: true },
  { name: 'PRODUCT', category: 'Math', syntax: 'PRODUCT(number1, [number2], ...)', template: 'PRODUCT(', description: 'Multiplies all the numbers given as arguments.', hasParams: true },
  { name: 'POWER', category: 'Math', syntax: 'POWER(number, power)', template: 'POWER(', description: 'Returns the result of a number raised to a power.', hasParams: true },
  { name: 'SQRT', category: 'Math', syntax: 'SQRT(number)', template: 'SQRT(', description: 'Returns a positive square root.', hasParams: true },

  // Date & Time
  { name: 'DATEDIF', category: 'Date', syntax: 'DATEDIF(start_date, end_date, unit)', template: 'DATEDIF(', description: 'Calculates the number of days, months, or years between two dates.', hasParams: true },
  { name: 'TODAY', category: 'Date', syntax: 'TODAY()', template: 'TODAY()', description: 'Returns the current calendar date.', hasParams: false },
  { name: 'NOW', category: 'Date', syntax: 'NOW()', template: 'NOW()', description: 'Returns the current date and time.', hasParams: false },
  { name: 'DATE', category: 'Date', syntax: 'DATE(year, month, day)', template: 'DATE(', description: 'Returns the serial number that represents a particular date.', hasParams: true },
  { name: 'DAY', category: 'Date', syntax: 'DAY(serial_number)', template: 'DAY(', description: 'Returns the day of the month from a date.', hasParams: true },
  { name: 'MONTH', category: 'Date', syntax: 'MONTH(serial_number)', template: 'MONTH(', description: 'Returns the month from a date.', hasParams: true },
  { name: 'YEAR', category: 'Date', syntax: 'YEAR(serial_number)', template: 'YEAR(', description: 'Returns the year from a date.', hasParams: true },
  { name: 'DATEVALUE', category: 'Date', syntax: 'DATEVALUE(date_text)', template: 'DATEVALUE(', description: 'Converts a date in the form of text to a serial number.', hasParams: true },
  { name: 'YEARFRAC', category: 'Date', syntax: 'YEARFRAC(start_date, end_date, [basis])', template: 'YEARFRAC(', description: 'Calculates the fraction of the year represented by the number of whole days between two dates.', hasParams: true },

  // Logical
  { name: 'IF', category: 'Logical', syntax: 'IF(logical_test, [value_if_true], [value_if_false])', template: 'IF(', description: 'Checks whether a condition is met, and returns one value if TRUE, and another if FALSE.', hasParams: true },
  { name: 'IFS', category: 'Logical', syntax: 'IFS(logical_test1, value_if_true1, ...)', template: 'IFS(', description: 'Checks whether one or more conditions are met and returns a value corresponding to the first TRUE condition.', hasParams: true },
  { name: 'IFERROR', category: 'Logical', syntax: 'IFERROR(value, value_if_error)', template: 'IFERROR(', description: 'Returns value_if_error if expression is an error and the value of expression itself otherwise.', hasParams: true },
  { name: 'AND', category: 'Logical', syntax: 'AND(logical1, [logical2], ...)', template: 'AND(', description: 'Returns TRUE if all its arguments evaluate to TRUE.', hasParams: true },
  { name: 'OR', category: 'Logical', syntax: 'OR(logical1, [logical2], ...)', template: 'OR(', description: 'Returns TRUE if any argument is TRUE.', hasParams: true },
  { name: 'NOT', category: 'Logical', syntax: 'NOT(logical)', template: 'NOT(', description: 'Reverses the logic of its argument.', hasParams: true },
  { name: 'ISBLANK', category: 'Logical', syntax: 'ISBLANK(value)', template: 'ISBLANK(', description: 'Checks whether a reference is to an empty cell.', hasParams: true },
  { name: 'ISNUMBER', category: 'Logical', syntax: 'ISNUMBER(value)', template: 'ISNUMBER(', description: 'Checks whether a value is a number.', hasParams: true },
  { name: 'ISTEXT', category: 'Logical', syntax: 'ISTEXT(value)', template: 'ISTEXT(', description: 'Checks whether a value is text.', hasParams: true },

  // Text
  { name: 'CONCATENATE', category: 'Text', syntax: 'CONCATENATE(text1, [text2], ...)', template: 'CONCATENATE(', description: 'Joins several text strings into one text string.', hasParams: true },
  { name: 'CONCAT', category: 'Text', syntax: 'CONCAT(text1, [text2], ...)', template: 'CONCAT(', description: 'Combines the text from multiple ranges and/or strings.', hasParams: true },
  { name: 'TRIM', category: 'Text', syntax: 'TRIM(text)', template: 'TRIM(', description: 'Removes all spaces from text except for single spaces between words.', hasParams: true },
  { name: 'UPPER', category: 'Text', syntax: 'UPPER(text)', template: 'UPPER(', description: 'Converts text to uppercase.', hasParams: true },
  { name: 'LOWER', category: 'Text', syntax: 'LOWER(text)', template: 'LOWER(', description: 'Converts text to lowercase.', hasParams: true },
  { name: 'PROPER', category: 'Text', syntax: 'PROPER(text)', template: 'PROPER(', description: 'Capitalizes the first letter of each word in a text value.', hasParams: true },
  { name: 'LEFT', category: 'Text', syntax: 'LEFT(text, [num_chars])', template: 'LEFT(', description: 'Returns the specified number of characters from the start of a text string.', hasParams: true },
  { name: 'RIGHT', category: 'Text', syntax: 'RIGHT(text, [num_chars])', template: 'RIGHT(', description: 'Returns the specified number of characters from the end of a text string.', hasParams: true },
  { name: 'MID', category: 'Text', syntax: 'MID(text, start_num, num_chars)', template: 'MID(', description: 'Returns characters from the middle of a text string given a starting position and length.', hasParams: true },
  { name: 'LEN', category: 'Text', syntax: 'LEN(text)', template: 'LEN(', description: 'Returns the number of characters in a text string.', hasParams: true },
  { name: 'SUBSTITUTE', category: 'Text', syntax: 'SUBSTITUTE(text, old_text, new_text, [instance_num])', template: 'SUBSTITUTE(', description: 'Replaces existing text with new text in a text string.', hasParams: true },
  { name: 'TEXT', category: 'Text', syntax: 'TEXT(value, format_text)', template: 'TEXT(', description: 'Formats a number and converts it to text.', hasParams: true },
  { name: 'VALUE', category: 'Text', syntax: 'VALUE(text)', template: 'VALUE(', description: 'Converts a text string that represents a number to a number.', hasParams: true },

  // Lookup & Reference
  { name: 'VLOOKUP', category: 'Lookup', syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])', template: 'VLOOKUP(', description: 'Looks for a value in the leftmost column of a table, and then returns a value in the same row from a specified column.', hasParams: true },
  { name: 'HLOOKUP', category: 'Lookup', syntax: 'HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])', template: 'HLOOKUP(', description: 'Looks for a value in the top row of a table and returns a value in the same column.', hasParams: true },
  { name: 'INDEX', category: 'Lookup', syntax: 'INDEX(array, row_num, [column_num])', template: 'INDEX(', description: 'Returns a value or reference of the cell at the intersection of a particular row and column.', hasParams: true },
  { name: 'MATCH', category: 'Lookup', syntax: 'MATCH(lookup_value, lookup_array, [match_type])', template: 'MATCH(', description: 'Returns the relative position of an item in an array that matches a specified value.', hasParams: true },
  { name: 'CHOOSE', category: 'Lookup', syntax: 'CHOOSE(index_num, value1, [value2], ...)', template: 'CHOOSE(', description: 'Chooses a value or action to perform from a list of values, based on an index number.', hasParams: true }
];

/**
 * Extracts formula search context from input string.
 * When user writes '=', it returns isFormula=true and searchTerm="" so ALL formulas appear.
 * As user writes '=S' or '=SUM', it returns searchTerm="S" or "SUM".
 */
export function getFormulaSearchContext(value: string | undefined | null): {
  isFormula: boolean;
  searchTerm: string;
  prefixText: string;
} {
  if (!value || typeof value !== 'string') {
    return { isFormula: false, searchTerm: '', prefixText: '' };
  }

  const trimmed = value.trimStart();
  if (!trimmed.startsWith('=')) {
    return { isFormula: false, searchTerm: '', prefixText: '' };
  }

  // Exact '=' shows all formulas
  if (trimmed === '=') {
    return { isFormula: true, searchTerm: '', prefixText: '=' };
  }

  // Match token after '=' or arithmetic/logical operator
  // e.g. '=S', '=SUM', '=A1+S', '=SUM(A1, S'
  const match = value.match(/^(.*[=(+\-*/,&]\s*)([A-Za-z0-9_]*)$/);
  if (match) {
    return {
      isFormula: true,
      searchTerm: match[2].toUpperCase(),
      prefixText: match[1]
    };
  }

  return { isFormula: false, searchTerm: '', prefixText: '' };
}
