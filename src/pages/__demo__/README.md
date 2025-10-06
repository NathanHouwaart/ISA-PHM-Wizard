# Demo Pages

This folder contains test/demo pages that are **only available in development mode** (`npm run dev`).

## Purpose

Demo pages are used for:
- Testing new features and components in isolation
- Grid/data structure experiments
- File system API testing
- Development debugging and prototyping

## Availability

- ✅ **Development** (`npm run dev`): All demo routes are available at `/demo/*`
- ❌ **Production** (`npm run build`): Demo routes are completely excluded from the bundle

## How It Works

Demo pages are:
1. Located in `src/pages/__demo__/` folder
2. Lazy-loaded using `React.lazy()` for code splitting
3. Conditionally imported based on `import.meta.env.DEV`
4. Only registered as routes when `isDev === true`

See `src/App.jsx` for the implementation.

## Available Demo Routes

When running `npm run dev`, these routes are available:

- `/demo/simplerevogrid` - Simple RevoGrid test
- `/demo/gridtest` - Generic data grid demo
- `/demo/filesystemtest` - File system hook test
- `/demo/filepickertest` - File picker test
- `/demo/newgrid` - New grid implementation test

## Adding New Demo Pages

### ⚠️ IMPORTANT: Export Requirements

Demo pages **MUST** have a default export for `React.lazy()` to work:

```jsx
// ✅ CORRECT - Default export
function MyDemo() {
  return <div>Demo content</div>;
}

export default MyDemo;

// ✅ ALSO CORRECT - Arrow function with default export
const MyDemo = () => {
  return <div>Demo content</div>;
};

export default MyDemo;

// ❌ WRONG - Named export only (will cause "Element type is invalid" error)
export function MyDemo() {
  return <div>Demo content</div>;
}

// ❌ WRONG - Named export without default
export const MyDemo = () => {
  return <div>Demo content</div>;
};
```

### Steps to Add a Demo Page

1. **Create your demo page** in `src/pages/__demo__/YourDemo.jsx`
   ```jsx
   import React from 'react';
   
   function YourDemo() {
     return (
       <div>
         <h1>Your Demo</h1>
         {/* Demo content */}
       </div>
     );
   }
   
   export default YourDemo;  // ⚠️ Don't forget this!
   ```

2. **Add lazy import** in `App.jsx`:
   ```jsx
   const YourDemo = isDev ? React.lazy(() => import("./pages/__demo__/YourDemo")) : null;
   ```

3. **Add route** inside the `isDev` conditional in `App.jsx`:
   ```jsx
   <Route 
     path="/demo/yourdemo" 
     element={
       <Suspense fallback={<div className="p-8 text-center">Loading demo...</div>}>
         <YourDemo />
       </Suspense>
     } 
   />
   ```

## Common Errors

### "Element type is invalid. Received a promise that resolves to: undefined"

**Cause**: Missing default export in your demo page.

**Solution**: Add `export default YourComponentName;` at the end of your file.

### "Cannot read properties of null"

**Cause**: Demo route accessed in production build where `isDev` is false.

**Solution**: Demo routes are not available in production builds. This is intentional.

## Benefits

- **Smaller production bundles**: Demo code is never included in production builds
- **Faster production builds**: Less code to process and optimize
- **Cleaner deployment**: No test/experimental features exposed to users
- **Better organization**: Clear separation between production and development code
