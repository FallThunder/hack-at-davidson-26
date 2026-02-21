// Evident Popup - Fact-checking and bias analysis interface
document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const exportBtn = document.getElementById('exportBtn');
    const statusText = document.getElementById('statusText');
    
    // Analysis UI elements
    const loadingIndicator = document.getElementById('loadingIndicator');
    const analysisResults = document.getElementById('analysisResults');
    const errorMessage = document.getElementById('errorMessage');
    
    // Status elements
    const articleStatus = document.getElementById('articleStatus');
    const newsStatus = document.getElementById('newsStatus');
    const confidenceScore = document.getElementById('confidenceScore');
    
    // Bias analysis elements
    const politicalBias = document.getElementById('politicalBias');
    const emotionalBias = document.getElementById('emotionalBias');
    const claimsCount = document.getElementById('claimsCount');
    const articleDetails = document.getElementById('articleDetails');

    // Load page analysis on popup open
    loadPageAnalysis();

    // Analyze button click handler
    analyzeBtn.addEventListener('click', function() {
        loadPageAnalysis(true);
    });

    // Export button click handler
    exportBtn.addEventListener('click', async function() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const analysis = await chrome.tabs.sendMessage(tab.id, {
                action: 'getPageAnalysis'
            });
            
            if (analysis && !analysis.error) {
                exportAnalysisReport(analysis);
                updateStatus('Report exported!', 'success');
            } else {
                updateStatus('No analysis to export', 'error');
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            updateStatus('Export failed', 'error');
        }
    });

    // Load and display page analysis
    async function loadPageAnalysis(forceRefresh = false) {
        showLoading();
        updateLoadingText('Analyzing article...', 'Extracting content and detecting patterns');
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Update loading for AI analysis
            setTimeout(() => {
                updateLoadingText('AI Analysis in progress...', 'Checking for bias and fact-checking claims');
            }, 1000);
            
            // Get page analysis from content script
            const analysis = await chrome.tabs.sendMessage(tab.id, {
                action: 'getPageAnalysis'
            });
            
            if (analysis && !analysis.error) {
                displayAnalysis(analysis);
                updateStatus('AI analysis complete!', 'success');
            } else {
                showError(analysis?.error || 'Could not analyze page');
                updateStatus('Analysis failed', 'error');
            }
            
        } catch (error) {
            console.error('Error loading page analysis:', error);
            
            // Handle quota exhaustion specifically
            if (error.message && error.message.includes('quota')) {
                showError('AI quota temporarily exhausted. Using pattern-based analysis. Try again later.');
                updateStatus('Quota limit reached', 'error');
            } else {
                showError('Extension not ready on this page');
                updateStatus('Analysis error', 'error');
            }
        }
    }

    // Update loading text
    function updateLoadingText(mainText, subText) {
        const loadingTextEl = document.getElementById('loadingText');
        const loadingSubtextEl = document.getElementById('loadingSubtext');
        
        if (loadingTextEl) loadingTextEl.textContent = mainText;
        if (loadingSubtextEl) loadingSubtextEl.textContent = subText;
    }

    // Show loading state
    function showLoading() {
        loadingIndicator.style.display = 'flex';
        analysisResults.style.display = 'none';
        errorMessage.style.display = 'none';
    }

    // Show error state
    function showError(message) {
        loadingIndicator.style.display = 'none';
        analysisResults.style.display = 'none';
        errorMessage.style.display = 'flex';
        errorMessage.querySelector('p').textContent = message || 'Could not analyze this page';
    }

    // Display analysis results
    function displayAnalysis(analysis) {
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'none';
        analysisResults.style.display = 'block';
        
        // Display article status
        displayArticleStatus(analysis);
        
        // Display bias analysis
        displayBiasAnalysis(analysis);
        
        // Display article details
        displayArticleDetails(analysis);
    }

    // Display article status
    function displayArticleStatus(analysis) {
        const isNews = analysis.isNewsArticle;
        const confidence = Math.round(analysis.newsConfidence || 0);
        
        // Update status indicator
        const statusDot = newsStatus.querySelector('.status-dot');
        const statusTextEl = newsStatus.querySelector('.status-text');
        
        statusDot.className = 'status-dot';
        if (isNews) {
            statusDot.classList.add('news');
            statusTextEl.textContent = 'News article detected';
        } else if (confidence > 25) {
            statusDot.classList.add('maybe');
            statusTextEl.textContent = 'Possibly news-related';
        } else {
            statusTextEl.textContent = 'Not a news article';
        }
        
        // Update confidence score
        confidenceScore.textContent = `${confidence}%`;
    }

    // Display bias analysis
    function displayBiasAnalysis(analysis) {
        const bias = analysis.biasAnalysis || {};
        const emotional = analysis.emotionalAnalysis || {};
        
        // Update political bias
        const politicalBiasText = bias.politicalBias || 'neutral';
        politicalBias.textContent = formatBiasText(politicalBiasText);
        politicalBias.className = `metric-value ${politicalBiasText.replace('-', '')}`;
        
        // Add reasoning tooltip if available
        if (bias.reasoning) {
            politicalBias.title = bias.reasoning;
        }
        
        // Update emotional manipulation
        const emotionalRisk = emotional.manipulationRisk || 'low';
        emotionalBias.textContent = formatBiasText(emotionalRisk);
        emotionalBias.className = `metric-value ${emotionalRisk}`;
        
        // Add reasoning tooltip if available
        if (emotional.reasoning) {
            emotionalBias.title = emotional.reasoning;
        }
        
        // Update claims count
        const totalClaims = (analysis.factCheckingData?.numericalClaims?.length || 0) + 
                           (analysis.factCheckingData?.factualClaims?.length || 0);
        claimsCount.textContent = totalClaims.toString();
        
        // Add credibility score if available
        if (analysis.factCheckingData?.credibilityScore) {
            claimsCount.title = `Credibility Score: ${analysis.factCheckingData.credibilityScore}/100`;
        }

        // Add detailed analysis sections
        addDetailedAnalysis(analysis);
    }

    // Add detailed analysis sections with expandable content
    function addDetailedAnalysis(analysis) {
        const biasCard = document.getElementById('biasCard');
        
        // Remove existing detailed sections
        const existingDetails = biasCard.querySelectorAll('.expandable-section');
        existingDetails.forEach(section => section.remove());

        // Add factual claims section
        if (analysis.factCheckingData?.factualClaims?.length > 0 || analysis.claims?.length > 0) {
            const claims = analysis.factCheckingData?.factualClaims || analysis.claims || [];
            addExpandableSection(biasCard, 'Factual Claims to Verify', claims, 'claims');
        }

        // Add numerical claims section
        if (analysis.factCheckingData?.numericalClaims?.length > 0) {
            addExpandableSection(biasCard, 'Numerical Claims', analysis.factCheckingData.numericalClaims, 'claims');
        }

        // Add emotional patterns section
        if (analysis.emotionalAnalysis?.patterns?.length > 0) {
            addExpandableSection(biasCard, 'Emotional Manipulation Patterns', analysis.emotionalAnalysis.patterns, 'red-flags');
        }

        // Add bias reasoning
        if (analysis.biasAnalysis?.reasoning) {
            addReasoningSection(biasCard, 'Political Bias Analysis', analysis.biasAnalysis.reasoning);
        }

        // Add emotional reasoning
        if (analysis.emotionalAnalysis?.reasoning) {
            addReasoningSection(biasCard, 'Emotional Analysis', analysis.emotionalAnalysis.reasoning);
        }
    }

    // Add expandable section with list of items
    function addExpandableSection(parentElement, title, items, listClass = '') {
        if (!items || items.length === 0) return;

        const section = document.createElement('div');
        section.className = 'expandable-section';
        
        const toggle = document.createElement('button');
        toggle.className = 'expand-toggle collapsed';
        toggle.textContent = `${title} (${items.length})`;
        
        const content = document.createElement('div');
        content.className = 'expandable-content collapsed';
        
        const list = document.createElement('ul');
        list.className = `detail-list ${listClass}`;
        
        items.slice(0, 10).forEach(item => { // Limit to 10 items
            const listItem = document.createElement('li');
            listItem.textContent = typeof item === 'string' ? item : item.text || item.claim || JSON.stringify(item);
            list.appendChild(listItem);
        });
        
        content.appendChild(list);
        section.appendChild(toggle);
        section.appendChild(content);
        parentElement.appendChild(section);
        
        // Add click handler for toggle
        toggle.addEventListener('click', () => {
            const isCollapsed = content.classList.contains('collapsed');
            if (isCollapsed) {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
                toggle.classList.remove('collapsed');
            } else {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
                toggle.classList.add('collapsed');
            }
        });
    }

    // Add reasoning section
    function addReasoningSection(parentElement, title, reasoning) {
        const section = document.createElement('div');
        section.className = 'expandable-section';
        
        const toggle = document.createElement('button');
        toggle.className = 'expand-toggle collapsed';
        toggle.textContent = title;
        
        const content = document.createElement('div');
        content.className = 'expandable-content collapsed';
        
        const reasoningDiv = document.createElement('div');
        reasoningDiv.className = 'reasoning-text';
        reasoningDiv.textContent = reasoning;
        
        content.appendChild(reasoningDiv);
        section.appendChild(toggle);
        section.appendChild(content);
        parentElement.appendChild(section);
        
        // Add click handler for toggle
        toggle.addEventListener('click', () => {
            const isCollapsed = content.classList.contains('collapsed');
            if (isCollapsed) {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
                toggle.classList.remove('collapsed');
            } else {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
                toggle.classList.add('collapsed');
            }
        });
    }

    // Display article details
    function displayArticleDetails(analysis) {
        let detailsHtml = '';
        
        if (analysis.articleData) {
            const data = analysis.articleData;
            
            // Handle authors
            if (data.authors && Array.isArray(data.authors) && data.authors.length > 0) {
                const authorText = data.authors.join(', ');
                detailsHtml += `<div class="detail-row"><span class="detail-label">Author${data.authors.length > 1 ? 's' : ''}:</span><span class="detail-value">${escapeHtml(authorText)}</span></div>`;
            } else if (data.author && typeof data.author === 'string') {
                detailsHtml += `<div class="detail-row"><span class="detail-label">Author:</span><span class="detail-value">${escapeHtml(data.author)}</span></div>`;
            }
            
            // Handle publisher
            if (data.publisher) {
                detailsHtml += `<div class="detail-row"><span class="detail-label">Publisher:</span><span class="detail-value">${escapeHtml(data.publisher)}</span></div>`;
            }
            
            // Handle publication date
            if (data.publishDate) {
                detailsHtml += `<div class="detail-row"><span class="detail-label">Published:</span><span class="detail-value">${formatDate(data.publishDate)}</span></div>`;
            }
            
            // Handle word count
            if (data.wordCount) {
                detailsHtml += `<div class="detail-row"><span class="detail-label">Word count:</span><span class="detail-value">${data.wordCount.toLocaleString()}</span></div>`;
            }
            
            // Handle site popularity
            if (analysis.sitePopularity) {
                detailsHtml += `<div class="detail-row"><span class="detail-label">Site type:</span><span class="detail-value">${formatBiasText(analysis.sitePopularity)}</span></div>`;
            }
        }
        
        // Add AI insights if available
        if (analysis.aiInsights) {
            const insights = analysis.aiInsights;
            
            if (insights.overallAssessment) {
                detailsHtml += `<div class="detail-row"><span class="detail-label">AI Assessment:</span><span class="detail-value">${escapeHtml(insights.overallAssessment)}</span></div>`;
            }
            
        }
        
        articleDetails.innerHTML = detailsHtml;
        
        // Add detailed AI insights sections
        addDetailedInsights(analysis);
    }

    // Add detailed AI insights sections
    function addDetailedInsights(analysis) {
        const detailsCard = document.getElementById('detailsCard');
        
        // Remove existing detailed sections
        const existingDetails = detailsCard.querySelectorAll('.expandable-section');
        existingDetails.forEach(section => section.remove());

        const insights = analysis.aiInsights || analysis.insights || {};

        // Add overall assessment
        if (insights.overallAssessment) {
            addInsightSection(detailsCard, 'AI Assessment', insights.overallAssessment);
        }

        // Add red flags section
        if (insights.redFlags && insights.redFlags.length > 0) {
            addExpandableSection(detailsCard, 'Red Flags', insights.redFlags, 'red-flags');
        }

        // Add strengths section
        if (insights.strengths && insights.strengths.length > 0) {
            addExpandableSection(detailsCard, 'Article Strengths', insights.strengths, 'strengths');
        }

        // Add sources section if available
        if (analysis.sources && analysis.sources.length > 0) {
            const sourceTexts = analysis.sources.map(source => 
                source.text || source.url || source.domain || source
            );
            addExpandableSection(detailsCard, 'Sources & References', sourceTexts, 'sources');
        }

        // Add main content summary if available
        if (analysis.content && analysis.content.mainText && analysis.content.mainText.length > 100) {
            const summary = analysis.content.mainText.substring(0, 300) + '...';
            addInsightSection(detailsCard, 'Content Preview', summary);
        }
    }

    // Add insight section (non-expandable text)
    function addInsightSection(parentElement, title, text) {
        const section = document.createElement('div');
        section.className = 'expandable-section';
        
        const toggle = document.createElement('button');
        toggle.className = 'expand-toggle collapsed';
        toggle.textContent = title;
        
        const content = document.createElement('div');
        content.className = 'expandable-content collapsed';
        
        const insightDiv = document.createElement('div');
        insightDiv.className = 'insight-text';
        insightDiv.textContent = text;
        
        content.appendChild(insightDiv);
        section.appendChild(toggle);
        section.appendChild(content);
        parentElement.appendChild(section);
        
        // Add click handler for toggle
        toggle.addEventListener('click', () => {
            const isCollapsed = content.classList.contains('collapsed');
            if (isCollapsed) {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
                toggle.classList.remove('collapsed');
            } else {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
                toggle.classList.add('collapsed');
            }
        });
    }

    // Format bias text for display
    function formatBiasText(text) {
        return text.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Export analysis report
    function exportAnalysisReport(analysis) {
        const report = {
            url: analysis.url,
            title: analysis.title,
            analyzedAt: new Date().toISOString(),
            isNewsArticle: analysis.isNewsArticle,
            confidence: analysis.newsConfidence,
            biasAnalysis: analysis.biasAnalysis,
            emotionalAnalysis: analysis.emotionalAnalysis,
            articleData: analysis.articleData,
            factCheckingData: analysis.factCheckingData,
            aiInsights: analysis.aiInsights,
            mainContent: {
                wordCount: analysis.mainContent?.wordCount,
                paragraphCount: analysis.mainContent?.paragraphs?.length,
                claimsFound: analysis.mainContent?.claims?.length
            }
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `evident-analysis-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Format date string
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return dateString; // Return original if parsing fails
            }
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    // Escape HTML to prevent XSS and handle special characters
    function escapeHtml(text) {
        if (typeof text !== 'string') {
            return String(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Update status text with styling
    function updateStatus(message, type = 'info') {
        statusText.textContent = message;
        statusText.className = type;
        
        // Reset after 3 seconds
        setTimeout(() => {
            statusText.textContent = 'Ready to analyze!';
            statusText.className = '';
        }, 3000);
    }

    // Load settings from storage
    async function loadSettings() {
        try {
            const result = await chrome.storage.local.get(['actionCount', 'lastAction']);
            if (result.actionCount) {
                updateStatus(`Actions performed: ${result.actionCount}`, 'info');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    // Get current action count
    async function getActionCount() {
        try {
            const result = await chrome.storage.local.get(['actionCount']);
            return result.actionCount || 0;
        } catch (error) {
            console.error('Error getting action count:', error);
            return 0;
        }
    }
});

// Add CSS classes for status styling
const style = document.createElement('style');
style.textContent = `
    #statusText.success { color: #28a745; }
    #statusText.error { color: #dc3545; }
    #statusText.info { color: #17a2b8; }
`;
document.head.appendChild(style);