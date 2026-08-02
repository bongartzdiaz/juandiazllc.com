// Cal.com-boekingslinks.
//
// Eén plek, omdat dezelfde link in fase 3 ook onder artikelpagina's komt. Een
// URL die op twee plaatsen los wordt ingetypt loopt vroeg of laat uiteen, en
// een kapotte boekingslink is stiller dan een kapotte pagina — je merkt hem
// pas als iemand níét boekt.
//
// Geverifieerd op 2026-08-02: beide geven HTTP 200.
export const BOOKING_15MIN = "https://cal.com/juandiazllc/15min";

// Er bestaat ook een variant van 30 minuten (cal.com/juandiazllc/30min). Die
// staat hier bewust NIET, want de site kent één primaire actie: een kwartier.
// Twee knoppen naast elkaar dwingen de bezoeker tot een keuze die hij op dat
// moment niet kan maken. Zet hem erbij zodra er een plek is waar de langere
// variant echt de betere is — bijvoorbeeld na een eerste gesprek.
