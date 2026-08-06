// In-memory reference implementation.
//
// Its job is not to simulate Printful. Its job is to be a SECOND implementation
// so the contract test suite has two subjects — an interface that only one class
// implements has never been shown to be an abstraction. It also gives CI a
// provider that needs no network and no credentials.

import type {
  FulfillmentProvider,
  FulfillmentResponse,
  NormalizedOrder,
  OrderStatus,
  WebhookResult,
} from '../types';

interface MockRecord {
  order: NormalizedOrder;
  status: OrderStatus;
}

export class MockProvider implements FulfillmentProvider {
  readonly name = 'mock';

  private readonly orders = new Map<string, MockRecord>();
  private seq = 0;

  /** Shared secret the mock expects in `x-mock-signature`. */
  static readonly WEBHOOK_SECRET = 'mock-webhook-secret';

  verifyWebhook(payload: string, headers: Headers): boolean {
    const signature = headers.get('x-mock-signature');
    if (!signature || payload.length === 0) return false;
    return signature === MockProvider.WEBHOOK_SECRET;
  }

  async createOrder(order: NormalizedOrder): Promise<FulfillmentResponse> {
    if (order.items.length === 0) {
      throw new Error('[mock] refusing to create an order with no items');
    }
    for (const item of order.items) {
      if (typeof item.metadata.printFileUrl !== 'string') {
        // Model B: the provider is handed an externally hosted print file. A
        // missing URL is a caller bug and must surface here, not at the printer.
        throw new Error(
          `[mock] item ${item.sku} has no printFileUrl in metadata`,
        );
      }
    }

    this.seq += 1;
    const providerOrderId = `mock-${this.seq}`;
    this.orders.set(providerOrderId, {
      order,
      status: {
        providerOrderId,
        status: 'created',
        events: [{ timestamp: '1970-01-01T00:00:00.000Z', status: 'created' }],
      },
    });

    return { providerOrderId, status: 'created', raw: { mock: true } };
  }

  async cancelOrder(providerOrderId: string): Promise<void> {
    const record = this.orders.get(providerOrderId);
    if (!record) {
      throw new Error(`[mock] unknown order ${providerOrderId}`);
    }
    if (record.status.status === 'shipped' || record.status.status === 'delivered') {
      throw new Error(
        `[mock] order ${providerOrderId} is ${record.status.status} and can no longer be cancelled`,
      );
    }
    record.status = { ...record.status, status: 'cancelled' };
  }

  async getStatus(providerOrderId: string): Promise<OrderStatus> {
    const record = this.orders.get(providerOrderId);
    if (!record) {
      throw new Error(`[mock] unknown order ${providerOrderId}`);
    }
    return record.status;
  }

  async handleWebhook(payload: unknown): Promise<WebhookResult> {
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('[mock] webhook payload must be an object');
    }
    const { providerOrderId, newStatus } = payload as Record<string, unknown>;
    if (typeof providerOrderId !== 'string' || typeof newStatus !== 'string') {
      throw new Error('[mock] webhook payload missing providerOrderId or newStatus');
    }

    const record = this.orders.get(providerOrderId);
    if (record) {
      record.status = {
        ...record.status,
        status: newStatus as OrderStatus['status'],
        events: [
          ...record.status.events,
          { timestamp: '1970-01-01T00:00:01.000Z', status: newStatus },
        ],
      };
    }

    return {
      providerOrderId,
      newStatus: newStatus as OrderStatus['status'],
      shouldNotifyCustomer: newStatus === 'shipped',
    };
  }

  /** Test seam: drive a status transition without going through a webhook. */
  __setStatus(providerOrderId: string, status: OrderStatus['status']): void {
    const record = this.orders.get(providerOrderId);
    if (!record) throw new Error(`[mock] unknown order ${providerOrderId}`);
    record.status = { ...record.status, status };
  }
}
