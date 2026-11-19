import React from 'react';

const LABELS = {
  pass: 'Dataset exported successfully', fail: 'Dataset exported with validation errors',
  incomplete: 'Dataset exported, but some checks could not finish',
  unavailable: 'Dataset exported, but validation was unavailable',
};

export default function SpecificationValidationReport({ report }) {
  if (!report) return null;
  const findings = Object.entries(report.checks || {}).flatMap(([name, check]) =>
    ['errors', 'incomplete', 'advisories'].flatMap((type) =>
      (check[type] || []).map((issue) => ({ name, type, ...issue }))));
  const hasWarnings = findings.some((issue) => issue.type === 'advisories');
  const style = report.status === 'pass' && !hasWarnings
    ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
    : report.status === 'fail'
      ? 'border-red-300 bg-red-50 text-red-950'
      : 'border-amber-300 bg-amber-50 text-amber-950';
  return (
    <section className={`mx-5 rounded-md border p-4 text-sm ${style}`} aria-live="polite">
      <h2 className="font-semibold">{report.status === 'pass' && hasWarnings ? 'Dataset exported with validation warnings' : LABELS[report.status]}</h2>
      <p className="mt-1">Measurement files and their paths were not checked during export.</p>
      {report.status === 'unavailable' && <p className="mt-1">{report.limitations?.[0]}</p>}
      {findings.length > 0 && (
        <ul className="mt-2 list-inside list-disc">
          {findings.map((issue, index) => <li key={`${issue.name}-${issue.code}-${index}`}>
            <span className="font-medium">{issue.type === 'advisories' ? 'Warning' : issue.type === 'incomplete' ? 'Not checked' : 'Error'}:</span> {issue.message}
          </li>)}
        </ul>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer font-medium underline">View validation details</summary>
        <p className="mt-2">These are selected draft checks, not an ISA-PHM conformance certificate.</p>
        <ul className="mt-1 list-inside list-disc">
          {Object.entries(report.checks || {}).map(([name, check]) => <li key={name}>{name}: {check.status}</li>)}
          {(report.limitations || []).map((item, index) => <li key={index}>{item}</li>)}
        </ul>
        {!report.report_missing && <p className="mt-2">The downloaded ZIP also contains the full validation report.</p>}
      </details>
    </section>
  );
}
