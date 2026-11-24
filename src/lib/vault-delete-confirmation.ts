/** Require an exact document-name match before an irreversible Bin purge. */
export function canPermanentlyDeleteDocument(documentName: string, confirmation: string): boolean {
  const expected = documentName.trim();
  return expected.length > 0 && confirmation.trim() === expected;
}
