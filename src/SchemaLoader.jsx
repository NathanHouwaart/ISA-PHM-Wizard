import { useEffect, useState } from 'react';
import { loadAndResolveSchema } from './resolver';


function SchemaLoader() {
  const [schema, setSchema] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        console.log("trying to resolve")
        const resolved = await loadAndResolveSchema('investigation_schema.json');
        setSchema(resolved);
      } catch (err) {
        console.error('Schema resolving failed', err);
      }
    })();
  }, []);

  return (
    <div>
      {schema ? (
        <pre>{JSON.stringify(schema, null, 2)}</pre>
      ) : (
        <p>Loading schema...</p>
      )}
    </div>
  );
}

export default SchemaLoader;
