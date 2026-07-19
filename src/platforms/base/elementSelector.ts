import { AppError } from '../../shared/errors/AppError';

function escapeCss(value: string): string {
  return CSS.escape(value);
}

function unique(element: HTMLElement, selector: string): boolean {
  try {
    return element.ownerDocument.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

const ATTRIBUTE_PRIORITY = [
  'data-message-author-role',
  'data-message-role',
  'data-author',
  'data-testid',
  'data-role',
  'data-speaker',
  'data-id',
  'aria-label',
  'aria-roledescription',
  'name',
  'role',
] as const;

const COLLECTION_ATTRIBUTE_PRIORITY = [
  'data-message-author-role',
  'data-message-role',
  'data-author',
  'data-role',
  'data-speaker',
  'data-testid',
  'aria-roledescription',
] as const;
const COLLECTION_ROLE_HINT =
  /\b(user|human|assistant|model|bot|prompt|query|response|answer)\b|用户|用戶|使用者|助手|模型|提问|提問|回答|回复|回覆/i;

function attributeSelector(
  element: HTMLElement,
  attributes: readonly string[] = ATTRIBUTE_PRIORITY,
): string | null {
  for (const attribute of attributes) {
    const value = element.getAttribute(attribute);
    if (value && value.length <= 100) {
      return `${element.localName}[${attribute}="${escapeCss(value)}"]`;
    }
  }
  return null;
}

function collectionAttributeSelector(element: HTMLElement): string | null {
  for (const attribute of COLLECTION_ATTRIBUTE_PRIORITY) {
    const value = element.getAttribute(attribute);
    if (value && value.length <= 100 && COLLECTION_ROLE_HINT.test(value)) {
      return `${element.localName}[${attribute}="${escapeCss(value)}"]`;
    }
  }
  return null;
}

export function createElementSelector(element: HTMLElement, collection = false): string {
  if (!collection && element.id) {
    const byId = `#${escapeCss(element.id)}`;
    if (unique(element, byId)) return byId;
  }

  if (collection) {
    let ancestor: HTMLElement | null = element;
    for (let depth = 0; ancestor && depth < 5; depth += 1) {
      const byAncestorAttribute = collectionAttributeSelector(ancestor);
      if (byAncestorAttribute) return byAncestorAttribute;
      ancestor = ancestor.parentElement;
    }
  }

  const byAttribute = collection
    ? collectionAttributeSelector(element)
    : attributeSelector(element, ATTRIBUTE_PRIORITY);
  if (byAttribute && (collection || unique(element, byAttribute))) return byAttribute;

  const classes = [...element.classList]
    .filter((name) => name.length > 1 && name.length < 80)
    .slice(0, 3);
  if (classes.length) {
    const byClass = `${element.localName}.${classes.map(escapeCss).join('.')}`;
    try {
      const count = element.ownerDocument.querySelectorAll(byClass).length;
      if ((collection && count > 0) || count === 1) return byClass;
    } catch {
      // Continue with an exact path.
    }
  }

  const segments: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== element.ownerDocument.body && segments.length < 7) {
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;
    const siblings = [...parent.children].filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.localName === current?.localName,
    );
    const index = siblings.indexOf(current) + 1;
    segments.unshift(`${current.localName}:nth-of-type(${index})`);
    const selector = `body > ${segments.join(' > ')}`;
    if (!collection && unique(element, selector)) return selector;
    current = parent;
  }
  throw new AppError('ELEMENT_SELECTOR_UNAVAILABLE', 'A unique selector could not be created.');
}
