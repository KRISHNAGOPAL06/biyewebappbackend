export type PlanCode = 'ALAAP' | 'JATRA' | 'AALOK' | 'OBHIJAAT';

export type SubscriptionStatus = 'active' | 'expired' | 'paused' | 'cancelled';

export type PaymentStatus = 'initiated' | 'success' | 'failed' | 'refunded';

export type PaymentGateway = 'sslcommerz' | 'stripe' | 'bkash' | 'applepay';

export interface PlanFeatures {
  photos?: number;
  video?: boolean;
  videoIntroSeconds?: number; // Max intro video duration (e.g., 45s for Obhijaat)
  messaging?: boolean | 'unlimited' | MessagingLimits;
  icebreakersPerMonth?: number | 'unlimited';
  parentIcebreakers?: number | 'unlimited';
  filters?: string[];
  verification?: 'selfie' | 'silver' | 'gold';
  stealth?: boolean;
  boosts?: number | 'unlimited';
  spotlight?: number | 'unlimited';
  spotlightDays?: number;
  pauseAllowed?: boolean;
  signatureFeed?: boolean;
  founderConsult?: boolean;
  aiIntroductions?: number | 'unlimited';
  familyMessaging?: boolean;
  inviteOnly?: boolean;
  // New features
  videoCalling?: boolean; // In-app video calls (Obhijaat)
  signatureBadge?: boolean; // Gold marker (Obhijaat)
  tierVisibility?: string[]; // Which plan tiers can be viewed
  visibilityControl?: boolean; // Can control profile visibility
  canRequestAalok?: boolean; // Jatra can request to see Aalok profiles
  founderEvents?: boolean; // Invitations to curated gatherings (Obhijaat)
}

export interface MessagingLimits {
  newChatsPerMonth: number;
  messagesPerChat: number;
}
export interface CheckoutRequest {
  profileId: string;
  planCode: PlanCode;
  gateway: PaymentGateway;
  currency?: string; // Optional override
  couponCode?: string; // Optional coupon code for discount
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  exchangeRate?: number;
  countryCode: string;
}

export type EntitlementAction =
  | 'send_message'
  | 'start_chat'
  | 'upload_photo'
  | 'view_contact'
  | 'enable_stealth'
  | 'use_boost'
  | 'use_spotlight'
  | 'pause_subscription'
  | 'upload_video'
  | 'use_icebreaker'
  | 'use_parent_icebreaker'
  | 'use_filter'
  | 'access_signature_feed'
  | 'use_ai_introduction'
  | 'use_family_messaging'
  | 'manual_profile_rewrite'
  | 'view_obhijaat_profiles'
  | 'attend_founder_events'
  // New actions
  | 'use_video_call'        // In-app video calling (Obhijaat)
  | 'control_visibility'    // Control profile visibility (Aalok+)
  | 'request_aalok_profile' // Request to view Aalok profile (Jatra)
  | 'view_tier';            // View profiles of specific tier

export interface EntitlementContext {
  photoCount?: number;
  chatCount?: number;
  messageCount?: number;
  icebreakerCount?: number;
  parentIcebreakerCount?: number;
  filterName?: string;
  boostCount?: number;
  spotlightCount?: number;
  aiIntroductionCount?: number;
  targetTier?: string; // The tier of the profile being viewed
}

export interface CheckoutResponse {
  paymentId: string;
  paymentUrl: string;
  gateway: PaymentGateway;
}

export interface GatewayPaymentRequest {
  paymentId: string;
  amount: number;
  currency: string;
  profileId: string;
  planCode: string;
  planName: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  currencyInfo?: CurrencyInfo; // Add currency context
}

export interface GatewayPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  gatewayTxnId?: string;
  error?: string;
  rawResponse?: Record<string, any>;
}

export interface GatewayWebhookPayload {
  gatewayTxnId: string;
  status: 'success' | 'failed';
  amount: number;
  currency: string;
  rawPayload: Record<string, any>;
}

export interface WebhookVerificationResult {
  valid: boolean;
  payload?: GatewayWebhookPayload;
  error?: string;
}

export interface PlanResponse {
  id: string;
  code: string;
  name: string;
  price: number;
  durationDays: number;
  isInviteOnly: boolean;
  features: PlanFeatures;
  category?: string;
  // Discount & coupon fields
  discountPercent?: number | null;
  discountAmount?: number | null;
  couponCode?: string | null;
  couponValidUntil?: Date | null;
}

export interface SubscriptionResponse {
  id: string;
  profileId: string;
  plan: PlanResponse;
  status: SubscriptionStatus;
  startAt: Date;
  endAt: Date;
  pausedUntil: Date | null;
  createdAt: Date;
}

export interface PaymentResponse {
  id: string;
  subscriptionId: string | null;
  profileId: string;
  gateway: string;
  amount: number;
  currency: string;
  status: string;
  gatewayTxnId: string | null;
  createdAt: Date;
}
