import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockedConfigurationId, mockedSaleorAppId } from "@/__tests__/mocks/constants";
import { mockedStripePublishableKey } from "@/__tests__/mocks/mocked-stripe-publishable-key";
import { mockedStripeRestrictedKey } from "@/__tests__/mocks/mocked-stripe-restricted-key";
import { mockedSaleorApiUrl } from "@/__tests__/mocks/saleor-api-url";
import { mockStripeWebhookSecret } from "@/__tests__/mocks/stripe-webhook-secret";
import { StripeClient } from "@/modules/stripe/stripe-client";
import { StripeWebhookManager } from "@/modules/stripe/stripe-webhook-manager";

describe("StripeWebhookManager", () => {
  const stripeSdkMock = new Stripe("test");
  const instance = new StripeWebhookManager();

  beforeEach(() => {
    vi.spyOn(stripeSdkMock.webhookEndpoints, "create");
    vi.spyOn(stripeSdkMock.webhookEndpoints, "del");

    vi.spyOn(StripeClient, "createFromRestrictedKey").mockImplementation(
      () => new StripeClient(stripeSdkMock),
    );
  });

  describe("error cases", () => {
    it("Returns CantCreateWebhookUrlError if base app url is broken", async () => {
      vi.mocked(stripeSdkMock.webhookEndpoints.create).mockImplementationOnce(
        async () =>
          ({
            secret: mockStripeWebhookSecret,
            id: "test-id",
          }) as unknown as Stripe.Response<Stripe.WebhookEndpoint>,
      );

      const result = await instance.createWebhook(
        {
          configurationId: mockedConfigurationId,
          name: "config name",
          publishableKey: mockedStripePublishableKey,
          restrictedKey: mockedStripeRestrictedKey,
        },
        {
          appUrl: "not url",
          saleorApiUrl: mockedSaleorApiUrl,
          appId: mockedSaleorAppId,
        },
      );

      expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(
        `[CantCreateWebhookUrlError: Cant create URL]`,
      );
    });

    it("Returns InvalidDataError if Stripe secret was not returned", async () => {
      vi.mocked(stripeSdkMock.webhookEndpoints.create).mockImplementationOnce(
        async () =>
          ({
            // Secret missing here
            id: "test-id",
          }) as unknown as Stripe.Response<Stripe.WebhookEndpoint>,
      );

      const result = await instance.createWebhook(
        {
          configurationId: mockedConfigurationId,
          name: "config name",
          publishableKey: mockedStripePublishableKey,
          restrictedKey: mockedStripeRestrictedKey,
        },
        {
          appUrl: "http://localhost:3000",
          saleorApiUrl: mockedSaleorApiUrl,
          appId: mockedSaleorAppId,
        },
      );

      expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(
        `[CantCreateWebhookError: Result from Stripe was unexpected]`,
      );
    });

    it("Returns CantCreateWebhookError if Stripe SDK returns any error", async () => {
      vi.mocked(stripeSdkMock.webhookEndpoints.create).mockImplementationOnce(async () => {
        throw new Error("Test error");
      });

      const result = await instance.createWebhook(
        {
          configurationId: mockedConfigurationId,
          name: "config name",
          publishableKey: mockedStripePublishableKey,
          restrictedKey: mockedStripeRestrictedKey,
        },
        {
          appUrl: "http://localhost:3000",
          saleorApiUrl: mockedSaleorApiUrl,
          appId: mockedSaleorAppId,
        },
      );

      expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
        [CantCreateWebhookError: Test error
        Error creating webhook]
      `);
    });

    it("Returns CantRemoveWebhookError if Stripe SDK returns any error", async () => {
      vi.mocked(stripeSdkMock.webhookEndpoints.del).mockImplementationOnce(async () => {
        return Promise.reject(new Error("Test error"));
      });

      const result = await instance.removeWebhook({
        webhookId: "we_123",
        restrictedKey: mockedStripeRestrictedKey,
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
        [CantRemoveWebhookError: Test error
        Error removing webhook]
      `);
    });
  });

  it("Calls stripe client to create endpoints with valid arguments, returns created ID and secret", async () => {
    vi.mocked(stripeSdkMock.webhookEndpoints.create).mockImplementationOnce(
      async () =>
        ({
          secret: mockStripeWebhookSecret,
          id: "test-id",
        }) as unknown as Stripe.Response<Stripe.WebhookEndpoint>,
    );

    const result = await instance.createWebhook(
      {
        configurationId: mockedConfigurationId,
        name: "config name",
        publishableKey: mockedStripePublishableKey,
        restrictedKey: mockedStripeRestrictedKey,
      },
      {
        appUrl: "http://localhost:3000",
        saleorApiUrl: mockedSaleorApiUrl,
        appId: mockedSaleorAppId,
      },
    );

    expect(result._unsafeUnwrap()).toStrictEqual({
      id: "test-id",
      secret: mockStripeWebhookSecret,
    });

    /**
     * Ensure we send proper webhook params to Stripe
     */
    expect(vi.mocked(stripeSdkMock.webhookEndpoints.create).mock.calls[0][0])
      .toMatchInlineSnapshot(`
        {
          "api_version": "2025-04-30.basil",
          "description": "Created by Saleor App Payment Stripe, config name: config name",
          "enabled_events": [
            "payment_intent.amount_capturable_updated",
            "payment_intent.payment_failed",
            "payment_intent.processing",
            "payment_intent.requires_action",
            "payment_intent.succeeded",
            "payment_intent.canceled",
            "charge.refund.updated",
          ],
          "metadata": {
            "saleorAppConfigurationId": "81f323bd-91e2-4838-ab6e-5affd81ffc3b",
          },
          "url": "http://localhost:3000/api/webhooks/stripe?configurationId=81f323bd-91e2-4838-ab6e-5affd81ffc3b&saleorApiUrl=https%3A%2F%2Ffoo.bar.saleor.cloud%2Fgraphql%2F&appId=saleor-app-id",
        }
      `);
  });

  it("Calls stripe client to remove endpoint based on it's ID", async () => {
    vi.mocked(stripeSdkMock.webhookEndpoints.del).mockImplementationOnce(async () => {
      return {
        id: "we_123",
        object: "webhook_endpoint",
        deleted: true,
        lastResponse: {} as never,
      };
    });

    const result = await instance.removeWebhook({
      webhookId: "we_123",
      restrictedKey: mockedStripeRestrictedKey,
    });

    expect(result.isOk()).toBe(true);
    expect(stripeSdkMock.webhookEndpoints.del).toHaveBeenCalledWith("we_123");
  });
});
