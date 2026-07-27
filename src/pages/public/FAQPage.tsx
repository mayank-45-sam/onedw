import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { helpService } from '@/services/help.service';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState, ErrorState } from '@/components/common/States';
import { useMemo, useState } from 'react';

export default function FAQPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['faq'], queryFn: () => helpService.faq() });
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (f) => f.question.toLowerCase().includes(query.toLowerCase()) || f.answer.toLowerCase().includes(query.toLowerCase())
    );
  }, [data, query]);

  const categories = useMemo(() => Array.from(new Set(data?.map((f) => f.category) ?? [])), [data]);

  return (
    <div className="container py-10 md:py-14">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <HelpCircle className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold font-display md:text-4xl">Frequently asked questions</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Everything you need to know about booking, payments, and pros.</p>
        <div className="mx-auto mt-6 max-w-md">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions…" className="rounded-full" />
        </div>
      </motion.div>

      <div className="mx-auto max-w-3xl">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState title="Couldn't load FAQs" description="Please try again later." icon={<HelpCircle className="h-8 w-8" />} />
        ) : !filtered.length ? (
          <EmptyState title="No questions found" description={query ? `No FAQs match "${query}".` : 'No FAQs available yet.'} icon={<HelpCircle className="h-8 w-8" />} />
        ) : (
          <div className="space-y-8">
            {categories.map((cat) => {
              const items = filtered.filter((f) => f.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat}>
                  <h2 className="mb-3 font-semibold font-display">{cat}</h2>
                  <Accordion type="single" collapsible>
                    {items.map((f, i) => (
                      <AccordionItem key={f._id} value={`${cat}-${i}`}>
                        <AccordionTrigger><ChevronDown className="hidden" />{f.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
