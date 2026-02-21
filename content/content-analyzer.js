// Content Analyzer - Intelligent page analysis for news detection and site popularity
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
                    articleData = { ...articleData, ...data };
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

    // Analyze meta tags for news indicators
    analyzeMetaTags() {
        let score = 0;
        let data = {};

        this.newsIndicators.metaTags.forEach(tagName => {
            const meta = document.querySelector(`meta[property="${tagName}"], meta[name="${tagName}"]`);
            if (meta) {
                score += 10;
                const key = tagName.replace('article:', '').replace('og:article:', '').replace('og:', '');
                data[key] = meta.getAttribute('content');
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
        const authorSelectors = ['.author', '.byline', '.by-author', '[rel="author"]'];
        for (const selector of authorSelectors) {
            const author = element.querySelector(selector) || document.querySelector(selector);
            if (author) {
                score += 10;
                data.author = author.textContent.trim();
                break;
            }
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