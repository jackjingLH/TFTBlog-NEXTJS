import Image from 'next/image';

interface MarkdownContentProps {
  markdown: string;
}

function slugifyHeading(text: string) {
  return text
    .replace(/[`*_#]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|#[\p{L}\p{N}_-]+)/gu);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="break-words rounded bg-gray-100 px-2 py-0.5 text-sm text-accent font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('#')) {
      return (
        <span key={index} className="mr-1 inline-flex break-words text-sm text-accent">
          {part}
        </span>
      );
    }

    return part;
  });
}

export default function MarkdownContent({ markdown }: MarkdownContentProps) {
  const lines = markdown
    .replace(/<!--\s*tft-page:\s*\d+\s*-->/g, '\n---page---\n')
    .split(/\r?\n/);

  return (
    <div className="min-w-0 space-y-4 overflow-hidden text-base leading-7 text-text-primary">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line || line === '---') return null;

        if (line === '---page---') {
          return <div key={index} className="h-px w-full bg-border my-8" />;
        }

        const heading = line.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
          const level = heading[1].length;
          const text = heading[2].trim();
          const id = slugifyHeading(text);
          const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';

          return (
            <Tag
              key={index}
              id={id}
              className={
                level === 1
                  ? 'break-words pt-2 text-3xl font-bold leading-tight text-text-primary sm:text-4xl'
                  : level === 2
                    ? 'scroll-mt-24 break-words pt-6 text-2xl font-bold leading-tight text-text-primary'
                    : 'scroll-mt-24 break-words pt-4 text-xl font-semibold text-text-primary'
              }
            >
              {text}
            </Tag>
          );
        }

        const obsidianImage = line.match(/^!\[\[([^\]]+)\]\]$/)?.[1];
        const markdownImage = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        const src = obsidianImage || markdownImage?.[2];

        if (obsidianImage || markdownImage) {
          const alt = markdownImage?.[1] || obsidianImage || '攻略图片';

          if (!src) {
            return (
              <div key={index} className="rounded-lg border border-dashed border-border bg-surface px-4 py-5 text-sm text-text-muted">
                图片待整理：{alt}
              </div>
            );
          }

          return (
            <figure key={index} className="my-6 max-w-full overflow-hidden rounded-lg border border-border bg-surface">
              <Image
                src={src.startsWith('http') ? src : src}
                alt={alt}
                width={900}
                height={520}
                className="h-auto w-full max-w-full object-contain"
                unoptimized
              />
            </figure>
          );
        }

        if (line.startsWith('封面：')) return null;

        if (line.startsWith('标签：')) {
          return (
            <p key={index} className="rounded-lg border border-accent-light bg-accent-light/30 px-4 py-3 text-sm leading-6 text-text-primary">
              {renderInline(line)}
            </p>
          );
        }

        if (line.startsWith('来源：')) {
          return (
            <p key={index} className="pt-4 text-sm text-text-muted">
              {line}
            </p>
          );
        }

        return <p key={index} className="break-words text-text-secondary">{renderInline(line)}</p>;
      })}
    </div>
  );
}
