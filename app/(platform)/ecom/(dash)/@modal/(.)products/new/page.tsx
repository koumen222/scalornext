'use client';

// Route interceptée : ouvre /products/new dans un Dialog par-dessus la liste,
// SANS modifier ProductForm ni la liste. Chargement direct de l'URL => page pleine.
import { useRouter } from 'next/navigation';

import { RequireRole } from '@/lib/dashboard/guards';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Page from '@/src/ecom/pages/ProductForm.jsx';

export default function ProductNewModal() {
  const router = useRouter();
  return (
    <Dialog defaultOpen onOpenChange={(open) => { if (!open) router.back(); }}>
      <DialogContent className="p-0 gap-0 w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 text-left space-y-0.5">
          <DialogTitle className="text-[17px]">Nouveau produit</DialogTitle>
          <DialogDescription>Remplissez les champs ci-dessous</DialogDescription>
        </DialogHeader>
        <RequireRole requiredRole={'ecom_admin'}>
          <Page embedded />
        </RequireRole>
      </DialogContent>
    </Dialog>
  );
}
