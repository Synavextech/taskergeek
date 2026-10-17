import { Request, Response } from "express";
import { type SupabaseClient } from "@supabase/supabase-js";
import { storage } from "./supabase-storage";
import { AppError, sendSuccess } from "./middleware";
import crypto from "crypto";

// PayPal webhook event types
interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  create_time: string;
  resource_type: string;
  resource: any;
  summary: string;
}

// Verify PayPal webhook signature
const verifyPayPalWebhook = (req: Request): boolean => {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const paypalSignature = req.headers['paypal-transmission-sig'] as string;
  const paypalCertId = req.headers['paypal-cert-id'] as string;
  const paypalTransmissionId = req.headers['paypal-transmission-id'] as string;
  const paypalTransmissionTime = req.headers['paypal-transmission-time'] as string;

  if (!webhookId || !paypalSignature || !paypalCertId || !paypalTransmissionId || !paypalTransmissionTime) {
    console.error('Missing PayPal webhook headers');
    return false;
  }

  // In production, implement proper PayPal webhook signature verification
  // For now, we'll do basic validation
  const expectedSignature = crypto
    .createHmac('sha256', process.env.PAYPAL_WEBHOOK_SECRET || '')
    .update(JSON.stringify(req.body))
    .digest('base64');

  return paypalSignature === expectedSignature;
};

// Handle PayPal webhook events
export const handlePayPalWebhook = async (req: any, res: Response) => {
  try {
    // Verify webhook signature
    if (!verifyPayPalWebhook(req)) {
      throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
    }

    const event: PayPalWebhookEvent = req.body;
    console.log(`Received PayPal webhook: ${event.event_type}`);

    const adminClient = req.supabaseAdmin;

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(adminClient, event);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaymentCaptureDenied(adminClient, event);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentCaptureRefunded(adminClient, event);
        break;

      case 'CHECKOUT.ORDER.APPROVED':
        await handleOrderApproved(adminClient, event);
        break;

      case 'CHECKOUT.ORDER.COMPLETED':
        await handleOrderCompleted(adminClient, event);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.event_type}`);
    }

    sendSuccess(res, { received: true }, 'Webhook processed successfully');
  } catch (error) {
    console.error('PayPal webhook error:', error);
    throw new AppError('Webhook processing failed', 500, 'WEBHOOK_ERROR');
  }
};

// Handle successful payment capture
const handlePaymentCaptureCompleted = async (adminClient: SupabaseClient, event: PayPalWebhookEvent) => {
  const capture = event.resource;
  const orderId = capture.supplementary_data?.related_ids?.order_id;

  if (!orderId) {
    console.error('No order ID found in payment capture event');
    return;
  }

  try {
    // Find the order in our database
    const order = await storage.getOrder(adminClient, orderId);
    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return;
    }

    // Update order status
    await storage.updateOrder(adminClient, order.id.toString(), {
      status: 'completed',
      payer_id: capture.payer?.payer_id,
      payer_email: capture.payer?.email_address,
      metadata: {
        ...(order.metadata as object || {}),
        captureId: capture.id,
        captureTime: capture.create_time,
        captureAmount: capture.amount
      }
    });

    // Create or update subscription
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month subscription

    await storage.createSubscription(adminClient, {
      userId: parseInt(order.user_id),
      tier: order.skill_upgrade_tier,
      amount: order.amount,
      paymentMethod: 'paypal',
      paymentReference: capture.id,
      isActive: true,
      expiresAt: expiryDate.toISOString()
    });

    // Update user subscription
    await storage.updateUser(adminClient, order.user_id, {
      skill_upgrade_tier: order.skill_upgrade_tier,
      skill_upgrade_expiry: expiryDate.toISOString()
    });

    // Create success notification
    await storage.createNotification(adminClient, {
      user_id: order.user_id,
      title: 'Payment Successful',
      message: `Your ${order.skill_upgrade_tier} subscription has been activated successfully.`,
      type: 'payment',
      is_read: false,
      metadata: {
        orderId: order.order_id,
        captureId: capture.id,
        amount: capture.amount.value
      }
    });

    // START: Referral Bonus Logic
    try {
      const user = await storage.getUser(adminClient, order.user_id);
      if (user && user.referred_by) {
        // Find referrer
        const { data: referrer, error: refError } = await adminClient
          .from('users')
          .select('*')
          .eq('referral_code', user.referred_by)
          .single();

        if (referrer && !refError) {
          const bonusAmount = (parseFloat(order.amount) * 0.10).toFixed(2);

          // Credit referrer wallet
          const referrerWallet = await storage.getWallet(adminClient, referrer.id);
          if (referrerWallet) {
            const newBalance = (parseFloat(referrerWallet.available_balance) + parseFloat(bonusAmount)).toFixed(2);
            const newEarnings = (parseFloat(referrerWallet.total_earnings) + parseFloat(bonusAmount)).toFixed(2);

            await storage.updateWallet(adminClient, referrer.id, {
              available_balance: newBalance,
              total_earnings: newEarnings
            });

            // Record transaction
            await storage.createTransaction(adminClient, {
              user_id: referrer.id,
              type: 'referral',
              amount: bonusAmount,
              status: 'completed',
              description: `Referral bonus for user ${user.name}`,
              metadata: {
                referred_user_id: user.id,
                order_id: order.id
              }
            });

            // Notify referrer
            await storage.createNotification(adminClient, {
              user_id: referrer.id,
              title: 'Referral Bonus Earned!',
              message: `You earned $${bonusAmount} because your referral ${user.name} subscribed!`,
              type: 'referral',
              is_read: false,
              metadata: {
                bonusAmount,
                referredUserId: user.id
              }
            });
            console.log(`Referral bonus of $${bonusAmount} processed for referrer ${referrer.id}`);
          }
        }
      }
    } catch (referralError) {
      console.error('Error processing referral bonus:', referralError);
      // Don't block the main payment success flow
    }
    // END: Referral Bonus Logic

    console.log(`Payment completed for order ${orderId}`);
  } catch (error) {
    console.error(`Error processing payment completion for order ${orderId}:`, error);

    // Create error notification for user
    try {
      const order = await storage.getOrder(adminClient, orderId);
      if (order) {
        await storage.createNotification(adminClient, {
          user_id: order.user_id,
          title: 'Payment Processing Issue',
          message: 'There was an issue processing your payment. Please contact support.',
          type: 'payment',
          is_read: false,
          metadata: {
            orderId: order.order_id,
            error: 'payment_processing_failed'
          }
        });
      }
    } catch (notificationError) {
      console.error('Failed to create error notification:', notificationError);
    }
  }
};

// Handle denied payment capture
const handlePaymentCaptureDenied = async (adminClient: SupabaseClient, event: PayPalWebhookEvent) => {
  const capture = event.resource;
  const orderId = capture.supplementary_data?.related_ids?.order_id;

  if (!orderId) return;

  try {
    const order = await storage.getOrder(adminClient, orderId);
    if (!order) return;

    // Update order status
    await storage.updateOrder(adminClient, order.id.toString(), {
      status: 'failed',
      metadata: {
        ...(order.metadata as object || {}),
        failureReason: capture.status_details?.reason,
        failureTime: new Date().toISOString()
      }
    });

    // Create failure notification
    await storage.createNotification(adminClient, {
      user_id: order.user_id,
      title: 'Payment Failed',
      message: 'Your payment was declined. Please try again with a different payment method.',
      type: 'payment',
      is_read: false,
      metadata: {
        orderId: order.order_id,
        reason: capture.status_details?.reason
      }
    });

    console.log(`Payment denied for order ${orderId}`);
  } catch (error) {
    console.error(`Error processing payment denial for order ${orderId}:`, error);
  }
};

// Handle payment refund
const handlePaymentCaptureRefunded = async (adminClient: SupabaseClient, event: PayPalWebhookEvent) => {
  const refund = event.resource;
  const captureId = refund.links?.find((link: any) => link.rel === 'up')?.href?.split('/').pop();

  if (!captureId) return;

  try {
    console.log(`Payment refunded for capture ${captureId}`);
  } catch (error) {
    console.error(`Error processing refund for capture ${captureId}:`, error);
  }
};

// Handle order approval
const handleOrderApproved = async (adminClient: SupabaseClient, event: PayPalWebhookEvent) => {
  const order = event.resource;

  try {
    const dbOrder = await storage.getOrder(adminClient, order.id);
    if (!dbOrder) return;

    await storage.updateOrder(adminClient, dbOrder.id.toString(), {
      status: 'pending',
      metadata: {
        ...(dbOrder.metadata as object || {}),
        approvedTime: new Date().toISOString(),
        payerInfo: order.payer
      }
    });

    console.log(`Order approved: ${order.id}`);
  } catch (error) {
    console.error(`Error processing order approval for ${order.id}:`, error);
  }
};

// Handle order completion
const handleOrderCompleted = async (adminClient: SupabaseClient, event: PayPalWebhookEvent) => {
  const order = event.resource;

  try {
    const dbOrder = await storage.getOrder(adminClient, order.id);
    if (!dbOrder) return;

    await storage.updateOrder(adminClient, dbOrder.id.toString(), {
      status: 'completed',
      metadata: {
        ...(dbOrder.metadata as object || {}),
        completedTime: new Date().toISOString(),
        finalStatus: order.status
      }
    });

    console.log(`Order completed: ${order.id}`);
  } catch (error) {
    console.error(`Error processing order completion for ${order.id}:`, error);
  }
};

// Payment recovery system
export const recoverFailedPayments = async (adminClient: SupabaseClient) => {
  try {
    console.log('Starting payment recovery process...');

    // Find orders that are pending for more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: staleOrders, error } = await adminClient
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo);

    if (error) throw error;

    for (const order of staleOrders) {
      console.log(`Checking stale order: ${order.order_id}`);
      // In a real implementation, you would call PayPal API to check order status
      // For now, we mark them as failed after timeout
      await storage.updateOrder(adminClient, order.id, {
        status: 'failed',
        metadata: {
          ...(order.metadata as object || {}),
          failureReason: 'timeout',
          failureTime: new Date().toISOString()
        }
      });
    }

    console.log('Payment recovery process completed');
  } catch (error) {
    console.error('Payment recovery process failed:', error);
  }
};

// Retry failed payments
export const retryFailedPayment = async (adminClient: SupabaseClient, orderId: string) => {
  try {
    const order = await storage.getOrder(adminClient, orderId);
    if (!order || order.status !== 'failed') {
      throw new AppError('Order not found or not in failed state', 404);
    }

    // Reset order status to pending for retry
    const currentMetadata = order.metadata as any || {};
    await storage.updateOrder(adminClient, order.id.toString(), {
      status: 'pending',
      metadata: {
        ...currentMetadata,
        retryAttempt: (currentMetadata.retryAttempt || 0) + 1,
        retryTime: new Date().toISOString()
      }
    });

    // Create notification about retry
    await storage.createNotification(adminClient, {
      user_id: order.user_id,
      title: 'Payment Retry',
      message: 'We are retrying your payment. You will be notified of the result.',
      type: 'payment',
      is_read: false,
      metadata: {
        orderId: order.order_id,
        retryAttempt: (currentMetadata.retryAttempt || 0) + 1
      }
    });

    return { success: true, message: 'Payment retry initiated' };
  } catch (error) {
    console.error(`Error retrying payment for order ${orderId}:`, error);
    throw error;
  }
};