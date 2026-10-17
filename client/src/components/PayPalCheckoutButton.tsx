import React, { useEffect, useRef, useState } from "react";
import { loadScript } from "@paypal/paypal-js";

interface PayPalCheckoutButtonProps {
  amount: string;
  currency: string;
  intent: string;
  tier?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
}
export default function PayPalCheckoutButton({
  amount,
  currency,
  intent,
  tier,
  onSuccess,
  onError,
  onCancel
}: PayPalCheckoutButtonProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const initializePayPal = async () => {
      try {
        // Validate PayPal client ID
        const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
        if (!paypalClientId) {
          throw new Error("VITE_PAYPAL_CLIENT_ID environment variable is required");
        }
        const tokenResponse = await fetch("/api/payments/paypal/setup", {
          credentials: "include"
        });

        if (!tokenResponse.ok) {
          throw new Error(`Failed to fetch client token: ${tokenResponse.status} ${tokenResponse.statusText}`);
        }

        const { clientToken } = await tokenResponse.json();

        if (!clientToken) {
          throw new Error("Received empty client token from server");
        }

        const paypal = await loadScript({
          clientId: paypalClientId,
          components: "buttons",
          dataClientToken: clientToken,
          currency: currency,
          intent: intent,
          "data-disable-funding": "card,credit,venmo,sepa,bancontact,eps,giropay,ideal,mybank,p24,sofort",
          commit: true
        } as any);

        if (!paypal || !paypal.Buttons) {
          throw new Error("Failed to load PayPal SDK - Buttons component not available");
        }
        const buttons = paypal.Buttons({
          createOrder: async () => {
            const orderPayload = {
              amount: amount,
              currency: currency,
              intent: intent,
              ...(tier && { tier: tier }),
            };

            const response = await fetch("/api/payments/paypal/order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(orderPayload),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Failed to create PayPal order: ${response.status} ${response.statusText}`);
            }

            const orderData = await response.json();
            return orderData.id;
          },
          onApprove: async (data) => {
            try {
              const captureResponse = await fetch(`/api/payments/paypal/order/${data.orderID}/capture`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tier: tier })
              });

              if (!captureResponse.ok) {
                throw new Error("Payment capture failed");
              }

              const captureData = await captureResponse.json();

              if (captureData.status === 'COMPLETED') {
                window.location.href = `/waiting-approval?reason=upgrade&orderId=${data.orderID}`;
              } else {
                throw new Error("Payment was not completed");
              }
            } catch (error) {
              if (onError) {
                onError(error);
              } else {
                alert("Payment processing failed. Please try again.");
              }
            }
          },
          onError: (err) => {
            setError("Failed to initialize PayPal. Please try again.");
            if (onError) {
              onError(err);
            }
          },
          onCancel: () => {
            if (onCancel) {
              onCancel();
            }
          },
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            tagline: false
          },
          fundingSource: 'paypal'
        });
        if (paypalRef.current) {
          buttons.render(paypalRef.current).catch((error) => {
            setError("Failed to render PayPal buttons. Please try again.");
          });
        }
        setLoading(false);
      } catch (error) {
        setError("Failed to initialize PayPal. Please try again.");
        setLoading(false);
      }
    };

    initializePayPal();
  }, [amount, currency, intent, tier, onSuccess, onError, onCancel]);

  if (loading) {
    return <div className="text-center py-4">Loading PayPal checkout...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  return <div ref={paypalRef}></div>;
}