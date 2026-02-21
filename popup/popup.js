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
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Get page analysis from content script
            const analysis = await chrome.tabs.sendMessage(tab.id, {
                action: 'getPageAnalysis'
            });
            
            if (analysis && !analysis.error) {
                displayAnalysis(analysis);
                updateStatus('Analysis complete!', 'success');
            } else {
                showError(analysis?.error || 'Could not analyze page');
                updateStatus('Analysis failed', 'error');
            }
            
        } catch (error) {
            console.error('Error loading page analysis:', error);
            showError('Extension not ready on this page');
            updateStatus('Analysis error', 'error');
        }
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
        
        // Update emotional manipulation
        const emotionalRisk = emotional.manipulationRisk || 'low';
        emotionalBias.textContent = formatBiasText(emotionalRisk);
        emotionalBias.className = `metric-value ${emotionalRisk}`;
        
        // Update claims count
        const claims = analysis.factCheckingData?.numericalClaims?.length || 0;
        claimsCount.textContent = claims.toString();
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
        
        articleDetails.innerHTML = detailsHtml;
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
            factCheckingData: analysis.factCheckingData
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