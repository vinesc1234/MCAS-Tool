import { timingSafeEqual } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { AnalysisResult } from '../src/analysis-types';

/**
 * Reads a photo and returns its ingredients.
 *
 * This runs on the server so ANTHROPIC_API_KEY never reaches the phone. The
 * image is passed straight through to the API — never written to disk, never
 * logged, never stored. Nothing about an entry lives on this server.
 */

const MODEL = 'claude-opus-5';

/** ~8MB of base64 ≈ a 6MB image. The client downscales well below this. */
const MAX_IMAGE_CHARS = 8_000_000;

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const SYSTEM_PROMPT = `You identify consumer products from photos for someone tracking MCAS (Mast Cell Activation Syndrome) triggers.

Given a photo, return what the item is and what is in it.

Reading ingredients:
- If an ingredients label is visible, transcribe it. Use the exact names printed, lowercased. Set source to "label".
- If there is no label (a plated meal, loose produce, a fabric, an unmarked pill), identify the item and list its likely components. Set source to "inferred".
- If the photo is too blurry, dark, or cropped to tell, set identified to false and say what went wrong in notes. Do not guess at a label you cannot actually read.

Flagging concerns — assign each ingredient exactly one:
- "histamine": naturally high in histamine (aged cheese, cured meat, fermented foods, vinegar, soy sauce, leftovers)
- "liberator": triggers histamine release without containing much (citrus, tomato, strawberry, chocolate, alcohol, shellfish, NSAIDs, some dyes)
- "sulfite": sulfites and metabisulfites
- "salicylate": high-salicylate foods and salicylate compounds
- "additive": other preservatives, artificial colors, flavor enhancers (MSG, benzoates, nitrates)
- "fragrance": perfume, parfum, essential oils, "fragrance"
- "none": no established MCAS relevance
- "unknown": you genuinely cannot classify it

The note is one short plain-language clause, and only when it adds something ("aged, high histamine", "common trigger in processed meat"). Leave it an empty string for ordinary ingredients like water or salt.

Be accurate over comprehensive. Listing an ingredient that isn't there is worse than missing one. This informs someone's health decisions, so do not invent detail the photo doesn't support.`;

const SCHEMA = {
  type: 'object',
  properties: {
    identified: { type: 'boolean' },
    name: { type: 'string' },
    category: {
      type: 'string',
      enum: ['food', 'drink', 'medicine', 'skincare', 'material', 'other'],
    },
    source: { type: 'string', enum: ['label', 'inferred', 'unclear'] },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          concern: {
            type: 'string',
            enum: [
              'histamine',
              'liberator',
              'sulfite',
              'salicylate',
              'additive',
              'fragrance',
              'none',
              'unknown',
            ],
          },
          note: { type: 'string' },
        },
        required: ['name', 'concern', 'note'],
        additionalProperties: false,
      },
    },
    notes: { type: 'string' },
  },
  required: ['identified', 'name', 'category', 'source', 'ingredients', 'notes'],
  additionalProperties: false,
};

/** Constant-time compare so the passcode can't be recovered by timing the endpoint. */
function passcodeMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedPasscode = process.env.APP_PASSCODE;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!expectedPasscode || !apiKey) {
    // Misconfigured deploy. Don't leak which of the two is missing.
    return res.status(503).json({ error: 'Server is not configured yet.' });
  }

  const provided = req.headers['x-app-passcode'];
  if (typeof provided !== 'string' || !passcodeMatches(provided, expectedPasscode)) {
    return res.status(401).json({ error: 'Wrong passcode.' });
  }

  const { image, mediaType } = (req.body ?? {}) as { image?: string; mediaType?: string };

  if (typeof image !== 'string' || !image) {
    return res.status(400).json({ error: 'No image provided.' });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return res.status(413).json({ error: 'Image is too large.' });
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType as (typeof ALLOWED_MEDIA_TYPES)[number])) {
    return res.status(400).json({ error: 'Unsupported image type.' });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      // Reading a label is a scoped extraction task — medium effort keeps it
      // accurate without a long deliberation on every snap.
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
                data: image,
              },
            },
            { type: 'text', text: 'What is this, and what is in it?' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ error: "Couldn't analyze that image." });
    }

    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') {
      return res.status(502).json({ error: 'No result returned.' });
    }

    const result = JSON.parse(block.text) as AnalysisResult;

    // Report what this call actually cost in tokens so the client tracks real
    // spend rather than a per-photo guess.
    result.usage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };

    return res.status(200).json(result);
  } catch (err) {
    // Logged server-side for debugging; the client gets nothing identifying.
    console.error('analyze failed:', err);
    const status =
      err instanceof Anthropic.RateLimitError
        ? 429
        : err instanceof Anthropic.AuthenticationError
          ? 503
          : 502;
    return res
      .status(status)
      .json({ error: 'Analysis failed. You can still enter ingredients yourself.' });
  }
}
