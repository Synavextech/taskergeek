import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Wallet, Transaction as BaseTransaction, Withdrawal as BaseWithdrawal, PaymentMethod } from "@shared/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  insertWithdrawalSchema,
  insertPaymentMethodSchema,
  type InsertWithdrawal,
  type InsertPaymentMethod,
} from "@shared/types";
import {
  Star,
  Trash2,
  Plus,
  ArrowUpRight,
  Wallet as WalletIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  DollarSign,
  History,
  ShieldCheck,
} from "lucide-react";

interface WalletData {
  available_balance: string;
  pending_balance: string;
  total_earnings: string;
}

interface TransactionType extends Omit<BaseTransaction, 'created_at' | 'type'> {
  type: 'earning' | 'withdrawal' | 'referral' | 'skill-upgrade';
  status: 'completed' | 'failed' | 'pending';
  amount: string;
  description?: string;
  created_at: string;
}

interface WithdrawalType extends Omit<BaseWithdrawal, 'created_at'> {
  status: 'completed' | 'failed' | 'pending';
  amount: string;
  created_at: string;
  phoneNumber?: string;
}

interface PaymentMethodType extends PaymentMethod {
  id: number;
  email: string;
  isPrimary: boolean;
}

interface WithdrawalFormData extends InsertWithdrawal {
  paymentMethodId?: number;
}

export default function Wallet() {
  const [showWithdrawals, setShowWithdrawals] = useState(false);
  const [isCashoutOpen, setIsCashoutOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | null>(null);
  const [selectedMethodType, setSelectedMethodType] = useState<string>("paypal");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getMethodLabel = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'payoneer': return 'Payoneer';
      case 'airtm': return 'AirTM';
      case 'bank_transfer': return 'Bank Wire';
      case 'paypal':
      default: return 'PayPal';
    }
  };

  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);

  const { data: wallet = { available_balance: "0", pending_balance: "0", total_earnings: "0" } } = useQuery<WalletData>({
    queryKey: [`/api/payments/wallet/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: transactions = [] } = useQuery<TransactionType[]>({
    queryKey: [`/api/payments/transactions/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: withdrawals = [] } = useQuery<WithdrawalType[]>({
    queryKey: [`/api/payments/withdrawals/${user?.id}`],
    enabled: !!user?.id && showWithdrawals,
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethodType[]>({
    queryKey: [`/api/payments/user/${user?.id}/methods`],
    enabled: !!user?.id,
  });

  const withdrawForm = useForm<WithdrawalFormData>({
    resolver: zodResolver(
      insertWithdrawalSchema.extend({
        paymentMethodId: z.number().optional().nullable(),
      })
    ),
    defaultValues: {
      amount: "0",
      paymentMethodId: undefined,
    },
  });

  const paymentMethodForm = useForm<InsertPaymentMethod>({
    resolver: zodResolver(insertPaymentMethodSchema),
    defaultValues: {
      type: "paypal",
      email: "",
      isPrimary: false,
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: InsertWithdrawal & { paymentMethodId?: number }) => {
      const response = await apiRequest("POST", "/api/payments/withdrawals", {
        ...data,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cashout Request Submitted",
        description: "Your withdrawal request is queued for automated batch processing.",
      });
      withdrawForm.reset();
      setIsCashoutOpen(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/payments/withdrawals/${user?.id}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/payments/wallet/${user?.id}`],
      });
    },
    onError: () => {
      setWithdrawError("Withdrawal failed. Please check your available balance and try again.");
      toast({
        title: "Withdrawal failed",
        description: "Please check your details and try again.",
        variant: "destructive",
      });
    },
  });

  const addPaymentMethodMutation = useMutation({
    mutationFn: async (data: InsertPaymentMethod) => {
      const response = await apiRequest("POST", "/api/payments/methods", {
        ...data,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payout account connected",
        description: "Your payout destination has been verified.",
      });
      paymentMethodForm.reset();
      queryClient.invalidateQueries({
        queryKey: [`/api/payments/user/${user?.id}/methods`],
      });
    },
    onError: () => {
      setPaymentMethodError("Failed to add payment method. Please verify your email format.");
      toast({
        title: "Failed to add payment method",
        description: "Please check your details and try again.",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (methodId: number) => {
      const response = await apiRequest("DELETE", `/api/payments/methods/${methodId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment account removed",
        description: "The payment method was deleted.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/payments/user/${user?.id}/methods`],
      });
    },
  });

  const setPrimaryPaymentMethodMutation = useMutation({
    mutationFn: async (methodId: number) => {
      const response = await apiRequest(
        "PATCH",
        `/api/payments/user/${user?.id}/methods/${methodId}/set-primary`
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Primary account set",
        description: "Your default payout destination was updated.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/payments/user/${user?.id}/methods`],
      });
    },
  });

  const onWithdraw = (data: WithdrawalFormData) => {
    setWithdrawError(null);
    const amount = parseFloat(data.amount);
    const available = parseFloat(wallet?.available_balance || "0");

    if (amount < 10) {
      toast({
        title: "Minimum withdrawal",
        description: "Minimum withdrawal amount is $10.00",
        variant: "destructive",
      });
      return;
    }

    if (amount > available) {
      toast({
        title: "Insufficient balance",
        description: "Requested amount exceeds available withdrawable balance.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPaymentMethodId) {
      toast({
        title: "No payout account selected",
        description: "Please select an active payout destination account.",
        variant: "destructive",
      });
      return;
    }

    withdrawMutation.mutate({
      ...data,
      paymentMethodId: selectedPaymentMethodId,
    });
  };

  const onAddPaymentMethod = (data: InsertPaymentMethod) => {
    setPaymentMethodError(null);
    addPaymentMethodMutation.mutate({
      ...data,
      type: (selectedMethodType as any) || data.type || "paypal",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/15 text-success border border-success/30 text-xs font-bold">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-xs font-bold">Failed</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs font-bold">Pending Review</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs font-bold">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>Specialist Wallet & Payouts</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track compensation from completed tasks, referral commissions, and process PayPal cashouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Cashout Button & Dialog */}
          <Dialog open={isCashoutOpen} onOpenChange={setIsCashoutOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm text-xs h-10 px-4">
                <ArrowUpRight className="w-4 h-4 mr-1.5" />
                Request Cashout
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Withdraw Funds</DialogTitle>
              </DialogHeader>

              <form onSubmit={withdrawForm.handleSubmit(onWithdraw)} className="space-y-4 my-2">
                <div>
                  <Label htmlFor="amount" className="text-xs font-semibold uppercase text-muted-foreground">Amount ($ USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="10"
                    step="0.01"
                    placeholder="10.00"
                    className="mt-1 rounded-xl bg-card border-border/60 text-lg font-bold"
                    {...withdrawForm.register("amount")}
                  />
                  <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                    <span>Minimum: $10.00</span>
                    <span>Available: ${parseFloat(wallet?.available_balance || "0").toFixed(2)}</span>
                  </div>
                </div>

                {withdrawError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/25 text-destructive rounded-xl text-xs">
                    {withdrawError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Select Payout Destination</Label>
                  <RadioGroup
                    value={selectedPaymentMethodId?.toString() || ""}
                    onValueChange={(val) => setSelectedPaymentMethodId(parseInt(val))}
                    className="space-y-2 mt-1"
                  >
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className="flex items-center space-x-3 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <RadioGroupItem value={method.id.toString()} id={`method-${method.id}`} />
                          <Label htmlFor={`method-${method.id}`} className="flex-1 cursor-pointer text-xs font-medium">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">{method.email}</span>
                                <Badge variant="outline" className="text-[9px] py-0 px-1 uppercase text-muted-foreground">
                                  {getMethodLabel(method.type)}
                                </Badge>
                              </div>
                              {method.isPrimary && (
                                <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                              )}
                            </div>
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground py-2">
                        No payout destination linked. Please add one under Payout Accounts first.
                      </p>
                    )}
                  </RadioGroup>
                </div>

                <Button
                  type="submit"
                  disabled={withdrawMutation.isPending || paymentMethods.length === 0}
                  className="w-full rounded-xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground mt-2"
                >
                  {withdrawMutation.isPending ? "Processing..." : "Confirm Withdrawal"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Payment Methods Dialog */}
          <Dialog open={isAccountsOpen} onOpenChange={setIsAccountsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl text-xs font-semibold h-10 px-4">
                <CreditCard className="w-4 h-4 mr-1.5" />
                Payout Accounts
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Payout Accounts</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 my-2">
                <div className="space-y-2">
                  {paymentMethods.length > 0 ? (
                    paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between p-3.5 border border-border/60 rounded-2xl bg-card shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-muted rounded-xl">
                            <CreditCard className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs text-foreground">{method.email}</p>
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5 uppercase font-medium">
                                {getMethodLabel(method.type)}
                              </Badge>
                            </div>
                            {method.isPrimary && (
                              <Badge variant="secondary" className="text-[10px] mt-0.5">Primary</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {!method.isPrimary && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPrimaryPaymentMethodMutation.mutate(method.id)}
                              disabled={setPrimaryPaymentMethodMutation.isPending}
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-amber-500"
                              title="Set as Primary"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deletePaymentMethodMutation.mutate(method.id)}
                            disabled={deletePaymentMethodMutation.isPending}
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      No payout accounts connected yet.
                    </p>
                  )}
                </div>

                <form onSubmit={paymentMethodForm.handleSubmit(onAddPaymentMethod)} className="space-y-3 pt-3 border-t border-border/40">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Add New Payout Account</h4>
                  
                  <div>
                    <Label className="text-xs mb-1 block">Payout Method</Label>
                    <Select
                      value={selectedMethodType}
                      onValueChange={(val: string) => {
                        setSelectedMethodType(val);
                        paymentMethodForm.setValue("type", val as any);
                      }}
                    >
                      <SelectTrigger className="rounded-xl bg-card border-border/60 text-xs">
                        <SelectValue placeholder="Select payout method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="payoneer">Payoneer</SelectItem>
                        <SelectItem value="airtm">AirTM</SelectItem>
                        <SelectItem value="bank_transfer">Direct Bank Wire / Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">Account Email / Identifier</Label>
                    <Input
                      type="email"
                      placeholder={
                        selectedMethodType === 'payoneer'
                          ? "payoneer-email@example.com"
                          : selectedMethodType === 'airtm'
                          ? "airtm-email@example.com"
                          : selectedMethodType === 'bank_transfer'
                          ? "beneficiary-email@example.com"
                          : "paypal-email@example.com"
                      }
                      className="rounded-xl bg-card border-border/60 text-xs"
                      {...paymentMethodForm.register("email")}
                    />
                    {paymentMethodForm.formState.errors.email && (
                      <p className="text-xs text-destructive mt-1">
                        {paymentMethodForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  {paymentMethodError && (
                    <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-xl">
                      {paymentMethodError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={addPaymentMethodMutation.isPending}
                    className="w-full rounded-xl text-xs font-bold bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    {addPaymentMethodMutation.isPending ? "Connecting..." : "Add Payout Account"}
                  </Button>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Available Balance */}
        <Card className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-success/5 shadow-sm p-6 sm:p-7">
          <CardContent className="p-0 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available for Cashout</span>
              <span className="p-2.5 rounded-2xl bg-success/10 text-success">
                <DollarSign className="w-5 h-5" />
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-black text-success">
              ${parseFloat(wallet?.available_balance || "0").toFixed(2)}
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Ready for PayPal payout</span>
              <span className="font-semibold text-foreground">Min: $10.00</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Balance */}
        <Card className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-warning/5 shadow-sm p-6 sm:p-7">
          <CardContent className="p-0 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Admin Verification</span>
              <span className="p-2.5 rounded-2xl bg-warning/10 text-warning">
                <Clock className="w-5 h-5" />
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-black text-warning">
              ${parseFloat(wallet?.pending_balance || "0").toFixed(2)}
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Under quality evaluation</span>
              <span className="font-semibold text-foreground">Credited upon approval</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toggle View: Withdrawal History */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg font-bold text-foreground">Recent Transactions</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowWithdrawals(!showWithdrawals)}
          className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="w-3.5 h-3.5 mr-1.5" />
          {showWithdrawals ? "Hide Cashout History" : "View Cashout History"}
        </Button>
      </div>

      {/* Cashout History Section (Collapsible) */}
      {showWithdrawals && (
        <Card className="rounded-3xl border-border/60 p-6 bg-card shadow-sm space-y-4">
          <CardHeader className="p-0 pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold">Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {withdrawals.length > 0 ? (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="p-4 rounded-2xl border border-border/40 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-foreground">${parseFloat(w.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.created_at ? new Date(w.created_at).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                    {getStatusBadge(w.status)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-xs text-muted-foreground">No withdrawal records found.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Ledger Transactions */}
      <div className="space-y-3">
        {transactions.length > 0 ? (
          transactions.slice(0, 10).map((tx) => (
            <div
              key={tx.id}
              className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card shadow-sm flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-muted/60 text-base shrink-0">
                  {tx.type === "earning" ? "💰" : tx.type === "withdrawal" ? "📤" : "👥"}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground capitalize">
                    {tx.type.replace("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx.description || (tx.type === "earning" ? "Task reward credited" : "Balance payout")}
                  </p>
                  <span className="text-[10px] text-muted-foreground/75">
                    {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className={`font-black text-sm ${tx.type === "withdrawal" ? "text-destructive" : "text-success"}`}>
                  {tx.type === "withdrawal" ? "-" : "+"}${parseFloat(tx.amount).toFixed(2)}
                </p>
                <div className="mt-1">
                  {getStatusBadge(tx.status)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 px-4 bg-card/60 border border-dashed border-border/80 rounded-3xl">
            <WalletIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h4 className="font-bold text-sm text-foreground">No transactions recorded yet</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Complete tasks from the marketplace to start accumulating wallet earnings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
