import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { classifyCta } = createRequire(import.meta.url)("../js/analytics.js");

test("classifyCta by href", () => {
  assert.equal(classifyCta("tel:+15107097097"), "call");
  assert.equal(classifyCta("sms:+15107097097"), "text");
  assert.equal(classifyCta("mailto:a@b.com"), "email");
  assert.equal(classifyCta("https://maps.apple.com/?q=eac"), "directions");
  assert.equal(classifyCta("https://www.google.com/maps/place/x"), "directions");
  assert.equal(classifyCta("https://app.shopmonkey.cloud/x"), "book-online");
  assert.equal(classifyCta("/raffle"), "raffle");
  assert.equal(classifyCta("/ppf"), "");
  assert.equal(classifyCta(""), "");
});

test("data-cta overrides and is slugified", () => {
  assert.equal(classifyCta("tel:+15107097097", { dataset: { cta: "get-quote" } }), "get-quote");
  assert.equal(classifyCta("/ppf", { dataset: { cta: "  Get A Quote!! " } }), "get-a-quote");
  assert.equal(classifyCta("/ppf", { dataset: { cta: "x".repeat(60) } }), "x".repeat(40));
  assert.equal(classifyCta("tel:1", { dataset: { cta: "!!!" } }), "call");
});
