import RefParser from '@apidevtools/json-schema-ref-parser';

export async function loadDereferencedSchema() {
  const rootUrl = '/schemas/root.json';
  const schema = await RefParser.dereference(rootUrl);
  return schema;
}
