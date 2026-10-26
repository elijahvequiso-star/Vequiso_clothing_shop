type DatabaseError = {
  code?: string;
};

export function isMissingProductPriceSettingsTable(error: DatabaseError): boolean {
  return error.code === "42P01" || error.code === "PGRST205";
}
