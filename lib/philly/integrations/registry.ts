/* Connector registry — central place to discover all known connectors.
   Used by the /integrations UI + OAuth initiate/callback routes. */

import { BaseConnector } from './connectors/base'
import { StripeConnector } from './connectors/stripe'
import { SlackConnector } from './connectors/slack'
import { MailchimpConnector } from './connectors/mailchimp'
import { GoogleConnector } from './connectors/google'
import { MicrosoftConnector } from './connectors/microsoft'
import { QuickbooksConnector } from './connectors/quickbooks'

const connectors: BaseConnector[] = [
  new StripeConnector(),
  new SlackConnector(),
  new MailchimpConnector(),
  new GoogleConnector(),
  new MicrosoftConnector(),
  new QuickbooksConnector(),
]

export function listConnectors() {
  return connectors.map(c => c.meta)
}

export function getConnector(id: string): BaseConnector | null {
  return connectors.find(c => c.meta.id === id) ?? null
}
