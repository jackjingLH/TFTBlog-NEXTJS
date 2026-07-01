declare module '@/lib/inline-data-references.mjs' {
  export type InlineDataReference = {
    type: 'champion' | 'trait' | 'item' | 'augment';
    id: string;
    slug?: string;
    name: string;
    imageUrl?: string;
    cost?: number | null;
    traits?: string[];
    skill?: {
      name?: string;
      type?: string;
      detail?: string;
      imageUrl?: string;
    };
    description?: string;
    levels?: Array<{ threshold: number; effect: string }>;
    champions?: Array<{ id: string; slug?: string; name: string; cost?: number | null; imageUrl?: string }>;
    category?: string;
    categoryLabel?: string;
    effectText?: string;
    rules?: string[];
    formula?: Array<{ id: string; name: string; imageUrl?: string; unresolved?: boolean }>;
    tier?: string;
    tierLabel?: string;
  };

  export type InlineReferenceSegment = {
    text: string;
    reference?: InlineDataReference;
  };

  export type InlineReferenceToken = {
    kind: 'text' | 'strong' | 'reference' | 'strong-reference' | 'code' | 'hashtag';
    text: string;
    reference?: InlineDataReference;
  };

  export type InlineReferenceIndex = {
    types: Array<'champion' | 'trait' | 'item' | 'augment'>;
    references: InlineDataReference[];
    referencesByName: Map<string, InlineDataReference>;
    pattern: RegExp | null;
  };

  export const INLINE_REFERENCE_CARD_METRICS: {
    width: number;
    height: number;
    gap: number;
    margin: number;
  };

  export function buildInlineReferenceIndex(options?: {
    champions?: InlineDataReference[];
    traits?: InlineDataReference[];
    items?: InlineDataReference[];
    augments?: InlineDataReference[];
  }): InlineReferenceIndex;

  export function splitTextByInlineReferences(text: string, index?: InlineReferenceIndex | null): InlineReferenceSegment[];
  export function splitTextByInlineReferences(
    text: string,
    index?: InlineReferenceIndex | null,
    options?: { seenReferenceIds?: Set<string> },
  ): InlineReferenceSegment[];

  export function splitMarkdownLineForInlineReferences(
    line: string,
    index?: InlineReferenceIndex | null,
    options?: { seenReferenceIds?: Set<string> },
  ): {
    tokens: InlineReferenceToken[];
    inlineReferenceCount: number;
  };

  export function createInlineReferenceLoader<T = unknown>(options: {
    fetcher: (type: string) => Promise<T[]> | T[];
  }): {
    load(type: string): Promise<T[]>;
    clear(type?: string): void;
  };

  export function getFloatingReferenceCardPosition(options: {
    anchorRect: { left: number; top: number; bottom: number };
    viewport: { width: number; height: number };
    card: { width: number; height: number };
    gap?: number;
    margin?: number;
  }): {
    left: number;
    top: number;
    placement: 'top' | 'bottom';
  };

  export function reduceInlineReferenceInteraction(
    current: {
      reference: InlineDataReference;
      rect: { left: number; top: number; bottom: number };
      locked: boolean;
      lockedBy?: 'hover' | 'manual';
    } | null,
    event:
      | { kind: 'close' }
      | { kind: 'hover-leave' }
      | {
          kind: 'lock';
          reference: InlineDataReference;
          rect: { left: number; top: number; bottom: number };
        }
      | {
          kind: 'activate';
          reference: InlineDataReference;
          rect: { left: number; top: number; bottom: number };
          locked: boolean;
        },
  ): {
    reference: InlineDataReference;
    rect: { left: number; top: number; bottom: number };
    locked: boolean;
    lockedBy?: 'hover' | 'manual';
  } | null;
}
