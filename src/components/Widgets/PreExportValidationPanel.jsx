import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, XCircle } from 'lucide-react';

const issuePalette = {
  error: {
    container: 'border-red-200 bg-red-50',
    iconClass: 'text-red-600',
    titleClass: 'text-red-900',
    textClass: 'text-red-800',
    Icon: XCircle,
  },
  warning: {
    container: 'border-yellow-200 bg-yellow-50',
    iconClass: 'text-yellow-600',
    titleClass: 'text-yellow-900',
    textClass: 'text-yellow-800',
    Icon: AlertTriangle,
  },
};

const renderIssue = (issue) => {
  const palette = issuePalette[issue?.level] || issuePalette.warning;
  const Icon = palette.Icon;
  const items = Array.isArray(issue?.items) ? issue.items.filter(Boolean).slice(0, 6) : [];

  return (
    <div key={issue?.id || issue?.title} className={`rounded-lg border p-3 ${palette.container}`}>
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${palette.iconClass}`} aria-hidden />
        <div className="flex-1">
          <p className={`text-sm font-semibold ${palette.titleClass}`}>{issue?.title || 'Issue'}</p>
          {issue?.description ? (
            <p className={`text-xs mt-1 ${palette.textClass}`}>{issue.description}</p>
          ) : null}
          {items.length > 0 ? (
            <ul className={`mt-2 list-disc pl-4 text-xs space-y-1 ${palette.textClass}`}>
              {items.map((item, index) => (
                <li key={`${issue?.id || 'issue'}-item-${index}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const PreExportValidationPanel = ({
  report,
  expanded = false,
  onToggle = () => {},
}) => {
  const safeReport = report || {
    summary: { errors: 0, warnings: 0 },
    hasBlockingErrors: false,
    blockingIssues: [],
    warningIssues: [],
    stats: {
      expectedAssignments: 0,
      requiredRawAssignments: 0,
      requiredProcessedAssignments: 0,
      mappedMeasurement: 0,
      mappedProcessing: 0
    },
  };

  const errors = Number(safeReport?.summary?.errors || 0);
  const warnings = Number(safeReport?.summary?.warnings || 0);
  const hasIssues = errors > 0 || warnings > 0;

  let bannerClass = 'border-green-200 bg-green-50 text-green-800';
  let Icon = CheckCircle2;
  let summaryText = 'Pre-export checks are clean.';

  if (errors > 0) {
    bannerClass = 'border-red-200 bg-red-50 text-red-800';
    Icon = XCircle;
    summaryText = `${errors} blocking issue${errors === 1 ? '' : 's'} found.`;
  } else if (warnings > 0) {
    bannerClass = 'border-yellow-200 bg-yellow-50 text-yellow-800';
    Icon = AlertTriangle;
    summaryText = `${warnings} warning${warnings === 1 ? '' : 's'} found.`;
  }

  return (
    <div className={`rounded-xl border p-3 ${bannerClass}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Pre-export validation</p>
          <p className="text-xs">
            {summaryText}
            {' '}
            Required mappings:
            {' '}
            raw {safeReport?.stats?.requiredRawAssignments || 0},
            {' '}
            processed {safeReport?.stats?.requiredProcessedAssignments || 0}.
          </p>
        </div>
        {hasIssues ? (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-md border border-current/20 px-2 py-1 text-xs font-medium hover:bg-white/30"
          >
            {expanded ? 'Hide details' : 'Show details'}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>

      {expanded && hasIssues ? (
        <div className="mt-3 space-y-2">
          {safeReport.blockingIssues.map(renderIssue)}
          {safeReport.warningIssues.map(renderIssue)}
        </div>
      ) : null}
    </div>
  );
};

export default PreExportValidationPanel;
