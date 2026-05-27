/* Connector registry — central place to discover all known connectors.
   Used by the /integrations UI + OAuth initiate/callback routes. */

import { BaseConnector } from './connectors/base'
import { StripeConnector } from './connectors/stripe'
import { SlackConnector } from './connectors/slack'
import { MailchimpConnector } from './connectors/mailchimp'
import { GoogleConnector } from './connectors/google'
import { MicrosoftConnector } from './connectors/microsoft'
import { QuickbooksConnector } from './connectors/quickbooks'
import { FundaConnector } from './connectors/funda'

const connectors: BaseConnector[] = [
  new StripeConnector(),
  new SlackConnector(),
  new MailchimpConnector(),
  new GoogleConnector(),
  new MicrosoftConnector(),
  new QuickbooksConnector(),
  // EU portal connectors (category: 'portal') — region-filtered in the
  // /integrations UI so a US-only org doesn't see Funda. Added 2026-05-27
  // as scaffolding for task #12; not yet wired to credentials.
  new FundaConnector(),
]

export function listConnectors() {
  return connectors.map(c => c.meta)
}

export function getConnector(id: string): BaseConnector | null {
  return connectors.find(c => c.meta.id === id) ?? null
}
