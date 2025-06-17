
function safeStringify(obj, space = 2) {
  const seen = new WeakSet();

  return JSON.stringify(obj, function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  }, space);
}


function JsonViewer({ data }) {
  const pretty = safeStringify(data, 2);

  return (
    <pre
      style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}
      dangerouslySetInnerHTML={{ __html: pretty.replace(/</g, '&lt;') }}
    />
  );
}

export default JsonViewer;