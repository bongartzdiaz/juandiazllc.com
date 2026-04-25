---
slug: onboarding/pick-industry
lang: es
title: Elige tu sector
summary: Cómo la configuración de sector (filantropía / inmobiliaria / hospitality) reformula el dashboard y qué tipos de contacto / deal están disponibles.
tags: [onboarding, settings, industry]
related: [onboarding/welcome, onboarding/first-contact, onboarding/first-deal]
updated: 2026-04-25
---

# Elige tu sector

Philly es un solo CRM con tres "skins" sectoriales. La misma base
de datos respalda a todos; lo que cambia es qué secciones se
exponen en la sidebar, qué tipos de contacto + deal se ofrecen en
los selectores de formulario, y un puñado de KPIs específicos de
la vertical.

## Los tres sectores

- **Filantropía** — el predeterminado. Optimizado para operaciones
  sin ánimo de lucro: socios, donantes, beneficiarios,
  stakeholders; proyectos con objetivos ODS, métricas de impacto,
  subvenciones.
- **Inmobiliaria** — compradores, vendedores, inversores,
  inquilinos, propietarios; propiedades, listings, visitas,
  ofertas, transacciones, comisiones, informes CMA.
- **Hospitality** — huéspedes, proveedores, socios, personal;
  reservas, habitaciones, housekeeping, open houses, drip
  campaigns.

Puedes cambiar en cualquier momento desde `/settings` → industry.
Tus datos existentes no se ven afectados — solo la UI se
reorganiza.

## Lo que realmente cambia

| Configuración | Filantropía | Inmobiliaria | Hospitality |
| --- | --- | --- | --- |
| Tipos de contacto por defecto | partner / donor / stakeholder / beneficiary | buyer / seller / tenant / landlord / investor | guest / vendor / partner / staff |
| Pipeline por defecto | Prospect → Engaged → Cultivated → Solicited → Stewarded | Lead → Showing → Offer → Under contract → Closed | Inquiry → Hold → Confirmed → Checked-in → Checked-out |
| Tarjetas KPI en `/projects` | Active / Total Budget / Budget Used | Active Listings / Portfolio Value / Avg Price | Available / Avg Nightly Rate / Occupancy |
| Adiciones a la sidebar | Impact, Donors, Grants | Properties, Showings, Offers, Open Houses, Commissions, Transactions, CMA | Rooms, Open Houses, Drip Campaigns |
| `/projects` se convierte en | Projects | Properties | Venues |

El modelo de datos compartido es agnóstico al sector. Un `Contact`
es un `Contact` independientemente del sector; el selector de tipo
es una preocupación de capa de presentación.

## Eligiendo el correcto

Si eres una organización sin ánimo de lucro, caridad, fundación o
cualquier organización con misión: **Filantropía**.

Si listas, vendes o alquilas propiedades: **Inmobiliaria**.

Si gestionas un hotel, B&B, espacio para eventos o alquileres a
corto plazo: **Hospitality**.

Si no eres ninguno de esos, por defecto **Filantropía** — las
etiquetas de tipo son las más genéricas y puedes renombrarlas o
extenderlas más tarde si es necesario.

## Cambiando más tarde

Cambiar de un sector a otro:

1. **No elimina datos.** Cada contacto, deal, proyecto existente
   permanece en la base de datos.
2. **No renombra filas existentes.** Un contacto que guardaste
   como `donor` todavía tiene `type: "donor"` después de cambiar a
   inmobiliaria — simplemente no aparece en las nuevas píldoras
   de filtro de tipo. Edita el tipo desde la página de detalle del
   contacto si quieres que reaparezca bajo las etiquetas del nuevo
   sector.
3. **Reorganiza KPIs.** Las tarjetas del dashboard se renderizan
   contra las métricas de la nueva vertical en la próxima carga.

## Organizaciones multi-sector

Hoy, una organización tiene exactamente un sector a la vez. Si
genuinamente operas dos verticales (por ejemplo, una fundación
que también opera una sede de hospitality), la configuración más
limpia es dos organizaciones — una por sector — bajo el mismo
admin. Los informes cross-org son una característica separada en
la roadmap.

## A dónde ir después

- **[Añade tu primer contacto](onboarding/first-contact)** — ve
  el selector de tipo en acción.
- **[Añade tu primer deal](onboarding/first-deal)** — ve la
  pipeline por defecto para tu sector.
- **[Settings overview](features/settings)** — referencia
  completa para el árbol de settings.
