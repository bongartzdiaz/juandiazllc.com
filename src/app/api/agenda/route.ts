import { NextResponse } from 'next/server'

interface Appointment {
  id: string
  naam: string
  telefoon: string
  stad: string
  type: 'Eerste bezoek' | 'Opvolgbezoek'
  status: 'bevestigd' | 'wachtend' | 'afgerond' | 'geannuleerd'
  datum: string
  tijd: string
  notities: string
}

export async function GET() {
  const apiKey = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  const baseUrl = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com'

  if (!apiKey || !locationId) {
    return NextResponse.json({ error: 'GoHighLevel API niet bereikbaar — controleer GHL_API_KEY en GHL_LOCATION_ID' })
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
  }

  try {
    // Get calendars for this location
    const calendarsRes = await fetch(
      `${baseUrl}/calendars/?locationId=${locationId}`,
      { headers }
    )
    if (!calendarsRes.ok) {
      console.error('[API /agenda] Failed to fetch calendars:', calendarsRes.status)
      return NextResponse.json({ error: 'Kan agenda niet ophalen uit GoHighLevel' })
    }

    const calendarsJson = await calendarsRes.json()
    const calendars = calendarsJson.calendars || []

    if (calendars.length === 0) {
      return NextResponse.json({ appointments: [] })
    }

    // Get current week range
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const startTime = monday.toISOString()
    const endTime = sunday.toISOString()

    // Fetch events from all calendars
    const allAppointments: Appointment[] = []

    for (const calendar of calendars) {
      const eventsRes = await fetch(
        `${baseUrl}/calendars/events?locationId=${locationId}&calendarId=${calendar.id}&startTime=${startTime}&endTime=${endTime}`,
        { headers }
      )
      if (!eventsRes.ok) continue

      const eventsJson = await eventsRes.json()
      const events = eventsJson.events || []

      for (const event of events) {
        const startDate = new Date(event.startTime || event.start)
        const contactName = event.contact?.name || event.title || 'Onbekend'
        const contactPhone = event.contact?.phone || ''
        const city = event.address?.city || event.location || ''

        let status: Appointment['status'] = 'wachtend'
        const eventStatus = (event.appointmentStatus || event.status || '').toLowerCase()
        if (['confirmed', 'bevestigd'].includes(eventStatus)) status = 'bevestigd'
        else if (['completed', 'showed', 'afgerond'].includes(eventStatus)) status = 'afgerond'
        else if (['cancelled', 'no_show', 'geannuleerd'].includes(eventStatus)) status = 'geannuleerd'

        const isFirstVisit = !event.tags?.includes('followup') && !event.notes?.toLowerCase().includes('opvolg')

        allAppointments.push({
          id: event.id,
          naam: contactName,
          telefoon: contactPhone,
          stad: city,
          type: isFirstVisit ? 'Eerste bezoek' : 'Opvolgbezoek',
          status,
          datum: startDate.toISOString().slice(0, 10),
          tijd: startDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', hour12: false }),
          notities: event.notes || '',
        })
      }
    }

    // Sort by date + time
    allAppointments.sort((a, b) => a.datum.localeCompare(b.datum) || a.tijd.localeCompare(b.tijd))

    return NextResponse.json({ appointments: allAppointments }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  } catch (error) {
    console.error('[API /agenda] Error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Fout bij ophalen agenda data uit GoHighLevel' })
  }
}
