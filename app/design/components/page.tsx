"use client";

import * as React from "react";
import { Bell, Check, Settings, User, LogOut, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="rounded-xl border bg-card p-6">{children}</div>
    </section>
  );
}

export default function ComponentsGallery() {
  const [dark, setDark] = React.useState(false);
  const [progress, setProgress] = React.useState(66);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <header className="mb-10 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-block h-6 w-6 rounded-md bg-primary" />
                <Badge variant="secondary">shadcn/ui · Scalor</Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Composants</h1>
              <p className="mt-1 text-muted-foreground">
                La bibliothèque installée, aux couleurs Scalor. Teste le mode sombre.
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setDark((v) => !v)} aria-label="Clair/sombre">
              {dark ? <Sun /> : <Moon />}
            </Button>
          </header>

          <Section title="Boutons">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primaire</Button>
              <Button variant="secondary">Secondaire</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Lien</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
            </div>
          </Section>

          <Section title="Badges & Alertes">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <div className="space-y-3">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Boutique connectée</AlertTitle>
                <AlertDescription>Ta boutique est synchronisée.</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <Bell className="h-4 w-4" />
                <AlertTitle>Attention</AlertTitle>
                <AlertDescription>Quota de commandes bientôt atteint.</AlertDescription>
              </Alert>
            </div>
          </Section>

          <Section title="Formulaire">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la boutique</Label>
                <Input id="name" placeholder="Zendospace" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat">Catégorie</Label>
                <Select>
                  <SelectTrigger id="cat">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mode">Mode</SelectItem>
                    <SelectItem value="beaute">Beauté</SelectItem>
                    <SelectItem value="maison">Maison</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" placeholder="Décris ta boutique…" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="terms" defaultChecked />
                <Label htmlFor="terms">Accepter les conditions</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="notif" defaultChecked />
                <Label htmlFor="notif">Notifications</Label>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <RadioGroup defaultValue="pro" className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="free" id="p-free" />
                    <Label htmlFor="p-free">Gratuit</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="pro" id="p-pro" />
                    <Label htmlFor="p-pro">Pro</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Objectif (%)</Label>
                <Slider defaultValue={[70]} max={100} step={1} />
              </div>
            </div>
          </Section>

          <Section title="Overlays">
            <div className="flex flex-wrap items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Ouvrir un dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvelle boutique</DialogTitle>
                    <DialogDescription>Renseigne les infos de base.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="d-name">Nom</Label>
                    <Input id="d-name" placeholder="Ma boutique" />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Annuler</Button>
                    </DialogClose>
                    <Button>Créer</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Menu déroulant</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem><User className="mr-2 h-4 w-4" />Profil</DropdownMenuItem>
                  <DropdownMenuItem><Settings className="mr-2 h-4 w-4" />Paramètres</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem><LogOut className="mr-2 h-4 w-4" />Déconnexion</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">Popover</Button>
                </PopoverTrigger>
                <PopoverContent>
                  <p className="text-sm text-muted-foreground">Contenu riche dans un portail.</p>
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon"><Bell /></Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>

              <Button variant="secondary" onClick={() => toast("Commande enregistrée", { description: "Zendospace · 1 240 €" })}>
                Toast
              </Button>
            </div>
          </Section>

          <Section title="Navigation">
            <Tabs defaultValue="apercu">
              <TabsList>
                <TabsTrigger value="apercu">Aperçu</TabsTrigger>
                <TabsTrigger value="ventes">Ventes</TabsTrigger>
                <TabsTrigger value="clients">Clients</TabsTrigger>
              </TabsList>
              <TabsContent value="apercu" className="pt-4 text-sm text-muted-foreground">
                Vue d’ensemble de la boutique.
              </TabsContent>
              <TabsContent value="ventes" className="pt-4 text-sm text-muted-foreground">
                Détail des ventes.
              </TabsContent>
              <TabsContent value="clients" className="pt-4 text-sm text-muted-foreground">
                Liste des clients.
              </TabsContent>
            </Tabs>

            <Separator className="my-6" />

            <Accordion type="single" collapsible>
              <AccordionItem value="a1">
                <AccordionTrigger>Comment fonctionne la livraison ?</AccordionTrigger>
                <AccordionContent>Expédition sous 48h, suivi inclus.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="a2">
                <AccordionTrigger>Puis-je changer de plan ?</AccordionTrigger>
                <AccordionContent>Oui, à tout moment depuis les paramètres.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          <Section title="Données & états">
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Profil</CardTitle>
                  <CardDescription>Utilisateur connecté</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">MK</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">Morgan K.</p>
                    <p className="text-xs text-muted-foreground">Super admin</p>
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button size="sm">Voir</Button>
                  <Button size="sm" variant="outline">Éditer</Button>
                </CardFooter>
              </Card>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Objectif mensuel</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setProgress((p) => Math.max(0, p - 10))}>-10</Button>
                    <Button size="sm" variant="outline" onClick={() => setProgress((p) => Math.min(100, p + 10))}>+10</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">#1042</TableCell>
                  <TableCell>Awa D.</TableCell>
                  <TableCell><Badge>Livrée</Badge></TableCell>
                  <TableCell className="text-right">240 €</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">#1043</TableCell>
                  <TableCell>Karim B.</TableCell>
                  <TableCell><Badge variant="secondary">En cours</Badge></TableCell>
                  <TableCell className="text-right">89 €</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">#1044</TableCell>
                  <TableCell>Fatou S.</TableCell>
                  <TableCell><Badge variant="destructive">Retour</Badge></TableCell>
                  <TableCell className="text-right">156 €</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Section>
        </div>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
