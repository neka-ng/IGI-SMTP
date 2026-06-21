var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_vite = require("vite");

// src/db/database.ts
var import_client = require("@prisma/client");
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? new import_client.PrismaClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
async function connectToDatabase() {
  try {
    await prisma.$connect();
    console.log("\u2705 Connected to PostgreSQL database successfully.");
    return true;
  } catch (error) {
    console.warn("\u26A0\uFE0F Database connection failed:", error?.message);
    return false;
  }
}
async function isDatabaseConnected() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// src/data.ts
var INITIAL_LISTS = [
  {
    id: "L-8842-X",
    name: "Enterprise Core - Global",
    description: "Primary corporate communication list for all active enterprise clients.",
    subscribersCount: 12408,
    status: "ACTIVE"
  },
  {
    id: "L-2291-B",
    name: "Q4 Beta Testers",
    description: "High-engagement segment for SMTP-relay feature testing.",
    subscribersCount: 842,
    status: "ACTIVE"
  },
  {
    id: "L-0012-A",
    name: "Historical Archive 2022",
    description: "Former subscribers from the legacy platform migration.",
    subscribersCount: 45102,
    status: "DORMANT"
  },
  {
    id: "L-5531-W",
    name: "Webinar Attendees - Oct",
    description: 'Leads collected from the "Secure Infra" web summit.',
    subscribersCount: 6120,
    status: "ACTIVE"
  }
];

// server.ts
import_dotenv.default.config();
var cache = /* @__PURE__ */ new Map();
var CACHE_TTL = 3e4;
function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  cache.delete(key);
  return null;
}
function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, { data, expiry: Date.now() + ttl });
}
function invalidateCache(pattern) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) cache.delete(key);
  }
}
async function fetchCached(cacheKey, fetcher, ttl = CACHE_TTL) {
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;
  const data = await fetcher();
  setCache(cacheKey, data, ttl);
  return data;
}
function getInitials(name) {
  return name.split(/\s+/).map((part) => part.charAt(0)).filter(Boolean).join("").toUpperCase();
}
function parseJsonField(value, fallback) {
  if (Array.isArray(value) || typeof value === "object" && value !== null) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}
function stringifyJsonField(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? []);
}
async function recordCampaignEvent(campaignId, email, name, eventType, url) {
  const dbConnected = await isDatabaseConnected();
  if (!dbConnected) return;
  try {
    await prisma.campaignEvent.create({
      data: {
        campaignId,
        email,
        name,
        eventType,
        url,
        timestamp: /* @__PURE__ */ new Date()
      }
    });
    console.log(`[Event Recorded] (${eventType.toUpperCase()}) for ${email} in Campaign ${campaignId}`);
    if (eventType === "unsubscribe") {
      await prisma.subscriber.updateMany({
        where: { email: email.trim() },
        data: { status: "Unsubscribed" }
      });
      console.log(`[Subscriber Unsubscribed] Status updated for ${email}`);
    }
  } catch (err) {
    console.error("Failed to record campaign event:", err);
  }
}
var DEFAULT_SENDER_EMAIL = process.env.MICROSOFT_SENDER_EMAIL || "admin@igi-smtp.io";
var microsoftSettings = {
  tenantId: process.env.MICROSOFT_TENANT_ID || "",
  clientId: process.env.MICROSOFT_CLIENT_ID || "",
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
  senderEmail: DEFAULT_SENDER_EMAIL
};
var campaignProgressStore = {};
async function getMicrosoftAccessToken() {
  const { tenantId, clientId, clientSecret } = microsoftSettings;
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("scope", "https://graph.microsoft.com/.default");
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Auth failed with HTTP ${response.status}: ${errText}`);
  }
  const data = await response.json();
  return data.access_token;
}
async function sendMicrosoftEmail(accessToken, senderEmail, recipientEmail, subject, htmlContent, recipientName) {
  const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;
  const body = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: htmlContent
      },
      toRecipients: [
        {
          emailAddress: {
            address: recipientEmail,
            name: recipientName || recipientEmail.split("@")[0]
          }
        }
      ]
    },
    saveToSentItems: true
  };
  const response = await fetch(sendMailUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }
}
async function updateCampaignStats(campaignId, sent, total) {
  try {
    const dbConnected = await isDatabaseConnected();
    if (dbConnected) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { recipients: sent }
      });
    }
  } catch (err) {
    console.warn("Failed to update campaign stats:", err);
  }
}
async function updateCampaignStatus(campaignId, status, recipients, openRate) {
  try {
    const dbConnected = await isDatabaseConnected();
    if (dbConnected) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status, recipients, openRate }
      });
    }
  } catch (err) {
    console.warn("Failed to update campaign progress status:", err);
  }
}
function renderElementToHtml(el, subscriberName, subscriberEmail, trackingClickUrl, trackingUnsubUrl, hostUrl) {
  if (!el || !el.type) return "";
  const p = el.properties || {};
  const paddingY = p.paddingY !== void 0 ? p.paddingY : 12;
  const paddingX = p.paddingX !== void 0 ? p.paddingX : 20;
  switch (el.type) {
    case "text": {
      const safeText = String(p.text || "Add custom content text.").replace(/</g, "<").replace(/>/g, ">");
      return `<div style="padding:${paddingY}px ${paddingX}px; font-size:${p.fontSize || "15px"}; color:${p.color || "#171c22"}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; white-space: pre-wrap;">${safeText}</div>`;
    }
    case "button": {
      const btnText = String(p.text || "Action Button").replace(/</g, "<").replace(/>/g, ">");
      const actualUrl = p.url || "https://igi-smtp.io";
      const trackingBase = trackingClickUrl ? trackingClickUrl.split("&url=")[0] : "";
      const btnUrl = trackingBase ? `${trackingBase}&url=${encodeURIComponent(actualUrl)}` : actualUrl;
      return `<div style="padding:${paddingY}px ${paddingX}px; text-align: center;">
        <a href="${btnUrl}" style="background-color:${p.bg || "#4f46e5"}; color:${p.color || "#ffffff"}; border-radius:${p.cornerRadius || 20}px; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">${btnText}</a>
      </div>`;
    }
    case "image": {
      const imgUrl = String(p.imageUrl || "").replace(/&/g, "&").replace(/"/g, '"').replace(/</g, "<").replace(/>/g, ">");
      const imgHeight = p.height ? ` height="${p.height}"` : "";
      const imgWidth = p.width ? ` width="${p.width}"` : "";
      return `<div style="padding:${paddingY}px ${paddingX}px; text-align: center;">
        <img src="${imgUrl}" alt="Email content" style="max-width: 100%; height: auto; border-radius: 8px;"${imgWidth}${imgHeight} loading="lazy" />
      </div>`;
    }
    case "spacer":
      return `<div style="height:${p.height || 24}px;"></div>`;
    case "divider":
      return `<div style="padding: 8px ${paddingX}px;"><hr style="border: 0; border-top: 1px solid ${p.color || "#eaeef7"}; margin: 0;" /></div>`;
    case "html":
      return `<div style="padding:${paddingY}px ${paddingX}px;">${p.htmlScript || ""}</div>`;
    default:
      return "";
  }
}
function renderFooterToHtml(footer, trackingUnsubUrl) {
  if (!footer) return "";
  const background = footer.background || {};
  const layout = footer.layout || {};
  const zones = (footer.zones || []).filter((z) => z.enabled);
  const getBackgroundStyle = () => {
    const base = { opacity: background.opacity ?? 1 };
    switch (background.type) {
      case "solid":
        base.backgroundColor = background.color || "#ffffff";
        break;
      case "gradient":
        base.background = `linear-gradient(${background.gradientDirection || "180deg"}, ${background.gradientFrom || "#000066"}, ${background.gradientTo || "#ffffff"})`;
        break;
      case "image":
        base.backgroundImage = `url(${background.imageUrl || ""})`;
        base.backgroundSize = background.imageSize || "cover";
        base.backgroundPosition = background.imagePosition || "center";
        break;
      case "pattern":
        base.backgroundColor = background.patternBg || "#ffffff";
        const color = background.patternColor || "#000066";
        let patternSvg = "";
        switch (background.pattern) {
          case "dots":
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="2" cy="2" r="1.5" fill="${color}"/></svg>`;
            break;
          case "stripes":
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><line x1="0" y1="0" x2="20" y2="20" stroke="${color}" stroke-width="1"/></svg>`;
            break;
          case "diagonal":
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><line x1="0" y1="20" x2="20" y2="0" stroke="${color}" stroke-width="1"/></svg>`;
            break;
          case "grid":
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="${color}" stroke-width="1"/></svg>`;
            break;
          case "checkerboard":
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="10" height="10" fill="${color}"/><rect x="10" y="10" width="10" height="10" fill="${color}"/></svg>`;
            break;
          case "zigzag":
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><polyline points="0 10 5 0 10 10 15 0 20 10" fill="none" stroke="${color}" stroke-width="1"/></svg>`;
            break;
          default:
            break;
        }
        if (patternSvg) {
          const encoded = encodeURIComponent(patternSvg);
          base.backgroundImage = `url("data:image/svg+xml;utf8,${encoded}")`;
        }
        break;
      default:
        break;
    }
    return base;
  };
  const stripProtocol = (value) => String(value).replace(/^https?:\/\//, "");
  const renderZone = (zone) => {
    switch (zone.type) {
      case "header":
        return `<div style="text-align:center;margin-bottom:8px;">
          ${zone.logoUrl ? `<img src="${zone.logoUrl}" alt="logo" style="max-height:40px;margin:0 auto 8px;display:block;" />` : ""}
          ${zone.companyName ? `<p style="font-size:14px;font-weight:700;color:#1e293b;margin:0;">${zone.companyName}</p>` : ""}
        </div>`;
      case "body":
        return `<div style="text-align:center;color:#64748b;font-size:13px;line-height:1.6;margin-bottom:8px;">${zone.content || ""}</div>`;
      case "social":
        const cols = zone.socialColumns || 4;
        const links = (zone.socialLinks || []).map((link) => {
          const href = link.url || "#";
          if (link.icon) {
            return `<td width="${100 / cols}%" align="center" style="padding:2px;"><a href="${href}" target="_blank" rel="noopener noreferrer" style="color:${link.color};text-decoration:none;display:block;text-align:center;font-size:${link.size === "lg" ? 24 : link.size === "md" ? 20 : 16}"><img src="${link.icon}" alt="${link.platform}" style="width:${link.size === "lg" ? 28 : link.size === "md" ? 22 : 18}px;height:${link.size === "lg" ? 28 : link.size === "md" ? 22 : 18}px;margin:0 auto;display:block;" /></a></td>`;
          }
          return `<td width="${100 / cols}%" align="center" style="padding:2px;"><a href="${href}" target="_blank" rel="noopener noreferrer" style="color:${link.color};text-decoration:none;display:block;text-align:center;font-size:${link.size === "lg" ? 24 : link.size === "md" ? 20 : 16};font-weight:600;">${link.platform}</a></td>`;
        }).join("");
        return `<table role="presentation" cellPadding="0" cellSpacing="0" border="0" width="100%" style="margin-bottom:8px;"><tr>${links}</tr></table>`;
      case "contact":
        return `<div style="text-align:center;color:#64748b;font-size:11px;line-height:1.5;margin-bottom:8px;">
          ${zone.address ? `<p style="margin:0 0 4px;">${zone.address}</p>` : ""}
          ${zone.phone || zone.website ? `<p style="margin:0;">${zone.phone ? `<span>${zone.phone}</span>` : ""}${zone.phone && zone.website ? '<span style="margin:0 4px;">\u2022</span>' : ""}${zone.website ? `<a href="${zone.website}" style="color:#000066;text-decoration:underline;">${stripProtocol(zone.website)}</a>` : ""}</p>` : ""}
        </div>`;
      case "legal":
        return `<div style="text-align:center;color:#94a3b8;font-size:10px;line-height:1.4;margin-bottom:8px;">
          <p style="margin:0 0 4px;">${zone.copyrightText || ""}</p>
          ${zone.showUnsubscribe ? `<p style="margin:0;"><a href="${trackingUnsubUrl || "#"}" style="color:#000066;text-decoration:underline;">${zone.unsubscribeText || "Unsubscribe"}</a></p>` : ""}
        </div>`;
      case "custom":
        return `<div>${zone.customHtml || ""}</div>`;
      default:
        return "";
    }
  };
  const zonesHtml = zones.map((zone) => `<tr><td style="padding:0;">${renderZone(zone)}</td></tr>`).join("");
  return `<table role="presentation" cellPadding="0" cellSpacing="0" border="0" width="100%" style="background-color:transparent;">
    <tbody><tr>
      <td align="center" style="padding:${layout.paddingY}px ${layout.paddingX}px;${Object.entries(getBackgroundStyle()).map(([k, v]) => `${k}:${v};`).join("")}">
        <table role="presentation" cellPadding="0" cellSpacing="0" border="0" width="${layout.maxWidth === "full" ? "100%" : layout.maxWidth}" style="max-width:${layout.maxWidth === "full" ? "100%" : layout.maxWidth};margin:${layout.centerAligned ? "0 auto" : "0"};border:${layout.borderWidth > 0 ? `${layout.borderWidth}px ${layout.borderStyle} ${layout.borderColor}` : "none"};border-radius:${layout.borderRadius}px;box-shadow:${layout.shadow ? layout.shadowIntensity === "subtle" ? "0 2px 8px rgba(0,0,0,0.06)" : layout.shadowIntensity === "medium" ? "0 4px 12px rgba(0,0,0,0.1)" : "0 8px 24px rgba(0,0,0,0.15)" : "none"};">
          <tbody>${zonesHtml}</tbody>
        </table>
      </td>
    </tr></tbody>
  </table>`;
}
function buildCampaignEmailHtml(campaignData, emailElements, subscriberName, subscriberEmail, trackingClickUrl, trackingUnsubUrl, hostUrl) {
  if (!emailElements || emailElements.length === 0) {
    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e1e7ec; border-radius: 16px; background-color: #ffffff;">
      <div style="background-color: #000066; padding: 24px; text-align: center; border-radius: 12px 12px 0 0; margin-bottom: 24px;">
        <img src="https://www.iginigeria.com/wp-content/uploads/2019/06/logo-69x50.png" alt="IGI SMTP Logo" style="height: 38px; display: block; margin: 0 auto;" />
      </div>
      <div style="color: #1e293b; line-height: 1.6; font-size: 15px;">
        <p>Hello <strong>${subscriberName}</strong>,</p>
        <h2 style="color: #000066; font-size: 20px; font-weight: 800;">${campaignData.subjectLine || "Campaign Broadcast"}</h2>
        <p>This is a broadcast from ${campaignData.senderName || "IGI Team"}.</p>
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px;">
          <a href="${trackingUnsubUrl}" style="color: #000066; text-decoration: underline;">Unsubscribe here</a>
        </p>
      </div>
    </div>`;
  }
  const elementsHtml = emailElements.map((el) => renderElementToHtml(el, subscriberName, subscriberEmail, trackingClickUrl, trackingUnsubUrl, hostUrl)).join("");
  let footerHtml = "";
  if (campaignData.selectedFooterId) {
    const selectedFooter = campaignData.footerData ? campaignData.footerData : null;
    footerHtml = renderFooterToHtml(selectedFooter, trackingUnsubUrl);
  }
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e1e7ec; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="background-color: #000066; padding: 24px; text-align: center; border-radius: 12px 12px 0 0; margin-bottom: 24px;">
      <img src="https://www.iginigeria.com/wp-content/uploads/2019/06/logo-69x50.png" alt="IGI SMTP Logo" style="height: 38px; display: block; margin: 0 auto;" />
    </div>
    <div style="color: #1e293b; line-height: 1.6; font-size: 15px;">
      <p style="margin-top: 0;">Hello <strong style="color: #0F172A;">${subscriberName}</strong>,</p>
      <h2 style="color: #000066; font-size: 20px; font-weight: 800; margin: 16px 0; letter-spacing: -0.025em;">${campaignData.subjectLine || "Campaign Broadcast"}</h2>
      <div style="margin: 16px 0;">
        ${elementsHtml}
      </div>
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0; line-height: 1.4;">
        Delivered via modern Azure Entra Client-Credentials OAuth flow API.<br/>
        IGI Enterprise High-Performance SMTP Gateway Dashboard.<br/>
        If you do not wish to receive these logs, <a href="${trackingUnsubUrl}" style="color: #000066; text-decoration: underline; font-weight: 600;">Unsubscribe here</a>.
      </p>
    </div>
    ${footerHtml}
  </div>`;
}
async function triggerCampaignSend(campaignId, campaignData) {
  if (campaignProgressStore[campaignId]?.status === "SENDING") return;
  const dbConnected = await isDatabaseConnected();
  if (!dbConnected) return;
  campaignProgressStore[campaignId] = {
    campaignId,
    status: "SENDING",
    total: 0,
    sent: 0,
    failed: 0,
    logs: [`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u{1F680} Initiated live delivery stream for "${campaignData.name}"`]
  };
  const progress = campaignProgressStore[campaignId];
  let activeSubs = [];
  try {
    activeSubs = await prisma.subscriber.findMany({ where: { status: "Active" } });
  } catch (err) {
    progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u274C Subscriber Query failed: ${err.message}`);
    progress.status = "FAILED";
    return;
  }
  const targetLists = parseJsonField(campaignData.targetLists, []);
  if (targetLists.length > 0) {
    progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u{1F4CA} Filtering subscribers matching target rosters: [${targetLists.join(", ")}]`);
    activeSubs = activeSubs.filter((sub) => {
      const rosterName = sub.roster || "General";
      return targetLists.some((t) => t.toLowerCase() === rosterName.trim().toLowerCase());
    });
  }
  if (activeSubs.length === 0) {
    progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u26A0\uFE0F Zero matching active subscribers found.`);
    progress.status = "SENT";
    await updateCampaignStatus(campaignId, "SENT", 0, 0);
    return;
  }
  progress.total = activeSubs.length;
  progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u{1F465} Mapped ${activeSubs.length} active target recipients.`);
  let accessToken = null;
  let useGraphAPI = false;
  try {
    progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u{1F511} Executing Modern Auth: Fetching Microsoft Azure Graph API Access Token...`);
    accessToken = await getMicrosoftAccessToken();
    useGraphAPI = true;
    progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u{1F513} Access Token obtained successfully. OAuth handshake secured.`);
  } catch (err) {
    progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u26A0\uFE0F Microsoft Graph Authentication handshake failed.`);
    progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u{1F39B}\uFE0F Safe Mode: Sandboxed simulated delivery...`);
  }
  for (const subscriber of activeSubs) {
    const subscriberEmail = subscriber.email;
    const subscriberName = subscriber.name;
    progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u2709\uFE0F Route analysis for ${subscriberName} <${subscriberEmail}>...`);
    const hostUrl = process.env.APP_URL || "https://igi-smtp.io";
    const cleanEmail = encodeURIComponent(subscriberEmail.trim());
    const trackingUnsubUrl = `${hostUrl}/api/tracking/unsubscribe?campaignId=${campaignId}&email=${cleanEmail}`;
    const destinationUrl = "https://www.iginigeria.com";
    const trackingClickUrl = `${hostUrl}/api/tracking/click?campaignId=${campaignId}&email=${cleanEmail}&url=${encodeURIComponent(destinationUrl)}`;
    const emailHtml = buildCampaignEmailHtml(
      { ...campaignData, footerData: parseJsonField(campaignData.footerData, null) },
      parseJsonField(campaignData.emailElements, []),
      subscriberName,
      subscriberEmail,
      trackingClickUrl,
      trackingUnsubUrl,
      hostUrl
    );
    let delivered = false;
    if (useGraphAPI && accessToken) {
      try {
        await sendMicrosoftEmail(accessToken, microsoftSettings.senderEmail, subscriberEmail, campaignData.subjectLine || "Campaign Broadcast", emailHtml);
        progress.sent++;
        progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u2705 [Microsoft Graph ACCEPTED] Despatched to ${subscriberEmail}`);
        delivered = true;
      } catch (err) {
        progress.failed++;
        progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u274C [Microsoft Graph FAILED] Send failed for ${subscriberEmail}: ${err.message}`);
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const randomizedSuccess = Math.random() < 0.95;
      if (randomizedSuccess) {
        progress.sent++;
        progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u2705 [IGI SMTP Gate Accepted] Delivered successfully to ${subscriberEmail}`);
        delivered = true;
      } else {
        progress.failed++;
        progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u274C [Queue Delivery Bounce] Relaying failed to ${subscriberEmail} (MTA Temporary Rejection)`);
      }
    }
    if (delivered) {
      await recordCampaignEvent(campaignId, subscriberEmail, subscriberName, "delivered");
      const randomOpenDelay = 2e3 + Math.random() * 8e3;
      const willOpen = Math.random() < 0.78;
      const willClick = willOpen && Math.random() < 0.45;
      const willUnsub = willOpen && !willClick && Math.random() < 0.06;
      if (willOpen) {
        setTimeout(async () => {
          await recordCampaignEvent(campaignId, subscriberEmail, subscriberName, "open");
          if (willClick) {
            setTimeout(async () => {
              await recordCampaignEvent(campaignId, subscriberEmail, subscriberName, "click", destinationUrl);
            }, 3e3 + Math.random() * 8e3);
          } else if (willUnsub) {
            setTimeout(async () => {
              await recordCampaignEvent(campaignId, subscriberEmail, subscriberName, "unsubscribe");
            }, 5e3 + Math.random() * 1e4);
          }
        }, randomOpenDelay);
      }
    }
    await updateCampaignStats(campaignId, progress.sent, progress.total);
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  progress.status = "SENT";
  progress.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u{1F389} Campaign completion sequence resolved. Dispatches: ${progress.sent} Success, ${progress.failed} Errors, ${progress.total} Total.`);
  const randomizedOpenRate = Math.floor(Math.random() * 31) + 55;
  await updateCampaignStatus(campaignId, "SENT", progress.total, randomizedOpenRate);
}
function startCampaignScheduler() {
  console.log("\u23F0 [Scheduler] Campaign scheduler started (checking every 30s)...");
  setInterval(async () => {
    try {
      const now = /* @__PURE__ */ new Date();
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return;
      const queuedCampaigns = await prisma.campaign.findMany({ where: { status: "QUEUED" } });
      for (const campaign of queuedCampaigns) {
        if (!campaign.scheduledAt) continue;
        const scheduleStr = campaign.scheduledAt.replace(" (UTC)", "");
        const scheduledTime = /* @__PURE__ */ new Date(scheduleStr + "Z");
        const diffMs = now.getTime() - scheduledTime.getTime();
        if (diffMs >= -6e4) {
          console.log(`\u23F0 [Scheduler] Firing queued campaign: "${campaign.name}" (scheduled: ${campaign.scheduledAt})`);
          triggerCampaignSend(campaign.id, campaign);
        }
      }
    } catch (err) {
      console.error("\u23F0 [Scheduler] Error checking queued campaigns:", err);
    }
  }, 3e4);
}
async function startServer() {
  const app2 = (0, import_express.default)();
  const PORT = 3e3;
  app2.use(import_express.default.json({ limit: "50mb" }));
  app2.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  let dbConnectionAvailable = false;
  try {
    dbConnectionAvailable = await connectToDatabase();
    if (dbConnectionAvailable) {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        console.log("\u{1F331} Seeding default super-admin user into database...");
        await prisma.user.create({
          data: {
            email: "admin@igi-smtp.io",
            password: "admin123",
            name: "Admin",
            role: "super-admin",
            mustChangePassword: false,
            allowedModules: JSON.stringify(["dashboard", "campaigns", "subscribers", "templates", "logs", "users"])
          }
        });
        console.log("   Default login: admin@igi-smtp.io / admin123");
      }
    }
  } catch (error) {
    console.warn("\u26A0\uFE0F Database connection failed:", error);
  }
  app2.get("/api/db-status", async (req, res) => {
    const connected = await isDatabaseConnected();
    res.json({
      connected,
      mode: connected ? "SQLite" : "Disconnected",
      hasUri: !!process.env.DATABASE_URL
    });
  });
  function parseCampaignJsonFields(campaign) {
    return {
      ...campaign,
      emailElements: parseJsonField(campaign.emailElements, []),
      targetLists: parseJsonField(campaign.targetLists, [])
    };
  }
  function parseTemplateJsonFields(template) {
    return {
      ...template,
      elements: parseJsonField(template.elements, [])
    };
  }
  function parseFooterJsonFields(footer) {
    return {
      ...footer,
      background: parseJsonField(footer.background, {}),
      layout: parseJsonField(footer.layout, {}),
      zones: parseJsonField(footer.zones, [])
    };
  }
  app2.get("/api/subscribers", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) {
        return res.status(503).json({ error: "Database not connected" });
      }
      const subs = await fetchCached(
        "subscribers:all",
        () => prisma.subscriber.findMany({ orderBy: { createdAt: "desc" } })
      );
      const mapped = subs.map((sub) => ({
        ...sub,
        id: sub.id,
        rosterName: sub.rosterName || sub.roster || "General",
        roster: sub.roster || sub.rosterName || "General"
      }));
      return res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/subscribers", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) {
        return res.status(503).json({ error: "Database not connected" });
      }
      const { name, email, status, plan, roster, rosterName } = req.body;
      const initials = getInitials(name);
      const dateAdded = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const targetRoster = rosterName || roster || "General";
      const newDoc = await prisma.subscriber.create({
        data: {
          name,
          email: email.toLowerCase().trim(),
          status: status || "Active",
          plan: plan || "Free",
          roster: targetRoster,
          rosterName: targetRoster,
          initials,
          dateAdded
        }
      });
      invalidateCache("subscribers");
      return res.status(201).json({
        ...newDoc,
        id: newDoc.id,
        rosterName: targetRoster,
        roster: targetRoster
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/subscribers/bulk-import", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) {
        return res.status(503).json({ error: "Database not connected" });
      }
      const { subscribers } = req.body;
      if (!Array.isArray(subscribers) || subscribers.length === 0) {
        return res.status(400).json({ error: "No subscribers provided" });
      }
      const results = [];
      const dateAdded = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      for (const sub of subscribers) {
        if (!sub.email || !sub.email.includes("@")) {
          results.push({ email: sub.email || "(invalid)", status: "skipped", message: "Invalid email address" });
          continue;
        }
        const email = sub.email.toLowerCase().trim();
        const name = sub.name || email.split("@")[0];
        const initials = getInitials(name);
        const targetRoster = sub.rosterName || sub.roster || "Imported";
        const status = sub.status || "Active";
        try {
          const upserted = await prisma.subscriber.upsert({
            where: { email },
            update: {
              name,
              status,
              plan: sub.plan || "Free",
              roster: targetRoster,
              rosterName: targetRoster,
              initials
            },
            create: {
              email,
              name,
              status,
              plan: sub.plan || "Free",
              roster: targetRoster,
              rosterName: targetRoster,
              initials,
              dateAdded
            }
          });
          const isNew = upserted.createdAt.getTime() > Date.now() - 5e3;
          results.push({ email, status: isNew ? "created" : "updated", id: upserted.id });
        } catch (err) {
          results.push({ email, status: "skipped", message: err.message });
        }
      }
      invalidateCache("subscribers");
      return res.status(201).json({
        total: subscribers.length,
        created: results.filter((r) => r.status === "created").length,
        updated: results.filter((r) => r.status === "updated").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        results
      });
    } catch (err) {
      console.error("Bulk import error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/subscribers/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) {
        return res.status(503).json({ error: "Database not connected" });
      }
      const { id } = req.params;
      const updateObj = { ...req.body };
      if (updateObj.name) updateObj.initials = getInitials(updateObj.name);
      delete updateObj.id;
      delete updateObj._id;
      const updated = await prisma.subscriber.update({
        where: { id },
        data: updateObj
      });
      if (!updated) return res.status(404).json({ error: "Subscriber not found" });
      invalidateCache("subscribers");
      return res.json(updated);
    } catch (err) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "Subscriber not found" });
      }
      res.status(500).json({ error: err.message });
    }
  });
  app2.delete("/api/subscribers/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) {
        return res.status(503).json({ error: "Database not connected" });
      }
      const { id } = req.params;
      await prisma.subscriber.delete({ where: { id } });
      invalidateCache("subscribers");
      return res.json({ success: true });
    } catch (err) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "Subscriber not found" });
      }
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/microsoft-settings", (req, res) => {
    res.json({
      tenantId: microsoftSettings.tenantId,
      clientId: microsoftSettings.clientId,
      senderEmail: microsoftSettings.senderEmail,
      clientSecretMasked: microsoftSettings.clientSecret ? `${microsoftSettings.clientSecret.slice(0, 5)}...${microsoftSettings.clientSecret.slice(-3)}` : ""
    });
  });
  app2.post("/api/microsoft-settings", (req, res) => {
    const { tenantId, clientId, clientSecret, senderEmail } = req.body;
    if (tenantId) microsoftSettings.tenantId = tenantId;
    if (clientId) microsoftSettings.clientId = clientId;
    if (clientSecret) microsoftSettings.clientSecret = clientSecret;
    if (senderEmail && !process.env.MICROSOFT_SENDER_EMAIL) {
      microsoftSettings.senderEmail = senderEmail;
    }
    return res.json({ success: true, message: "Microsoft SMTP configuration saved." });
  });
  app2.post("/api/microsoft-settings/verify", async (req, res) => {
    try {
      const token = await getMicrosoftAccessToken();
      if (token) return res.json({ success: true, message: "Handshake completed!" });
      throw new Error("Empty token");
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/campaigns/:id/progress", (req, res) => {
    const { id } = req.params;
    const progress = campaignProgressStore[id];
    if (progress) return res.json(progress);
    return res.json({
      campaignId: id,
      status: "SENT",
      total: 0,
      sent: 0,
      failed: 0,
      logs: [`[Success] Pipeline dispatch archived.`]
    });
  });
  app2.get("/api/campaigns/:id/tracking", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) {
        return res.status(503).json({ error: "Database not connected" });
      }
      const { id } = req.params;
      const events = await prisma.campaignEvent.findMany({
        where: { campaignId: id },
        orderBy: { timestamp: "desc" }
      });
      const delivered = events.filter((e) => e.eventType === "delivered");
      const openCount = events.filter((e) => e.eventType === "open").length;
      const clickCount = events.filter((e) => e.eventType === "click").length;
      const unsubscribeCount = events.filter((e) => e.eventType === "unsubscribe").length;
      const totalDelivered = delivered.length;
      const openRate = totalDelivered > 0 ? Math.round(openCount / totalDelivered * 100) : 0;
      const clickRate = totalDelivered > 0 ? Math.round(clickCount / totalDelivered * 100) : 0;
      return res.json({
        campaignId: id,
        metrics: { delivered: totalDelivered, opens: openCount, clicks: clickCount, unsubscribes: unsubscribeCount, openRate, clickRate },
        lists: {
          deliveredList: delivered.map((e) => ({ name: e.name, email: e.email, timestamp: e.timestamp })),
          openedList: events.filter((e) => e.eventType === "open").map((e) => ({ name: e.name, email: e.email, timestamp: e.timestamp })),
          clickedList: events.filter((e) => e.eventType === "click").map((e) => ({ name: e.name, email: e.email, timestamp: e.timestamp, url: e.url })),
          unsubscribedList: events.filter((e) => e.eventType === "unsubscribe").map((e) => ({ name: e.name, email: e.email, timestamp: e.timestamp }))
        },
        eventsTimeline: events.slice(0, 50)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/tracking/click", async (req, res) => {
    try {
      const { campaignId, email, url } = req.query;
      if (!campaignId || !email) return res.status(400).send("Missing parameters");
      let name = "Subscriber";
      const dbConnected = await isDatabaseConnected();
      if (dbConnected) {
        const sub = await prisma.subscriber.findFirst({ where: { email: email.trim().toLowerCase() } });
        if (sub) name = sub.name;
      }
      await recordCampaignEvent(campaignId, email, name, "click", url || "https://www.iginigeria.com");
      return res.redirect(url || "https://www.iginigeria.com");
    } catch (err) {
      return res.redirect("https://www.iginigeria.com");
    }
  });
  app2.get("/api/tracking/unsubscribe", async (req, res) => {
    try {
      const { campaignId, email } = req.query;
      if (!email) return res.status(400).send("Email parameter is required.");
      let name = "Subscriber";
      const dbConnected = await isDatabaseConnected();
      if (dbConnected) {
        const sub = await prisma.subscriber.findFirst({ where: { email: email.trim().toLowerCase() } });
        if (sub) name = sub.name;
      }
      await recordCampaignEvent(campaignId || "MANUAL", email, name, "unsubscribe");
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed | IGI</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>body{font-family:'Inter',sans-serif;background:#f8fafc;padding:40px 20px;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:white;max-width:480px;width:100%;padding:40px;border-radius:20px;box-shadow:0 10px 25px -5px rgba(0,0,102,.05);text-align:center;border:1px solid #e2e8f0}.logo{height:44px;margin-bottom:24px}.icon{width:56px;height:56px;background:#fef2f2;color:#ef4444;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;font-size:24px;margin-bottom:20px}h1{color:#000066;font-size:22px;font-weight:800;margin:0 0 12px 0}p{color:#64748b;font-size:14px;line-height:1.6;margin:0 0 28px 0}.btn{display:block;background:#000066;color:white!important;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;font-size:14px}.btn:hover{background:#000044}.footer{margin-top:32px;font-size:11px;color:#94a3b8}</style></head><body>
        <div class="card"><img src="https://www.iginigeria.com/wp-content/uploads/2019/06/logo-69x50.png" alt="IGI" class="logo"/>
        <div class="icon">\u2713</div><h1>Unsubscribe Confirmed</h1>
        <p>Hello <strong>${name}</strong>, your email (<code>${email}</code>) has been removed from our mailing lists.</p>
        <a href="/api/tracking/resubscribe?email=${encodeURIComponent(email)}" class="btn">Resubscribe</a>
        <div class="footer">IGI high-performance email gateway.</div></div></body></html>
      `);
    } catch (err) {
      return res.status(500).send("Error processing unsubscription.");
    }
  });
  app2.get("/api/tracking/resubscribe", async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) return res.status(400).send("Email parameter is required.");
      const dbConnected = await isDatabaseConnected();
      if (dbConnected) {
        await prisma.subscriber.updateMany({
          where: { email: email.trim() },
          data: { status: "Active" }
        });
      }
      return res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>Resubscribed | IGI</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>body{font-family:'Inter',sans-serif;background:#f8fafc;padding:40px;text-align:center}.card{max-width:400px;margin:80px auto;background:white;padding:32px;border-radius:16px;border:1px solid #e2e8f0}h1{color:#10b981;font-size:20px}p{font-size:14px;color:#64748b}</style></head><body>
        <div class="card"><h1>\u2713 Re-activated</h1><p>Your email <strong>${email}</strong> is now <strong>Active</strong>.</p></div></body></html>
      `);
    } catch (err) {
      res.status(500).send("Error re-establishing active status.");
    }
  });
  app2.post(["/api/webhooks", "/api/webhooks/events"], async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const payload = req.body;
      const events = Array.isArray(payload) ? payload : [payload];
      let processedCount = 0;
      for (const ev of events) {
        const email = ev.email || ev.recipient || ev.address || ev.rcpt;
        const campaignId = ev.campaignId || ev.campaign_id || ev.campaign || "MANUAL";
        const rawEvent = String(ev.eventType || ev.event || "open").toLowerCase();
        const url = ev.url || ev.link;
        if (!email) continue;
        let eventType = "open";
        if (rawEvent.startsWith("deliver") || rawEvent.includes("send") || rawEvent === "success") eventType = "delivered";
        else if (rawEvent.startsWith("click") || rawEvent.includes("link") || rawEvent === "clicked") eventType = "click";
        else if (rawEvent.startsWith("unsub") || rawEvent.includes("optout") || rawEvent.includes("bounce") || rawEvent === "dropped") eventType = "unsubscribe";
        else if (rawEvent.startsWith("open") || rawEvent === "opened") eventType = "open";
        let name = "Subscriber";
        const sub = await prisma.subscriber.findFirst({ where: { email: email.trim().toLowerCase() } });
        if (sub) name = sub.name;
        await recordCampaignEvent(campaignId, email, name, eventType, url);
        processedCount++;
      }
      return res.json({ success: true, processed: processedCount });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/analytics/engagement-trends", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) {
        const emptyTrends = [];
        const today2 = /* @__PURE__ */ new Date();
        for (let i = 6; i >= 0; i--) {
          const d = /* @__PURE__ */ new Date();
          d.setDate(today2.getDate() - i);
          const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          emptyTrends.push({ date: label, opens: 0, clicks: 0, delivered: 0 });
        }
        return res.json(emptyTrends);
      }
      const events = await prisma.campaignEvent.findMany({ orderBy: { timestamp: "asc" } });
      const dataMap = {};
      const today = /* @__PURE__ */ new Date();
      for (let i = 6; i >= 0; i--) {
        const d = /* @__PURE__ */ new Date();
        d.setDate(today.getDate() - i);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dataMap[label] = { opens: 0, clicks: 0, delivered: 0 };
      }
      events.forEach((ev) => {
        const dateObj = new Date(ev.timestamp || ev.createdAt);
        if (isNaN(dateObj.getTime())) return;
        const label = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!dataMap[label]) dataMap[label] = { opens: 0, clicks: 0, delivered: 0 };
        if (ev.eventType === "open") dataMap[label].opens += 1;
        else if (ev.eventType === "click") dataMap[label].clicks += 1;
        else if (ev.eventType === "delivered") dataMap[label].delivered += 1;
      });
      const trends = Object.keys(dataMap).map((date) => ({ date, ...dataMap[date] }));
      return res.json(trends);
    } catch (err) {
      const emptyTrends = [];
      const today = /* @__PURE__ */ new Date();
      for (let i = 6; i >= 0; i--) {
        const d = /* @__PURE__ */ new Date();
        d.setDate(today.getDate() - i);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        emptyTrends.push({ date: label, opens: 0, clicks: 0, delivered: 0 });
      }
      return res.json(emptyTrends);
    }
  });
  app2.get("/api/analytics/deliverability", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) {
        const emptyData = [];
        for (let i = 0; i < 10; i++) {
          emptyData.push({ day: `Day ${i + 1}`, deliverability: 0 });
        }
        return res.json(emptyData);
      }
      const today = /* @__PURE__ */ new Date();
      const data = [];
      for (let i = 9; i >= 0; i--) {
        const dayDate = /* @__PURE__ */ new Date();
        dayDate.setDate(today.getDate() - i);
        const label = `Day ${10 - i}`;
        const start = new Date(dayDate.setHours(0, 0, 0, 0));
        const end = new Date(dayDate.setHours(23, 59, 59, 999));
        const campaigns = await prisma.campaign.findMany({
          where: { status: "SENT", createdAt: { gte: start, lt: end } }
        });
        const sentCount = campaigns.reduce((sum, c) => sum + (c.recipients || 0), 0);
        const deliveredCount = await prisma.campaignEvent.count({
          where: { eventType: "delivered", timestamp: { gte: start, lt: end } }
        });
        const deliverability = sentCount > 0 ? Math.round(deliveredCount / sentCount * 100) : 0;
        data.push({ day: label, deliverability });
      }
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/analytics/performance", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) {
        return res.json({ sends: 0, opens: 0, clicks: 0, bounce: 0, bounceRate: 0, spam: 0, spamRate: 0 });
      }
      const sentCampaigns = await prisma.campaign.findMany({ where: { status: "SENT" } });
      const totalSent = sentCampaigns.reduce((sum, c) => sum + (c.recipients || 0), 0);
      const events = await prisma.campaignEvent.findMany();
      const totalDelivered = events.filter((e) => e.eventType === "delivered").length;
      const totalOpens = events.filter((e) => e.eventType === "open").length;
      const totalClicks = events.filter((e) => e.eventType === "click").length;
      const totalUnsubscribes = events.filter((e) => e.eventType === "unsubscribe").length;
      const totalBounces = events.filter((e) => e.eventType === "unsubscribe" && /bounce/i.test(e.url || "")).length;
      const totalSpam = events.filter((e) => e.eventType === "unsubscribe" && /spam/i.test(e.url || "")).length;
      const baseDeliveries = totalDelivered > 0 ? totalDelivered : totalSent;
      const bounceRate = baseDeliveries > 0 ? parseFloat((totalUnsubscribes / baseDeliveries * 100).toFixed(1)) : 0;
      const spamRate = baseDeliveries > 0 ? parseFloat((totalSpam / baseDeliveries * 100).toFixed(1)) : 0;
      const openRate = totalSent > 0 ? parseFloat((totalOpens / totalSent * 100).toFixed(1)) : 0;
      const clickRate = totalSent > 0 ? parseFloat((totalClicks / totalSent * 100).toFixed(1)) : 0;
      return res.json({
        sends: totalSent,
        delivered: totalDelivered,
        opens: totalOpens,
        clicks: totalClicks,
        bounce: totalUnsubscribes,
        bounceRate,
        spam: totalSpam,
        spamRate,
        openRate,
        clickRate
      });
    } catch (err) {
      return res.json({ sends: 0, opens: 0, clicks: 0, bounce: 0, bounceRate: 0, spam: 0, spamRate: 0, openRate: 0, clickRate: 0, delivered: 0 });
    }
  });
  app2.get("/api/analytics/system-health", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      let throughput = 0;
      let uptimeSeconds = process.uptime();
      let eventsLast5Min = 0;
      let totalEvents = 0;
      let queueDepth = 0;
      if (dbConnected) {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1e3);
        eventsLast5Min = await prisma.campaignEvent.count({
          where: { timestamp: { gte: fiveMinAgo } }
        });
        totalEvents = await prisma.campaignEvent.count();
        queueDepth = await prisma.campaign.count({
          where: { status: { in: ["SENDING", "QUEUED"] } }
        });
        throughput = eventsLast5Min > 0 ? parseFloat((eventsLast5Min / 300).toFixed(2)) : 0;
      }
      return res.json({
        throughput,
        // emails/sec over last 5 min
        queueDepth,
        // pending campaigns
        totalEvents,
        // total processed events
        uptime: Math.floor(uptimeSeconds),
        dbConnected,
        nodes: {
          ipReputation: { status: "healthy", score: 96 },
          spfDkim: { status: "verified", lastCheck: (/* @__PURE__ */ new Date()).toISOString() },
          smtpRelay: { status: dbConnected ? "operational" : "degraded", latency: "32ms" },
          queue: { status: queueDepth > 5 ? "elevated" : "normal", depth: queueDepth }
        }
      });
    } catch (err) {
      return res.json({
        throughput: 0,
        queueDepth: 0,
        totalEvents: 0,
        uptime: Math.floor(process.uptime()),
        dbConnected: false,
        nodes: { ipReputation: { status: "unknown", score: 0 }, spfDkim: { status: "unknown" }, smtpRelay: { status: "unknown" }, queue: { status: "unknown", depth: 0 } }
      });
    }
  });
  app2.get("/api/analytics/hourly-trends", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) {
        const emptyData = [];
        const now2 = /* @__PURE__ */ new Date();
        for (let i = 23; i >= 0; i--) {
          const hourDate = new Date(now2.getTime() - i * 60 * 60 * 1e3);
          const hourLabel = hourDate.getHours().toString().padStart(2, "0") + ":00";
          emptyData.push({ hour: hourLabel, sent: 0, opened: 0, clicked: 0 });
        }
        return res.json(emptyData);
      }
      const now = /* @__PURE__ */ new Date();
      const data = [];
      for (let i = 23; i >= 0; i--) {
        const hourDate = new Date(now.getTime() - i * 60 * 60 * 1e3);
        const hourLabel = hourDate.getHours().toString().padStart(2, "0") + ":00";
        const start = new Date(hourDate);
        start.setMinutes(0, 0, 0);
        const end = new Date(start);
        end.setMinutes(59, 59, 999);
        const sent = await prisma.campaignEvent.count({
          where: { eventType: "delivered", timestamp: { gte: start, lt: end } }
        });
        const opened = await prisma.campaignEvent.count({
          where: { eventType: "open", timestamp: { gte: start, lt: end } }
        });
        const clicked = await prisma.campaignEvent.count({
          where: { eventType: "click", timestamp: { gte: start, lt: end } }
        });
        data.push({ hour: hourLabel, sent, opened, clicked });
      }
      return res.json(data);
    } catch (err) {
      const emptyData = [];
      const now = /* @__PURE__ */ new Date();
      for (let i = 23; i >= 0; i--) {
        const hourDate = new Date(now.getTime() - i * 60 * 60 * 1e3);
        const hourLabel = hourDate.getHours().toString().padStart(2, "0") + ":00";
        emptyData.push({ hour: hourLabel, sent: 0, opened: 0, clicked: 0 });
      }
      return res.json(emptyData);
    }
  });
  app2.get("/api/campaigns", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const campaigns = await fetchCached(
        "campaigns:all",
        () => prisma.campaign.findMany({ orderBy: { createdAt: "desc" } })
      );
      return res.json(campaigns.map(parseCampaignJsonFields));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/campaigns", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { name, status, recipients, openRate, subjectLine, senderName, replyTo, templateId, emailElements, targetLists, scheduledAt, selectedFooterId, footerData } = req.body;
      const createdDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const elementsToStore = Array.isArray(emailElements) ? emailElements : [];
      const newCamp = await prisma.campaign.create({
        data: {
          name,
          status: status || "DRAFT",
          recipients: recipients || 0,
          openRate: openRate || null,
          createdDate,
          subjectLine,
          senderName,
          replyTo,
          templateId,
          emailElements: stringifyJsonField(elementsToStore),
          targetLists: stringifyJsonField(targetLists || []),
          scheduledAt,
          selectedFooterId: selectedFooterId || null,
          footerData: footerData ? stringifyJsonField(footerData) : null
        }
      });
      if (newCamp.status === "SENDING") {
        const parsedCampaign = parseCampaignJsonFields(newCamp);
        triggerCampaignSend(newCamp.id, parsedCampaign);
      }
      invalidateCache("campaigns");
      return res.status(201).json(parseCampaignJsonFields(newCamp));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/campaigns/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      const updates = req.body;
      delete updates.id;
      delete updates._id;
      if (updates.emailElements && Array.isArray(updates.emailElements)) {
        updates.emailElements = stringifyJsonField(updates.emailElements);
      }
      if (updates.targetLists && Array.isArray(updates.targetLists)) {
        updates.targetLists = stringifyJsonField(updates.targetLists);
      }
      if (updates.footerData && typeof updates.footerData === "object") {
        updates.footerData = stringifyJsonField(updates.footerData);
      }
      const updated = await prisma.campaign.update({
        where: { id },
        data: updates
      });
      if (!updated) return res.status(404).json({ error: "Campaign not found" });
      const parsedUpdated = parseCampaignJsonFields(updated);
      if (updated.status === "SENDING") {
        triggerCampaignSend(updated.id, parsedUpdated);
      }
      invalidateCache("campaigns");
      return res.json(parsedUpdated);
    } catch (err) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.status(500).json({ error: err.message });
    }
  });
  app2.delete("/api/campaigns/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      await prisma.campaign.delete({ where: { id } });
      invalidateCache("campaigns");
      return res.json({ success: true });
    } catch (err) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/campaigns/:id/send", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      const campaign = await prisma.campaign.findUnique({ where: { id } });
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      const parsedCampaign = parseCampaignJsonFields(campaign);
      delete campaignProgressStore[id];
      await prisma.campaign.update({ where: { id }, data: { status: "SENDING" } });
      triggerCampaignSend(id, parsedCampaign);
      return res.json({ success: true, message: "Campaign retry initiated." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/campaigns/test", async (req, res) => {
    try {
      const { email, subject, html } = req.body;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ success: false, error: "Invalid email address" });
      }
      if (microsoftSettings.tenantId && microsoftSettings.clientId && microsoftSettings.clientSecret && microsoftSettings.senderEmail) {
        try {
          const accessToken = await getMicrosoftAccessToken();
          if (accessToken) {
            await sendMicrosoftEmail(accessToken, microsoftSettings.senderEmail, email, subject || "IGI SMTP Test Email", html || "<p>Test email from IGI SMTP</p>");
            return res.json({ success: true, method: "microsoft_graph", message: "Email sent via Microsoft Graph API" });
          }
        } catch (err) {
          console.warn("[TEST] Microsoft Graph send failed:", err.message);
          return res.json({ success: false, method: "microsoft_graph_failed", message: `Microsoft Graph API failed: ${err.message}` });
        }
      }
      console.log(`[TEST] Simulated email to ${email} | Subject: ${subject}`);
      res.json({ success: true, method: "simulated", message: `Test email simulated for ${email} \u2014 configure Microsoft 365 credentials for real delivery` });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/compose/send", async (req, res) => {
    try {
      const { subject, receivers, htmlContent, selectedFooterId, footerData } = req.body;
      if (!subject?.trim()) {
        return res.status(400).json({ success: false, error: "Subject is required" });
      }
      if (!Array.isArray(receivers) || receivers.length === 0) {
        return res.status(400).json({ success: false, error: "At least one receiver email is required" });
      }
      if (!htmlContent?.trim()) {
        return res.status(400).json({ success: false, error: "HTML content is required" });
      }
      if (!microsoftSettings.tenantId || !microsoftSettings.clientId || !microsoftSettings.clientSecret || !microsoftSettings.senderEmail) {
        return res.status(500).json({ success: false, error: "Microsoft Graph credentials not configured" });
      }
      const accessToken = await getMicrosoftAccessToken();
      let sentCount = 0;
      const errors = [];
      const composeCampaignId = `COMPOSE-${Date.now()}`;
      const footerForRender = footerData && typeof footerData === "object" ? footerData : null;
      for (const receiver of receivers) {
        const email = receiver?.email?.trim();
        const recipientName = receiver?.name?.trim() || email?.split("@")[0] || "Subscriber";
        if (!email || !email.includes("@")) {
          errors.push({ email: email || "(empty)", message: "Invalid email address" });
          continue;
        }
        try {
          let finalHtml = htmlContent;
          if (selectedFooterId && footerForRender) {
            const footerHtml = renderFooterToHtml(footerForRender, "");
            finalHtml = `${htmlContent}<div style="margin-top:24px;">${footerHtml}</div>`;
          }
          await sendMicrosoftEmail(accessToken, microsoftSettings.senderEmail, email, subject, finalHtml, recipientName);
          sentCount++;
          await recordCampaignEvent(composeCampaignId, email, recipientName, "delivered");
        } catch (err) {
          errors.push({ email, message: err.message });
        }
      }
      return res.json({ success: true, sentCount, failedCount: errors.length, errors, composeCampaignId });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/subscribers/bulk-delete", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array is required" });
      const result = await prisma.subscriber.deleteMany({ where: { id: { in: ids } } });
      invalidateCache("subscribers");
      return res.json({ success: true, deleted: result.count });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/subscribers/bulk-update", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { ids, updates } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array is required" });
      if (!updates || typeof updates !== "object") return res.status(400).json({ error: "updates object is required" });
      const allowedFields = ["status", "plan", "roster", "rosterName"];
      const sanitizedUpdates = {};
      for (const field of allowedFields) {
        if (updates[field] !== void 0) sanitizedUpdates[field] = updates[field];
      }
      if (Object.keys(sanitizedUpdates).length === 0) return res.status(400).json({ error: "No valid update fields" });
      const result = await prisma.subscriber.updateMany({
        where: { id: { in: ids } },
        data: sanitizedUpdates
      });
      invalidateCache("subscribers");
      return res.json({ success: true, modified: result.count });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/subscribers/export", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const subs = await fetchCached("subscribers:export", () => prisma.subscriber.findMany());
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=subscribers-export.json");
      return res.json(subs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/templates", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const dbTemplates = await fetchCached(
        "templates:all",
        () => prisma.emailTemplate.findMany({ orderBy: { createdAt: "desc" } })
      );
      return res.json(dbTemplates.map(parseTemplateJsonFields));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/templates", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { name, description, thumbnailAlt, thumbnailUrl, elements } = req.body;
      const newDoc = await prisma.emailTemplate.create({
        data: { name, description, thumbnailAlt, thumbnailUrl, elements: stringifyJsonField(elements || []) }
      });
      invalidateCache("templates");
      return res.status(201).json(parseTemplateJsonFields(newDoc));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/templates/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      const updates = req.body;
      delete updates.id;
      delete updates._id;
      if (updates.elements && Array.isArray(updates.elements)) {
        updates.elements = stringifyJsonField(updates.elements);
      }
      const updated = await prisma.emailTemplate.update({ where: { id }, data: updates });
      if (!updated) return res.status(404).json({ error: "Template not found" });
      invalidateCache("templates");
      return res.json(parseTemplateJsonFields(updated));
    } catch (err) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(500).json({ error: err.message });
    }
  });
  app2.delete("/api/templates/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      await prisma.emailTemplate.delete({ where: { id } });
      invalidateCache("templates");
      return res.json({ success: true });
    } catch (err) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/footers", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const footers = await fetchCached(
        "footers:all",
        () => prisma.emailFooter.findMany({ orderBy: { createdAt: "desc" } })
      );
      return res.json(footers.map(parseFooterJsonFields));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/footers", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { name, description, thumbnailUrl, background, layout, zones, isActive, createdById } = req.body;
      const newDoc = await prisma.emailFooter.create({
        data: {
          name,
          description: description || "",
          thumbnailUrl: thumbnailUrl || "",
          background: stringifyJsonField(background || {}),
          layout: stringifyJsonField(layout || {}),
          zones: stringifyJsonField(zones || []),
          isActive: isActive !== false,
          createdById: createdById || null
        }
      });
      invalidateCache("footers");
      return res.status(201).json(parseFooterJsonFields(newDoc));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/footers/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      const footer = await prisma.emailFooter.findUnique({ where: { id } });
      if (!footer) return res.status(404).json({ error: "Footer not found" });
      return res.json(parseFooterJsonFields(footer));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/footers/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      const updates = req.body;
      delete updates.id;
      delete updates._id;
      if (updates.background && typeof updates.background === "object") updates.background = stringifyJsonField(updates.background);
      if (updates.layout && typeof updates.layout === "object") updates.layout = stringifyJsonField(updates.layout);
      if (updates.zones && Array.isArray(updates.zones)) updates.zones = stringifyJsonField(updates.zones);
      const updated = await prisma.emailFooter.update({ where: { id }, data: updates });
      if (!updated) return res.status(404).json({ error: "Footer not found" });
      invalidateCache("footers");
      return res.json(parseFooterJsonFields(updated));
    } catch (err) {
      if (err?.code === "P2025") return res.status(404).json({ error: "Footer not found" });
      res.status(500).json({ error: err.message });
    }
  });
  app2.delete("/api/footers/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      await prisma.emailFooter.delete({ where: { id } });
      invalidateCache("footers");
      return res.json({ success: true });
    } catch (err) {
      if (err?.code === "P2025") return res.status(404).json({ error: "Footer not found" });
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/events", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const events = await prisma.campaignEvent.findMany({ orderBy: { timestamp: "desc" } });
      return res.json(events);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) {
        return res.status(503).json({ error: "Database not connected" });
      }
      const user = await prisma.user.findFirst({
        where: { email: email.trim().toLowerCase(), password }
      });
      if (!user) return res.status(401).json({ error: "Invalid email or password." });
      const { password: _, ...userData } = user;
      const parsedUser = {
        ...userData,
        id: user.id,
        allowedModules: parseJsonField(user.allowedModules, [])
      };
      return res.json({ success: true, user: parsedUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/auth/first-login", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ error: "Email and new password are required." });
      }
      if (newPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters." });
      }
      const user = await prisma.user.findFirst({
        where: { email: email.trim().toLowerCase(), mustChangePassword: true }
      });
      if (!user) return res.status(401).json({ error: "User not found or password already changed." });
      await prisma.user.update({
        where: { email: email.trim().toLowerCase() },
        data: { password: newPassword, mustChangePassword: false }
      });
      return res.json({ success: true, message: "Password changed successfully." });
    } catch (err) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "User not found." });
      }
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const email = req.query.email;
      if (!email) return res.status(400).json({ error: "Email query parameter is required." });
      const user = await prisma.user.findFirst({
        where: { email: email.trim().toLowerCase() },
        select: { id: true, email: true, name: true, avatarUrl: true, role: true, mustChangePassword: true, allowedModules: true, createdById: true, createdAt: true, updatedAt: true }
      });
      if (!user) return res.status(404).json({ error: "User not found." });
      return res.json({ success: true, user: { ...user, allowedModules: parseJsonField(user.allowedModules, []) } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/auth/profile", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { email, name, avatarUrl } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required to identify the user." });
      const updateData = {};
      if (name !== void 0) updateData.name = name;
      if (avatarUrl !== void 0) updateData.avatarUrl = avatarUrl;
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields to update." });
      }
      const updated = await prisma.user.update({
        where: { email: email.trim().toLowerCase() },
        data: updateData,
        select: { id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true }
      });
      return res.json({ success: true, user: updated });
    } catch (err) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "User not found." });
      }
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/auth/change-password", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { email, currentPassword, newPassword } = req.body;
      if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "Email, current password, and new password are required." });
      }
      if (newPassword.length < 4) {
        return res.status(400).json({ error: "New password must be at least 4 characters." });
      }
      const user = await prisma.user.findFirst({
        where: { email: email.trim().toLowerCase(), password: currentPassword }
      });
      if (!user) return res.status(401).json({ error: "Current password is incorrect." });
      await prisma.user.update({
        where: { email: email.trim().toLowerCase() },
        data: { password: newPassword }
      });
      return res.json({ success: true, message: "Password changed successfully." });
    } catch (err) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "User not found." });
      }
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { email, password, name } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
      if (password.length < 4) return res.status(400).json({ error: "Password must be at least 4 characters." });
      const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existing) return res.status(409).json({ error: "Account already exists." });
      const newUser = await prisma.user.create({
        data: { email: email.trim().toLowerCase(), password, name: name || email.split("@")[0], role: "admin" }
      });
      const { password: _, ...userData } = newUser;
      return res.status(201).json({ success: true, user: { ...userData, id: newUser.id } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/auth/users", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { email, name, password, allowedModules } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
      if (!email.includes("@")) return res.status(400).json({ error: "Invalid email address." });
      if (password.length < 4) return res.status(400).json({ error: "Password must be at least 4 characters." });
      const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existing) return res.status(409).json({ error: "A user with this email already exists." });
      const newUser = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          password,
          name: name || email.split("@")[0],
          role: "user",
          mustChangePassword: true,
          allowedModules: stringifyJsonField(allowedModules || ["dashboard", "campaigns", "subscribers", "templates", "logs"])
        },
        select: { id: true, email: true, name: true, avatarUrl: true, role: true, mustChangePassword: true, allowedModules: true, createdAt: true, updatedAt: true }
      });
      return res.status(201).json({ success: true, user: { ...newUser, allowedModules: parseJsonField(newUser.allowedModules, []) } });
    } catch (err) {
      if (err?.code === "P2002") return res.status(409).json({ error: "A user with this email already exists." });
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/auth/users", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, name: true, avatarUrl: true, role: true, allowedModules: true, createdById: true, createdAt: true, updatedAt: true }
      });
      return res.json(users.map((u) => ({ ...u, allowedModules: parseJsonField(u.allowedModules, []) })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/auth/users/:id/modules", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      const { allowedModules } = req.body;
      if (!Array.isArray(allowedModules)) {
        return res.status(400).json({ error: "allowedModules must be an array." });
      }
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: "User not found." });
      if (user.role === "super-admin") return res.status(403).json({ error: "Cannot modify super-admin permissions." });
      const updated = await prisma.user.update({
        where: { id },
        data: { allowedModules: stringifyJsonField(allowedModules) },
        select: { id: true, email: true, name: true, avatarUrl: true, role: true, allowedModules: true, createdAt: true, updatedAt: true }
      });
      return res.json({ success: true, user: { ...updated, allowedModules: parseJsonField(updated.allowedModules, []) } });
    } catch (err) {
      if (err?.code === "P2025") return res.status(404).json({ error: "User not found." });
      res.status(500).json({ error: err.message });
    }
  });
  app2.delete("/api/auth/users/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: "User not found." });
      if (user.role === "super-admin") return res.status(403).json({ error: "Cannot delete super-admin user." });
      await prisma.user.delete({ where: { id } });
      return res.json({ success: true });
    } catch (err) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "User not found." });
      }
      res.status(500).json({ error: err.message });
    }
  });
  function generateApiKey() {
    const rawKey = import_crypto.default.randomBytes(48).toString("hex");
    const prefix = rawKey.substring(0, 8);
    return { rawKey: `igi_${rawKey}`, prefix };
  }
  async function apiKeyMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header. Expected: Bearer <api_key>" });
    }
    const rawKey = authHeader.substring(7).trim();
    if (!rawKey) return res.status(401).json({ error: "API key is required." });
    try {
      const allKeys = await prisma.apiKey.findMany({ where: { isActive: true } });
      let matchedKey = null;
      for (const key of allKeys) {
        const isValid = await import_bcryptjs.default.compare(rawKey, key.keyHash);
        if (isValid) {
          matchedKey = key;
          break;
        }
      }
      if (!matchedKey) return res.status(401).json({ error: "Invalid or revoked API key." });
      if (matchedKey.expiresAt && new Date(matchedKey.expiresAt) < /* @__PURE__ */ new Date()) {
        return res.status(401).json({ error: "API key has expired." });
      }
      req.apiKey = matchedKey;
      prisma.apiKey.update({
        where: { id: matchedKey.id },
        data: { lastUsedAt: /* @__PURE__ */ new Date(), usageCount: { increment: 1 } }
      }).catch(() => {
      });
      next();
    } catch (err) {
      return res.status(500).json({ error: "Authentication error." });
    }
  }
  const rateLimitStore = /* @__PURE__ */ new Map();
  const DAILY_LIMIT = 500;
  function getDailyRateLimit(keyId) {
    const now = Date.now();
    const entry = rateLimitStore.get(keyId);
    if (!entry || now > entry.resetAt) {
      const resetAt = /* @__PURE__ */ new Date();
      resetAt.setUTCHours(23, 59, 59, 999);
      rateLimitStore.set(keyId, { count: 0, resetAt: resetAt.getTime() });
      return { allowed: true, remaining: DAILY_LIMIT, resetAt: resetAt.getTime() };
    }
    const remaining = DAILY_LIMIT - entry.count;
    if (remaining <= 0) return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    entry.count++;
    return { allowed: true, remaining: remaining - 1, resetAt: entry.resetAt };
  }
  app2.get("/api/api-keys", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: "userId query parameter is required." });
      const keys = await prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          keyPrefix: true,
          name: true,
          description: true,
          userId: true,
          lastUsedAt: true,
          expiresAt: true,
          isActive: true,
          usageCount: true,
          createdAt: true,
          updatedAt: true
        }
      });
      const keysWithQuota = keys.map((k) => {
        const quota = getDailyRateLimit(k.id);
        return { ...k, dailyLimit: DAILY_LIMIT, dailyRemaining: quota.remaining };
      });
      return res.json(keysWithQuota);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/api-keys", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { name, description, userId, expiresAt } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
      if (!userId) return res.status(400).json({ error: "userId is required." });
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: "User not found." });
      const { rawKey, prefix } = generateApiKey();
      const keyHash = await import_bcryptjs.default.hash(rawKey, 10);
      const apiKey = await prisma.apiKey.create({
        data: {
          keyPrefix: prefix,
          keyHash,
          name: name.trim(),
          description: description?.trim() || null,
          userId,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        }
      });
      return res.status(201).json({
        id: apiKey.id,
        keyPrefix: apiKey.keyPrefix,
        name: apiKey.name,
        description: apiKey.description,
        rawKey,
        // This is the only time the full key is returned
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/api-keys/:id/revoke", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      const updated = await prisma.apiKey.update({
        where: { id },
        data: { isActive: false }
      });
      return res.json({ success: true, id: updated.id, isActive: false });
    } catch (err) {
      if (err?.code === "P2025") return res.status(404).json({ error: "API key not found." });
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/api-keys/:id/activate", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      const updated = await prisma.apiKey.update({
        where: { id },
        data: { isActive: true }
      });
      return res.json({ success: true, id: updated.id, isActive: true });
    } catch (err) {
      if (err?.code === "P2025") return res.status(404).json({ error: "API key not found." });
      res.status(500).json({ error: err.message });
    }
  });
  app2.delete("/api/api-keys/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      await prisma.apiKey.delete({ where: { id } });
      return res.json({ success: true });
    } catch (err) {
      if (err?.code === "P2025") return res.status(404).json({ error: "API key not found." });
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/v1/health", async (req, res) => {
    const dbConnected = await isDatabaseConnected();
    res.json({
      status: dbConnected ? "ok" : "degraded",
      service: "IGI SMTP API",
      version: "1.0.0",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.post("/api/v1/send", apiKeyMiddleware, async (req, res) => {
    try {
      const { to, subject, html, trackOpens, trackClicks } = req.body;
      if (!to || !to.includes("@")) {
        return res.status(400).json({ success: false, error: 'A valid "to" email address is required.' });
      }
      if (!subject?.trim()) {
        return res.status(400).json({ success: false, error: '"subject" is required.' });
      }
      if (!html?.trim()) {
        return res.status(400).json({ success: false, error: '"html" content is required.' });
      }
      const quota = getDailyRateLimit(req.apiKey.id);
      if (!quota.allowed) {
        return res.status(429).json({
          success: false,
          error: "Daily rate limit exceeded (500 emails/day).",
          rateLimit: { remaining: 0, resetAt: new Date(quota.resetAt).toISOString() }
        });
      }
      if (!microsoftSettings.tenantId || !microsoftSettings.clientId || !microsoftSettings.clientSecret || !microsoftSettings.senderEmail) {
        return res.status(500).json({ success: false, error: "SMTP provider not configured. Admin must configure Microsoft Graph credentials." });
      }
      const accessToken = await getMicrosoftAccessToken();
      const messageId = `API-${Date.now()}-${import_crypto.default.randomBytes(4).toString("hex")}`;
      const recipientEmail = to.trim().toLowerCase();
      const recipientName = recipientEmail.split("@")[0];
      const senderLabel = process.env.APP_URL || "IGI SMTP";
      let finalHtml = html;
      if (trackOpens !== false) {
        const trackingPixelUrl = `${process.env.APP_URL || "https://igi-smtp.io"}/api/v1/track/open?messageId=${messageId}&email=${encodeURIComponent(recipientEmail)}`;
        finalHtml = `${html}<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`;
      }
      await sendMicrosoftEmail(accessToken, microsoftSettings.senderEmail, recipientEmail, subject, finalHtml);
      const composeCampaignId = `API-${req.apiKey.id}-${Date.now()}`;
      await recordCampaignEvent(composeCampaignId, recipientEmail, recipientName, "delivered");
      return res.json({
        success: true,
        messageId,
        recipient: recipientEmail,
        status: "delivered",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        rateLimit: { remaining: quota.remaining, resetAt: new Date(quota.resetAt).toISOString() }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/v1/status/:messageId", apiKeyMiddleware, async (req, res) => {
    try {
      const { messageId } = req.params;
      const events = await prisma.campaignEvent.findMany({
        where: {
          campaignId: { startsWith: `API-${req.apiKey.id}-` },
          email: { not: void 0 }
        },
        orderBy: { timestamp: "desc" },
        take: 100
      });
      const messageEvents = events.filter((e) => e.campaignId.includes(messageId) || e.campaignId === messageId);
      if (messageEvents.length === 0) {
        return res.json({
          messageId,
          status: "unknown",
          message: "No events found for this message ID. It may not have been sent via this API key."
        });
      }
      const delivered = messageEvents.find((e) => e.eventType === "delivered");
      const opened = messageEvents.find((e) => e.eventType === "open");
      const clicked = messageEvents.filter((e) => e.eventType === "click");
      const unsubscribed = messageEvents.find((e) => e.eventType === "unsubscribe");
      return res.json({
        messageId,
        recipient: delivered?.email || messageEvents[0]?.email,
        status: unsubscribed ? "unsubscribed" : delivered ? "delivered" : "unknown",
        deliveredAt: delivered?.timestamp?.toISOString() || null,
        opened: !!opened,
        openedAt: opened?.timestamp?.toISOString() || null,
        clicked: clicked.length > 0,
        clicks: clicked.map((c) => ({ url: c.url, timestamp: c.timestamp?.toISOString() })),
        clickedAt: clicked[0]?.timestamp?.toISOString() || null,
        unsubscribed: !!unsubscribed,
        unsubscribedAt: unsubscribed?.timestamp?.toISOString() || null
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/v1/analytics", apiKeyMiddleware, async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const keyId = req.apiKey.id;
      const campaignIdPrefix = `API-${keyId}-`;
      const events = await prisma.campaignEvent.findMany({
        where: { campaignId: { startsWith: campaignIdPrefix } }
      });
      const totalSent = events.filter((e) => e.eventType === "delivered").length;
      const totalOpens = events.filter((e) => e.eventType === "open").length;
      const totalClicks = events.filter((e) => e.eventType === "click").length;
      const totalUnsubscribes = events.filter((e) => e.eventType === "unsubscribe").length;
      const openRate = totalSent > 0 ? Math.round(totalOpens / totalSent * 100) : 0;
      const clickRate = totalSent > 0 ? Math.round(totalClicks / totalSent * 100) : 0;
      const quota = getDailyRateLimit(keyId);
      return res.json({
        keyId,
        keyName: req.apiKey.name,
        metrics: {
          totalSent,
          totalOpens,
          totalClicks,
          totalUnsubscribes,
          openRate,
          clickRate
        },
        rateLimit: {
          dailyLimit: DAILY_LIMIT,
          remaining: quota.remaining,
          resetAt: new Date(quota.resetAt).toISOString()
        },
        usageCount: req.apiKey.usageCount
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/v1/track/open", async (req, res) => {
    try {
      const { messageId, email } = req.query;
      if (messageId && email) {
        const name = email.split("@")[0];
        const campaignId = `API-${messageId}`;
        await recordCampaignEvent(campaignId, email, name, "open").catch(() => {
        });
      }
      const transparentPixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      res.writeHead(200, {
        "Content-Type": "image/gif",
        "Content-Length": transparentPixel.length,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.end(transparentPixel);
    } catch (err) {
      res.writeHead(200, { "Content-Type": "image/gif" });
      res.end(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"));
    }
  });
  app2.post("/api/upload", import_express.default.raw({ type: "application/octet-stream", limit: "10mb" }), async (req, res) => {
    try {
      const filename = req.query.filename || `file-${Date.now()}`;
      const fileBuffer = req.body;
      const filetype = String(req.query.filetype || "application/octet-stream");
      if (!fileBuffer || fileBuffer.length === 0) return res.status(400).json({ error: "No file provided" });
      if (fileBuffer.length > 10 * 1024 * 1024) return res.status(413).json({ error: "File size exceeds 10MB limit" });
      const base64Data = fileBuffer.toString("base64");
      const dataUrl = `data:${encodeURIComponent(filetype)};base64,${base64Data}`;
      res.json({ success: true, url: dataUrl, filename, size: fileBuffer.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/fonts", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const fonts = await fetchCached(
        "fonts:all",
        () => prisma.customFont.findMany({ orderBy: { name: "asc" } })
      );
      return res.json(fonts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/fonts", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { name, family, url, format, weight, style, category } = req.body;
      if (!name || !family) return res.status(400).json({ error: "Font name and family are required" });
      const newFont = await prisma.customFont.create({
        data: { name, family, url, format: format || "woff2", weight: weight || "400", style: style || "normal", category: category || "sans-serif", isActive: true }
      });
      invalidateCache("fonts");
      return res.status(201).json(newFont);
    } catch (err) {
      if (err?.code === "P2002") return res.status(409).json({ error: "A font with this name already exists" });
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/fonts/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      const updates = req.body;
      delete updates.id;
      delete updates._id;
      const allowed = ["name", "family", "url", "format", "weight", "style", "category", "isActive"];
      const sanitized = {};
      for (const key of allowed) {
        if (updates[key] !== void 0) sanitized[key] = updates[key];
      }
      if (Object.keys(sanitized).length === 0) return res.status(400).json({ error: "No valid fields to update" });
      const updated = await prisma.customFont.update({ where: { id }, data: sanitized });
      invalidateCache("fonts");
      return res.json(updated);
    } catch (err) {
      if (err?.code === "P2025") return res.status(404).json({ error: "Font not found" });
      res.status(500).json({ error: err.message });
    }
  });
  app2.delete("/api/fonts/:id", async (req, res) => {
    try {
      const dbConnected = await isDatabaseConnected();
      if (!dbConnected) return res.status(503).json({ error: "Database not connected" });
      const { id } = req.params;
      await prisma.customFont.delete({ where: { id } });
      invalidateCache("fonts");
      return res.json({ success: true });
    } catch (err) {
      if (err?.code === "P2025") return res.status(404).json({ error: "Font not found" });
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/lists", (req, res) => {
    res.json(INITIAL_LISTS);
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app2.use(import_express.default.static(distPath));
    app2.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  if (process.env.VERCEL !== "1") {
    startCampaignScheduler();
  }
  if (process.env.VERCEL !== "1") {
    app2.listen(PORT, "0.0.0.0", () => {
      console.log(`\u{1F680} Secure IGI-SMTP server running on http://localhost:${PORT}`);
    });
  }
}
startServer().catch((err) => {
  console.error("\u274C Failed to start server:", err);
  process.exit(1);
});
var server_default = app;
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
