/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriberStatus = 'Active' | 'Unsubscribed' | 'Dormant';

export interface Subscriber {
  id: string;
  name: string;
  email: string;
  status: SubscriberStatus;
  dateAdded: string;
  avatarUrl?: string;
  initials?: string;
  plan?: string;
  roster?: string;
  rosterName?: string;
}

export interface SubscriberImportResult {
  id?: string;
  email: string;
  status: 'created' | 'updated' | 'skipped';
  message?: string;
}

export type CampaignStatus = 'SENT' | 'DRAFT' | 'SENDING' | 'QUEUED' | 'FAILED';

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  recipients: number;
  openRate: number | null; // null means '--' or not applicable
  createdDate: string;
  subjectLine?: string;
  senderName?: string;
  replyTo?: string;
  templateId?: string;
  emailElements?: EmailElement[]; // Customized template content designed in the wizard
  targetLists?: string[]; // IDs of list to target
  scheduledAt?: string;
  rateThrottling?: boolean; // Spread delivery over 2 hours to avoid rate limits
  autoResendUnopened?: boolean; // Auto-resend variant to unopened recipients after 48h
  resendVariantSubject?: string; // Alternative subject for unopened resend
  selectedFooterId?: string | null;
  footerData?: EmailFooter | null;
}

export interface SubscriberList {
  id: string;
  name: string;
  description: string;
  subscribersCount: number;
  status: 'ACTIVE' | 'DORMANT';
}

export type EmailElementType = 'text' | 'image' | 'button' | 'spacer' | 'divider' | 'html' | 'richtext' | 'container';

export interface EmailElement {
  id: string;
  type: EmailElementType;
  properties: {
    text?: string;
    url?: string;
    bg?: string;
    fontSize?: string;
    color?: string;
    paddingY?: number;
    paddingX?: number;
    cornerRadius?: number | string;
    imageUrl?: string;
    height?: number; // for spacer
    width?: number | string; // for image
    htmlScript?: string; // custom HTML script markup or embedded block
    content?: string; // Rich text HTML content
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    lineHeight?: string;
    textAlign?: string;
    letterSpacing?: string;
    bgColor?: string;
    borderWidth?: number;
    borderColor?: string;
    borderStyle?: string;
    shadow?: boolean;
    boxShadow?: string;
    altText?: string;
    borderRadius?: number;
    caption?: string;
    overlayText?: string;
    aspectRatio?: string;
    autoHeight?: boolean;
    icon?: string;
    iconPosition?: 'before' | 'after';
    linkTarget?: string;
    customClass?: string;
    children?: EmailElement[]; // for container blocks
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  thumbnailAlt: string;
  thumbnailUrl: string;
  elements: EmailElement[];
  selectedFooterId?: string | null;
  footerData?: EmailFooter | null;
}

export interface CampaignEvent {
  id?: string;
  _id?: string;
  campaignId: string;
  email: string;
  name: string;
  eventType: 'delivered' | 'open' | 'click' | 'unsubscribe';
  timestamp: string | Date;
  url?: string;
  userAgent?: string;
  ipAddress?: string;
}

// Font management types
export interface CustomFont {
  id: string;
  name: string;
  family: string;
  url?: string;
  format: string;
  weight: string;
  style: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FontUploadPayload {
  name: string;
  family: string;
  url?: string;
  format?: string;
  weight?: string;
  style?: string;
  category?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
  mustChangePassword?: boolean;
  allowedModules?: string[];
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Footer Design System Types ───────────────────────────────────────────────

export type BackgroundType = 'solid' | 'gradient' | 'image' | 'pattern';

export type PatternPreset =
  | 'dots'
  | 'stripes'
  | 'diagonal'
  | 'grid'
  | 'checkerboard'
  | 'zigzag'
  | 'none';

export interface BackgroundStyle {
  type: BackgroundType;
  color?: string; // solid color
  gradientFrom?: string; // for gradient
  gradientTo?: string;
  gradientDirection?: string; // e.g. '90deg', '135deg', '180deg'
  imageUrl?: string; // for image
  imagePosition?: string; // 'center', 'top', 'bottom', 'left', 'right'
  imageSize?: 'cover' | 'contain' | 'auto' | 'repeat';
  pattern?: PatternPreset;
  patternColor?: string;
  patternBg?: string;
  opacity?: number;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon?: string; // custom icon SVG or emoji
  color: string;
  hoverColor: string;
  size: 'sm' | 'md' | 'lg';
}

export interface FooterZone {
  id: string;
  type: 'header' | 'body' | 'social' | 'contact' | 'legal' | 'custom';
  enabled: boolean;
  content?: string; // HTML for body, text for header/legal
  logoUrl?: string;
  companyName?: string;
  address?: string;
  phone?: string;
  website?: string;
  socialLinks?: SocialLink[];
  socialColumns?: 3 | 4 | 5 | 6;
  copyrightText?: string;
  showUnsubscribe?: boolean;
  unsubscribeText?: string;
  customHtml?: string;
}

export interface FooterLayout {
  maxWidth: '600px' | '640px' | '720px' | 'full';
  centerAligned: boolean;
  paddingY: number;
  paddingX: number;
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  borderRadius: number;
  shadow: boolean;
  shadowIntensity: 'subtle' | 'medium' | 'strong';
}

export interface EmailFooter {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  background: BackgroundStyle;
  layout: FooterLayout;
  zones: FooterZone[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
}

export interface UserCreatePayload {
  email: string;
  name: string;
  password: string;
  role?: string;
  allowedModules?: string[];
}

export interface ModulePermission {
  id: string;
  name: string;
  label: string;
}

export const AVAILABLE_MODULES: ModulePermission[] = [
  { id: 'dashboard', name: 'dashboard', label: 'Dashboard' },
  { id: 'compose', name: 'compose', label: 'Compose' },
  { id: 'campaigns', name: 'campaigns', label: 'Campaigns' },
  { id: 'subscribers', name: 'subscribers', label: 'Subscribers' },
  { id: 'templates', name: 'templates', label: 'Templates' },
  { id: 'logs', name: 'logs', label: 'Delivery Logs' },
  { id: 'api-keys', name: 'api-keys', label: 'API Keys' },
];
