import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/Logo';
import { ROUTES } from '@/constants/routes';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center gradient-hero">
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }}>
        <Logo />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-10 text-7xl font-extrabold font-display gradient-text md:text-9xl"
      >
        404
      </motion.h1>
      <p className="mt-4 text-xl font-semibold font-display">Page not found</p>
      <p className="mt-2 max-w-md text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild variant="outline" className="gap-2 rounded-full">
          <Link to={ROUTES.home}><ArrowLeft className="h-4 w-4" /> Go home</Link>
        </Button>
        <Button asChild className="btn-glow gap-2 rounded-full">
          <Link to={ROUTES.services}><Search className="h-4 w-4" /> Browse services</Link>
        </Button>
      </div>
    </div>
  );
}
