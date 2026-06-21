/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Subscriber, Campaign, SubscriberList, EmailTemplate } from './types';

export const INITIAL_SUBSCRIBERS: Subscriber[] = [
  {
    id: 'sub-1',
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    status: 'Active',
    dateAdded: 'Oct 24, 2023',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYb27as6qeLKRjJivLqydx1k84pCXMkxdN_zwXbuYI-O81UZ5-OyBN5eotarp0MddPjOYtKfCP1LieTaJ2aBzF0nCo4QC84T3nv-iOiJzIYDGw5sTBOtFNnXX7E6a5Fmpqk5pNvetBl2PZa1fNAGxx3KWdv81j3cznNtvrEo2XJy5xKak9geVD_Aj4wXe5ExRTXejnQoKvAAIPxMr7jrECmBnZvGZDv0BxCSDxIbjoezXls4lbLj46nAie4-ZcapLSJWVeY8x2l7c',
    plan: 'Enterprise'
  },
  {
    id: 'sub-2',
    name: 'Sarah Chen',
    email: 'sarah.c@techcorp.io',
    status: 'Active',
    dateAdded: 'Oct 21, 2023',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAV_vu2MEuFB7MBw8Rarpbqp9kTp5p2CGcmsCS1uo8LfEBqpg9GaMpfi_7Em0HZaBzP7LUXIbuIhFMWRm-oKZhThLspXtiIbvuDRzBBYGEWVttquKSEWeEzpK6L28AVJj2n0UW0769WHTUKyZVLSR0W13qhvgRUo9f1H2jDsqcW9FpaDjYk_sa07sgyiD7OqkJ3zwF5uxUBHpbeQR6Rjwfi-PXzp8krEJmld6do4vx_yxx37E4O4xt9DCVEhLKmkJxeUUefR5iofXA',
    plan: 'Premium'
  },
  {
    id: 'sub-3',
    name: 'Jordan Smyth',
    email: 'j.smyth@logistics.com',
    status: 'Unsubscribed',
    dateAdded: 'Sept 15, 2023',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOtV2mKg8v3MRc66wIPPY5luh4E-YjZdSnKmwInGYpONkXL6ToF0lrlwcCksXXWldJB3ppO7CaW9RCrBeepznu4NtRU1jIMuvs4SnYMcCRElo2ILeBKvO-tswvvM7_3xOCZnKDAb-8WxZ4nabNGqp_cZpE9nLzDk4cmlLD9iP9nntKetqGShAF3mOXE4r3fc5bkYCN4qS2JLkwhLjE8nFvS2ObmhBPj8JpCU8NspsT1lzwx2vDwZZ2x74nWH2gT4RU7TQHW_I13Po',
    plan: 'Free'
  },
  {
    id: 'sub-4',
    name: 'Marcus Vance',
    email: 'marcus.vance@infrasoft.com',
    status: 'Active',
    dateAdded: 'Nov 02, 2023',
    initials: 'MV',
    plan: 'Standard'
  },
  {
    id: 'sub-5',
    name: 'Elena Rostova',
    email: 'elena.r@cyberguard.net',
    status: 'Active',
    dateAdded: 'Nov 12, 2023',
    initials: 'ER',
    plan: 'Enterprise'
  },
  {
    id: 'sub-6',
    name: 'David Kojo',
    email: 'kojo.d@cloudservices.org',
    status: 'Dormant',
    dateAdded: 'Jul 18, 2023',
    initials: 'DK',
    plan: 'Free'
  }
];

export const INITIAL_LISTS: SubscriberList[] = [
  {
    id: 'L-8842-X',
    name: 'Enterprise Core - Global',
    description: 'Primary corporate communication list for all active enterprise clients.',
    subscribersCount: 12408,
    status: 'ACTIVE'
  },
  {
    id: 'L-2291-B',
    name: 'Q4 Beta Testers',
    description: 'High-engagement segment for SMTP-relay feature testing.',
    subscribersCount: 842,
    status: 'ACTIVE'
  },
  {
    id: 'L-0012-A',
    name: 'Historical Archive 2022',
    description: 'Former subscribers from the legacy platform migration.',
    subscribersCount: 45102,
    status: 'DORMANT'
  },
  {
    id: 'L-5531-W',
    name: 'Webinar Attendees - Oct',
    description: 'Leads collected from the "Secure Infra" web summit.',
    subscribersCount: 6120,
    status: 'ACTIVE'
  }
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'CMP-99201',
    name: 'Weekly Update - Nov Week 4',
    status: 'SENT',
    recipients: 12456,
    openRate: 68,
    createdDate: 'Nov 28, 2023',
    subjectLine: 'Weekly Update Nov Week 4: System Infrastructure Logs',
    senderName: 'IGI Infrastructure Team',
    replyTo: 'support@igi-smtp.enterprise',
    targetLists: ['L-8842-X']
  },
  {
    id: 'CMP-99202',
    name: 'Product Launch: API v2.0',
    status: 'SENDING',
    recipients: 8902,
    openRate: 12,
    createdDate: 'Nov 30, 2023',
    subjectLine: 'The next generation of high-performance SMTP is here.',
    senderName: 'IGI Launch Team',
    replyTo: 'support@igi-smtp.enterprise',
    targetLists: ['L-2291-B']
  },
  {
    id: 'CMP-99203',
    name: 'Holiday Sale Announcement',
    status: 'DRAFT',
    recipients: 45100,
    openRate: null,
    createdDate: 'Dec 01, 2023',
    subjectLine: 'Exclusive Developer Holiday discount - IGI SMTP Pro Upgrade',
    senderName: 'IGI Portal Team',
    replyTo: 'support@igi-smtp.enterprise',
    targetLists: ['L-0012-A']
  },
  {
    id: 'CMP-99204',
    name: 'Security Patch Notification',
    status: 'SENT',
    recipients: 2340,
    openRate: 94,
    createdDate: 'Nov 25, 2023',
    subjectLine: 'CRITICAL SECURITY PATCH: Please read details',
    senderName: 'IGI Security Response',
    replyTo: 'support@igi-smtp.enterprise',
    targetLists: ['L-8842-X']
  },
  {
    id: 'CMP-99205',
    name: 'Newsletter - Issue #42',
    status: 'SENT',
    recipients: 15670,
    openRate: 42,
    createdDate: 'Nov 22, 2023',
    subjectLine: 'Developer News Issue #42: Optimal Node Configurations',
    senderName: 'Elena Rostova',
    replyTo: 'support@igi-smtp.enterprise',
    targetLists: ['L-5531-W']
  }
];

export const INITIAL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tmpl-weekly',
    name: 'Weekly Newsletter',
    description: 'Standard editorial layout for recurring content and updates.',
    thumbnailAlt: 'Weekly Newsletter Mockup',
    thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAprd92xEsVS4Hu2_6ei60pp2DhTDIcCtWPqNGSRRa-LY-9SOetgRGLGTtJ3QdZYjuhM4rF_G3AbJVvJpWv-X_dGNLfHt_yXVXL6M0fg_r_GDb5SrPid5RRbTl6VeaAfFRvZ3Psc9dpXDNV16YICqBIkoaAi7YCQpsneYoxHj8q_Wmge3v7lie7IPqyJ6oz7WSdiHaJfef3tGhyn1iGxyYpBE75WBjbXT0gQSSN4tAaiX1LfdCs09nRWTT6Ys0-6p1BLA3SiGGPc7s',
    elements: [
      {
        id: 'el-img-1',
        type: 'image',
        properties: {
          imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZppEBj7PyzwXKwG9Xn5QKr05Gh2iB8eVCeEyZa1F3BnexE_HVaZIEQilIG-Fg8Zucx53ESvnfLTxeG7lvFUAaQnPqRIo111htduJQQV0TOe3lBHjcqhkFIVSmdVrpH50w_DfqvSQWflHYS9Qy96o_1H7-emCHjCW51VHQIWM9gTae6ZRlOFFCyvTdIZABIWI_2tW5RT_LYRoF9--uUnVVi2X5mlUP8w0kOfB364MBCCOt4ApVVAovhdv_uJZdWztJMnLQJNar76g',
          paddingY: 0,
          paddingX: 0
        }
      },
      {
        id: 'el-text-title',
        type: 'text',
        properties: {
          text: 'Welcome to the Future',
          fontSize: '32px',
          color: '#121c2b',
          paddingY: 16,
          paddingX: 32
        }
      },
      {
        id: 'el-text-body',
        type: 'text',
        properties: {
          text: 'Your delivery infrastructure just got an upgrade. Experience the precision and speed of IGI SMTP with our new template engine. Secure, reliable, and built for scale.',
          fontSize: '16px',
          color: '#45474c',
          paddingY: 8,
          paddingX: 32
        }
      },
      {
        id: 'el-btn-1',
        type: 'button',
        properties: {
          text: 'Get Started',
          url: 'https://igi-smtp.com/start',
          bg: '#4f46e5',
          color: '#ffffff',
          paddingY: 16,
          paddingX: 32,
          cornerRadius: 24
        }
      },
      {
        id: 'el-spacer-1',
        type: 'spacer',
        properties: {
          height: 48
        }
      },
      {
        id: 'el-divider-1',
        type: 'divider',
        properties: {
          color: '#c5c6cd'
        }
      }
    ]
  },
  {
    id: 'tmpl-launch',
    name: 'Product Launch',
    description: 'High-impact visual design optimized for conversion and clicks.',
    thumbnailAlt: 'Product Launch Mockup',
    thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZAPQStrYteph20GDvLJsDc7e9K_J0X1RgMXgsPOv0LbDjsItohlnNNLmmBiOdi8o6gA53ylRlWjMPlMbekkAl5Q3CF7Gj0I6js6zN14sW7Cy4Xjfil3A5arZiY77-PTE9HkgiBsJpmpPNKzEaRfligAm1lxCAd91KhFCKzknMD4gPKhBVCJ1MBWB0Lf_nF7LYVjKzzLj6iFP48q0vU5Y3Aw6bF7xDLMTlMWHoVsxnuLFcnLG9qthO2WbwWLda0iCSrdsHUot0pkk',
    elements: [
      {
        id: 'el-text-l1',
        type: 'text',
        properties: {
          text: 'API v2.0 Live Now',
          fontSize: '28px',
          color: '#4f46e5',
          paddingY: 16,
          paddingX: 24
        }
      },
      {
        id: 'el-text-l2',
        type: 'text',
        properties: {
          text: 'Enjoy blazing fast relay speeds with over 99.9% uptime and zero throttling.',
          fontSize: '15px',
          color: '#171c22',
          paddingY: 8,
          paddingX: 24
        }
      },
      {
        id: 'el-btn-l1',
        type: 'button',
        properties: {
          text: 'Read API Docs',
          url: 'https://igi-smtp.com/docs',
          bg: '#121c2b',
          color: '#ffffff',
          paddingY: 12,
          paddingX: 24,
          cornerRadius: 6
        }
      }
    ]
  },
  {
    id: 'tmpl-alert',
    name: 'System Alert',
    description: 'Transactional template for critical infrastructure notifications.',
    thumbnailAlt: 'System Alert Mockup',
    thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkAzQSYdYkEZ40s-716WPBM-PX9vORg4Q5FkNaKLIGxvWjMKevOivh02nobDJzCKbLMYsj-IB9BLHeJD8L9dx97UJhnTJxOAAG5Egme1gM9--TUZJp2BOT_xNq830N2VMcUhhYG2GJIH4OV-7kUS78XXNQA0xzD8fKz0jYAPPzdKR4QDnXzY-2KK91EvCt12n35T-i-EOGYn7HYCNU1WHCa0xBWLTI83NSQ8Dcd3WIDQFOOWlaqWnbWTm998-EZiquBP4RgdIsCkg',
    elements: [
      {
        id: 'el-text-a1',
        type: 'text',
        properties: {
          text: '⚠️ INFRASTRUCTURE WARNING',
          fontSize: '20px',
          color: '#ba1a1a',
          paddingY: 12,
          paddingX: 16
        }
      },
      {
        id: 'el-text-a2',
        type: 'text',
        properties: {
          text: 'Automatic bounce threshold exceeded on node IP-10.42.1. Please inspect your recipient list for clean email syntax immediately.',
          fontSize: '14px',
          color: '#410002',
          paddingY: 10,
          paddingX: 16
        }
      }
    ]
  },
  {
    id: 'tmpl-blank',
    name: 'Blank Canvas',
    description: 'Full creative control with our drag-and-drop builder.',
    thumbnailAlt: 'Blank Canvas Mockup',
    thumbnailUrl: '',
    elements: []
  }
];
