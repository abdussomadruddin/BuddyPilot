const test = require("node:test");
const assert = require("node:assert/strict");
const { compatibleMetaAuthorizationUrl } = require("../lib/meta-ads")._test;

test("Meta reconnect omits rejected scopes but preserves PKCE, state, resource and redirect", () => {
  const input = new URL("https://www.facebook.com/v26.0/dialog/oauth");
  for (const [key, value] of Object.entries({ state: "fixture", code_challenge: "fixture-challenge", code_challenge_method: "S256", resource: "https://mcp.facebook.com/ads", redirect_uri: "https://buddypilot.vercel.app/api/meta/oauth-callback", client_id: "fixture", scope: "ads_read,pages_manage_ads ads_mcp_management instagram_branded_content_ads_brand pages_show_list" })) input.searchParams.set(key, value);
  const output = new URL(compatibleMetaAuthorizationUrl(input));
  assert.equal(output.searchParams.get("scope"), "ads_read ads_mcp_management pages_show_list");
  for (const key of ["state", "code_challenge", "code_challenge_method", "resource", "redirect_uri", "client_id"]) assert.equal(output.searchParams.get(key), input.searchParams.get(key));
});

test("Meta authorization rejects non-Facebook origins and insecure redirects", () => {
  for (const url of ["https://facebook.com.evil.invalid/oauth", "http://facebook.com/oauth", "https://evil.invalid/oauth"]) assert.throws(() => compatibleMetaAuthorizationUrl(url));
  assert.equal(compatibleMetaAuthorizationUrl("https://facebook.com/dialog/oauth?state=fixture"), "https://facebook.com/dialog/oauth?state=fixture");
});
