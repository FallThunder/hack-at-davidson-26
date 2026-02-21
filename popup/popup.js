// Popup script for cross-browser extension
document.addEventListener('DOMContentLoaded', function() {
    const actionBtn = document.getElementById('actionBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const statusText = document.getElementById('statusText');
    
    // Analysis UI elements
    const loadingIndicator = document.getElementById('loadingIndicator');
    const analysisResults = document.getElementById('analysisResults');
    const errorMessage = document.getElementById('errorMessage');
    
    // News analysis elements
    const newsStatus = document.getElementById('newsStatus');
    const newsConfidence = document.getElementById('newsConfidence');
    const newsConfidenceText = document.getElementById('newsConfidenceText');
    const newsDetails = document.getElementById('newsDetails');
    
    // Popularity analysis elements
    const popularityLevel = document.getElementById('popularityLevel');
    const siteMetrics = document.getElementById('siteMetrics');

    // Load page analysis on popup open
    loadPageAnalysis();

    // Analyze button click handler
    analyzeBtn.addEventListener('click', function() {
        loadPageAnalysis(true);
    });

    // Action button click handler
    actionBtn.addEventListener('click', async function() {
        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Send message to content script
            await chrome.tabs.sendMessage(tab.id, {
                action: 'performAction',
                data: { timestamp: Date.now() }
            });
            
            updateStatus('Action performed!', 'success');
            
            // Store action in storage
            await chrome.storage.local.set({
                lastAction: Date.now(),
                actionCount: await getActionCount() + 1
            });
            
        } catch (error) {
            console.error('Error performing action:', error);
            updateStatus('Error occurred', 'error');
        }
    });

    // Settings button click handler
    settingsBtn.addEventListener('click', function() {
        // Open options page or show settings
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            // Fallback for browsers that don't support options page
            updateStatus('Settings clicked!', 'info');
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
        analysisResults.style.display = 'flex';
        
        // Display news analysis
        displayNewsAnalysis(analysis);
        
        // Display popularity analysis
        displayPopularityAnalysis(analysis);
    }

    // Display news article analysis
    function displayNewsAnalysis(analysis) {
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
        
        // Update confidence bar
        newsConfidence.style.width = `${confidence}%`;
        newsConfidenceText.textContent = `${confidence}%`;
        
        // Update details
        let detailsHtml = '';
        if (analysis.articleData) {
            const data = analysis.articleData;
            if (data.author) {
                detailsHtml += `<div class="detail-item"><span>Author:</span><span>${data.author}</span></div>`;
            }
            if (data.publishDate) {
                detailsHtml += `<div class="detail-item"><span>Published:</span><span>${formatDate(data.publishDate)}</span></div>`;
            }
            if (data.wordCount) {
                detailsHtml += `<div class="detail-item"><span>Word count:</span><span>${data.wordCount}</span></div>`;
            }
            if (data.paragraphCount) {
                detailsHtml += `<div class="detail-item"><span>Paragraphs:</span><span>${data.paragraphCount}</span></div>`;
            }
        }
        newsDetails.innerHTML = detailsHtml;
    }

    // Display site popularity analysis
    function displayPopularityAnalysis(analysis) {
        const popularity = analysis.sitePopularity || 'unknown';
        const score = analysis.popularityScore || 0;
        
        // Update popularity badge
        const badge = popularityLevel.querySelector('.level-badge');
        const description = popularityLevel.querySelector('.level-description');
        
        badge.className = `level-badge ${popularity}`;
        badge.textContent = popularity.charAt(0).toUpperCase() + popularity.slice(1);
        
        // Set description based on popularity level
        const descriptions = {
            major: 'Well-known, high-traffic website',
            established: 'Recognized site with good reputation',
            moderate: 'Moderately popular website',
            emerging: 'Growing or niche website',
            unknown: 'Limited information available'
        };
        description.textContent = descriptions[popularity] || descriptions.unknown;
        
        // Update site metrics
        let metricsHtml = '';
        if (analysis.siteMetrics) {
            const metrics = analysis.siteMetrics;
            metricsHtml += `<div class="metric-item"><span>Domain:</span><span>${analysis.domain}</span></div>`;
            if (metrics.loadTime) {
                metricsHtml += `<div class="metric-item"><span>Load time:</span><span>${metrics.loadTime}ms</span></div>`;
            }
            if (metrics.hasSSL !== undefined) {
                metricsHtml += `<div class="metric-item"><span>SSL:</span><span>${metrics.hasSSL ? 'Yes' : 'No'}</span></div>`;
            }
            if (metrics.socialMediaLinks) {
                metricsHtml += `<div class="metric-item"><span>Social links:</span><span>${metrics.socialMediaLinks}</span></div>`;
            }
        }
        siteMetrics.innerHTML = metricsHtml;
    }

    // Format date string
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return dateString; // Return original if parsing fails
            }
            return date.toLocaleDateString();
        } catch {
            return dateString;
        }
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