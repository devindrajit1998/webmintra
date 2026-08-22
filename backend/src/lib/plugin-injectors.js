export function generatePluginInjections(plugins = []) {
  if (!Array.isArray(plugins) || plugins.length === 0) {
    return { headHtml: "", bodyHtml: "" };
  }

  let headHtml = "";
  let bodyHtml = "";

  for (const plugin of plugins) {
    if (!plugin.isEnabled) continue;

    if (plugin.pluginSlug === "whatsapp-chat") {
      const config = plugin.config || {};
      const rawNumber = String(config.phoneNumber || "").replace(/[^0-9]/g, "");
      if (!rawNumber) continue;

      const prefilledText = encodeURIComponent(config.greetingMessage || "Hello! I am visiting your website.");
      const ctaText = config.callToAction || "Chat with us";
      const isLeft = config.buttonPosition === "bottom-left";
      const positionClass = isLeft ? "left: 20px;" : "right: 20px;";

      bodyHtml += `
<!-- WebMintra WhatsApp Floating Chat Plugin -->
<div id="wm-whatsapp-widget" style="position: fixed; bottom: 20px; ${positionClass} z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <a href="https://wa.me/${rawNumber}?text=${prefilledText}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 10px; background-color: #25D366; color: #ffffff; padding: 10px 16px 10px 12px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.4); font-size: 13px; font-weight: 700; transition: transform 0.2s ease, box-shadow 0.2s ease;" onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 6px 20px rgba(37, 211, 102, 0.6)';" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 14px rgba(37, 211, 102, 0.4)';">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: #ffffff; stroke: none;">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
    <span>${escapeHtml(ctaText)}</span>
  </a>
</div>
`;
    }
  }

  return { headHtml, bodyHtml };
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
