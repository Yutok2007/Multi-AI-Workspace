import { AppError, CapabilityUnavailableError } from '../../shared/errors/AppError';

function normalizedControlText(element: HTMLElement): string {
  return (element.getAttribute('aria-label') || element.innerText || element.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function modelNameMatches(value: string, model: string): boolean {
  return value.trim().toLocaleLowerCase() === model.trim().toLocaleLowerCase();
}

function isVisibleControl(element: HTMLElement): boolean {
  if (!element.isConnected || element.closest('[hidden], [aria-hidden="true"]')) return false;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return style?.display !== 'none' && style?.visibility !== 'hidden';
}

function findExactModelOptions(document_: Document, model: string): HTMLElement[] {
  return [...document_.querySelectorAll('[role="option"], [role="menuitemradio"]')].filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement &&
      isVisibleControl(element) &&
      modelNameMatches(normalizedControlText(element), model),
  );
}

async function waitForExactModelOption(
  document_: Document,
  model: string,
  timeoutMs = 1_500,
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    let timer = 0;
    const finish = (option?: HTMLElement, error?: Error) => {
      window.clearTimeout(timer);
      observer.disconnect();
      if (option) resolve(option);
      else reject(error ?? new AppError('MODEL_NOT_FOUND', `Model “${model}” was not found.`));
    };
    const inspect = () => {
      const options = findExactModelOptions(document_, model);
      if (options.length === 1) finish(options[0]);
      else if (options.length > 1) {
        finish(
          undefined,
          new AppError('MODEL_SELECTION_AMBIGUOUS', `More than one model matched “${model}”.`),
        );
      }
    };
    const observer = new MutationObserver(inspect);
    observer.observe(document_.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    timer = window.setTimeout(() => finish(), timeoutMs);
    inspect();
  });
}

export async function selectBoundModel(
  control: HTMLElement | null,
  modelInput: string,
): Promise<{ model: string }> {
  const model = modelInput.trim();
  if (!model) throw new AppError('DEFAULT_MODEL_INVALID', 'The default model is empty.');
  if (!control) throw new CapabilityUnavailableError('model.select');

  if (control instanceof HTMLSelectElement) {
    const matches = [...control.options].filter(
      (option) =>
        modelNameMatches(option.value, model) || modelNameMatches(option.textContent ?? '', model),
    );
    if (matches.length === 0) {
      throw new AppError('MODEL_NOT_FOUND', `Model “${model}” was not found.`);
    }
    if (matches.length > 1) {
      throw new AppError('MODEL_SELECTION_AMBIGUOUS', `More than one model matched “${model}”.`);
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    setter?.call(control, matches[0].value);
    control.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    control.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    if (control.value !== matches[0].value) {
      throw new AppError('MODEL_SELECTION_UNVERIFIED', 'The selected model could not be verified.');
    }
    return { model: matches[0].textContent?.trim() || matches[0].value };
  }

  let options = findExactModelOptions(control.ownerDocument, model);
  if (options.length === 0) {
    control.click();
    options = [await waitForExactModelOption(control.ownerDocument, model)];
  }
  if (options.length !== 1) {
    throw new AppError('MODEL_SELECTION_AMBIGUOUS', `More than one model matched “${model}”.`);
  }
  const option = options[0];
  option.click();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  const visibleSelection = normalizedControlText(control);
  const ariaSelected = option.getAttribute('aria-selected') === 'true';
  if (!ariaSelected && !modelNameMatches(visibleSelection, model)) {
    throw new AppError('MODEL_SELECTION_UNVERIFIED', 'The selected model could not be verified.');
  }
  return { model: normalizedControlText(option) || model };
}
