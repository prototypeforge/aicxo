import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={`markdown-content ${className}`}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-2xl font-display font-bold text-white mt-6 mb-4 first:mt-0 border-b border-obsidian-700 pb-2">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-display font-bold text-white mt-5 mb-3 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold text-white mt-4 mb-2 first:mt-0">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-semibold text-obsidian-200 mt-3 mb-2 first:mt-0">
            {children}
          </h4>
        ),
        // Paragraphs
        p: ({ children }) => (
          <p className="text-obsidian-200 leading-relaxed mb-3 last:mb-0">
            {children}
          </p>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1.5 mb-4 text-obsidian-200 ml-2">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1.5 mb-4 text-obsidian-200 ml-2">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed pl-1">
            {children}
          </li>
        ),
        // Strong/Bold
        strong: ({ children }) => (
          <strong className="font-semibold text-white">
            {children}
          </strong>
        ),
        // Emphasis/Italic
        em: ({ children }) => (
          <em className="italic text-obsidian-300">
            {children}
          </em>
        ),
        // Code
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded bg-obsidian-800 text-sapphire-400 text-sm font-mono">
                {children}
              </code>
            );
          }
          return (
            <code className="block p-4 rounded-xl bg-obsidian-900 text-obsidian-200 text-sm font-mono overflow-x-auto mb-4">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="rounded-xl bg-obsidian-900 overflow-x-auto mb-4">
            {children}
          </pre>
        ),
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gold-500 pl-4 py-2 my-4 bg-gold-500/5 rounded-r-lg italic text-obsidian-300">
            {children}
          </blockquote>
        ),
        // Horizontal Rule
        hr: () => (
          <hr className="my-6 border-obsidian-700" />
        ),
        // Links
        a: ({ href, children }) => (
          <a 
            href={href} 
            className="text-sapphire-400 hover:text-sapphire-300 underline underline-offset-2 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-obsidian-800">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-obsidian-700">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="border-b border-obsidian-700">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left text-sm font-semibold text-white">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 text-sm text-obsidian-200">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

