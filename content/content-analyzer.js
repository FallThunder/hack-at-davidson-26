// Evident Content Analyzer - Advanced content extraction and bias analysis for fact-checking
class ContentAnalyzer {
    constructor() {
        this.newsIndicators = {
            // Common news article selectors
            selectors: [
                'article',
                '[role="article"]',
                '.article',
                '.post',
                '.entry',
                '.story',
                '.news-article',
                '.article-content',
                '.post-content',
                '.entry-content'
            ],
            
            // News-specific meta tags
            metaTags: [
                'article:published_time',
                'article:modified_time',
                'article:author',
                'article:section',
                'og:type',
                'og:article:published_time',
                'og:article:author'
            ],
            
            // JSON-LD structured data types
            structuredDataTypes: [
                'NewsArticle',
                'Article',
                'BlogPosting',
                'Report'
            ],
            
            // Common news keywords in URLs
            urlKeywords: [
                'news', 'article', 'story', 'post', 'blog', 'press',
                'breaking', 'latest', 'update', 'report', 'analysis'
            ],
            
            // News-related CSS classes
            cssClasses: [
                'byline', 'dateline', 'timestamp', 'publish-date',
                'author', 'journalist', 'reporter', 'news-meta',
                'article-meta', 'story-meta'
            ]
        };

        this.popularDomains = new Set([
            // Major news outlets
            'cnn.com', 'bbc.com', 'reuters.com', 'ap.org', 'npr.org',
            'nytimes.com', 'washingtonpost.com', 'wsj.com', 'usatoday.com',
            'theguardian.com', 'independent.co.uk', 'dailymail.co.uk',
            'foxnews.com', 'nbcnews.com', 'abcnews.go.com', 'cbsnews.com',
            'bloomberg.com', 'fortune.com', 'forbes.com', 'businessinsider.com',
            
            // Tech news
            'techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com',
            'engadget.com', 'gizmodo.com', 'mashable.com', 'cnet.com',
            
            // Social media and platforms
            'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
            'youtube.com', 'tiktok.com', 'reddit.com', 'pinterest.com',
            
            // Search engines
            'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
            
            // E-commerce
            'amazon.com', 'ebay.com', 'walmart.com', 'target.com',
            'shopify.com', 'etsy.com', 'alibaba.com',
            
            // Entertainment
            'netflix.com', 'hulu.com', 'disney.com', 'hbo.com',
            'spotify.com', 'apple.com', 'microsoft.com',
            
            // Other major sites
            'wikipedia.org', 'github.com', 'stackoverflow.com',
            'medium.com', 'quora.com', 'imdb.com'
        ]);

        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Main analysis function
    async analyzeCurrentPage() {
        const url = window.location.href;
        const domain = this.extractDomain(url);
        
        // Check cache first
        const cacheKey = `${domain}_${url}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        const analysis = {
            url: url,
            domain: domain,
            title: document.title,
            isNewsArticle: false,
            newsConfidence: 0,
            sitePopularity: 'unknown',
            popularityScore: 0,
            articleData: null,
            siteMetrics: null,
            timestamp: Date.now()
        };

        // Analyze if it's a news article
        const newsAnalysis = await this.analyzeNewsArticle();
        analysis.isNewsArticle = newsAnalysis.isNews;
        analysis.newsConfidence = newsAnalysis.confidence;
        analysis.articleData = newsAnalysis.articleData;

        // Analyze site popularity
        const popularityAnalysis = await this.analyzeSitePopularity(domain);
        analysis.sitePopularity = popularityAnalysis.category;
        analysis.popularityScore = popularityAnalysis.score;
        analysis.siteMetrics = popularityAnalysis.metrics;

        // Cache the result
        this.cache.set(cacheKey, {
            data: analysis,
            timestamp: Date.now()
        });

        // Extract main content for bias analysis
        analysis.mainContent = this.extractMainContent();
        analysis.biasAnalysis = this.analyzeBias(analysis.mainContent);
        analysis.emotionalAnalysis = this.analyzeEmotionalLanguage(analysis.mainContent);
        analysis.factCheckingData = this.extractFactCheckingData();

        return analysis;
    }

    // Analyze if current page is a news article
    async analyzeNewsArticle() {
        let confidence = 0;
        let indicators = [];
        let articleData = {};

        // Check structured data (JSON-LD)
        const structuredData = this.extractStructuredData();
        if (structuredData.length > 0) {
            for (const data of structuredData) {
                if (this.newsIndicators.structuredDataTypes.includes(data['@type'])) {
                    confidence += 30;
                    indicators.push('structured_data');
                    
                    // Process structured data to extract clean information
                    const processedData = this.processStructuredData(data);
                    articleData = { ...articleData, ...processedData };
                    break;
                }
            }
        }

        // Check meta tags
        const metaAnalysis = this.analyzeMetaTags();
        confidence += metaAnalysis.score;
        if (metaAnalysis.score > 0) {
            indicators.push('meta_tags');
            articleData = { ...articleData, ...metaAnalysis.data };
        }

        // Check article selectors
        const articleElements = this.findArticleElements();
        if (articleElements.length > 0) {
            confidence += 20;
            indicators.push('article_elements');
            
            // Analyze article content
            const contentAnalysis = this.analyzeArticleContent(articleElements[0]);
            confidence += contentAnalysis.score;
            articleData = { ...articleData, ...contentAnalysis.data };
        }

        // Check URL patterns
        const urlAnalysis = this.analyzeURL();
        confidence += urlAnalysis.score;
        if (urlAnalysis.score > 0) {
            indicators.push('url_patterns');
        }

        // Check for news-specific elements
        const newsElements = this.findNewsElements();
        confidence += newsElements.score;
        if (newsElements.score > 0) {
            indicators.push('news_elements');
        }

        // Normalize confidence to 0-100
        confidence = Math.min(confidence, 100);

        return {
            isNews: confidence >= 50,
            confidence: confidence,
            indicators: indicators,
            articleData: articleData
        };
    }

    // Extract JSON-LD structured data
    extractStructuredData() {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        const data = [];
        
        scripts.forEach(script => {
            try {
                const parsed = JSON.parse(script.textContent);
                if (Array.isArray(parsed)) {
                    data.push(...parsed);
                } else {
                    data.push(parsed);
                }
            } catch (e) {
                console.warn('Failed to parse JSON-LD:', e);
            }
        });
        
        return data;
    }

    // Process structured data to extract clean information
    processStructuredData(data) {
        const processed = {};
        
        // Handle title
        if (data.headline) {
            processed.title = data.headline;
        } else if (data.name) {
            processed.title = data.name;
        }
        
        // Handle authors - can be string, object, or array
        if (data.author) {
            processed.authors = this.extractAuthorsFromStructuredData(data.author);
            processed.author = processed.authors.join(', ');
        }
        
        // Handle publication date
        if (data.datePublished) {
            processed.publishDate = data.datePublished;
        } else if (data.dateCreated) {
            processed.publishDate = data.dateCreated;
        }
        
        // Handle modified date
        if (data.dateModified) {
            processed.modifiedDate = data.dateModified;
        }
        
        // Handle publisher
        if (data.publisher) {
            if (typeof data.publisher === 'object' && data.publisher.name) {
                processed.publisher = data.publisher.name;
            } else if (typeof data.publisher === 'string') {
                processed.publisher = data.publisher;
            }
        }
        
        // Handle description
        if (data.description) {
            processed.description = data.description;
        }
        
        // Handle word count
        if (data.wordCount) {
            processed.wordCount = data.wordCount;
        }
        
        // Handle article section
        if (data.articleSection) {
            processed.section = data.articleSection;
        }
        
        // Handle keywords
        if (data.keywords) {
            if (Array.isArray(data.keywords)) {
                processed.keywords = data.keywords;
            } else if (typeof data.keywords === 'string') {
                processed.keywords = data.keywords.split(',').map(k => k.trim());
            }
        }
        
        return processed;
    }
    
    // Extract authors from structured data (handles various formats)
    extractAuthorsFromStructuredData(authorData) {
        const authors = [];
        
        if (Array.isArray(authorData)) {
            authorData.forEach(author => {
                if (typeof author === 'string') {
                    authors.push(author);
                } else if (typeof author === 'object') {
                    if (author.name) {
                        authors.push(author.name);
                    } else if (author['@type'] === 'Person' && author.givenName && author.familyName) {
                        authors.push(`${author.givenName} ${author.familyName}`);
                    }
                }
            });
        } else if (typeof authorData === 'string') {
            authors.push(authorData);
        } else if (typeof authorData === 'object') {
            if (authorData.name) {
                authors.push(authorData.name);
            } else if (authorData['@type'] === 'Person' && authorData.givenName && authorData.familyName) {
                authors.push(`${authorData.givenName} ${authorData.familyName}`);
            }
        }
        
        return authors.filter(author => author && author.trim().length > 0);
    }

    // Analyze meta tags for news indicators
    analyzeMetaTags() {
        let score = 0;
        let data = {};

        this.newsIndicators.metaTags.forEach(tagName => {
            const meta = document.querySelector(`meta[property="${tagName}"], meta[name="${tagName}"]`);
            if (meta) {
                score += 10;
                const key = tagName.replace('article:', '').replace('og:article:', '').replace('og:', '');
                const content = meta.getAttribute('content');
                
                // Handle author meta tags specially
                if (key === 'author') {
                    if (!data.authors) data.authors = [];
                    // Split multiple authors if comma-separated
                    const authorList = content.split(',').map(a => a.trim()).filter(a => a);
                    data.authors.push(...authorList);
                    data.author = data.authors.join(', ');
                } else {
                    data[key] = content;
                }
            }
        });

        // Check for additional author meta tags
        const additionalAuthorSelectors = [
            'meta[name="author"]',
            'meta[name="article:author"]',
            'meta[property="article:author"]',
            'meta[name="twitter:creator"]',
            'meta[name="sailthru.author"]'
        ];
        
        additionalAuthorSelectors.forEach(selector => {
            const meta = document.querySelector(selector);
            if (meta) {
                const content = meta.getAttribute('content');
                if (content) {
                    if (!data.authors) data.authors = [];
                    const authorList = content.split(',').map(a => a.trim()).filter(a => a);
                    authorList.forEach(author => {
                        if (!data.authors.includes(author)) {
                            data.authors.push(author);
                        }
                    });
                    data.author = data.authors.join(', ');
                }
            }
        });

        // Check for Open Graph type
        const ogType = document.querySelector('meta[property="og:type"]');
        if (ogType && ogType.getAttribute('content') === 'article') {
            score += 15;
            data.type = 'article';
        }

        return { score, data };
    }

    // Find article elements on the page
    findArticleElements() {
        const elements = [];
        
        this.newsIndicators.selectors.forEach(selector => {
            const found = document.querySelectorAll(selector);
            found.forEach(el => {
                if (!elements.includes(el)) {
                    elements.push(el);
                }
            });
        });

        return elements;
    }

    // Analyze article content
    analyzeArticleContent(element) {
        let score = 0;
        let data = {};

        if (!element) return { score, data };

        const text = element.textContent || '';
        const wordCount = text.split(/\s+/).length;

        // Check word count (news articles typically have substantial content)
        if (wordCount > 300) score += 15;
        if (wordCount > 800) score += 10;

        data.wordCount = wordCount;
        data.characterCount = text.length;

        // Look for byline/author information
        const authorSelectors = [
            '.author', '.byline', '.by-author', '[rel="author"]',
            '.article-author', '.post-author', '.story-author',
            '[itemprop="author"]', '.author-name', '.writer',
            // Common news site patterns
            '.gtm-author', '.author-link', '.article-byline',
            '.story-byline', '.byline-author', '.contributor',
            '.reporter', '.journalist', '.writer-name',
            // Axios-specific patterns
            '.AxiosAuthorByline', '.author-byline', 
            '[data-testid="author"]', '[data-cy="author"]',
            // Other common patterns
            '.meta-author', '.post-meta .author', '.entry-author',
            '.article-meta .author', '.story-meta .author'
        ];
        
        let authors = [];
        for (const selector of authorSelectors) {
            const authorElements = element.querySelectorAll(selector);
            if (authorElements.length === 0) {
                // Try document-wide search if not found in article
                const globalAuthor = document.querySelector(selector);
                if (globalAuthor) {
                    const authorText = globalAuthor.textContent.trim();
                    if (authorText && !authors.includes(authorText)) {
                        authors.push(authorText);
                    }
                }
            } else {
                authorElements.forEach(authorEl => {
                    const authorText = authorEl.textContent.trim();
                    if (authorText && !authors.includes(authorText)) {
                        authors.push(authorText);
                    }
                });
            }
        }
        
        if (authors.length > 0) {
            score += 10;
            data.authors = authors;
            data.author = authors.join(', '); // For backward compatibility
        }

        // Look for publish date
        const dateSelectors = [
            'time', '.date', '.publish-date', '.published', '.timestamp',
            '[datetime]', '.dateline'
        ];
        for (const selector of dateSelectors) {
            const dateEl = element.querySelector(selector) || document.querySelector(selector);
            if (dateEl) {
                score += 10;
                data.publishDate = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
                break;
            }
        }

        // Check for paragraphs (news articles typically have multiple paragraphs)
        const paragraphs = element.querySelectorAll('p');
        if (paragraphs.length >= 3) score += 10;
        if (paragraphs.length >= 6) score += 5;

        data.paragraphCount = paragraphs.length;

        return { score, data };
    }

    // Analyze URL for news patterns
    analyzeURL() {
        let score = 0;
        const url = window.location.href.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();

        // Check for news keywords in URL
        this.newsIndicators.urlKeywords.forEach(keyword => {
            if (url.includes(keyword)) {
                score += 5;
            }
        });

        // Check for date patterns in URL (common in news sites)
        const datePatterns = [
            /\/\d{4}\/\d{1,2}\/\d{1,2}\//,  // /2024/01/15/
            /\/\d{4}-\d{2}-\d{2}/,          // /2024-01-15
            /\/\d{4}\/\d{2}\//              // /2024/01/
        ];

        datePatterns.forEach(pattern => {
            if (pattern.test(pathname)) {
                score += 15;
            }
        });

        return { score };
    }

    // Find news-specific elements
    findNewsElements() {
        let score = 0;

        this.newsIndicators.cssClasses.forEach(className => {
            const elements = document.getElementsByClassName(className);
            if (elements.length > 0) {
                score += 5;
            }
        });

        // Look for comment sections (common in news articles)
        const commentSelectors = [
            '.comments', '#comments', '.comment-section',
            '.disqus', '.fb-comments', '.discourse-comments'
        ];
        
        commentSelectors.forEach(selector => {
            if (document.querySelector(selector)) {
                score += 8;
            }
        });

        // Look for social sharing buttons
        const shareSelectors = [
            '.share', '.social-share', '.sharing',
            '[class*="share"]', '[class*="social"]'
        ];

        shareSelectors.forEach(selector => {
            if (document.querySelector(selector)) {
                score += 5;
            }
        });

        return { score };
    }

    // Analyze site popularity
    async analyzeSitePopularity(domain) {
        const baseDomain = this.extractBaseDomain(domain);
        let category = 'unknown';
        let score = 0;
        let metrics = {};

        // Check against known popular domains
        if (this.popularDomains.has(baseDomain)) {
            category = 'major';
            score = 90;
        } else {
            // Analyze domain characteristics
            const domainAnalysis = this.analyzeDomainCharacteristics(baseDomain);
            category = domainAnalysis.category;
            score = domainAnalysis.score;
        }

        // Try to get additional metrics
        try {
            metrics = await this.getPageMetrics();
        } catch (error) {
            console.warn('Could not fetch page metrics:', error);
        }

        return {
            category,
            score,
            metrics
        };
    }

    // Analyze domain characteristics
    analyzeDomainCharacteristics(domain) {
        let score = 0;
        let category = 'unknown';

        // Check TLD
        if (domain.endsWith('.gov') || domain.endsWith('.edu')) {
            score = 80;
            category = 'institutional';
        } else if (domain.endsWith('.org')) {
            score = 60;
            category = 'organization';
        } else if (domain.endsWith('.com') || domain.endsWith('.net')) {
            score = 40;
            category = 'commercial';
        }

        // Check domain length (shorter domains are often more established)
        if (domain.length <= 10) score += 20;
        else if (domain.length <= 15) score += 10;

        // Check for common patterns
        if (domain.includes('news') || domain.includes('times') || domain.includes('post')) {
            score += 30;
            category = 'news_site';
        }

        // Check for subdomains (often indicates less established sites)
        if (domain.split('.').length > 2) {
            score -= 10;
        }

        // Determine final category based on score
        if (score >= 80) category = 'major';
        else if (score >= 60) category = 'established';
        else if (score >= 40) category = 'moderate';
        else if (score >= 20) category = 'emerging';
        else category = 'unknown';

        return { category, score };
    }

    // Get page metrics (performance, social signals, etc.)
    async getPageMetrics() {
        const metrics = {};

        // Performance metrics
        if (window.performance) {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                metrics.loadTime = Math.round(navigation.loadEventEnd - navigation.loadEventStart);
                metrics.domContentLoaded = Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
            }
        }

        // Page characteristics
        metrics.wordCount = document.body.textContent.split(/\s+/).length;
        metrics.imageCount = document.querySelectorAll('img').length;
        metrics.linkCount = document.querySelectorAll('a').length;
        metrics.hasSSL = window.location.protocol === 'https:';

        // Social media presence indicators
        const socialLinks = document.querySelectorAll('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"]');
        metrics.socialMediaLinks = socialLinks.length;

        return metrics;
    }

    // Utility functions
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return window.location.hostname;
        }
    }

    extractBaseDomain(domain) {
        const parts = domain.split('.');
        if (parts.length >= 2) {
            return parts.slice(-2).join('.');
        }
        return domain;
    }

    // Extract main content from the page for analysis
    extractMainContent() {
        const content = {
            title: '',
            subtitle: '',
            mainText: '',
            paragraphs: [],
            quotes: [],
            claims: [],
            sources: [],
            wordCount: 0
        };

        // Extract title
        content.title = document.title || '';
        
        // Try to find subtitle/deck
        const subtitleSelectors = [
            '.subtitle', '.deck', '.subhead', '.standfirst',
            '.article-subtitle', '.post-subtitle', '.summary',
            'h2.subtitle', '.article-deck', '.story-summary'
        ];
        
        for (const selector of subtitleSelectors) {
            const subtitle = document.querySelector(selector);
            if (subtitle) {
                content.subtitle = subtitle.textContent.trim();
                break;
            }
        }

        // Find main article content
        const articleElement = this.findMainArticleElement();
        if (articleElement) {
            // Extract paragraphs
            const paragraphs = articleElement.querySelectorAll('p');
            paragraphs.forEach(p => {
                const text = p.textContent.trim();
                if (text.length > 20) { // Filter out very short paragraphs
                    content.paragraphs.push(text);
                }
            });

            // Extract quotes
            const quoteSelectors = ['blockquote', '.quote', '.pullquote', 'q'];
            quoteSelectors.forEach(selector => {
                const quotes = articleElement.querySelectorAll(selector);
                quotes.forEach(quote => {
                    const text = quote.textContent.trim();
                    if (text.length > 10) {
                        content.quotes.push(text);
                    }
                });
            });

            // Extract potential claims (sentences with strong assertions)
            content.claims = this.extractClaims(content.paragraphs);

            // Extract sources and links
            content.sources = this.extractSources(articleElement);

            // Combine all text
            content.mainText = content.paragraphs.join(' ');
            content.wordCount = content.mainText.split(/\s+/).length;
        }

        return content;
    }

    // Find the main article element using multiple strategies
    findMainArticleElement() {
        // Try semantic HTML first
        let article = document.querySelector('article');
        if (article && article.textContent.length > 500) {
            return article;
        }

        // Try common article selectors
        const articleSelectors = [
            '[role="article"]', '.article-content', '.post-content',
            '.entry-content', '.story-content', '.article-body',
            '.post-body', '.content', '.main-content', '.article-text'
        ];

        for (const selector of articleSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.length > 500) {
                return element;
            }
        }

        // Try to find the element with the most text content
        const candidates = document.querySelectorAll('div, section, main');
        let bestCandidate = null;
        let maxTextLength = 0;

        candidates.forEach(candidate => {
            const textLength = candidate.textContent.length;
            const paragraphs = candidate.querySelectorAll('p').length;
            
            // Score based on text length and paragraph count
            const score = textLength + (paragraphs * 100);
            
            if (score > maxTextLength && textLength > 500) {
                maxTextLength = score;
                bestCandidate = candidate;
            }
        });

        return bestCandidate;
    }

    // Extract potential factual claims from text
    extractClaims(paragraphs) {
        const claims = [];
        const claimIndicators = [
            /according to/i, /studies show/i, /research indicates/i,
            /data reveals/i, /statistics show/i, /experts say/i,
            /reports indicate/i, /analysis shows/i, /findings suggest/i,
            /\d+%/, /\$[\d,]+/, /\d+ million/, /\d+ billion/,
            /increased by/i, /decreased by/i, /rose by/i, /fell by/i
        ];

        paragraphs.forEach(paragraph => {
            const sentences = paragraph.split(/[.!?]+/);
            sentences.forEach(sentence => {
                const trimmed = sentence.trim();
                if (trimmed.length > 30) {
                    // Check if sentence contains claim indicators
                    const hasClaim = claimIndicators.some(pattern => pattern.test(trimmed));
                    if (hasClaim) {
                        claims.push(trimmed);
                    }
                }
            });
        });

        return claims.slice(0, 10); // Limit to top 10 claims
    }

    // Extract sources and references
    extractSources(articleElement) {
        const sources = [];
        
        // Find external links
        const links = articleElement.querySelectorAll('a[href^="http"]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            const text = link.textContent.trim();
            const domain = this.extractDomain(href);
            
            if (text.length > 5 && !domain.includes(window.location.hostname)) {
                sources.push({
                    text: text,
                    url: href,
                    domain: domain,
                    type: 'external_link'
                });
            }
        });

        // Look for citation patterns
        const citationPatterns = [
            /\(Source: ([^)]+)\)/gi,
            /According to ([^,]+)/gi,
            /Via ([^,\s]+)/gi
        ];

        const fullText = articleElement.textContent;
        citationPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(fullText)) !== null) {
                sources.push({
                    text: match[1],
                    type: 'citation'
                });
            }
        });

        return sources.slice(0, 15); // Limit to top 15 sources
    }

    // Analyze potential bias in the content
    analyzeBias(content) {
        const analysis = {
            politicalBias: 'neutral',
            politicalScore: 0,
            emotionalBias: 'neutral',
            emotionalScore: 0,
            biasIndicators: [],
            confidence: 0
        };

        if (!content.mainText) return analysis;

        const text = content.mainText.toLowerCase();

        // Political bias indicators
        const leftBiasWords = [
            'progressive', 'liberal', 'social justice', 'inequality', 'systemic',
            'marginalized', 'oppression', 'climate crisis', 'corporate greed',
            'wealth gap', 'exploitation', 'discrimination'
        ];

        const rightBiasWords = [
            'conservative', 'traditional values', 'law and order', 'free market',
            'personal responsibility', 'individual liberty', 'patriotic',
            'border security', 'fiscal responsibility', 'constitutional rights'
        ];

        let leftScore = 0;
        let rightScore = 0;

        leftBiasWords.forEach(word => {
            const matches = (text.match(new RegExp(word, 'g')) || []).length;
            leftScore += matches;
        });

        rightBiasWords.forEach(word => {
            const matches = (text.match(new RegExp(word, 'g')) || []).length;
            rightScore += matches;
        });

        // Determine political bias
        const totalPolitical = leftScore + rightScore;
        if (totalPolitical > 0) {
            const leftRatio = leftScore / totalPolitical;
            if (leftRatio > 0.7) {
                analysis.politicalBias = 'left-leaning';
                analysis.politicalScore = Math.min(leftRatio * 100, 100);
            } else if (leftRatio < 0.3) {
                analysis.politicalBias = 'right-leaning';
                analysis.politicalScore = Math.min((1 - leftRatio) * 100, 100);
            }
        }

        // Emotional bias analysis
        const emotionalWords = {
            positive: ['amazing', 'excellent', 'outstanding', 'brilliant', 'fantastic', 'wonderful'],
            negative: ['terrible', 'awful', 'horrible', 'devastating', 'catastrophic', 'outrageous'],
            sensational: ['shocking', 'unbelievable', 'stunning', 'explosive', 'bombshell', 'breaking']
        };

        let emotionalScore = 0;
        Object.values(emotionalWords).flat().forEach(word => {
            const matches = (text.match(new RegExp(word, 'g')) || []).length;
            emotionalScore += matches;
        });

        if (emotionalScore > 5) {
            analysis.emotionalBias = 'high';
            analysis.emotionalScore = Math.min(emotionalScore * 10, 100);
            analysis.biasIndicators.push('High emotional language detected');
        }

        // Calculate overall confidence
        analysis.confidence = Math.min((totalPolitical + emotionalScore) * 5, 100);

        return analysis;
    }

    // Analyze emotional language patterns
    analyzeEmotionalLanguage(content) {
        const analysis = {
            sentiment: 'neutral',
            emotionalIntensity: 0,
            manipulationRisk: 'low',
            patterns: []
        };

        if (!content.mainText) return analysis;

        const text = content.mainText.toLowerCase();

        // Fear-based language
        const fearWords = [
            'dangerous', 'threat', 'crisis', 'emergency', 'alarming',
            'terrifying', 'devastating', 'catastrophic', 'urgent', 'critical'
        ];

        // Anger-inducing language
        const angerWords = [
            'outrageous', 'disgusting', 'appalling', 'shocking', 'scandalous',
            'betrayal', 'corruption', 'fraud', 'lies', 'deception'
        ];

        // Superlatives and absolutes
        const absoluteWords = [
            'always', 'never', 'all', 'none', 'completely', 'totally',
            'absolutely', 'definitely', 'certainly', 'undoubtedly'
        ];

        let fearScore = 0;
        let angerScore = 0;
        let absoluteScore = 0;

        fearWords.forEach(word => {
            const matches = (text.match(new RegExp(word, 'g')) || []).length;
            fearScore += matches;
        });

        angerWords.forEach(word => {
            const matches = (text.match(new RegExp(word, 'g')) || []).length;
            angerScore += matches;
        });

        absoluteWords.forEach(word => {
            const matches = (text.match(new RegExp(word, 'g')) || []).length;
            absoluteScore += matches;
        });

        const totalEmotional = fearScore + angerScore + absoluteScore;
        analysis.emotionalIntensity = Math.min(totalEmotional * 5, 100);

        if (fearScore > 3) analysis.patterns.push('Fear-based language');
        if (angerScore > 3) analysis.patterns.push('Anger-inducing language');
        if (absoluteScore > 5) analysis.patterns.push('Absolute statements');

        // Determine manipulation risk
        if (totalEmotional > 8) {
            analysis.manipulationRisk = 'high';
        } else if (totalEmotional > 4) {
            analysis.manipulationRisk = 'medium';
        }

        // Determine overall sentiment
        if (angerScore > fearScore && angerScore > 2) {
            analysis.sentiment = 'negative';
        } else if (fearScore > 2) {
            analysis.sentiment = 'fearful';
        }

        return analysis;
    }

    // Extract data useful for fact-checking
    extractFactCheckingData() {
        const data = {
            numericalClaims: [],
            namedEntities: [],
            dates: [],
            locations: [],
            organizations: []
        };

        const text = document.body.textContent;

        // Extract numerical claims
        const numberPatterns = [
            /\d+%/g,
            /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|trillion))?/gi,
            /\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion|trillion)/gi
        ];

        numberPatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            data.numericalClaims.push(...matches.slice(0, 10));
        });

        // Extract dates
        const datePatterns = [
            /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
            /\d{1,2}\/\d{1,2}\/\d{4}/g,
            /\d{4}-\d{2}-\d{2}/g
        ];

        datePatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            data.dates.push(...matches.slice(0, 5));
        });

        return data;
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentAnalyzer;
} else {
    window.ContentAnalyzer = ContentAnalyzer;
}