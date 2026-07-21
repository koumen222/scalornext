"use client";

import * as React from "react";
import { Moon, Sun, Check, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

type Swatch = { name: string; hex: string; className: string; fg?: string };

const brand: Swatch[] = [
  { name: "Primary — vert", hex: "#0F6B4F", className: "bg-primary", fg: "text-primary-foreground" },
  { name: "Secondary — sable", hex: "#D8CFC4", className: "bg-secondary", fg: "text-secondary-foreground" },
  { name: "Accent — sable clair", hex: "#EDE8E2", className: "bg-accent", fg: "text-accent-foreground" },
  { name: "Cuivre (accent)", hex: "#C56A2D", className: "bg-brand-copper", fg: "text-white" },
  { name: "Destructive", hex: "rouge", className: "bg-destructive", fg: "text-destructive-foreground" },
  { name: "Muted", hex: "#f3f4f6", className: "bg-muted", fg: "text-muted-foreground" },
];

const charts: Swatch[] = [
  { name: "chart-1", hex: "#0F6B4F", className: "bg-chart-1" },
  { name: "chart-2", hex: "#C56A2D", className: "bg-chart-2" },
  { name: "chart-3", hex: "#14855F", className: "bg-chart-3" },
  { name: "chart-4", hex: "#C4B8A9", className: "bg-chart-4" },
  { name: "chart-5", hex: "graphite", className: "bg-chart-5" },
];

export default function DesignSystemPage() {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-6 w-6 rounded-md bg-primary" />
              <Badge variant="secondary">shadcn/ui · Scalor</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Scalor Design System</h1>
            <p className="mt-1 text-muted-foreground">
              Vert #0F6B4F en primaire · cuivre & sable en accents · rayon 0.5rem
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setDark((v) => !v)} aria-label="Basculer clair/sombre">
            {dark ? <Sun /> : <Moon />}
          </Button>
        </header>

        {/* Palette */}
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Palette
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {brand.map((s) => (
              <div key={s.name} className="overflow-hidden rounded-lg border">
                <div className={`flex h-20 items-end p-3 ${s.className} ${s.fg ?? ""}`}>
                  <span className="text-xs font-medium">{s.name}</span>
                </div>
                <div className="flex items-center justify-between bg-card px-3 py-2 text-xs text-muted-foreground">
                  <span>{s.className}</span>
                  <span className="font-mono">{s.hex}</span>
                </div>
              </div>
            ))}
          </div>

          <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Graphiques
          </h3>
          <div className="flex flex-wrap gap-3">
            {charts.map((c) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className={`h-8 w-8 rounded-md ${c.className}`} />
                <span className="text-xs text-muted-foreground">{c.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Boutons */}
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Boutons
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primaire</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Lien</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button>
              Continuer <ArrowRight />
            </Button>
          </div>
        </section>

        {/* Cartes */}
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cartes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Boutique connectée</CardTitle>
                <CardDescription>Vue d’ensemble de la performance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ventes du jour</span>
                  <span className="font-semibold">1 240 €</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Check className="size-4" /> Objectif atteint
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm">Voir</Button>
                <Button size="sm" variant="outline">Exporter</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Créer un compte</CardTitle>
                <CardDescription>Rejoins la plateforme Scalor.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Nom de la boutique" />
                <Input type="email" placeholder="Email" />
                <div className="flex gap-2">
                  <Badge>Nouveau</Badge>
                  <Badge variant="secondary">Pro</Badge>
                  <Badge variant="outline">Beta</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Commencer</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Typographie */}
        <section className="mb-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Typographie
          </h2>
          <div className="rounded-lg border bg-card p-6">
            <h1 className="text-4xl font-bold tracking-tight">Titre H1 — Satoshi</h1>
            <h2 className="mt-2 text-2xl font-semibold">Titre H2</h2>
            <p className="mt-3 max-w-prose text-foreground">
              Corps de texte sur fond neutre. La primaire Scalor{" "}
              <span className="font-semibold text-primary">#0F6B4F</span> sert aux actions et liens.
            </p>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              Texte secondaire (muted-foreground) pour les informations de moindre importance.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
