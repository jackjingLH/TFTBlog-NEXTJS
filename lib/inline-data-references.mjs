function isRegularChampion(reference) {
  return (
    reference?.type === 'champion' &&
    typeof reference.name === 'string' &&
    reference.name.trim() &&
    Number.isInteger(reference.cost) &&
    reference.cost >= 1 &&
    reference.cost <= 5 &&
    Array.isArray(reference.traits) &&
    reference.traits.length > 0 &&
    !reference.traits.includes('特殊对象')
  );
}

function isNamedReference(reference, type) {
  return reference?.type === type && typeof reference.name === 'string' && reference.name.trim();
}

export const INLINE_REFERENCE_CARD_METRICS = {
  width: 280,
  height: 176,
  gap: 8,
  margin: 12,
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildInlineReferenceIndex({ champions = [], traits = [], items = [], augments = [] } = {}) {
  const championReferences = champions.filter(isRegularChampion);
  const traitReferences = traits.filter((reference) => isNamedReference(reference, 'trait'));
  const itemReferences = items.filter((reference) => isNamedReference(reference, 'item'));
  const augmentReferences = augments.filter((reference) => isNamedReference(reference, 'augment'));
  const references = [...championReferences, ...traitReferences, ...itemReferences, ...augmentReferences];
  const types = [
    championReferences.length ? 'champion' : null,
    traitReferences.length ? 'trait' : null,
    itemReferences.length ? 'item' : null,
    augmentReferences.length ? 'augment' : null,
  ].filter(Boolean);
  const referencesByName = new Map();

  for (const reference of references) {
    if (!referencesByName.has(reference.name)) {
      referencesByName.set(reference.name, reference);
    }
  }

  const names = [...referencesByName.keys()].sort((left, right) => right.length - left.length);
  const pattern = names.length ? new RegExp(names.map(escapeRegExp).join('|'), 'gu') : null;

  return {
    types,
    references,
    referencesByName,
    pattern,
  };
}

function referenceKey(reference) {
  return `${reference?.type || 'unknown'}:${reference?.id || reference?.name || ''}`;
}

export function splitTextByInlineReferences(text, index, options = {}) {
  if (!text || !index?.pattern) {
    return [{ text }];
  }

  const segments = [];
  let cursor = 0;
  const seenReferenceIds = options.seenReferenceIds;

  for (const match of text.matchAll(index.pattern)) {
    const matchedText = match[0];
    const start = match.index ?? 0;
    const reference = index.referencesByName.get(matchedText);
    const key = referenceKey(reference);

    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start) });
    }

    if (reference && seenReferenceIds?.has(key)) {
      segments.push({ text: matchedText });
    } else {
      if (reference && seenReferenceIds) {
        seenReferenceIds.add(key);
      }
      segments.push({
        text: matchedText,
        reference,
      });
    }
    cursor = start + matchedText.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments.length ? segments : [{ text }];
}

function shouldSkipMarkdownLine(line) {
  const trimmed = String(line || '').trim();
  return (
    !trimmed ||
    /^#{1,6}\s+/.test(trimmed) ||
    trimmed.startsWith('标签：') ||
    trimmed.startsWith('来源：') ||
    trimmed.startsWith('封面：') ||
    /^!\[\[([^\]]+)\]\]$/.test(trimmed) ||
    /^!\[([^\]]*)\]\(([^)]+)\)$/.test(trimmed)
  );
}

function splitPlainToken(text, index, kind = 'text', options = {}) {
  return splitTextByInlineReferences(text, index, options).map((segment) => ({
    kind: segment.reference ? (kind === 'strong' ? 'strong-reference' : 'reference') : kind,
    text: segment.text,
    reference: segment.reference,
  }));
}

function pushToken(tokens, token) {
  const previous = tokens[tokens.length - 1];
  if (previous && !previous.reference && !token.reference && previous.kind === token.kind) {
    previous.text += token.text;
    return;
  }
  tokens.push(token);
}

export function splitMarkdownLineForInlineReferences(line, index, options = {}) {
  if (shouldSkipMarkdownLine(line)) {
    return {
      tokens: [{ kind: 'text', text: String(line || '') }],
      inlineReferenceCount: 0,
    };
  }

  const parts = String(line).split(/(\*\*[^*]+\*\*|`[^`]+`|#[\p{L}\p{N}_-]+)/gu);
  const tokens = [];

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      for (const token of splitPlainToken(part.slice(2, -2), index, 'strong', options)) {
        pushToken(tokens, token);
      }
      continue;
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      pushToken(tokens, { kind: 'code', text: part.slice(1, -1) });
      continue;
    }

    if (part.startsWith('#')) {
      pushToken(tokens, { kind: 'hashtag', text: part });
      continue;
    }

    for (const token of splitPlainToken(part, index, 'text', options)) {
      pushToken(tokens, token);
    }
  }

  return {
    tokens,
    inlineReferenceCount: tokens.filter((token) => token.reference).length,
  };
}

export function createInlineReferenceLoader({ fetcher } = {}) {
  if (typeof fetcher !== 'function') {
    throw new TypeError('createInlineReferenceLoader requires a fetcher function');
  }

  const cache = new Map();

  return {
    load(type) {
      if (!cache.has(type)) {
        cache.set(type, Promise.resolve().then(() => fetcher(type)));
      }
      return cache.get(type);
    },
    clear(type) {
      if (type) {
        cache.delete(type);
        return;
      }
      cache.clear();
    },
  };
}

export function getFloatingReferenceCardPosition({ anchorRect, viewport, card, gap = 8, margin = 12 }) {
  const maxLeft = Math.max(margin, viewport.width - card.width - margin);
  const left = Math.min(Math.max(anchorRect.left, margin), maxLeft);
  const hasBottomSpace = anchorRect.bottom + gap + card.height <= viewport.height - margin;

  if (hasBottomSpace) {
    return {
      left,
      top: anchorRect.bottom + gap,
      placement: 'bottom',
    };
  }

  return {
    left,
    top: Math.max(margin, anchorRect.top - gap - card.height),
    placement: 'top',
  };
}

export function reduceInlineReferenceInteraction(current, event) {
  if (!event || event.kind === 'close') {
    return null;
  }

  if (event.kind === 'hover-leave') {
    return current?.locked ? current : null;
  }

  if (event.kind === 'lock') {
    return {
      reference: event.reference,
      rect: event.rect,
      locked: true,
      lockedBy: 'hover',
    };
  }

  if (event.kind === 'activate') {
    if (
      event.locked &&
      current?.locked &&
      current.lockedBy !== 'hover' &&
      current.reference?.id === event.reference?.id
    ) {
      return null;
    }

    return {
      reference: event.reference,
      rect: event.rect,
      locked: Boolean(event.locked),
      lockedBy: event.locked ? 'manual' : 'hover',
    };
  }

  return current || null;
}
