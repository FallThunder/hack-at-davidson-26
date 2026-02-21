import Anthropic from "@anthropic-ai/sdk";
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
	flags: z.array(flag)
    })
});

const anthropic = new Anthropic();

const db = new Database('cache.db');

db.run(`CREATE TABLE IF NOT EXISTS publisher_cache (
    url TEXT PRIMARY KEY,
    content TEXT NOT NULL
)`);

db.run(`CREATE TABLE IF NOT EXISTS analysis_cache (
    url TEXT PRIMARY KEY,
    waiting INTEGER NOT NULL DEFAULT 1,
    content TEXT
)`);

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
            return Response.json({ ready: true, data: JSON.parse(cached.content) }, yesCache);
        }

        let finalMsg;
        try {
            const msg = await anthropic.messages.stream({
                model: "claude-haiku-4-5",
                tools: [{
                    type: "web_search_20250305",
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
            finalMsg = await msg.finalMessage();
        } catch (e: unknown) {
            console.error(e);
            return Response.json({ ready: true, data: null }, noCache);
        }

        const output = finalMsg.parsed_output;
        db.run('INSERT OR REPLACE INTO publisher_cache (url, content) VALUES (?, ?)',
            [url, JSON.stringify(output)]);

        return Response.json({ ready: true, data: output }, yesCache);
    } catch (e: unknown) {
        console.error(e);
        return Response.json({}, { status: 400, headers: CORS_HEADERS });
    }
}

async function analyze(url: string, text: string): Promise<Response> {
    try {
        const cached = db.query<{ waiting: number; content: string | null }, [string]>(
            'SELECT waiting, content FROM analysis_cache WHERE url = ?'
        ).get(url);

        if (cached) {
            if (cached.waiting) {
                return Response.json({ ready: false, data: null }, noCache);
            }
            return Response.json({ ready: true, data: cached.content ? JSON.parse(cached.content) : null }, yesCache);
        }

        // Atomically claim this URL — INSERT OR IGNORE handles race conditions
        const inserted = db.run(
            'INSERT OR IGNORE INTO analysis_cache (url, waiting, content) VALUES (?, 1, NULL)',
            [url]
        );
        if (inserted.changes === 0) {
            // Another concurrent request already started analysis
            return Response.json({ ready: false, data: null }, noCache);
        }

        // Start the stream — not awaited (fire and forget). If stream init throws
        // synchronously, the outer catch handles cleanup.
        const msg = anthropic.messages.stream({
            model: "claude-opus-4-6",
            tools: [{
                type: "web_search_20250305",
                name: "web_search",
                max_uses: 5
            }],
            system: `
You are a rigorous, politically neutral fact-checking engine. You will be given the full text of a news article or opinion piece. Your job is to analyze it and return a structured JSON object.

    Before you analyze the article, determine the source's overall reliability to guide your analysis. If an outlet has historically been unreliable or failed fact checks, be more critical of it. Rely on the site's https://mediabiasfactcheck.com article to determine this information.

    Identify EVERY instance of:
	- A specific factual claim that is false or mostly false
    - A claim presented as fact that has no source and cannot be independently verified
    - Language that misleads through framing, implication, or selective omission
    - Passive constructions used to make unattributed or unverifiable claims
    - Emotionally loaded language that substitutes rhetoric for evidence

    Flags cannot overlap content; in the event of an overlap, assign all of the overlapping section to the more urgent flag.

	Your flag summaries (the 'flag' field) should generally be one-to-three word descriptions of the flag as a whole (such as 'Incorrect' or 'Misleading framing' or 'Overly passive language'). Include any clarifications in the description field.

    ### Urgency Scale
    - 5: Definitive, verifiable falsehood (e.g. a statistic that is demonstrably wrong)
    - 4: Highly likely false or severely misleading, strong counter-evidence exists
    - 3: Misleading framing or missing context that materially distorts the claim
    - 2: Rhetorical manipulation or passive language that obscures meaning
    - 1: Minor stylistic issue, loaded word choice with minimal impact

    Note that 'a statistic that is demonstrably wrong' does NOT include slightly outdated statistics. For example, "there have been at least 6 shootings by federal officials" should not be flagged simply because there have in fact been 7; as the statement is still true.
	    Anything that is a technicality should NOT be included.

    ### Confidence
    - Use confidence to reflect how certain you are that this is a genuine issue, not legitimate editorial judgement
    - For clear factual errors with strong counter-source: 0.85-0.99
    - Do not include anything you are less than 50% confident would be confusing to the average reader

    ### Excerpts
    - Quote verbatim from the article, do NOT truncate or add ellipsis. It must be an EXACT TEXTUAL MATCH to the problematic sections
    - Prefer a clause or phrase over a full sentence or paragraph

    ### Sources
    - For any False, Mostly False, or Misleading flag with urgency > 3, you must provide at least one source
    - Sources must be real, specific, and directly relevant; do not hallucinate URLs
    - Prefer primary sources, such as government data, peer reviewed research, official records, court rulings
    - For language/framing flags, urgency < 2, sources are optional

    ## Neutrality Rules
    - Apply the same scrutiny regardless of the article's political leaning
    - Do not flag something as misleading simply because it expresses a conservative or liberal viewpoint
    - Only flag claims that are factually wrong, verifiably unsupported, or rhetorically deceptive in a way that would mislead a reasonable reader
    - Opinion and editorializing are not themselves issues -- only flag when rhetoric substitutes for or actively contradicts verifiable fact, or could be confusing to the average reader.
    - Do not let these rules affect your ratings - be critical.

    Overall Tone and Overall Factuality should be single-word ratings.
	    You should be VERY critical of sites with anything lower than a 'Factual' rating according to Media Bias/ Fact Check. However, do not provide entirely unnecessary flags; if an article is well-written, you are not required to flag something.
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

        // finalMessage() is not awaited — returns immediately so we can respond with ready:false
        const finalMsgPromise = msg.finalMessage();

        console.log('started analysis for ' + url);

        (finalMsgPromise as Promise<{ parsed_output: z.infer<typeof output_schema> }>).then((finalMsg) => {
            db.run('UPDATE analysis_cache SET waiting = 0, content = ? WHERE url = ?',
                [JSON.stringify(finalMsg.parsed_output), url]);
            console.log('completed analysis for ' + url);
        }).catch((e: unknown) => {
            console.error(e);
            // Delete the row so the next poll can retry rather than deadlocking on waiting=1
            db.run('DELETE FROM analysis_cache WHERE url = ?', [url]);
        });

        return Response.json({ ready: false, data: null }, noCache);
    } catch (e: unknown) {
        console.error('fail!', e);
        // If something went wrong after we inserted the row, clean it up
        db.run('DELETE FROM analysis_cache WHERE url = ?', [url]);
        return Response.json({}, { status: 400, headers: CORS_HEADERS });
    }
}

const server = Bun.serve({
    routes: {
        "/publisher": async (req: Request) => {
            if (req.method === 'OPTIONS') {
                return new Response(null, { status: 204, headers: CORS_HEADERS });
            }
            const reqUrl = new URL(req.url);
            const analyzeUrl = reqUrl.searchParams.get("url");
            if (!analyzeUrl) {
                return new Response("no url provided", { status: 400, headers: CORS_HEADERS });
            }
            return await publisher(analyzeUrl);
        },
        "/analyze": async (req: Request) => {
            if (req.method === 'OPTIONS') {
                return new Response(null, { status: 204, headers: CORS_HEADERS });
            }
            const reqUrl = new URL(req.url);
            const analyzeUrl = reqUrl.searchParams.get("url");
            if (!analyzeUrl) {
                return new Response("no url provided", { status: 400, headers: CORS_HEADERS });
            }
            return await analyze(analyzeUrl, (await req.text()));
        }
    }
});

console.log(`server running, ${server.url}`);
