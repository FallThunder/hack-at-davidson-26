import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Database } from 'bun:sqlite';

// PUBLIC ENDPOINT:
// https://factcheck2.coredoes.dev
// example:
// https://factcheck2.coredoes.dev/publisher?url=<some url>
// https://factcheck2.coredoes.dev/analyze?url=<some url>
//
// /publisher returns the Site Profile and general information about the publisher. It returns quickly, and is synchronous
// /analyze should be called repeatedly until it returns ready:true with the analysis. Analysis can take a couple minutes if the article has not been analyzed before, and the user should be informed of this.
//
// Both of these endpoints are heavily cached via SQLite, and will return very rapidly if the article or publisher has been analyzed recently.

const profile_score = z.object({
    rating: z.string(),
    score: z.number().min(0).max(100)
});

const flag = z.object({
    urgency: z.number().min(1).max(5),
    flag: z.string(),
    confidence: z.number().min(0).max(1),
    excerpt: z.string(),
    reasoning: z.string(),
    sources: z.array(z.object({
	title: z.string(),
	url: z.string().url(),
	publisher: z.string()
    }))
});

const site_profile = z.object({
    domain: z.string(),
    company: z.string(),
    factual_reporting: profile_score,
    political_bias: profile_score
});

const output_schema = z.object({
    content_analysis: z.object({
	overall_tone: z.string(),
	overall_factuality: z.string(),
	article_category: z.string(),
	flags: z.array(flag)
    })
});

const anthropic = new Anthropic();

function log(...args: unknown[]): void {
    console.log(new Date().toISOString(), ...args);
}

function logError(prefix: string, e: unknown): void {
    if (e instanceof APIError) {
        console.error(new Date().toISOString(), `${prefix} APIError status=${e.status} type=${(e.error as { type?: string })?.type ?? 'unknown'} message=${e.message}`);
    } else if (e instanceof Error) {
        console.error(new Date().toISOString(), `${prefix} Error name=${e.name} message=${e.message}`);
    } else {
        console.error(new Date().toISOString(), `${prefix} unknown error:`, e);
    }
}

const db = new Database('cache.db');

db.run(`CREATE TABLE IF NOT EXISTS publisher_cache (
    url TEXT PRIMARY KEY,
    content TEXT NOT NULL
)`);

db.run(`CREATE TABLE IF NOT EXISTS analysis_cache (
    url TEXT PRIMARY KEY,
    waiting INTEGER NOT NULL DEFAULT 1,
    content TEXT,
    error TEXT,
    progress TEXT
)`);
// Safe migrations for existing databases that predate these columns
try { db.run('ALTER TABLE analysis_cache ADD COLUMN error TEXT'); } catch {}
try { db.run('ALTER TABLE analysis_cache ADD COLUMN progress TEXT'); } catch {}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

const noCache = {
    headers: {
        ...CORS_HEADERS,
        "Cache-Control": "no-store"
    }
};
const yesCache = {
    headers: {
        ...CORS_HEADERS,
        "Cache-Control": "max-age=604800"
    }
};

async function publisher(url: string): Promise<Response> {
    try {
        const cached = db.query<{ content: string }, [string]>(
            'SELECT content FROM publisher_cache WHERE url = ?'
        ).get(url);
        if (cached) {
            log(`[publisher] cache hit → ${url}`);
            return Response.json({ ready: true, data: JSON.parse(cached.content) }, yesCache);
        }

        let finalMsg;
        try {
            const start = Date.now();
            const msg = anthropic.messages.stream({
                model: "claude-haiku-4-5",
                tools: [{
                    type: "web_search_20260209",
                    name: "web_search",
                    max_uses: 5
                }],
                system: `You are a rigorous, politically neutral fact-checking engine. Given the user's provided article, extract the following information from their https://mediabiasfactcheck.com article. Do NOT use any other domain or source. If unavailable, set the ratings to null.

    Extract:
    Factual Reporting, from 0-100 where 0 is Very Low and 100 is Very High
    Political Bias, with 0 being Extreme Left, 50 being Least Biased, 100 being Extreme Right
    Ownership/Company

    Base your information primarily on Ad Fontes and Media Bias Fact Check, and output your ratings using the Media Bias / Fact Check framework.

    Do not output any other information or make more searches than necessary.
    `,
                messages: [
                    { "role": "user", "content": url }
                ],
                output_config: {
                    format: zodOutputFormat(site_profile)
                },
                max_tokens: 500
            });
            log(`[publisher] stream started → ${url}`);
            let publisherTextStarted = false;
            msg.on('text', (textDelta: string) => {
                if (!publisherTextStarted) {
                    publisherTextStarted = true;
                    log(`[publisher] generating response`);
                }
                process.stdout.write(textDelta);
            });
            finalMsg = await msg.finalMessage();
            process.stdout.write('\n');
            log(`[publisher] done in ${Date.now() - start}ms — in:${finalMsg.usage.input_tokens} out:${finalMsg.usage.output_tokens} tokens → ${url}`);
        } catch (e: unknown) {
            logError('[publisher]', e);
            return Response.json({ ready: true, data: null }, noCache);
        }

        const output = finalMsg.parsed_output;
        db.run('INSERT OR REPLACE INTO publisher_cache (url, content) VALUES (?, ?)',
            [url, JSON.stringify(output)]);

        return Response.json({ ready: true, data: output }, yesCache);
    } catch (e: unknown) {
        logError('[publisher] outer catch', e);
        return Response.json({}, { status: 400, headers: CORS_HEADERS });
    }
}

async function analyze(url: string, text: string): Promise<Response> {
    try {
        const cached = db.query<{ waiting: number; content: string | null; error: string | null; progress: string | null }, [string]>(
            'SELECT waiting, content, error, progress FROM analysis_cache WHERE url = ?'
        ).get(url);

        if (cached) {
            if (cached.waiting) {
                log(`[analyze] poll — waiting, progress="${cached.progress}" → ${url}`);
                return Response.json({ ready: false, data: null, progress: cached.progress }, noCache);
            }
            if (cached.error === 'overloaded') {
                log(`[analyze] poll — overloaded, deleting row for retry → ${url}`);
                db.run('DELETE FROM analysis_cache WHERE url = ?', [url]);
                return Response.json({ ready: false, data: null, error: 'overloaded' }, noCache);
            }
            if (cached.error === 'failed') {
                log(`[analyze] poll — permanent failure → ${url}`);
                return Response.json({ ready: true, data: null, error: 'failed' }, noCache);
            }
            log(`[analyze] cache hit → ${url}`);
            return Response.json({ ready: true, data: cached.content ? JSON.parse(cached.content) : null }, yesCache);
        }

        // Atomically claim this URL — INSERT OR IGNORE handles race conditions
        const inserted = db.run(
            'INSERT OR IGNORE INTO analysis_cache (url, waiting, content) VALUES (?, 1, NULL)',
            [url]
        );
        if (inserted.changes === 0) {
            // Another concurrent request already started analysis
            log(`[analyze] race — another request claimed ${url}, returning not-ready`);
            return Response.json({ ready: false, data: null }, noCache);
        }

        log(`[analyze] new request — text length=${text.length} chars → ${url}`);

        // Start the stream — not awaited (fire and forget). If stream init throws
        // synchronously, the outer catch handles cleanup.
        const analyzeStart = Date.now();
        const msg = anthropic.messages.stream({
            model: "claude-opus-4-6",
            tools: [{
                type: "web_search_20260209",
                name: "web_search",
                max_uses: 5
            }],
            system: `
You are a rigorous, politically neutral fact-checking engine. You will be given the full text of a news article or opinion piece. Your job is to analyze it and return a structured JSON object.

    The article text may contain non-article content such as titles of related articles, "You might also like" or "Read more" links, sidebar text, or navigation copy. Ignore all such content — only analyze the main article body. Do not flag link text, related article headlines, or promotional copy that appears alongside the article.

    Before you analyze the article, check the source's overall reliability via its https://mediabiasfactcheck.com article to understand how critically to read the piece.

    Flag only claims that remain genuinely problematic after research. If you look into a claim and find it is accurate, plausible, or defensible, do NOT include it as a flag — even if it initially seemed suspicious. Quality over quantity: a short list of solid flags is far more useful than a long list of borderline ones.

    Flag the following types of issues:
    - A specific factual claim that is demonstrably false, supported by strong counter-evidence
    - Language that materially misleads through framing, selective omission, or implication — where a reasonable reader would be left with a false impression
    - Emotionally loaded language that substitutes rhetoric for evidence in a way that distorts the reader's understanding

    Flags cannot overlap content; in the event of an overlap, assign all of the overlapping section to the more urgent flag.

    Your flag summaries (the 'flag' field) should generally be one-to-three word descriptions of the flag as a whole (such as 'Incorrect' or 'Misleading framing' or 'Overly passive language'). Include any clarifications in the description field.

    ### Urgency Scale
    - 5: Definitive, verifiable falsehood with strong primary-source counter-evidence
    - 4: Highly likely false or severely misleading; strong counter-evidence exists and the claim is not defensible
    - 3: Misleading framing or missing context that materially distorts the claim for a reasonable reader
    - 2: Rhetorical manipulation or passive language that meaningfully obscures meaning
    - 1: Minor stylistic issue, loaded word choice with minimal impact

    Only assign urgency 4 or 5 when you are highly confident the claim is false — not merely unverified, borderline, or "on the high end." If the claim is plausible or the evidence is mixed, use urgency 3 or lower, or omit the flag entirely.

    Do not flag technicalities. A statement like "at least 6 shootings" is not wrong simply because there were 7 — the claim is still technically true. Similarly, a claim that is accurate but incomplete is not a falsehood.

    ### Confidence
    - Use confidence to reflect how certain you are that this is a genuine issue, not legitimate editorial judgement
    - For clear factual errors with strong counter-source: 0.85-0.99
    - Do not include any flag you are less than 70% confident represents a genuine problem for a reasonable reader
    - If your reasoning for a flag includes words like "borderline," "plausible," "may," or "on the high end," reconsider whether it should be included at all

    ### Excerpts
    - Quote verbatim from the article. It must be an EXACT TEXTUAL MATCH to the article text — copy the characters directly, do not paraphrase or alter punctuation
    - Include enough surrounding context to uniquely locate the passage: aim for a full sentence or at least 10–15 words. If the problematic text is short (e.g. a two-word phrase), extend the excerpt to include the full surrounding clause
    - Do NOT truncate with ellipsis; the excerpt must be a single contiguous verbatim span

    ### Sources
    - For any False, Mostly False, or Misleading flag with urgency > 3, you must provide at least one source
    - Sources must be real, specific, and directly relevant; do not hallucinate URLs
    - Prefer primary sources, such as government data, peer reviewed research, official records, court rulings
    - For language/framing flags, urgency < 2, sources are optional

    ## Neutrality Rules
    - Apply the same scrutiny regardless of the article's political leaning
    - Do not flag something as misleading simply because it expresses a conservative or liberal viewpoint
    - Only flag claims that are factually wrong, verifiably unsupported, or rhetorically deceptive in a way that would mislead a reasonable reader
    - Opinion and editorializing are not themselves issues — only flag when rhetoric substitutes for or actively contradicts verifiable fact
    - Apply the same standards regardless of the outlet's MBFC rating; a low-rated outlet still deserves accurate flags, not inflated ones

    Overall Tone and Overall Factuality should be single-word ratings.
    If an article is well-written and factually sound, it is correct to produce few or no flags.

    ### Article Category
    Classify the article into exactly one of the following categories based on its content, structure, and intent:
    - "News" — straight reporting of events with minimal editorial voice
    - "Politics" — political reporting or coverage of government, elections, or policy
    - "Opinion" — explicitly labeled or clearly written as an opinion piece; author expresses personal views
    - "Editorial" — institutional opinion representing the publication's stance
    - "Analysis" — in-depth examination or interpretation of events; goes beyond straight reporting
    - "Commentary" — opinion or reaction to current events, similar to opinion but often unsigned or staff-written
    - "Science" — science or research reporting
    - "Technology" — technology or tech-industry reporting
    - "Business" — business, finance, or economic reporting
    - "Sports" — sports reporting or commentary
    - "Entertainment" — entertainment, culture, or lifestyle reporting
    - "Health" — health, medicine, or wellness reporting
    - "World" — international news reporting
    - "Local" — local or regional news reporting

    Output this as article_category.
`,
            messages: [
                {
                    "role": "user",
                    "content": `URL: ${url}\nFull article text below.\n---\n${text}`
                }
            ],
            output_config: {
                format: zodOutputFormat(output_schema)
            },
            max_tokens: 4000
        });

        // Stream listeners for progress reporting and server-side logging.
        // Initial progress is "Searching the web..." — Claude always searches before generating text.
        // The first 'text' event signals Claude is now writing its analysis.
        db.run('UPDATE analysis_cache SET progress = ? WHERE url = ?', ['Searching the web...', url]);
        let analyzeTextStarted = false;
        msg.on('text', (textDelta: string) => {
            if (!analyzeTextStarted) {
                analyzeTextStarted = true;
                log(`[analyze] text streaming started (+${Date.now() - analyzeStart}ms) → ${url}`);
                db.run('UPDATE analysis_cache SET progress = ? WHERE url = ?', ['Analyzing article...', url]);
            }
            process.stdout.write(textDelta);
        });

        // finalMessage() is not awaited — returns immediately so we can respond with ready:false
        const finalMsgPromise = msg.finalMessage();

        log(`[analyze] stream open, returning not-ready → ${url}`);

        (finalMsgPromise as Promise<{ parsed_output: z.infer<typeof output_schema>; usage: { input_tokens: number; output_tokens: number } }>).then((finalMsg) => {
            const flags = finalMsg.parsed_output.content_analysis.flags;
            const elapsed = Date.now() - analyzeStart;
            log(`[analyze] done in ${elapsed}ms — flags=${flags.length} in:${finalMsg.usage.input_tokens} out:${finalMsg.usage.output_tokens} tokens → ${url}`);
            process.stdout.write('\n');
            db.run('UPDATE analysis_cache SET waiting = 0, content = ? WHERE url = ?',
                [JSON.stringify(finalMsg.parsed_output), url]);
        }).catch((e: unknown) => {
            logError(`[analyze] stream error (+${Date.now() - analyzeStart}ms)`, e);
            const isRetriable = e instanceof APIError && (e.status === 529 || e.status === 429);
            db.run('UPDATE analysis_cache SET waiting = 0, error = ? WHERE url = ?',
                [isRetriable ? 'overloaded' : 'failed', url]);
        });

        return Response.json({ ready: false, data: null }, noCache);
    } catch (e: unknown) {
        logError('[analyze] outer catch', e);
        const isRetriable = e instanceof APIError && (e.status === 529 || e.status === 429);
        db.run('UPDATE analysis_cache SET waiting = 0, error = ? WHERE url = ?',
            [isRetriable ? 'overloaded' : 'failed', url]);
        return Response.json({}, { status: 400, headers: CORS_HEADERS });
    }
}

const server = Bun.serve({
    routes: {
        "/publisher": async (req: Request) => {
            if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
            const reqUrl = new URL(req.url);
            const analyzeUrl = reqUrl.searchParams.get("url");
            if (!analyzeUrl) {
                log(`[request] GET /publisher — missing url param`);
                return new Response("no url provided", { status: 400, headers: CORS_HEADERS });
            }
            log(`[request] GET /publisher → ${analyzeUrl}`);
            return await publisher(analyzeUrl);
        },
        "/analyze": async (req: Request) => {
            if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
            const reqUrl = new URL(req.url);
            const analyzeUrl = reqUrl.searchParams.get("url");
            if (!analyzeUrl) {
                log(`[request] POST /analyze — missing url param`);
                return new Response("no url provided", { status: 400, headers: CORS_HEADERS });
            }
            log(`[request] POST /analyze → ${analyzeUrl}`);
            return await analyze(analyzeUrl, (await req.text()));
        }
    }
});

console.log(`server running, ${server.url}`);
