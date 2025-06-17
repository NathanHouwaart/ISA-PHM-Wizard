import * as $RefParser from '@apidevtools/json-schema-ref-parser';

export async function loadAndResolveSchema(schemaFile = 'investigation_schema.json') {
  const parser = new $RefParser();

  const schemaUrl = `/schemas/${schemaFile}`; // relative to public folder

  const resolvedSchema = await parser.bundle(schemaUrl, {
    resolve: {
      file: false, // disable Node file resolver
      http: {
        headers: {
          Accept: 'application/json',
        },
        timeout: 5000,
        withCredentials: false,
      },
    },
  });

  return resolvedSchema;
}
