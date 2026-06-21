/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EmailFooter } from '../types';

interface EmailFooterRendererProps {
  footer: EmailFooter | null;
  unsubscribeUrl?: string;
}

export default function EmailFooterRenderer({ footer, unsubscribeUrl }: EmailFooterRendererProps) {
  if (!footer) return null;

  const { background, layout, zones } = footer;
  const enabledZones = zones.filter(z => z.enabled);

  const getBackgroundStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { opacity: background.opacity ?? 1 };
    switch (background.type) {
      case 'solid':
        base.backgroundColor = background.color || '#ffffff';
        break;
      case 'gradient':
        base.background = `linear-gradient(${background.gradientDirection || '180deg'}, ${background.gradientFrom || '#000066'}, ${background.gradientTo || '#ffffff'})`;
        break;
      case 'image':
        base.backgroundImage = `url(${background.imageUrl || ''})`;
        base.backgroundSize = background.imageSize || 'cover';
        base.backgroundPosition = background.imagePosition || 'center';
        break;
      case 'pattern':
        base.backgroundColor = background.patternBg || '#ffffff';
        const color = background.patternColor || '#000066';
        let patternSvg = '';
        switch (background.pattern) {
          case 'dots':
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="2" cy="2" r="1.5" fill="${color}"/></svg>`;
            break;
          case 'stripes':
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><line x1="0" y1="0" x2="20" y2="20" stroke="${color}" stroke-width="1"/></svg>`;
            break;
          case 'diagonal':
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><line x1="0" y1="20" x2="20" y2="0" stroke="${color}" stroke-width="1"/></svg>`;
            break;
          case 'grid':
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="${color}" stroke-width="1"/></svg>`;
            break;
          case 'checkerboard':
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="10" height="10" fill="${color}"/><rect x="10" y="10" width="10" height="10" fill="${color}"/></svg>`;
            break;
          case 'zigzag':
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

  const renderZone = (zone: any) => {
    switch (zone.type) {
      case 'header':
        return (
          <div key={zone.id} style={{ textAlign: 'center', marginBottom: '8px' }}>
            {zone.logoUrl && <img src={zone.logoUrl} alt="logo" style={{ maxHeight: '40px', margin: '0 auto 8px', display: 'block' }} />}
            {zone.companyName && <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{zone.companyName}</p>}
          </div>
        );
      case 'body':
        return (
          <div key={zone.id} style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', lineHeight: 1.6, marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: zone.content || '' }} />
        );
      case 'social':
        const cols = zone.socialColumns || 4;
        return (
          <div key={zone.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '8px', marginBottom: '8px' }}>
            {(zone.socialLinks || []).map((link: any) => {
              const href = link.url || '#';
              return (
                <a key={link.id} href={href} target="_blank" rel="noopener noreferrer" style={{ color: link.color, textAlign: 'center', display: 'block', textDecoration: 'none', fontSize: link.size === 'lg' ? 24 : link.size === 'md' ? 20 : 16 }}>
                  {link.icon ? (
                    <img src={link.icon} alt={link.platform} style={{ width: link.size === 'lg' ? 28 : link.size === 'md' ? 22 : 18, height: link.size === 'lg' ? 28 : link.size === 'md' ? 22 : 18, margin: '0 auto', display: 'block' }} />
                  ) : (
                    <span style={{ fontWeight: 600, display: 'block' }}>{link.platform}</span>
                  )}
                </a>
              );
            })}
          </div>
        );
      case 'contact':
        return (
          <div key={zone.id} style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', lineHeight: 1.5, marginBottom: '8px' }}>
            {zone.address && <p style={{ margin: '0 0 4px' }}>{zone.address}</p>}
            {(zone.phone || zone.website) && (
              <p style={{ margin: 0 }}>
                {zone.phone && <span>{zone.phone}</span>}
                {zone.phone && zone.website && <span style={{ margin: '0 4px' }}>•</span>}
                {zone.website && <a href={zone.website} style={{ color: '#000066', textDecoration: 'underline' }}>{zone.website.replace(/^https?:\/\//, '')}</a>}
              </p>
            )}
          </div>
        );
      case 'legal':
        return (
          <div key={zone.id} style={{ textAlign: 'center', color: '#94a3b8', fontSize: '10px', lineHeight: 1.4, marginBottom: '8px' }}>
            <p style={{ margin: '0 0 4px' }}>{zone.copyrightText}</p>
            {zone.showUnsubscribe && (
              <p style={{ margin: 0 }}>
                <a href={unsubscribeUrl || '#'} style={{ color: '#000066', textDecoration: 'underline' }}>{zone.unsubscribeText || 'Unsubscribe'}</a>
              </p>
            )}
          </div>
        );
      case 'custom':
        return (
          <div key={zone.id} dangerouslySetInnerHTML={{ __html: zone.customHtml || '' }} />
        );
      default:
        return null;
    }
  };

  return (
    <table role="presentation" cellPadding="0" cellSpacing="0" border="0" width="100%" style={{ backgroundColor: 'transparent' }}>
      <tbody>
        <tr>
          <td align="center" style={{ padding: `${layout.paddingY}px ${layout.paddingX}px` }} {...getBackgroundStyle()}>
            <table role="presentation" cellPadding="0" cellSpacing="0" border="0" width={layout.maxWidth === 'full' ? '100%' : layout.maxWidth} style={{ maxWidth: layout.maxWidth === 'full' ? '100%' : layout.maxWidth, margin: layout.centerAligned ? '0 auto' : '0', border: layout.borderWidth > 0 ? `${layout.borderWidth}px ${layout.borderStyle} ${layout.borderColor}` : 'none', borderRadius: layout.borderRadius, boxShadow: layout.shadow ? (layout.shadowIntensity === 'subtle' ? '0 2px 8px rgba(0,0,0,0.06)' : layout.shadowIntensity === 'medium' ? '0 4px 12px rgba(0,0,0,0.1)' : '0 8px 24px rgba(0,0,0,0.15)') : 'none' }}>
              <tbody>
                {enabledZones.map(zone => (
                  <tr key={zone.id}>
                    <td style={{ padding: '0' }}>
                      {zone.type === 'social' ? (
                        <table role="presentation" cellPadding="0" cellSpacing="0" border="0" width="100%">
                          <tbody>
                            <tr>
                              {(zone.socialLinks || []).map((link: any) => {
                                const href = link.url || '#';
                                return (
                                  <td key={link.id} width={`${100 / (zone.socialColumns || 4)}%`} align="center" style={{ padding: '2px' }}>
                                    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: link.color, textDecoration: 'none', display: 'block', textAlign: 'center', fontSize: link.size === 'lg' ? 24 : link.size === 'md' ? 20 : 16 }}>
                                      {link.icon ? (
                                        <img src={link.icon} alt={link.platform} style={{ width: link.size === 'lg' ? 28 : link.size === 'md' ? 22 : 18, height: link.size === 'lg' ? 28 : link.size === 'md' ? 22 : 18, margin: '0 auto', display: 'block' }} />
                                      ) : (
                                        <span style={{ fontWeight: 600, display: 'block' }}>{link.platform}</span>
                                      )}
                                    </a>
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      ) : zone.type === 'header' ? (
                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                          {zone.logoUrl && <img src={zone.logoUrl} alt="logo" style={{ maxHeight: '40px', margin: '0 auto 8px', display: 'block' }} />}
                          {zone.companyName && <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{zone.companyName}</p>}
                        </div>
                      ) : zone.type === 'body' ? (
                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', lineHeight: 1.6, marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: zone.content || '' }} />
                      ) : zone.type === 'contact' ? (
                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', lineHeight: 1.5, marginBottom: '8px' }}>
                          {zone.address && <p style={{ margin: '0 0 4px' }}>{zone.address}</p>}
                          {(zone.phone || zone.website) && (
                            <p style={{ margin: 0 }}>
                              {zone.phone && <span>{zone.phone}</span>}
                              {zone.phone && zone.website && <span style={{ margin: '0 4px' }}>•</span>}
                              {zone.website && <a href={zone.website} style={{ color: '#000066', textDecoration: 'underline' }}>{zone.website.replace(/^https?:\/\//, '')}</a>}
                            </p>
                          )}
                        </div>
                      ) : zone.type === 'legal' ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '10px', lineHeight: 1.4, marginBottom: '8px' }}>
                          <p style={{ margin: '0 0 4px' }}>{zone.copyrightText}</p>
                          {zone.showUnsubscribe && <p style={{ margin: 0 }}><a href={unsubscribeUrl || '#'} style={{ color: '#000066', textDecoration: 'underline' }}>{zone.unsubscribeText || 'Unsubscribe'}</a></p>}
                        </div>
                      ) : zone.type === 'custom' ? (
                        <div dangerouslySetInnerHTML={{ __html: zone.customHtml || '' }} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}