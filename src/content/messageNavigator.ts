import { findScrollableAncestor } from '../shared/utils/messageScroll';

const MIN_RAIL_PERCENT = 1;
const MAX_RAIL_PERCENT = 99;
const MAX_RAIL_GAP_PERCENT = 6;

export interface MessageRailMeasurement {
  topPercent: number;
  viewportCenter: number;
}

function clampRailPercent(value: number): number {
  return Math.min(MAX_RAIL_PERCENT, Math.max(MIN_RAIL_PERCENT, value));
}

export function measureMessageRailPosition(
  element: HTMLElement,
  documentHeight: number,
): MessageRailMeasurement {
  const rect = element.getBoundingClientRect();
  const scrollContainer = findScrollableAncestor(element);
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const contentTop = rect.top - containerRect.top + scrollContainer.scrollTop;
    const contentHeight = Math.max(scrollContainer.scrollHeight, 1);
    return {
      topPercent: clampRailPercent((contentTop / contentHeight) * 100),
      viewportCenter:
        containerRect.top + Math.max(containerRect.height, scrollContainer.clientHeight) / 2,
    };
  }
  return {
    topPercent: clampRailPercent(
      ((rect.top + (element.ownerDocument.defaultView?.scrollY ?? 0)) /
        Math.max(documentHeight, 1)) *
        100,
    ),
    viewportCenter: (element.ownerDocument.defaultView?.innerHeight ?? 0) / 2,
  };
}

export function spreadRailPercentages(values: number[]): number[] {
  if (values.length <= 1) return values.map(clampRailPercent);
  const gap = Math.min(
    MAX_RAIL_GAP_PERCENT,
    (MAX_RAIL_PERCENT - MIN_RAIL_PERCENT) / (values.length - 1),
  );
  const result: number[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const minimum = MIN_RAIL_PERCENT + index * gap;
    const maximum = MAX_RAIL_PERCENT - (values.length - index - 1) * gap;
    const natural = Math.min(maximum, Math.max(minimum, clampRailPercent(values[index])));
    result.push(index ? Math.max(natural, result[index - 1] + gap) : natural);
  }
  return result;
}
