/**
 * Public address of the site. It must be the domain verified in the TikTok developer
 * portal, because TikTok only pulls images from verified URLs. PUBLIC_BASE_URL overrides it.
 */
export const SITE_URL = (process.env.PUBLIC_BASE_URL || "https://fnt.diaspafra.org").replace(/\/$/, "");
