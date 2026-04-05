import type { ChannelConnector } from './channel-connector.interface';
import { EtsyConnector } from './etsy.connector';
import { AmazonConnector } from './amazon.connector';

interface MarketplaceRef {
  id: string;
  type: string;
}

/**
 * Returns the appropriate ChannelConnector instance for a given marketplace.
 * Throws for unsupported marketplace types.
 */
export function getConnector(marketplace: MarketplaceRef): ChannelConnector {
  switch (marketplace.type) {
    case 'ETSY':
      return new EtsyConnector(marketplace.id);
    case 'AMAZON':
      return new AmazonConnector(marketplace.id);
    default:
      throw new Error(
        `Unsupported marketplace type: "${marketplace.type}". Supported types: ETSY, AMAZON`,
      );
  }
}
