import { describe, expect, it } from "vitest";

import { b64urlDecode, b64urlEncode, encryptPayload, jwkFromRaw } from "@/lib/webpush.server";

// RFC 8291 Appendix A test vector.
const AS_PUBLIC =
  "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
const AS_PRIVATE = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";
const UA_PUBLIC =
  "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
const AUTH = "BTBZMqHH6r4Tts7J_aSIgg";
const SALT = "DGv6ra1nlYgDCS1FRnbzlw";
const EXPECTED =
  "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN";

describe("web push encryption", () => {
  it("matches the RFC 8291 example message", async () => {
    const asPublicRaw = b64urlDecode(AS_PUBLIC);
    const out = await encryptPayload(
      new Uint8Array(new TextEncoder().encode("When I grow up, I want to be a watermelon")),
      UA_PUBLIC,
      AUTH,
      {
        asPrivateJwk: jwkFromRaw(asPublicRaw, b64urlDecode(AS_PRIVATE)),
        asPublicRaw,
        salt: b64urlDecode(SALT),
      },
    );
    expect(b64urlEncode(out)).toBe(EXPECTED);
  });
});
