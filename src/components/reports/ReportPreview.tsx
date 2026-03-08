import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReportPreviewProps {
  content: string;
}

export const ReportPreview = ({ content }: ReportPreviewProps) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea className="h-[550px]">
          <div className="p-6 md:p-8 prose prose-sm dark:prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-bold
            prose-h1:text-2xl prose-h1:border-b prose-h1:border-border prose-h1:pb-3 prose-h1:mb-4
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-strong:text-foreground
            prose-li:text-muted-foreground
            prose-ul:my-2 prose-ol:my-2
            prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:bg-muted/30 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4
            prose-hr:border-border
            prose-table:border-border
            prose-th:text-foreground prose-th:bg-muted/50 prose-th:p-2 prose-th:text-left
            prose-td:p-2 prose-td:border-border
          ">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
