// Evident Content Analyzer - AI-powered content extraction and bias analysis for fact-checking
class ContentAnalyzer {
    constructor() {
        // Gemini AI API configuration
        this.apiKey = 'AIzaSyD05HamtdStA4CGTrPmAfxG4L-R3LfYJ68';
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
        
        // Rate limiting and quota management
        this.lastApiCall = 0;
        this.minCallInterval = 5000; // 5 seconds between calls (increased)
        this.quotaExhausted = false;
        this.quotaResetTime = null;
        this.maxRetryAttempts = 2; // Limit retry attempts
        this.skipModelDiscovery = false; // Skip model discovery after first quota hit
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

        // Extract main content for AI analysis
        try {
            analysis.mainContent = this.extractMainContent();
            console.log('Main content extracted:', analysis.mainContent ? 'Success' : 'Failed');
        } catch (error) {
            console.error('Error extracting main content:', error);
            analysis.mainContent = {
                title: document.title || 'Unknown',
                mainText: '',
                paragraphs: [],
                quotes: [],
                claims: [],
                sources: [],
                wordCount: 0
            };
        }
        
        // Check if AI should be attempted or skip to pattern analysis
        const shouldTryAI = !this.quotaExhausted && analysis.mainContent.mainText.length > 200;
        
        if (shouldTryAI) {
            try {
                console.log('Attempting AI analysis...');
                const aiAnalysis = await this.performAIAnalysis(analysis.mainContent, analysis.articleData);
                analysis.biasAnalysis = aiAnalysis.biasAnalysis;
                analysis.emotionalAnalysis = aiAnalysis.emotionalAnalysis;
                analysis.factCheckingData = aiAnalysis.factCheckingData;
                analysis.aiInsights = aiAnalysis.insights;
                console.log('AI analysis completed successfully');
            } catch (error) {
                console.warn('AI analysis failed, using pattern analysis:', error.message);
                this.usePatternAnalysis(analysis);
            }
        } else {
            console.log('Skipping AI analysis - using pattern-based analysis');
            this.usePatternAnalysis(analysis);
        }

        // Cache the complete result
        this.cache.set(cacheKey, {
            data: analysis,
            timestamp: Date.now()
        });

        return analysis;
    }

    // Use pattern-based analysis as fallback
    usePatternAnalysis(analysis) {
        const content = analysis.mainContent;
        const biasAnalysis = this.analyzeBias(content);
        const emotionalAnalysis = this.analyzeEmotionalLanguage(content);
        const factCheckingData = this.extractFactCheckingData();
        
        analysis.biasAnalysis = {
            politicalBias: biasAnalysis.politicalBias,
            politicalScore: biasAnalysis.politicalScore,
            reasoning: 'Pattern-based analysis (AI quota exhausted)'
        };
        
        analysis.emotionalAnalysis = {
            manipulationRisk: emotionalAnalysis.manipulationRisk,
            emotionalIntensity: emotionalAnalysis.emotionalIntensity,
            patterns: emotionalAnalysis.patterns,
            reasoning: 'Pattern-based analysis (AI quota exhausted)'
        };
        
        analysis.factCheckingData = {
            numericalClaims: factCheckingData.numericalClaims,
            factualClaims: content.claims || [],
            sources: content.sources || [],
            credibilityScore: Math.min(50 + (biasAnalysis.confidence / 2), 80) // Basic credibility score
        };
        
        analysis.aiInsights = {
            overallAssessment: this.quotaExhausted ? 
                'Analysis completed using pattern matching (AI quota exhausted)' : 
                'Analysis completed using pattern matching',
            redFlags: biasAnalysis.biasIndicators.concat(emotionalAnalysis.patterns),
            strengths: ['Content analyzed for bias patterns', 'Claims extracted for verification']
        };
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
        console.log('Starting main content extraction...');
        
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

        // Check if this is a CNN live blog or special page type
        const isLiveBlog = this.isLiveBlogPage();
        console.log('Is live blog page:', isLiveBlog);

        // Find main article content
        const articleElement = isLiveBlog ? this.findLiveBlogContent() : this.findMainArticleElement();
        console.log('Article element found:', !!articleElement, 'Type:', isLiveBlog ? 'live-blog' : 'article');

        // Extract title - prioritize the main article title
        content.title = this.extractArticleTitle(articleElement);
        
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
            try {
                // Extract paragraphs
                const paragraphs = articleElement.querySelectorAll('p');
                paragraphs.forEach(p => {
                    const text = p.textContent?.trim() || '';
                    if (text.length > 20) { // Filter out very short paragraphs
                        content.paragraphs.push(text);
                    }
                });
                console.log(`Extracted ${content.paragraphs.length} paragraphs`);

                // Extract quotes
                const quoteSelectors = ['blockquote', '.quote', '.pullquote', 'q'];
                quoteSelectors.forEach(selector => {
                    try {
                        const quotes = articleElement.querySelectorAll(selector);
                        quotes.forEach(quote => {
                            const text = quote.textContent.trim();
                            if (text.length > 10) {
                                content.quotes.push(text);
                            }
                        });
                    } catch (e) {
                        console.warn(`Error extracting quotes with selector ${selector}:`, e);
                    }
                });

                // Extract potential claims (sentences with strong assertions)
                try {
                    content.claims = this.extractClaims(content.paragraphs);
                    console.log(`Extracted ${content.claims.length} claims`);
                } catch (e) {
                    console.warn('Error extracting claims:', e);
                    content.claims = [];
                }

                // Extract sources and links
                try {
                    content.sources = this.extractSources(articleElement);
                    console.log(`Extracted ${content.sources.length} sources`);
                } catch (e) {
                    console.warn('Error extracting sources:', e);
                    content.sources = [];
                }

                // Combine all text
                content.mainText = content.paragraphs.join(' ');
                content.wordCount = content.mainText ? content.mainText.split(/\s+/).filter(word => word.length > 0).length : 0;
                console.log(`Total word count: ${content.wordCount}`);
                
            } catch (error) {
                console.error('Error processing article element:', error);
                // Use fallback extraction
                this.useFallbackExtraction(content);
            }
        } else {
            // Fallback: try to get text from the entire page
            console.warn('No main article element found, using fallback content extraction');
            this.useFallbackExtraction(content);
        }

        return content;
    }

    // Fallback content extraction when main article detection fails
    useFallbackExtraction(content) {
        try {
            console.log('Using fallback content extraction');
            const bodyText = document.body?.textContent || '';
            
            if (bodyText.length > 0) {
                const paragraphs = bodyText.split('\n')
                    .map(p => p.trim())
                    .filter(p => p.length > 50 && p.length < 2000) // Reasonable paragraph length
                    .slice(0, 15); // Limit to first 15 substantial paragraphs
                
                content.paragraphs = paragraphs;
                content.mainText = paragraphs.join(' ');
                content.wordCount = content.mainText ? content.mainText.split(/\s+/).filter(word => word.length > 0).length : 0;
                
                // Try to extract some basic claims from the text
                try {
                    content.claims = this.extractClaims(content.paragraphs);
                } catch (e) {
                    content.claims = [];
                }
                
                console.log(`Fallback extraction: ${content.paragraphs.length} paragraphs, ${content.wordCount} words`);
            } else {
                console.warn('No content found in document body');
                content.mainText = 'No content available';
                content.wordCount = 0;
            }
        } catch (error) {
            console.error('Error in fallback extraction:', error);
            content.mainText = 'Content extraction failed';
            content.wordCount = 0;
        }
    }

    // Find the main article element - prioritize the PRIMARY article user is reading
    findMainArticleElement() {
        console.log('Finding primary article element...');
        
        // Strategy 1: Look for the primary article (usually first, largest, most prominent)
        const primaryArticle = this.findPrimaryArticle();
        if (primaryArticle) {
            console.log('Found primary article');
            return primaryArticle;
        }

        // Strategy 2: Try semantic HTML first with validation (first valid one)
        const articles = document.querySelectorAll('article');
        for (const article of articles) {
            if (this.isMainArticleCandidate(article)) {
                console.log('Found main article via semantic HTML');
                return article;
            }
        }

        // Strategy 3: Try news-specific selectors (first match only)
        const newsSelectors = [
            '[role="article"]',
            '.article-content', '.story-content', '.article-body',
            '.post-content', '.entry-content', '.main-content',
            '.article-text', '.story-body', '.article-main',
            // CNN specific
            '.pg-rail-tall__body', '.zn-body__paragraph',
            // Common news patterns
            '[data-module="ArticleBody"]', '[data-component="ArticleBody"]',
            '.RichTextArticleBody', '.ArticleBody'
        ];

        for (const selector of newsSelectors) {
            const element = document.querySelector(selector);
            if (element && this.isMainArticleCandidate(element)) {
                console.log(`Found main article via selector: ${selector}`);
                return element;
            }
        }

        console.warn('No suitable main article element found');
        return null;
    }

    // Find the primary article that the user is actually reading
    findPrimaryArticle() {
        // Look for articles in the main content area (not sidebars)
        const mainContentSelectors = [
            'main', '[role="main"]', '#main', '.main', 
            '#content', '.content', '#primary', '.primary',
            '.main-content', '.primary-content'
        ];

        for (const selector of mainContentSelectors) {
            const mainArea = document.querySelector(selector);
            if (mainArea) {
                // Find the first substantial article within the main content area
                const articlesInMain = mainArea.querySelectorAll('article, .article, [role="article"]');
                for (const article of articlesInMain) {
                    if (this.isPrimaryArticleCandidate(article)) {
                        console.log(`Found primary article in main content area: ${selector}`);
                        return article;
                    }
                }
            }
        }

        // Look for the largest article by content (likely the main one user is reading)
        const allArticles = document.querySelectorAll('article, .article, [role="article"]');
        let largestArticle = null;
        let maxContentScore = 0;

        allArticles.forEach((article, index) => {
            // Prioritize articles that appear earlier in the DOM (usually main content)
            const positionBonus = Math.max(0, 100 - (index * 10));
            const contentScore = this.calculatePrimaryArticleScore(article) + positionBonus;
            
            if (contentScore > maxContentScore && contentScore > 200) {
                maxContentScore = contentScore;
                largestArticle = article;
            }
        });

        if (largestArticle) {
            console.log(`Found primary article by content size (score: ${maxContentScore})`);
            return largestArticle;
        }

        return null;
    }

    // Check if element is the primary article (not a recommended/related article)
    isPrimaryArticleCandidate(element) {
        if (!element || element.textContent.length < 500) return false;
        
        // Strong exclusion patterns for recommended/related articles
        const excludePatterns = [
            /recommend|related|suggested|trending|popular|more-stories/i,
            /sidebar|aside|secondary|rail|widget/i,
            /comments?|social|share|footer|header|nav/i,
            /advertisement|ads?|promo|sponsored/i,
            /newsletter|subscribe|signup|follow/i,
            /also-read|you-may-like|dont-miss|must-read/i
        ];
        
        const className = element.className || '';
        const id = element.id || '';
        const parentClasses = element.parentElement?.className || '';
        const combined = className + ' ' + id + ' ' + parentClasses;
        
        // Exclude if matches exclusion patterns
        if (excludePatterns.some(pattern => pattern.test(combined))) {
            return false;
        }
        
        // Must have substantial paragraph content
        const paragraphs = element.querySelectorAll('p');
        const substantialParagraphs = Array.from(paragraphs).filter(p => 
            p.textContent.trim().length > 80 // Higher threshold for primary content
        ).length;
        
        return substantialParagraphs >= 5; // Higher threshold for primary article
    }

    // Calculate score for primary article detection
    calculatePrimaryArticleScore(element) {
        if (!element) return 0;
        
        let score = 0;
        const text = element.textContent || '';
        const textLength = text.length;
        
        // Heavy weight on content length for primary articles
        score += Math.min(textLength / 5, 500); // Up to 500 points for length
        
        // Paragraph quality analysis
        const paragraphs = element.querySelectorAll('p');
        const substantialParagraphs = Array.from(paragraphs).filter(p => {
            const pText = p.textContent.trim();
            return pText.length > 80 && pText.length < 3000; // Primary content paragraphs
        });
        
        score += substantialParagraphs.length * 30; // Higher weight for paragraphs
        
        // Bonus for article-like structure
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length > 0 && headings.length < 8) score += 50;
        
        // Penalize high link density (indicates navigation/recommendations)
        const links = element.querySelectorAll('a');
        const linkDensity = links.length / Math.max(textLength / 200, 1);
        if (linkDensity > 3) score -= 200; // Strong penalty for high link density
        
        // Check for primary content indicators
        const className = element.className || '';
        const id = element.id || '';
        const combined = (className + ' ' + id).toLowerCase();
        
        // Strong bonus for primary content indicators
        if (/main|primary|article-body|story-body|content-body/i.test(combined)) {
            score += 100;
        }
        
        // Strong penalty for secondary content indicators
        if (/recommend|related|sidebar|aside|secondary/i.test(combined)) {
            score -= 300;
        }
        
        return score;
    }

    // Extract the title of the main article (not page title which might be generic)
    extractArticleTitle(articleElement) {
        // Strategy 1: Look for title within the article element
        if (articleElement) {
            const titleSelectors = [
                'h1', '.headline', '.title', '.article-title', 
                '.story-title', '.entry-title', '.post-title',
                '[data-testid="headline"]', '[data-cy="headline"]'
            ];
            
            for (const selector of titleSelectors) {
                const titleElement = articleElement.querySelector(selector);
                if (titleElement && titleElement.textContent.trim().length > 10) {
                    console.log(`Found article title via selector: ${selector}`);
                    return titleElement.textContent.trim();
                }
            }
        }

        // Strategy 2: Look for main headline in document
        const mainTitleSelectors = [
            'h1', '.headline', '.main-headline', '.article-headline',
            '[role="heading"][aria-level="1"]'
        ];
        
        for (const selector of mainTitleSelectors) {
            const titleElement = document.querySelector(selector);
            if (titleElement && titleElement.textContent.trim().length > 10) {
                // Make sure it's not in a sidebar or recommended section
                const parentText = titleElement.closest('[class*="sidebar"], [class*="recommend"], [class*="related"]');
                if (!parentText) {
                    console.log(`Found main title via selector: ${selector}`);
                    return titleElement.textContent.trim();
                }
            }
        }

        // Strategy 3: Use page title as fallback but clean it up
        const pageTitle = document.title || '';
        if (pageTitle) {
            // Remove common site suffixes
            const cleanTitle = pageTitle
                .replace(/\s*[-|–]\s*.+$/, '') // Remove " - Site Name" or " | Site Name"
                .replace(/\s*\|\s*.+$/, '')
                .trim();
            
            if (cleanTitle.length > 10) {
                console.log('Using cleaned page title');
                return cleanTitle;
            }
        }

        console.warn('Could not find article title');
        return pageTitle || 'Unknown Article';
    }

    // Check if this is a live blog page
    isLiveBlogPage() {
        const url = window.location.href.toLowerCase();
        const title = document.title.toLowerCase();
        
        // Check URL patterns for live blogs
        if (url.includes('/live-news/') || 
            url.includes('/live-updates/') || 
            url.includes('/live/') ||
            title.includes('live') ||
            title.includes('updates')) {
            return true;
        }
        
        // Check for live blog indicators in the page
        const liveBlogSelectors = [
            '[data-component="LiveBlog"]',
            '.live-blog',
            '.live-updates',
            '[class*="live"]'
        ];
        
        return liveBlogSelectors.some(selector => document.querySelector(selector));
    }

    // Find content for live blog pages
    findLiveBlogContent() {
        console.log('Finding live blog content...');
        
        // Try live blog specific selectors
        const liveBlogSelectors = [
            '[data-component="LiveBlog"]',
            '.live-blog-content',
            '.live-updates-content',
            '.live-blog',
            '.live-updates'
        ];
        
        for (const selector of liveBlogSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.length > 200) {
                console.log(`Found live blog content via: ${selector}`);
                return element;
            }
        }
        
        // Fallback to looking for the main content area
        const mainContentSelectors = [
            'main',
            '[role="main"]',
            '#main-content',
            '.main-content',
            '.content'
        ];
        
        for (const selector of mainContentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.length > 300) {
                console.log(`Found live blog content via main area: ${selector}`);
                return element;
            }
        }
        
        // Last resort: use body but try to filter out navigation
        console.log('Using document body as fallback for live blog');
        return document.body;
    }

    // Check if element is a good main article candidate
    isMainArticleCandidate(element) {
        if (!element || element.textContent.length < 300) return false;
        
        // Exclude elements that are clearly not main content
        const excludePatterns = [
            /sidebar|related|recommended|trending|popular/i,
            /comments?|social|share|footer|header|nav/i,
            /advertisement|ads?|promo|sponsored/i,
            /newsletter|subscribe|signup/i
        ];
        
        const className = element.className || '';
        const id = element.id || '';
        const combined = className + ' ' + id;
        
        if (excludePatterns.some(pattern => pattern.test(combined))) {
            return false;
        }
        
        // Must have substantial paragraph content
        const paragraphs = element.querySelectorAll('p');
        const substantialParagraphs = Array.from(paragraphs).filter(p => 
            p.textContent.trim().length > 50
        ).length;
        
        return substantialParagraphs >= 3;
    }

    // Score article candidates based on content characteristics
    scoreArticleCandidate(element) {
        if (!element) return 0;
        
        let score = 0;
        const text = element.textContent || '';
        const textLength = text.length;
        
        // Base score from text length
        score += Math.min(textLength / 10, 200);
        
        // Paragraph analysis
        const paragraphs = element.querySelectorAll('p');
        const substantialParagraphs = Array.from(paragraphs).filter(p => {
            const pText = p.textContent.trim();
            return pText.length > 50 && pText.length < 2000; // Not too short or too long
        });
        
        score += substantialParagraphs.length * 20;
        
        // Penalize if it contains too many links (likely navigation/sidebar)
        const links = element.querySelectorAll('a');
        const linkDensity = links.length / Math.max(textLength / 100, 1);
        if (linkDensity > 5) score -= 100; // High link density = likely not main content
        
        // Bonus for article-like structure
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length > 0 && headings.length < 10) score += 30;
        
        // Penalize elements with navigation-like characteristics
        const className = element.className || '';
        const id = element.id || '';
        const combined = (className + ' ' + id).toLowerCase();
        
        if (/sidebar|nav|menu|related|recommended|trending/i.test(combined)) {
            score -= 150;
        }
        
        // Bonus for main content indicators
        if (/article|content|story|main|body/i.test(combined)) {
            score += 50;
        }
        
        // Penalize if element is too nested (likely not main content)
        let depth = 0;
        let parent = element.parentElement;
        while (parent && depth < 10) {
            depth++;
            parent = parent.parentElement;
        }
        if (depth > 8) score -= 30;
        
        // Penalize very wide elements (likely full-page containers)
        if (element.offsetWidth && element.offsetWidth > window.innerWidth * 0.9) {
            score -= 50;
        }
        
        return score;
    }

    // Extract potential factual claims from text (improved)
    extractClaims(paragraphs) {
        const claims = new Set(); // Use Set to avoid duplicates
        
        // Enhanced claim indicators with more sophisticated patterns
        const claimPatterns = [
            // Authority-based claims
            /[^.!?]*(?:according to|officials say|experts claim|researchers found|study shows|data reveals|reports indicate)[^.!?]*/gi,
            
            // Statistical claims
            /[^.!?]*(?:\d+(?:\.\d+)?%|increased by|decreased by|rose by|fell by|\d+(?:,\d{3})*\s*(?:million|billion|trillion))[^.!?]*/gi,
            
            // Temporal claims
            /[^.!?]*(?:since \d{4}|in \d{4}|by \d{4}|over the (?:past|last) \d+ (?:years?|months?|decades?))[^.!?]*/gi,
            
            // Causal claims
            /[^.!?]*(?:caused by|resulted in|led to|due to|because of|as a result of)[^.!?]*/gi,
            
            // Comparative claims
            /[^.!?]*(?:more than|less than|higher than|lower than|compared to|versus)[^.!?]*(?:\d+|other|previous|last year)/gi,
            
            // Definitive statements that could be fact-checked
            /[^.!?]*(?:will|announced|confirmed|denied|stated|declared|revealed)[^.!?]*/gi
        ];

        paragraphs.forEach(paragraph => {
            claimPatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(paragraph)) !== null && claims.size < 15) {
                    const claim = match[0].trim();
                    
                    // Filter out low-quality claims
                    if (claim.length > 40 && 
                        claim.length < 300 && 
                        !claim.toLowerCase().includes('advertisement') &&
                        !claim.toLowerCase().includes('subscribe') &&
                        claim.split(' ').length > 5) {
                        
                        // Clean up the claim
                        const cleanClaim = claim
                            .replace(/^[^\w]*/, '') // Remove leading non-word chars
                            .replace(/[^\w]*$/, '') // Remove trailing non-word chars
                            .replace(/\s+/g, ' ') // Normalize whitespace
                            .trim();
                            
                        if (cleanClaim.length > 30) {
                            claims.add(cleanClaim);
                        }
                    }
                }
                // Reset regex lastIndex to avoid issues with global flag
                pattern.lastIndex = 0;
            });
        });

        return Array.from(claims).slice(0, 8); // Limit to top 8 quality claims
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

    // Extract data useful for fact-checking from main content only
    extractFactCheckingData() {
        const data = {
            numericalClaims: [],
            namedEntities: [],
            dates: [],
            locations: [],
            organizations: []
        };

        // Use main article content only, not entire page
        const mainArticle = this.findMainArticleElement();
        if (!mainArticle) {
            console.warn('No main article found for fact-checking extraction');
            return data;
        }

        const text = mainArticle.textContent;

        // Extract meaningful numerical claims with context
        const numericalClaims = new Set(); // Use Set to avoid duplicates
        
        // More sophisticated patterns with context
        const contextualPatterns = [
            // Percentages with context
            /(?:increased|decreased|rose|fell|up|down|grew|declined)\s+(?:by\s+)?(\d+(?:\.\d+)?%)/gi,
            /(\d+(?:\.\d+)?%)\s+(?:increase|decrease|rise|fall|growth|decline|higher|lower|more|less)/gi,
            /(\d+(?:\.\d+)?%)\s+of\s+(?:people|voters|respondents|Americans|citizens)/gi,
            
            // Money amounts with context
            /(?:\$[\d,]+(?:\.\d{2})?\s*(?:million|billion|trillion))\s+(?:budget|funding|cost|investment|revenue|profit|loss)/gi,
            /(?:spent|cost|invested|allocated|budgeted|earned|lost)\s+(?:\$[\d,]+(?:\.\d{2})?\s*(?:million|billion|trillion)?)/gi,
            
            // Large numbers with context
            /(\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion|trillion))\s+(?:people|jobs|dollars|votes|cases|deaths|infections)/gi,
            
            // Years and time periods
            /(?:in|since|by|from|during)\s+(\d{4})/gi,
            /(\d{1,2})\s+(?:years?|months?|weeks?|days?)\s+(?:ago|later|earlier)/gi
        ];

        contextualPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null && numericalClaims.size < 15) {
                const claim = match[0].trim();
                if (claim.length > 3 && claim.length < 100) { // Filter reasonable length claims
                    numericalClaims.add(claim);
                }
            }
        });

        data.numericalClaims = Array.from(numericalClaims).slice(0, 10);

        // Extract dates from main content only
        const datePatterns = [
            /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
            /\d{1,2}\/\d{1,2}\/\d{4}/g,
            /\d{4}-\d{2}-\d{2}/g
        ];

        const dates = new Set();
        datePatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            matches.forEach(date => {
                if (dates.size < 5) dates.add(date);
            });
        });
        data.dates = Array.from(dates);

        return data;
    }

    // Discover available models from Google's API (with quota awareness)
    async discoverAvailableModels() {
        // Skip discovery if we've hit quota limits or already discovered
        if (this.skipModelDiscovery || this.quotaExhausted) {
            console.log('Skipping model discovery due to quota concerns');
            return [];
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            if (response.ok) {
                const data = await response.json();
                console.log('Available models discovered');
                
                // Filter for models that support generateContent and are likely free
                const availableModels = data.models
                    .filter(model => 
                        model.supportedGenerationMethods?.includes('generateContent') &&
                        model.name.includes('flash') // Only flash models to save quota
                    )
                    .slice(0, 2) // Limit to 2 models max
                    .map(model => `https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent`);
                
                console.log('Filtered available models:', availableModels.length);
                
                // Skip discovery in future calls to save quota
                this.skipModelDiscovery = true;
                return availableModels;
            } else if (response.status === 429) {
                // Mark discovery as failed due to quota
                this.skipModelDiscovery = true;
                console.warn('Model discovery hit quota limit');
            }
        } catch (error) {
            console.warn('Could not discover models:', error);
            this.skipModelDiscovery = true;
        }
        return [];
    }

    // Check if we should skip AI analysis due to quota limits
    shouldSkipAIAnalysis() {
        if (this.quotaExhausted && this.quotaResetTime) {
            const now = Date.now();
            if (now < this.quotaResetTime) {
                const minutesLeft = Math.ceil((this.quotaResetTime - now) / 60000);
                console.log(`Quota exhausted. Skipping AI analysis. Reset in ${minutesLeft} minutes.`);
                return true;
            } else {
                // Reset quota status
                this.quotaExhausted = false;
                this.quotaResetTime = null;
                console.log('Quota reset time reached. Re-enabling AI analysis.');
            }
        }
        return false;
    }

    // Implement rate limiting
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        
        if (timeSinceLastCall < this.minCallInterval) {
            const waitTime = this.minCallInterval - timeSinceLastCall;
            console.log(`Rate limiting: waiting ${waitTime}ms before API call`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastApiCall = Date.now();
    }

    // Handle quota exhaustion errors
    handleQuotaError(error, retryDelay) {
        console.warn('Quota exhausted - entering extended cooldown');
        this.quotaExhausted = true;
        this.skipModelDiscovery = true; // Stop all discovery attempts
        
        // Parse retry delay from error (in seconds) and add significant buffer
        const delaySeconds = retryDelay || 3600; // Default 1 hour if no delay specified
        this.quotaResetTime = Date.now() + (delaySeconds * 1000) + 1800000; // Add 30 minute buffer
        
        console.log(`Quota exhausted. AI analysis disabled for ${Math.ceil((delaySeconds + 1800)/60)} minutes.`);
    }

    // Perform AI-powered analysis using Gemini
    async performAIAnalysis(content, articleData) {
        if (!content || !content.mainText || content.mainText.length < 100) {
            throw new Error('Insufficient content for AI analysis');
        }

        // Check if we should skip due to quota limits
        if (this.shouldSkipAIAnalysis()) {
            throw new Error('AI analysis temporarily disabled due to quota limits');
        }

        // Implement rate limiting
        await this.waitForRateLimit();

        // Use minimal model list to avoid quota waste
        let modelEndpoints = [];
        
        // Only try model discovery if we haven't hit quota yet
        if (!this.quotaExhausted && !this.skipModelDiscovery) {
            modelEndpoints = await this.discoverAvailableModels();
        }
        
        // Use minimal fallback list to save quota
        if (modelEndpoints.length === 0) {
            console.log('Using minimal fallback model list');
            modelEndpoints = [
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent'
            ];
        }
        
        // Limit to maximum 2 attempts to prevent quota waste
        modelEndpoints = modelEndpoints.slice(0, this.maxRetryAttempts);

        for (let i = 0; i < modelEndpoints.length; i++) {
            try {
                const endpoint = modelEndpoints[i];
                console.log(`Trying AI model endpoint ${i + 1}/${modelEndpoints.length}: ${endpoint}`);
                
                const prompt = this.buildAnalysisPrompt(content, articleData);
                
                const requestBody = {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                };

                const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(`Model endpoint ${i + 1} failed:`, errorText);
                    
                    // Handle quota exhaustion specifically
                    if (response.status === 429) {
                        try {
                            const errorData = JSON.parse(errorText);
                            const retryDelay = errorData.details?.find(d => d['@type']?.includes('RetryInfo'))?.retryDelay;
                            const delaySeconds = retryDelay ? parseInt(retryDelay.replace('s', '')) : 3600; // Default 1 hour
                            this.handleQuotaError(errorData, delaySeconds);
                            
                            // Immediately break out of loop to prevent more API calls
                            throw new Error('Quota exhausted - stopping all AI attempts');
                        } catch (e) {
                            this.handleQuotaError(errorText, 3600); // 1 hour default
                            throw new Error('Quota exhausted - stopping all AI attempts');
                        }
                    }
                    
                    // If this is the last endpoint, throw the error
                    if (i === modelEndpoints.length - 1) {
                        throw new Error(`All AI endpoints failed. Last error: ${response.status} - ${errorText}`);
                    }
                    continue; // Try next endpoint
                }

                const data = await response.json();
                console.log('AI API response received:', data);
                
                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                    console.warn('Invalid AI response structure, trying next endpoint');
                    if (i === modelEndpoints.length - 1) {
                        throw new Error('Invalid AI response structure from all endpoints');
                    }
                    continue;
                }
                
                const aiResponse = data.candidates[0].content.parts[0].text;
                console.log('AI response text:', aiResponse);
                
                // Successfully got a response, update the working endpoint for future use
                this.apiEndpoint = endpoint;
                
                return this.parseAIResponse(aiResponse);
                
            } catch (error) {
                console.error(`AI analysis error with endpoint ${i + 1}:`, error);
                if (i === modelEndpoints.length - 1) {
                    throw error;
                }
                // Continue to next endpoint
            }
        }
    }

    // Build comprehensive analysis prompt for AI (optimized for quota)
    buildAnalysisPrompt(content, articleData) {
        const title = content.title || 'No title';
        const publisher = articleData?.publisher || 'Unknown';
        
        // Reduce text size to save tokens
        const textSample = content.mainText.substring(0, 1500);
        
        return `Analyze this article for bias and fact-checking:

Title: ${title}
Publisher: ${publisher}
Text: ${textSample}

Return JSON:
{
  "biasAnalysis": {"politicalBias": "neutral|left-leaning|right-leaning", "politicalScore": 0-100, "reasoning": "brief explanation"},
  "emotionalAnalysis": {"manipulationRisk": "low|medium|high", "emotionalIntensity": 0-100, "reasoning": "brief explanation"},
  "factCheckingData": {"numericalClaims": [], "factualClaims": [], "credibilityScore": 0-100},
  "insights": {"overallAssessment": "brief assessment", "redFlags": [], "strengths": []}
}`;
    }

    // Parse AI response and structure the data
    parseAIResponse(aiResponse) {
        try {
            // Extract JSON from the response (AI might include extra text)
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }
            
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Ensure all required fields exist with defaults
            return {
                biasAnalysis: {
                    politicalBias: parsed.biasAnalysis?.politicalBias || 'neutral',
                    politicalScore: parsed.biasAnalysis?.politicalScore || 0,
                    reasoning: parsed.biasAnalysis?.reasoning || 'No bias detected',
                    ...parsed.biasAnalysis
                },
                emotionalAnalysis: {
                    manipulationRisk: parsed.emotionalAnalysis?.manipulationRisk || 'low',
                    emotionalIntensity: parsed.emotionalAnalysis?.emotionalIntensity || 0,
                    patterns: parsed.emotionalAnalysis?.patterns || [],
                    reasoning: parsed.emotionalAnalysis?.reasoning || 'No emotional manipulation detected',
                    ...parsed.emotionalAnalysis
                },
                factCheckingData: {
                    numericalClaims: parsed.factCheckingData?.numericalClaims || [],
                    factualClaims: parsed.factCheckingData?.factualClaims || [],
                    sources: parsed.factCheckingData?.sources || [],
                    credibilityScore: parsed.factCheckingData?.credibilityScore || 50,
                    ...parsed.factCheckingData
                },
                insights: {
                    overallAssessment: parsed.insights?.overallAssessment || 'Analysis completed',
                    redFlags: parsed.insights?.redFlags || [],
                    strengths: parsed.insights?.strengths || [],
                    ...parsed.insights
                }
            };
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            throw new Error('Invalid AI response format');
        }
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