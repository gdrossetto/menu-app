import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  getRestaurantForOwner,
  hasAiImportEntitlement,
} from "../_shared/billing.ts";
import { requireAuthenticatedUser } from "../_shared/supabase.ts";
import { getSafeErrorResponse, logFunctionError } from "../_shared/logging.ts";

const menuImportSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sourceFileName", "detectedLanguage", "warnings", "categories"],
  properties: {
    sourceFileName: { type: "string" },
    detectedLanguage: { type: ["string", "null"] },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    categories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "items"],
        properties: {
          name: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "description", "price"],
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                price: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

interface ImportRequestBody {
  fileName?: string;
  mimeType?: string;
  fileData?: string;
}

const SUPPORTED_MENU_IMPORT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_IMPORT_FILE_BYTES = 8 * 1024 * 1024;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const user = await requireAuthenticatedUser(request);
    const restaurant = await getRestaurantForOwner(user.id);

    if (!hasAiImportEntitlement(restaurant)) {
      return jsonResponse(
        {
          error:
            "AI menu import is available on the Professional plan. Upgrade your subscription to continue.",
        },
        403,
      );
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const openAiModel = Deno.env.get("OPENAI_MENU_IMPORT_MODEL") || "gpt-5.4-mini";

    if (!openAiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable.");
    }

    const { fileName, mimeType, fileData } = (await request.json().catch(() => ({}))) as ImportRequestBody;

    if (!fileName || !mimeType || !fileData) {
      return jsonResponse(
        { error: "Missing request: fileName, mimeType, or fileData." },
        400,
      );
    }

    if (!SUPPORTED_MENU_IMPORT_MIME_TYPES.has(mimeType)) {
      return jsonResponse(
        { error: "Invalid request: unsupported file type." },
        400,
      );
    }

    const approximateFileBytes = Math.ceil((fileData.length * 3) / 4);
    if (approximateFileBytes > MAX_IMPORT_FILE_BYTES) {
      return jsonResponse(
        { error: "Invalid request: file is too large." },
        400,
      );
    }

    const inputContent = [
      {
        type: "input_text",
        text:
          "Extract this restaurant menu into structured JSON. Preserve the menu's language. For every item price, return only the numeric value as a string, with no currency symbol or currency code. Prefer short warnings over guesswork if a section or price is unclear.",
      },
      buildFileInput(fileName, mimeType, fileData),
    ];

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: openAiModel,
        input: [
          {
            role: "user",
            content: inputContent,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "menu_import",
            description: "Structured draft of a restaurant menu import.",
            strict: true,
            schema: menuImportSchema,
          },
        },
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      throw new Error(`OpenAI request failed: ${errorText}`);
    }

    const responseJson = await openAiResponse.json();
    const outputText = extractOutputText(responseJson);

    if (!outputText) {
      throw new Error("The AI response did not include structured output text.");
    }

    const parsed = JSON.parse(outputText);
    return jsonResponse(parsed);
  } catch (error) {
    logFunctionError("menu-import", error);
    const { status, message } = getSafeErrorResponse(
      error,
      "The import failed. Please try again.",
    );
    return jsonResponse({ error: message }, status);
  }
});

function buildFileInput(fileName: string, mimeType: string, fileData: string) {
  if (mimeType === "application/pdf") {
    return {
      type: "input_file",
      filename: fileName,
      file_data: fileData,
    };
  }

  return {
    type: "input_image",
    image_url: `data:${mimeType};base64,${fileData}`,
    detail: "high",
  };
}

function extractOutputText(responseJson: Record<string, unknown>): string | null {
  if (typeof responseJson.output_text === "string") {
    return responseJson.output_text;
  }

  const output = Array.isArray(responseJson.output) ? responseJson.output : [];
  for (const entry of output) {
    if (!entry || typeof entry !== "object") continue;
    const content = Array.isArray((entry as { content?: unknown[] }).content)
      ? (entry as { content: unknown[] }).content
      : [];

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") {
        return text;
      }
    }
  }

  return null;
}
