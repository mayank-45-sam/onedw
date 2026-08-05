import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { LifeBuoy, Mail, MessageSquare, Phone, Send, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SectionHeader } from '@/components/common/SectionHeader';
import { supportService } from '@/services/support.service';
import { ApiError } from '@/lib/apiError';

const scrollToContact = () => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });

const SUPPORT_EMAIL = 'onedw@gmail.com';

const copyEmail = async () => {
  try {
    await navigator.clipboard.writeText(SUPPORT_EMAIL);
  } catch {
    const input = document.createElement('textarea');
    input.value = SUPPORT_EMAIL;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
  toast.success(`${SUPPORT_EMAIL} copied to clipboard`);
};

const emailUs = () => {
  copyEmail();
  window.location.href = `mailto:${SUPPORT_EMAIL}`;
};

const SUPPORT_CHANNELS = [
  { icon: MessageSquare, title: 'Live chat', description: 'Chat with our team 24/7', action: 'Start chat', href: undefined, onClick: scrollToContact },
  { icon: Mail, title: 'Email us', description: SUPPORT_EMAIL, action: 'Send email', href: `mailto:${SUPPORT_EMAIL}`, onClick: copyEmail },
  { icon: Phone, title: 'Call us', description: '+1 800 555 0000', action: 'Call now', href: 'tel:+18005550000', onClick: undefined },
];

export default function HelpCenterPage() {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<{ name: string; email: string; subject: string; message: string }>();

  const onSubmit = form.handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      await supportService.contact({
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      });
      toast.success('Message sent successfully! Our team will get back to you.');
      form.reset();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not send your message. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="container py-10 md:py-14">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <LifeBuoy className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold font-display md:text-4xl">How can we help?</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Browse common questions or reach out — our team is here 24/7.</p>
      </motion.div>

      <div className="mb-12 grid gap-4 sm:grid-cols-3">
        {SUPPORT_CHANNELS.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card-premium card-premium-hover p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-semibold font-display">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
                <a href={c.href} onClick={(e) => {
                  if (c.href) e.preventDefault();
                  if (c.onClick) c.onClick();
                  if (c.href) window.location.href = c.href;
                }}>{c.action}</a>
              </Button>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div id="contact-form" className="card-premium p-6 md:p-8">
          <SectionHeader title="Send us a message" subtitle="We typically reply within a few hours." className="mb-6" />
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" {...form.register('name', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...form.register('email', { required: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="How can we help?" {...form.register('subject', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={5} placeholder="Describe your issue…" {...form.register('message', { required: true })} />
            </div>
            <Button type="submit" className="btn-glow w-full gap-2 rounded-xl" disabled={submitting}>
              {submitting ? 'Sending…' : <>Send message <Send className="h-4 w-4" /></>}
            </Button>
          </form>
        </div>

        <div className="card-premium p-6 md:p-8">
          <SectionHeader title="Quick answers" subtitle="Tap a question to expand." className="mb-6" />
          <Accordion type="single" collapsible>
            {[
              { q: 'How do I book a service?', a: 'Pick a service, describe your problem, choose a pro, select a time, and pay. You will get a confirmation instantly.' },
              { q: 'How do payments work?', a: 'You can pay by wallet, card, UPI, or cash. Payments are held securely and released to the pro after the job is done.' },
              { q: 'Can I cancel a booking?', a: 'Yes, you can cancel for free up to 2 hours before the scheduled time. Later cancellations may incur a small fee.' },
              { q: 'Are workers verified?', a: 'Every pro is background-checked, identity-verified, and rated by real customers before joining OneDW.' },
              { q: 'How do refunds work?', a: 'If a job is cancelled or unsatisfactory, refunds are processed to your wallet or original payment method within 3-5 days.' },
            ].map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left"><ChevronDown className="hidden" />{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
