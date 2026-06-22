import Image from 'next/image';

interface MarkdownContentProps {
  content: string;
  slug: string;
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
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="break-words rounded bg-white/8 px-1.5 py-0.5 text-[0.92em] text-emerald-200">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('#')) {
      return (
        <span key={index} className="mr-1 inline-flex break-words text-[0.92em] text-cyan-200/90">
          {part}
        </span>
      );
    }

    return part;
  });
}

function imageSrc(slug: string, value: string) {
  const cleanValue = value.split('|')[0].trim();
  if (/^https?:\/\//.test(cleanValue) || cleanValue.startsWith('/')) {
    return cleanValue;
  }
  if (cleanValue.startsWith('..')) {
    return null;
  }
  return `/guides/${slug}/${encodeURIComponent(cleanValue).replace(/%2F/g, '/')}`;
}

export default function MarkdownContent({ content, slug }: MarkdownContentProps) {
  const lines = content
    .replace(/<!--\s*tft-page:\s*\d+\s*-->/g, '\n---page---\n')
    .split(/\r?\n/);

  return (
    <div className="min-w-0 space-y-5 overflow-hidden text-[16px] leading-8 text-slate-200">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line || line === '---') return null;

        if (line === '---page---') {
          return <div key={index} className="h-px w-full bg-white/10" />;
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
                  ? 'break-words pt-2 text-[1.75rem] font-bold leading-tight text-white sm:text-3xl'
                  : level === 2
                    ? 'scroll-mt-24 break-words pt-5 text-[1.45rem] font-bold leading-tight text-white sm:text-2xl'
                    : 'scroll-mt-24 break-words pt-3 text-xl font-semibold text-white'
              }
            >
              {text}
            </Tag>
          );
        }

        const obsidianImage = line.match(/^!\[\[([^\]]+)\]\]$/)?.[1];
        const markdownImage = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        const src = obsidianImage ? imageSrc(slug, obsidianImage) : markdownImage ? imageSrc(slug, markdownImage[2]) : null;

        if (obsidianImage || markdownImage) {
          const alt = markdownImage?.[1] || obsidianImage || '攻略图片';

          if (!src) {
            return (
              <div key={index} className="rounded-lg border border-dashed border-white/15 bg-white/[0.04] px-4 py-5 text-sm text-slate-400">
                图片待整理：{alt}
              </div>
            );
          }

          return (
            <figure key={index} className="max-w-full overflow-hidden rounded-lg border border-white/10 bg-slate-950">
              <Image
                src={src}
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
            <p key={index} className="rounded-lg border border-cyan-300/15 bg-cyan-300/8 px-4 py-3 text-sm leading-6 text-cyan-100">
              {renderInline(line)}
            </p>
          );
        }

        if (line.startsWith('来源：')) {
          return (
            <p key={index} className="pt-4 text-sm text-slate-500">
              {line}
            </p>
          );
        }

        return <p key={index} className="break-words">{renderInline(line)}</p>;
      })}
    </div>
  );
}
