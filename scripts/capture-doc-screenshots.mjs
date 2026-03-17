import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.DOCS_CAPTURE_BASE_URL || 'http://127.0.0.1:4173/ISA-PHM-Wizard/#';
const OUTPUT_DIR = path.resolve('docs/images/annotated');
const ZOOM_FACTOR = 0.8;

const SCREENSHOT_OPTIONS = {
  fullPage: false,
  type: 'png'
};

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function applyZoom(page) {
  await page.evaluate((zoom) => {
    const percent = `${zoom * 100}%`;
    document.documentElement.style.zoom = percent;
    document.body.style.zoom = '';
  }, ZOOM_FACTOR);
}

function buildUrl(route) {
  const normalized = route.startsWith('/') ? route : `/${route}`;
  return `${BASE_URL}${normalized}`;
}

async function gotoRoute(page, route, waitLocator = null) {
  await page.goto(buildUrl(route), { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    // networkidle can time out with dev tooling websocket noise
  }
  await applyZoom(page);
  if (waitLocator) {
    await waitLocator.first().waitFor({ state: 'visible', timeout: 20000 });
  }
  await page.waitForTimeout(700);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function annotationBoxes(entries) {
  const boxes = [];
  for (const entry of entries) {
    const locator = entry.locator.first();
    if ((await locator.count()) === 0) continue;

    try {
      await locator.scrollIntoViewIfNeeded({ timeout: 3000 });
    } catch {
      // Not all targets can be scrolled into view (e.g. fixed elements)
    }

    const box = await locator.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
    });
    if (!box) continue;

    boxes.push({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      label: entry.label,
      placement: entry.placement || 'right',
      lockPlacement: Boolean(entry.lockPlacement)
    });
  }
  return boxes;
}

async function drawAnnotations(page, boxes) {
  await page.evaluate(({ items, zoomFactor }) => {
    const existing = document.getElementById('__doc_anno_layer__');
    if (existing) existing.remove();

    const layer = document.createElement('div');
    layer.id = '__doc_anno_layer__';
    layer.style.position = 'fixed';
    layer.style.inset = '0';
    layer.style.pointerEvents = 'none';
    layer.style.zIndex = '2147483647';
    // The page itself is rendered at 80% zoom; compensate so annotation
    // coordinates stay in the visible viewport coordinate system.
    layer.style.zoom = `${(1 / zoomFactor) * 100}%`;
    layer.style.transformOrigin = '0 0';

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const create = (tag, style = {}) => {
      const node = document.createElement(tag);
      Object.assign(node.style, style);
      return node;
    };
    const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));
    const rectArea = (rect) => Math.max(0, rect.width) * Math.max(0, rect.height);
    const intersectionArea = (a, b) => {
      const left = Math.max(a.x, b.x);
      const top = Math.max(a.y, b.y);
      const right = Math.min(a.x + a.width, b.x + b.width);
      const bottom = Math.min(a.y + a.height, b.y + b.height);
      if (right <= left || bottom <= top) return 0;
      return (right - left) * (bottom - top);
    };
    const expandedRect = (rect, padding) => ({
      x: rect.x - padding,
      y: rect.y - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    });

    const itemRects = items.map((item) => ({
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height
    }));
    const placedLabels = [];

    const placeLabelRect = (item, index, text) => {
      const charWidth = 7.2;
      const baseWidth = clampValue(Math.ceil(text.length * charWidth) + 24, 170, 300);
      const maxLines = 3;
      const estimatedLines = clampValue(Math.ceil((text.length * charWidth) / (baseWidth - 24)), 1, maxLines);
      const labelHeight = 16 + estimatedLines * 18;
      const gap = 16;
      const offsets = [0, -24, 24, -44, 44, -68, 68, -90, 90];
      const centerX = item.x + item.width / 2;
      const centerY = item.y + item.height / 2;
      const preferred = item.placement || 'right';
      const candidates = item.lockPlacement
        ? [preferred]
        : Array.from(new Set([preferred, 'right', 'left', 'top', 'bottom']));

      let best = null;

      const buildRect = (side, offset) => {
        let x = item.x + item.width + gap;
        let y = centerY - labelHeight / 2;

        if (side === 'left') {
          x = item.x - baseWidth - gap;
          y = centerY - labelHeight / 2 + offset;
        } else if (side === 'right') {
          x = item.x + item.width + gap;
          y = centerY - labelHeight / 2 + offset;
        } else if (side === 'top') {
          x = centerX - baseWidth / 2 + offset;
          y = item.y - labelHeight - gap;
        } else if (side === 'bottom') {
          x = centerX - baseWidth / 2 + offset;
          y = item.y + item.width * 0 + item.height + gap;
        }

        x = clampValue(x, 10, vw - baseWidth - 10);
        y = clampValue(y, 10, vh - labelHeight - 10);
        return { x, y, width: baseWidth, height: labelHeight, side };
      };

      const scoreRect = (rect, sideOrder) => {
        const padded = expandedRect(rect, 6);
        let score = sideOrder * 50;

        for (const existing of placedLabels) {
          score += intersectionArea(padded, expandedRect(existing, 4)) * 50;
        }

        // Prefer labels that do not sit on top of any annotated target box.
        for (let i = 0; i < itemRects.length; i += 1) {
          if (i === index) continue;
          score += intersectionArea(padded, expandedRect(itemRects[i], 4)) * 12;
        }

        // Also avoid covering the current target content.
        score += intersectionArea(padded, expandedRect(itemRects[index], 4)) * 120;

        return score;
      };

      for (let sideOrder = 0; sideOrder < candidates.length; sideOrder += 1) {
        const side = candidates[sideOrder];
        for (const offset of offsets) {
          const rect = buildRect(side, offset);
          const score = scoreRect(rect, sideOrder);
          if (!best || score < best.score) {
            best = { ...rect, score };
          }
          if (score === 0) {
            return { ...rect };
          }
        }
      }

      return { ...best };
    };

    const boxEdgeAnchor = (item, pointX, pointY) => {
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      const dx = pointX - cx;
      const dy = pointY - cy;

      if (Math.abs(dx / item.width) >= Math.abs(dy / item.height)) {
        // left or right edge
        const x = dx >= 0 ? item.x + item.width : item.x;
        const y = clampValue(pointY, item.y + 8, item.y + item.height - 8);
        return { x, y };
      }

      // top or bottom edge
      const y = dy >= 0 ? item.y + item.height : item.y;
      const x = clampValue(pointX, item.x + 8, item.x + item.width - 8);
      return { x, y };
    };

    items.forEach((item, index) => {
      const box = create('div', {
        position: 'absolute',
        left: `${item.x - 2}px`,
        top: `${item.y - 2}px`,
        width: `${item.width + 4}px`,
        height: `${item.height + 4}px`,
        border: '2px solid #f97316',
        borderRadius: '7px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.9)',
        background: 'transparent'
      });

      const labelText = `${index + 1}. ${item.label}`;
      const labelRect = placeLabelRect(item, index, labelText);
      placedLabels.push(labelRect);

      const label = create('div', {
        position: 'absolute',
        left: `${labelRect.x}px`,
        top: `${labelRect.y}px`,
        width: `${labelRect.width}px`,
        minHeight: `${labelRect.height}px`,
        background: '#f97316',
        color: '#fff',
        borderRadius: '8px',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontWeight: '700',
        fontSize: '14px',
        lineHeight: '1.25',
        padding: '8px 10px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
        whiteSpace: 'normal',
        overflow: 'hidden'
      });
      label.textContent = labelText;

      const labelCenterX = labelRect.x + labelRect.width / 2;
      const labelCenterY = labelRect.y + labelRect.height / 2;
      const anchor = boxEdgeAnchor(item, labelCenterX, labelCenterY);

      let lineStartX = labelRect.x;
      let lineStartY = labelCenterY;
      if (labelRect.side === 'left') {
        lineStartX = labelRect.x + labelRect.width;
        lineStartY = clampValue(anchor.y, labelRect.y + 6, labelRect.y + labelRect.height - 6);
      } else if (labelRect.side === 'right') {
        lineStartX = labelRect.x;
        lineStartY = clampValue(anchor.y, labelRect.y + 6, labelRect.y + labelRect.height - 6);
      } else if (labelRect.side === 'top') {
        lineStartX = clampValue(anchor.x, labelRect.x + 8, labelRect.x + labelRect.width - 8);
        lineStartY = labelRect.y + labelRect.height;
      } else if (labelRect.side === 'bottom') {
        lineStartX = clampValue(anchor.x, labelRect.x + 8, labelRect.x + labelRect.width - 8);
        lineStartY = labelRect.y;
      }

      const dx = anchor.x - lineStartX;
      const dy = anchor.y - lineStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      const line = create('div', {
        position: 'absolute',
        left: `${lineStartX}px`,
        top: `${lineStartY}px`,
        width: `${Math.max(8, distance)}px`,
        height: '2px',
        background: '#f97316',
        transformOrigin: '0 50%',
        transform: `rotate(${angle}deg)`,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.5)'
      });

      const arrow = create('div', {
        position: 'absolute',
        left: `${anchor.x - 6}px`,
        top: `${anchor.y - 6}px`,
        width: '0',
        height: '0',
        borderTop: '6px solid transparent',
        borderBottom: '6px solid transparent',
        borderLeft: '10px solid #f97316',
        transformOrigin: '50% 50%',
        transform: `rotate(${angle}deg)`
      });

      const anchorDot = create('div', {
        position: 'absolute',
        left: `${anchor.x - 3}px`,
        top: `${anchor.y - 3}px`,
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: '#f97316',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.7)'
      });

      layer.append(box, line, arrow, anchorDot, label);
    });

    document.body.appendChild(layer);
  }, { items: boxes, zoomFactor: ZOOM_FACTOR });
}

async function clearAnnotations(page) {
  await page.evaluate(() => {
    const existing = document.getElementById('__doc_anno_layer__');
    if (existing) existing.remove();
  });
}

async function capture(page, fileName, entries) {
  await applyZoom(page);
  await page.waitForTimeout(250);
  const boxes = await annotationBoxes(entries);
  await drawAnnotations(page, boxes);
  await page.screenshot({
    ...SCREENSHOT_OPTIONS,
    path: path.join(OUTPUT_DIR, fileName)
  });
  await clearAnnotations(page);
  console.log(`Captured ${fileName}`);
}

async function clickNextSlide(page) {
  const nextButton = page.locator('button:has-text("Start"), button:has-text("Next >")').last();
  await nextButton.waitFor({ state: 'visible', timeout: 10000 });
  await nextButton.click();
  await page.waitForTimeout(850);
}

async function advanceToSlide(page, targetSlideNumber) {
  // Slide number is 1-based, target 1 means no navigation.
  const steps = Math.max(0, targetSlideNumber - 1);
  for (let i = 0; i < steps; i += 1) {
    await clickNextSlide(page);
  }
}

async function captureGeneralScreens(page) {
  await gotoRoute(page, '/', page.getByRole('heading', { name: /Welcome to the ISA-PHM input Wizard/i }));
  await capture(page, 'home-annotated.png', [
    { locator: page.getByRole('heading', { name: /Welcome to the ISA-PHM input Wizard/i }), label: 'Start from Home', placement: 'bottom' },
    { locator: page.locator('main a:has-text("Test Setups")').first(), label: 'Open Test Setup management', placement: 'top' },
    { locator: page.locator('main a:has-text("ISA Questionnaire")').first(), label: 'Open questionnaire workflow', placement: 'top' }
  ]);

  await gotoRoute(page, '/testsetups', page.getByRole('heading', { name: /^Test Setups$/i }));
  await capture(page, 'test-setups-overview-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Test Setups$/i }), label: 'Test setup catalog', placement: 'right' },
    { locator: page.getByRole('button', { name: /Add Test Setup/i }), label: 'Create new test setup', placement: 'left' },
    { locator: page.locator('div.bg-white.rounded-lg.shadow-md').first(), label: 'Edit or reuse existing setup', placement: 'right' }
  ]);

  await gotoRoute(page, '/isaquestionnaire', page.getByText(/Project sessions/i));
  await capture(page, 'questionnaire-project-sessions-annotated.png', [
    { locator: page.getByText(/Project sessions/i), label: 'Choose project session', placement: 'bottom' },
    { locator: page.locator('div.border.border-gray-200.rounded-2xl.bg-white').first(), label: 'Project list', placement: 'right' },
    { locator: page.getByRole('button', { name: /Select project/i }), label: 'Continue with selected project', placement: 'left' }
  ]);
}

async function openProjectSessions(page) {
  // The questionnaire opens the modal on route-entry; navigate away first to
  // guarantee a pathname change and force modal re-open.
  await gotoRoute(page, '/', page.getByRole('heading', { name: /Welcome to the ISA-PHM input Wizard/i }));
  await gotoRoute(page, '/isaquestionnaire', page.getByText(/Project sessions/i));
}

async function selectProjectInModal(page, projectNamePattern) {
  const projectRow = page.locator('button').filter({ hasText: projectNamePattern }).first();
  await projectRow.waitFor({ state: 'visible', timeout: 15000 });
  await projectRow.click();
  await page.waitForTimeout(600);
}

async function closeSetupEditor(page) {
  const closeButtons = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
  if (await closeButtons.count()) {
    try {
      await closeButtons.last().click({ timeout: 4000, force: true });
      await page.waitForTimeout(500);
    } catch {
      // fallback below
    }
  }

  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } catch {
    // ignore
  }
}

async function resolveSetupCard(page, setupNamePattern, fallbackIndex = 0) {
  const namedCards = page.locator('div.bg-white.rounded-lg.shadow-md').filter({ hasText: setupNamePattern });
  if (await namedCards.count()) {
    return namedCards.first();
  }

  const allCards = page.locator('div.bg-white.rounded-lg.shadow-md');
  if ((await allCards.count()) > fallbackIndex) {
    return allCards.nth(fallbackIndex);
  }

  throw new Error(`No test setup card found for pattern ${setupNamePattern}`);
}

async function openSetupEditor(page, setupCard, fallbackIndex = 0) {
  const tryClick = async (locator) => {
    if (!(await locator.count())) return false;
    try {
      await locator.first().click({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  };

  // Prefer edit button inside the matched card.
  if (await tryClick(setupCard.locator('button'))) {
    return;
  }

  // Fallback: global pencil icon buttons ordered by card.
  const pencilButtons = page.locator('button').filter({ has: page.locator('svg.lucide-pencil') });
  if ((await pencilButtons.count()) > fallbackIndex) {
    await pencilButtons.nth(fallbackIndex).click({ timeout: 5000 });
    return;
  }

  // Last resort: click the card itself.
  await setupCard.click({ timeout: 5000 });
}

async function captureExampleSetupCharacteristics(page, setupNamePattern, fileName, setupLabel, fallbackIndex = 0) {
  // Force unmount of any open setup editor from previous capture.
  await gotoRoute(page, '/', page.getByRole('heading', { name: /Welcome to the ISA-PHM input Wizard/i }));
  await gotoRoute(page, '/testsetups', page.getByRole('heading', { name: /^Test Setups$/i }));
  const setupCard = await resolveSetupCard(page, setupNamePattern, fallbackIndex);
  await setupCard.waitFor({ state: 'visible', timeout: 15000 });
  await setupCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  await openSetupEditor(page, setupCard, fallbackIndex);
  await page.locator('button:has-text("Characteristics")').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('button:has-text("Characteristics")').first().click();
  await page.locator('h3:has-text("Characteristics")').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(700);

  const gridButton = page.locator('button:has-text("Grid View")').first();
  if (await gridButton.count()) {
    await gridButton.click();
    await page.waitForTimeout(500);
  }

  await capture(page, fileName, [
    { locator: page.locator('button:has-text("Characteristics")').first(), label: `${setupLabel} setup characteristics`, placement: 'bottom' },
    { locator: page.locator('h3:has-text("Characteristics")').first(), label: 'Existing characteristic entries', placement: 'right' }
  ]);

  await closeSetupEditor(page);
}

async function captureExampleProjects(page) {
  await captureExampleSetupCharacteristics(
    page,
    /Techport/i,
    'example-techport-characteristics-annotated.png',
    'Techport',
    0
  );

  await captureExampleSetupCharacteristics(
    page,
    /Milling Lab/i,
    'example-milling-lab-characteristics-annotated.png',
    'Milling Lab',
    1
  );

  await openProjectSessions(page);

  await selectProjectInModal(page, /Single Run Sietze/i);
  await capture(page, 'example-project-sietze-annotated.png', [
    { locator: page.getByText(/Project sessions/i).first(), label: 'Example project: Single Run Sietze', placement: 'right' },
    { locator: page.locator('button').filter({ hasText: /Single Run Sietze/i }).first(), label: 'Select Sietze example', placement: 'right' },
    { locator: page.getByRole('button', { name: /Select project/i }).first(), label: 'Open questionnaire with this project', placement: 'top' }
  ]);

  await page.getByRole('button', { name: /Select project/i }).first().click();
  await page.getByRole('heading', { name: /ISA Questionnaire Form/i }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
  await advanceToSlide(page, 8);
  await page.getByRole('heading', { name: /^Test Matrix$/i }).first().waitFor({ state: 'visible', timeout: 12000 });
  await capture(page, 'example-sietze-test-matrix-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Test Matrix$/i }).first(), label: 'Sietze single-run matrix', placement: 'right', lockPlacement: true },
    { locator: page.getByText(/Test Matrix - All Experiments/i).first(), label: 'One matrix across experiments', placement: 'right', lockPlacement: true }
  ]);

  await openProjectSessions(page);
  await selectProjectInModal(page, /Multi Run Milling/i);
  await capture(page, 'example-project-milling-annotated.png', [
    { locator: page.getByText(/Project sessions/i).first(), label: 'Example project: Multi Run Milling', placement: 'right' },
    { locator: page.locator('button').filter({ hasText: /Multi Run Milling/i }).first(), label: 'Select Milling example', placement: 'right' },
    { locator: page.getByRole('button', { name: /Select project/i }).first(), label: 'Open questionnaire with this project', placement: 'top' }
  ]);

  await page.getByRole('button', { name: /Select project/i }).first().click();
  await page.getByRole('heading', { name: /ISA Questionnaire Form/i }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
  await advanceToSlide(page, 8);
  await page.getByRole('heading', { name: /^Test Matrix$/i }).first().waitFor({ state: 'visible', timeout: 12000 });
  await capture(page, 'example-milling-test-matrix-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Test Matrix$/i }).first(), label: 'Milling multi-run matrix', placement: 'right', lockPlacement: true },
    { locator: page.getByText(/Test Matrix - Case 1/i).first(), label: 'Each case contains run columns', placement: 'right', lockPlacement: true }
  ]);
}

async function captureTestSetupTabs(page) {
  await gotoRoute(page, '/testsetups', page.getByRole('heading', { name: /^Test Setups$/i }));
  await page.getByRole('button', { name: /Add Test Setup/i }).first().click();
  await page.getByText(/Add New Test Setup/i).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);

  await capture(page, 'test-setup-tab-basic-info-annotated.png', [
    { locator: page.locator('button:has-text("Basic Info")').first(), label: 'Tab: Basic Info', placement: 'bottom' },
    { locator: page.locator('label:has-text("Name")').first(), label: 'Required setup name field', placement: 'right' },
    { locator: page.locator('button:has-text("Add Test Setup"), button:has-text("Update Test Setup")').first(), label: 'Save setup', placement: 'top' }
  ]);

  await page.locator('button:has-text("Characteristics")').first().click();
  await page.locator('h3:has-text("Characteristics")').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);
  await capture(page, 'test-setup-tab-characteristics-annotated.png', [
    { locator: page.locator('button:has-text("Characteristics")').first(), label: 'Tab: Characteristics', placement: 'bottom' },
    { locator: page.locator('h3:has-text("Characteristics")').first(), label: 'Manage setup characteristics', placement: 'right' },
    { locator: page.getByText(/No characteristics added yet/i).first(), label: 'Add first characteristic', placement: 'top' }
  ]);

  await page.locator('button:has-text("Sensors")').first().click();
  await page.locator('h3:has-text("Sensors")').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);
  await capture(page, 'test-setup-tab-sensors-annotated.png', [
    { locator: page.locator('button:has-text("Sensors")').first(), label: 'Tab: Sensors', placement: 'bottom' },
    { locator: page.locator('h3:has-text("Sensors")').first(), label: 'Define measurement sensors', placement: 'right' },
    { locator: page.getByText(/No sensors added yet/i).first(), label: 'Add first sensor', placement: 'top' }
  ]);

  await page.locator('button:has-text("Configurations")').first().click();
  await page.locator('h3:has-text("Configurations")').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);
  await capture(page, 'test-setup-tab-configurations-annotated.png', [
    { locator: page.locator('button:has-text("Configurations")').first(), label: 'Tab: Configurations', placement: 'bottom' },
    { locator: page.locator('h3:has-text("Configurations")').first(), label: 'Create setup variants', placement: 'right' },
    { locator: page.getByText(/No configurations added yet/i).first(), label: 'Add first configuration', placement: 'top' }
  ]);

  await page.locator('button:has-text("Measurement")').first().click();
  await page.locator('h3:has-text("Measurement Protocols")').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);
  const measurementSection = page.locator('div.mt-3.bg-gray-50.rounded-lg.p-4').first();
  await measurementSection.locator('button').first().click();
  await page.getByText(/Suggested parameters/i).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);
  await capture(page, 'test-setup-tab-measurement-annotated.png', [
    { locator: page.locator('button:has-text("Measurement")').first(), label: 'Tab: Measurement protocols', placement: 'bottom' },
    { locator: page.getByText(/Suggested parameters/i).first(), label: 'Use suggestions for quick start', placement: 'right' },
    { locator: page.getByText(/Add sensors first to map parameter values per sensor/i).first(), label: 'Sensor dependency warning', placement: 'top' }
  ]);

  await page.locator('button:has-text("Processing")').first().click();
  await page.locator('h3:has-text("Processing Protocols")').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);
  await capture(page, 'test-setup-tab-processing-annotated.png', [
    { locator: page.locator('button:has-text("Processing")').first(), label: 'Tab: Processing protocols', placement: 'bottom' },
    { locator: page.locator('h3:has-text("Processing Protocols")').first(), label: 'Define processing variants', placement: 'right' },
    { locator: page.getByText(/No processing protocols added yet/i).first(), label: 'Add first processing protocol', placement: 'top' }
  ]);

  const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
  if (await closeButton.count()) {
    await closeButton.click();
    await page.waitForTimeout(500);
  }
}

async function captureIsaSlides(page) {
  await gotoRoute(page, '/isaquestionnaire', page.getByText(/Project sessions/i));
  await page.getByRole('button', { name: /Select project/i }).first().click();
  await page.getByRole('heading', { name: /ISA Questionnaire Form/i }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1000);

  await page.getByRole('heading', { name: /^Introduction$/i }).first().waitFor({ state: 'visible', timeout: 10000 });
  await capture(page, 'isa-slide-01-introduction-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Introduction$/i }), label: 'Slide 1: Introduction', placement: 'right' },
    { locator: page.getByText(/With this Wizard it is easy to annotate/i).first(), label: 'Purpose and context', placement: 'top' },
    { locator: page.locator('button:has-text("Start")').last(), label: 'Go to next slide', placement: 'left' }
  ]);

  await clickNextSlide(page);
  await page.getByRole('heading', { name: /^Project Information$/i }).first().waitFor({ state: 'visible', timeout: 10000 });
  await capture(page, 'isa-slide-02-project-information-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Project Information$/i }), label: 'Slide 2: Project metadata', placement: 'right' },
    { locator: page.locator('label:has-text("Project Title")').first(), label: 'Core project identifier', placement: 'right' },
    { locator: page.locator('label:has-text("License")').first(), label: 'Select data license', placement: 'left' }
  ]);

  await clickNextSlide(page);
  await page.getByRole('heading', { name: /^Contacts$/i }).first().waitFor({ state: 'visible', timeout: 10000 });
  await capture(page, 'isa-slide-03-contacts-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Contacts$/i }).first(), label: 'Slide 3: Contributors', placement: 'right' },
    { locator: page.locator('button:has-text("Add Contact")').first(), label: 'Add contributor entries', placement: 'left' },
    { locator: page.getByText(/Contacts \(/i).first(), label: 'Contact collection', placement: 'top' }
  ]);

  await clickNextSlide(page);
  await page.getByRole('heading', { name: /^Publications$/i }).first().waitFor({ state: 'visible', timeout: 10000 });
  await capture(page, 'isa-slide-04-publications-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Publications$/i }).first(), label: 'Slide 4: Publications', placement: 'right' },
    { locator: page.locator('button:has-text("Add Publication")').first(), label: 'Add publication metadata', placement: 'left' },
    { locator: page.getByText(/Publications \(/i).first(), label: 'Publication collection', placement: 'top' }
  ]);

  await clickNextSlide(page);
  await page.getByRole('heading', { name: /^Experiment descriptions$/i }).first().waitFor({ state: 'visible', timeout: 10000 });
  await capture(page, 'isa-slide-05-experiment-descriptions-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Experiment descriptions$/i }), label: 'Slide 5: Experiments', placement: 'right' },
    { locator: page.locator('button:has-text("Simple View")').first(), label: 'Switch simple/grid views', placement: 'bottom' },
    { locator: page.locator('button:has-text("Add Experiment")').first(), label: 'Add experiment rows', placement: 'left' }
  ]);

  await clickNextSlide(page);
  await page.getByRole('heading', { name: /^Fault Specifications$/i }).first().waitFor({ state: 'visible', timeout: 10000 });
  await capture(page, 'isa-slide-06-fault-specifications-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Fault Specifications$/i }), label: 'Slide 6: Fault variables', placement: 'right' },
    { locator: page.getByText(/Suggested fault specifications/i).first(), label: 'Suggestion chips', placement: 'right' },
    { locator: page.locator('button:has-text("Add Fault Spec")').first(), label: 'Add custom fault variable', placement: 'left' }
  ]);

  await clickNextSlide(page);
  await page.getByRole('heading', { name: /^Operating Conditions$/i }).first().waitFor({ state: 'visible', timeout: 10000 });
  await capture(page, 'isa-slide-07-operating-conditions-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Operating Conditions$/i }), label: 'Slide 7: Operating conditions', placement: 'right' },
    { locator: page.getByText(/Suggested operating conditions/i).first(), label: 'Suggestion chips', placement: 'right' },
    { locator: page.locator('button:has-text("Add Op Condition")').first(), label: 'Add custom operating variable', placement: 'left' }
  ]);

  await clickNextSlide(page);
  await page.getByRole('heading', { name: /^Test Matrix$/i }).first().waitFor({ state: 'visible', timeout: 10000 });
  await capture(page, 'isa-slide-08-test-matrix-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Test Matrix$/i }), label: 'Slide 8: Variable mapping matrix', placement: 'right' },
    { locator: page.locator('button:has-text("Simple View")').first(), label: 'Switch mapping mode', placement: 'bottom' },
    { locator: page.getByText(/Fault Specifications/i).first(), label: 'Fault variable section', placement: 'top' }
  ]);

  await clickNextSlide(page);
  await page.getByRole('heading', { name: /^Raw Measurement Output$/i }).first().waitFor({ state: 'visible', timeout: 10000 });
  await capture(page, 'isa-slide-09-raw-measurement-output-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Raw Measurement Output$/i }), label: 'Slide 9: Raw output mapping', placement: 'right' },
    { locator: page.getByText(/Sensor Output Mapping/i).first(), label: 'Run-by-run sensor assignment', placement: 'right' },
    { locator: page.getByText(/Measurement Protocol/i).first(), label: 'Select protocol per study', placement: 'left' }
  ]);

  await clickNextSlide(page);
  await page.getByRole('heading', { name: /^Processing Protocol Output$/i }).first().waitFor({ state: 'visible', timeout: 10000 });
  await capture(page, 'isa-slide-10-processing-output-annotated.png', [
    { locator: page.getByRole('heading', { name: /^Processing Protocol Output$/i }), label: 'Slide 10: Processed output mapping', placement: 'right' },
    { locator: page.getByText(/^Studies$/i).first(), label: 'Select study/run context', placement: 'right' },
    { locator: page.getByText(/Processing Protocol/i).first(), label: 'Assign processing protocol', placement: 'left' }
  ]);
}

async function main() {
  await ensureOutputDir();
  const captureScope = (process.env.DOCS_CAPTURE_SCOPE || 'all').toLowerCase();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1200 }
  });
  const page = await context.newPage();

  try {
    if (captureScope === 'all' || captureScope === 'general') {
      await captureGeneralScreens(page);
    }
    if (captureScope === 'all' || captureScope === 'examples') {
      await captureExampleProjects(page);
    }
    if (captureScope === 'all' || captureScope === 'test-setups') {
      await captureTestSetupTabs(page);
    }
    if (captureScope === 'all' || captureScope === 'isa-slides') {
      await captureIsaSlides(page);
    }
    console.log('All annotated screenshots captured.');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
