'use client';

// Route interceptée : ouvre /reports/new dans un Dialog par-dessus la liste,
// SANS modifier ReportForm ni la liste. Chargement direct de l'URL => page pleine.
import { useRouter } from 'next/navigation';

import { RequireRole } from '@/lib/dashboard/guards';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Page from '@/src/ecom/pages/ReportForm.jsx';

export default function ReportNewModal() {
  const router = useRouter();
  return (
    <Dialog defaultOpen onOpenChange={(open) => { if (!open) router.back(); }}>
      <DialogContent className="p-0 gap-0 w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 text-left space-y-0.5">
          <DialogTitle className="text-[17px]">Nouveau rapport</DialogTitle>
          <DialogDescription>Données quotidiennes pour un produit</DialogDescription>
        </DialogHeader>
        <RequireRole requiredRole={['ecom_admin', 'ecom_closeuse']}>
          <Page embedded />
        </RequireRole>
      </DialogContent>
    </Dialog>
  );
}
