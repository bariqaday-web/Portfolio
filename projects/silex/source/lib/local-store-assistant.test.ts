import test from "node:test";
import assert from "node:assert/strict";
import {
  findProductRecommendations,
  getLocalStoreAssistantReply,
  getLocalStoreAssistantReplyRule,
  isBotAvailableNow,
  isHumanHandoffRequest,
  renderAssistantResponse,
} from "./local-store-assistant.ts";

const products = [
  {
    id: "dress-1",
    title: "فستان صيفي أسود",
    price: 25000,
    oldPrice: null,
    description: "قماش خفيف",
    stock: 4,
    coverUrl: "/dress.jpg",
    category: "ملابس نسائية",
  },
  {
    id: "dress-2",
    title: "فستان سهرة",
    price: 45000,
    oldPrice: null,
    description: null,
    stock: 2,
    coverUrl: null,
    category: "ملابس نسائية",
  },
  {
    id: "sold-out",
    title: "فستان قطن",
    price: 18000,
    oldPrice: null,
    description: null,
    stock: 0,
    coverUrl: null,
    category: "ملابس نسائية",
  },
];

test("assistant finds active products by Arabic category/type and excludes sold-out items", () => {
  const results = findProductRecommendations("عندكم فستان؟", products);
  assert.deepEqual(results.map((product) => product.id).sort(), ["dress-1", "dress-2"]);
});

test("assistant replies with product recommendations instead of its generic fallback", () => {
  const reply = getLocalStoreAssistantReply({
    customerName: "سارة",
    storeName: "متجر الأناقة",
    message: "أريد أشوف فستان أسود",
    products,
    latestOrder: null,
    config: {},
  });
  assert.equal(reply.needsMerchant, false);
  assert.equal(reply.productRecommendations?.[0]?.id, "dress-1");
  assert.match(reply.text, /لقيت لك/);
});

test("assistant clearly says when a requested product category is unavailable", () => {
  const reply = getLocalStoreAssistantReply({
    customerName: "سارة",
    storeName: "متجر الأناقة",
    message: "عندكم أحذية؟",
    products,
    latestOrder: null,
    config: {},
  });
  assert.equal(reply.needsMerchant, false);
  assert.match(reply.text, /ما لقيت/);
  assert.equal(reply.productRecommendations, undefined);
});

test("rule matching accepts common Arabic spelling and inflection variants", () => {
  const matched = getLocalStoreAssistantReplyRule(
    [{ phrases: ["موجود"], response: "تفضل اسأل." }],
    "موجودين؟",
  );
  assert.deepEqual(matched, { matched: true, response: "تفضل اسأل." });
});

test("response templates rotate to a different approved wording within a conversation", () => {
  const response = renderAssistantResponse(
    "أهلاً بك في {{storeName}}. ||| حياك الله في {{storeName}}.",
    { storeName: "متجر الأناقة" },
    "أهلاً بك في متجر الأناقة.",
  );
  assert.equal(response, "حياك الله في متجر الأناقة.");
});

test("assistant answers preliminary and frustrated messages without handing over", () => {
  const preliminary = getLocalStoreAssistantReply({
    customerName: "سارة",
    storeName: "متجر الأناقة",
    message: "اريد اسلك",
    products: [],
    latestOrder: null,
    config: {},
  });
  assert.match(preliminary.text, /تفضل اسألني/);
  assert.equal(preliminary.needsMerchant, false);

  const frustrated = getLocalStoreAssistantReply({
    customerName: "سارة",
    storeName: "متجر الأناقة",
    message: "شنو شغلك لعد",
    products: [],
    latestOrder: null,
    config: {},
  });
  assert.match(frustrated.text, /أعتذر عن اللخبطة/);
  assert.equal(frustrated.needsMerchant, false);

  const repeated = getLocalStoreAssistantReply({
    customerName: "سارة",
    storeName: "متجر الأناقة",
    message: "اريد اسلك",
    previousReply: preliminary.text,
    products: [],
    latestOrder: null,
    config: {},
  });
  assert.notEqual(repeated.text, preliminary.text);
});

test("a short product-name search uses only this store catalog and asks for clarification on a miss", () => {
  const reply = getLocalStoreAssistantReply({
    customerName: "سارة",
    storeName: "متجر الأناقة",
    message: "سيارات",
    products,
    latestOrder: null,
    config: {},
  });
  assert.match(reply.text, /ما لقيت تطابقاً مؤكداً/);
  assert.equal(reply.needsMerchant, false);
});

test("a short plural product query matches the store's singular product title", () => {
  const vehicles = [{
    id: "vehicle-1",
    title: "سيارة عائلية",
    price: 12000000,
    oldPrice: null,
    description: "خمسة مقاعد",
    stock: 1,
    coverUrl: null,
    category: "سيارات",
  }] as unknown as typeof products;
  const reply = getLocalStoreAssistantReply({
    customerName: "سارة",
    storeName: "معرض المدينة",
    message: "سيارات",
    products: vehicles,
    latestOrder: null,
    config: {},
  });
  assert.equal(reply.productRecommendations?.[0]?.id, "vehicle-1");
});

test("human handover is only requested when the customer explicitly asks for a person", () => {
  assert.equal(isHumanHandoffRequest("اريد اكلم موظف"), true);
  assert.equal(isHumanHandoffRequest("اريد اسألك عن سيارة"), false);
  const reply = getLocalStoreAssistantReply({
    customerName: "سارة",
    storeName: "متجر الأناقة",
    message: "اريد اكلم موظف",
    products: [],
    latestOrder: null,
    config: {},
  });
  assert.equal(reply.needsMerchant, true);
  assert.match(reply.text, /أحوّل رسالتك لصاحب/);
});

test("bot stays available all day when the 24x7 option is enabled", () => {
  assert.equal(isBotAvailableNow({
    botHoursEnabled: true,
    botHoursAlwaysOn: true,
    botHoursStart: "22:00",
    botHoursEnd: "06:00",
  }), true);

  assert.equal(isBotAvailableNow({
    botHoursEnabled: false,
    botHoursAlwaysOn: false,
    botHoursStart: "09:00",
    botHoursEnd: "22:00",
  }), true);
});
