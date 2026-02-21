import Anthropic from "@anthropic-ai/sdk";
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Database } from 'bun:sqlite';

// PUBLIC ENDPOINT:
// https://factcheck.coredoes.dev
// example:
// https://factcheck.coredoes.dev/publisher?url=<some url>
// https://factcheck.coredoes.dev/analyze?url=<some url>
//
// /publisher returns the Site Profile and general information about the publisher. It returns quickly, and is synchronous
// /analyze should be called repeatedly until it returns ready:true with the analysis. Analysis can take a couple minutes if the article has not been analyzed before, and the user should be informed of this.
//
// Both of these endpoints are heavily cached, and will return very rapidly if the article or publisher has been analyzed recently.

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

interface Output {
	waiting: boolean;
	content: object | null;
}
interface SiteEntry {
	publisher: Output | undefined,
	analysis: Output | undefined
}
const database: Record<string, SiteEntry> = {};

interface Response {
    ready: boolean;
    data: object | null;
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

function corsJson(data: object, status = 200) {
    return Response.json(data, { status, headers: CORS_HEADERS });
}

async function publisher(url: string): Response {
    if (Object.keys(database).includes(url)) {
	    const entry = database[url];
	    if (entry.publisher && entry.publisher.content && !entry.publisher.waiting) {
		    return Response.json({
			    ready: true,
			    data: entry.publisher.content
		    }, yesCache);
	    }
    }
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

	    Do not output any other information or make more searches than nessecary.
	    `,
	messages: [
	    { "role": "user", "content": url }
	],
	output_config: {
	    format: zodOutputFormat(site_profile)
	},
	max_tokens: 500
    });
    const finalMsg = await msg.finalMessage();
    const output = finalMsg.parsed_output;

    database[url] = {
	    publisher: {
		    ready: true,
		    content: output
	    }
    };

    return Response.json({
	ready: true,
	data: output
    }, yesCache);

}

const noCache = {
	headers: {
		"Cache-Control": "no-store"
	}
};
const yesCache = {
	headers: {
		"Cache-Control": "max-age=604800"
	}
};

async function analyze(url: string): Response {
    if (Object.keys(database).includes(url)) {
	    const entry = database[url];
	    if (entry.analysis) {
		    if (entry.analysis.waiting) {
			    return Response.json({
				    ready: false,
				    data: null
			    }, noCache);
		    } else if (entry.analysis.content) {
			    return Response.json({
				    ready: true,
				    data: entry.analysis.content
			    }, yesCache);
		    }
	    }
    }
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
    - Language that misleads through framing, implication, or selective ommission
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

    ### Confidence
    - Use confidence to reflect how certain you are that this is a genuine issue, not legitimate editorial judgement
    - For clear factual errors with strong counter-source: 0.85-0.99

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

	    You should be VERY critical of sites with anything lower than a 'Factual' rating according to Media Bias/ Fact Check.
`,
	messages: [
	    {
		"role": "user",
		"content": `${url}`
	    }
	],
	output_config: {
	    format: zodOutputFormat(output_schema)
	},
	max_tokens: 4000
    });
    const finalMsg = msg.finalMessage();
    console.log('started analysis for ' + url);
    database[url] = {
	    analysis: {
		    waiting: true,
		    content: null
	    }
    };
    finalMsg.then(msg => {
	database[url] = {
		analysis: {
			waiting: false,
			content: msg.parsed_output
		}
	};
	console.log('completed analysis for ' + url);
    });
    return Response.json({
	ready: false,
	data: null
    }, noCache);
}

const server = Bun.serve({
    routes: {
	"/publisher": async req => {
	    if (req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	    }
	    const reqUrl = new URL(req.url);
	    const analyzeUrl = reqUrl.searchParams.get("url");
	    if (!analyzeUrl) {
		return new Response("no url provided");
	    }
	    return await publisher(analyzeUrl);
	},
        "/analyze": async req => {
	    if (req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	    }
	    const reqUrl = new URL(req.url);
	    const analyzeUrl = reqUrl.searchParams.get("url");
	    if (!analyzeUrl) {
	        return new Response("no url provided");
	    }
	    const analyzeUrlV = new URL(analyzeUrl);
	    return await analyze(analyzeUrl);
	}
    }
});

console.log(`server running, ${server.url}`);
