document.addEventListener('DOMContentLoaded', function() {
    const highlightsContainer = document.getElementById('highlightsContainer');
    const clearBtn = document.getElementById('clearBtn');
    const openAllBtn = document.getElementById('openAllBtn');
    const exportImportMenu = document.getElementById('exportImportMenu');
    const exportImportBtn = document.getElementById('exportImportBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const importJsonBtn = document.getElementById('importJsonBtn');
    const totalCount = document.getElementById('totalCount');
    const todayCount = document.getElementById('todayCount');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    // Search and filter elements
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResultsInfo = document.getElementById('searchResultsInfo');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let currentHighlights = [];
    let filteredHighlights = [];
    let isPdfReady = false;
    let currentSearchTerm = '';
    let currentDateFilter = 'all';
    let currentTagFilter = ''; 


    // Check if PDF library is available
    function checkPdfLibrary() {
        if (typeof jspdf !== 'undefined') {
            isPdfReady = true;
            console.log('PDF library loaded successfully');
        } else {
            console.error('PDF library not loaded');
        }
    }

    // Load highlights when popup opens
    loadHighlights();

    // Check PDF library after a short delay
    setTimeout(checkPdfLibrary, 100);

    // Search input event listener
    searchInput.addEventListener('input', function(e) {
        currentSearchTerm = e.target.value.trim();
        
        if (currentSearchTerm) {
            clearSearchBtn.classList.add('visible');
        } else {
            clearSearchBtn.classList.remove('visible');
        }
        
        applyFilters();
    });

    // Clear search button
    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        currentSearchTerm = '';
        clearSearchBtn.classList.remove('visible');
        applyFilters();
        searchInput.focus();
    });

    // Filter buttons event listeners
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDateFilter = this.dataset.filter;
            applyFilters();
        });
    });

    function loadHighlights() {
        chrome.storage.local.get({ highlights: [] }, function(result) {
            currentHighlights = result.highlights || [];
            applyFilters();
            updateStats(currentHighlights);
        });
    }

    function applyFilters() {
        // Start with all highlights
        filteredHighlights = [...currentHighlights];

        // Apply date filter
        filteredHighlights = filterByDate(filteredHighlights, currentDateFilter);

        // Apply search filter
        if (currentSearchTerm) {
            filteredHighlights = searchHighlights(filteredHighlights, currentSearchTerm);
        }

        //  Apply tag filter
        if (currentTagFilter) {
            filteredHighlights = filteredHighlights.filter(h =>
                h.tags && h.tags.map(t => t.toLowerCase()).includes(currentTagFilter.toLowerCase())
            );
        }

        displayHighlights(filteredHighlights);
        updateSearchInfo(filteredHighlights.length, currentHighlights.length);
    }

    function filterByDate(highlights, filter) {
        if (filter === 'all') return highlights;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return highlights.filter(h => {
            const highlightDate = new Date(h.date);
            
            switch(filter) {
                case 'today':
                    return highlightDate >= today;
                
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return highlightDate >= weekAgo;
                
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return highlightDate >= monthAgo;
                
                default:
                    return true;
            }
        });
    }

    function searchHighlights(highlights, searchTerm) {
        const term = searchTerm.toLowerCase();
        
        return highlights.filter(h => {
            // Search in text
            const textMatch = h.text.toLowerCase().includes(term);
            
            // Search in source/domain
            let sourceMatch = false;
            try {
                const domain = new URL(h.source).hostname;
                sourceMatch = domain.toLowerCase().includes(term) || 
                             h.source.toLowerCase().includes(term);
            } catch (e) {
                sourceMatch = h.source.toLowerCase().includes(term);
            }
            
            // Search in date
            const dateMatch = formatDate(h.date).toLowerCase().includes(term);
            
            return textMatch || sourceMatch || dateMatch;
        });
    }

    function updateSearchInfo(filteredCount, totalCount) {
        if (currentSearchTerm || currentDateFilter !== 'all') {
            searchResultsInfo.textContent = `Showing ${filteredCount} of ${totalCount} highlights`;
        } else {
            searchResultsInfo.textContent = '';
        }
    }

    function displayHighlights(highlights) {
        highlightsContainer.innerHTML = '';

        if (!highlights || highlights.length === 0) {
            if (currentSearchTerm || currentDateFilter !== 'all') {
                showNoResults();
            } else {
                showNoHighlights();
            }
            return;
        }

        const sortedHighlights = highlights.sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedHighlights.forEach((highlight, index) => {
            const originalIndex = currentHighlights.findIndex(h => 
                h.text === highlight.text && h.date === highlight.date && h.source === highlight.source
            );
            const highlightElement = createHighlightElement(highlight, originalIndex);
            highlightsContainer.appendChild(highlightElement);
        });
    }

    function createHighlightElement(highlight, index) {
        const div = document.createElement('div');
        div.className = 'highlight-item';

        let displayText = highlight.text.length > 200 
            ? highlight.text.substring(0, 200) + '...' 
            : highlight.text;

        // Highlight search term in text
        if (currentSearchTerm) {
            displayText = highlightSearchTerm(displayText, currentSearchTerm);
        }

        let domain = 'Unknown source';
        try {
            domain = new URL(highlight.source).hostname;
        } catch (e) {
            domain = highlight.source;
        }

        const isToday = isTodayDate(highlight.date);
        
        div.innerHTML = `
            ${isToday ? '<div class="new-badge">NEW</div>' : ''}
            <div class="highlight-text">"${displayText}"</div>
            <div class="highlight-meta">
                <a href="${highlight.source}" target="_blank" class="highlight-source">
                    ${domain}
                </a>
                <span class="highlight-date">${formatDate(highlight.date)}</span>
            </div>
            <div class="highlight-actions">
                <button class="delete-btn" data-index="${index}">Delete</button>
            </div>
        `;

        const deleteBtn = div.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            deleteHighlight(index);
        });

        return div;
    }

    function highlightSearchTerm(text, searchTerm) {
        if (!searchTerm) return escapeHtml(text);
        
        const escapedText = escapeHtml(text);
        const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
        return escapedText.replace(regex, '<mark>$1</mark>');
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function showNoHighlights() {
        highlightsContainer.innerHTML = `
            <div class="no-highlights">
                <div class="icon">📚</div>
                <h3>No Highlights Yet</h3>
                <p>Select text on any webpage, right-click, and choose<br>"Save Highlight" to save your first highlight!</p>
            </div>
        `;
    }

    function showNoResults() {
        highlightsContainer.innerHTML = `
            <div class="no-highlights">
                <div class="icon">🔍</div>
                <h3>No Results Found</h3>
                <p>Try adjusting your search or filter criteria.<br>Clear filters to see all highlights.</p>
            </div>
        `;
    }

    function updateStats(highlights) {
        totalCount.textContent = `${highlights.length} ${highlights.length === 1 ? 'highlight' : 'highlights'}`;
        
        const today = new Date().toDateString();
        const todayHighlights = highlights.filter(h => {
            try {
                return new Date(h.date).toDateString() === today;
            } catch {
                return false;
            }
        });
        
        todayCount.textContent = `${todayHighlights.length} today`;
    }

    function deleteHighlight(index) {
        const updatedHighlights = currentHighlights.filter((_, i) => i !== index);
        chrome.storage.local.set({ highlights: updatedHighlights }, function() {
            loadHighlights();
        });
    }

    // Clear all highlights
    clearBtn.addEventListener('click', function() {
        if (currentHighlights.length === 0) {
            alert('No highlights to clear!');
            return;
        }

        if (confirm(`Are you sure you want to delete all ${currentHighlights.length} highlights? This action cannot be undone.`)) {
            chrome.storage.local.set({ highlights: [] }, function() {
                loadHighlights();
            });
        }
    });

    // Open all links
    openAllBtn.addEventListener('click', function() {
        const highlightsToOpen = filteredHighlights.length > 0 ? filteredHighlights : currentHighlights;
        
        if (highlightsToOpen.length === 0) {
            alert('No highlights with links to open!');
            return;
        }

        const uniqueSources = [...new Set(highlightsToOpen.map(h => h.source))];

        const message = filteredHighlights.length > 0 && filteredHighlights.length < currentHighlights.length
            ? `Open all ${uniqueSources.length} unique links from filtered results in new tabs?`
            : `Open all ${uniqueSources.length} unique links in new tabs?`;

        if (confirm(message)) {
            uniqueSources.forEach(link => {
                chrome.tabs.create({ url: link });
            });
        }
    });

    exportImportBtn.addEventListener('click', () => {
        exportImportMenu.classList.toggle('hidden');
    });

    exportJsonBtn.addEventListener('click', function() {
        if (currentHighlights.length === 0) {
            alert('No highlights to export!');
            return;
        }

        const dataStr = JSON.stringify(currentHighlights, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `highlights-${timestamp}.json`;
        a.click();

        URL.revokeObjectURL(url);
    });

    importJsonBtn.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = function(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedHighlights = JSON.parse(e.target.result);

                    if (!Array.isArray(importedHighlights)) {
                        alert('Invalid JSON format!');
                        return;
                    }

                    const mergedHighlights = [...currentHighlights];

                    importedHighlights.forEach(h => {
                        if (!mergedHighlights.some(ch => ch.text === h.text && ch.source === h.source)) {
                            mergedHighlights.push(h);
                        }
                    });

                    chrome.storage.local.set({ highlights: mergedHighlights }, function() {
                        loadHighlights();
                        alert(`Imported ${importedHighlights.length} highlights successfully!`);
                    });

                } catch (err) {
                    alert('Error reading JSON: ' + err.message);
                }
            };

            reader.readAsText(file);
        };

        input.click();
    });

    exportPdfBtn.addEventListener('click', function() {
        if (currentHighlights.length === 0) {
            alert('No highlights to export!');
            return;
        }

        if (!isPdfReady) {
            alert('PDF library is still loading. Please wait a moment and try again.');
            return;
        }

        loadingIndicator.style.display = 'block';
        exportPdfBtn.disabled = true;

        try {
            const doc = new jspdf.jsPDF();

            doc.setFontSize(20);
            doc.text('My MarkIt Highlights', 20, 20);

            doc.setFontSize(12);
            doc.text(`Exported on: ${new Date().toLocaleString()}`, 20, 35);
            doc.text(`Total Highlights: ${currentHighlights.length}`, 20, 45);

            let y = 60;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 20;
            const maxWidth = 170;

            currentHighlights.forEach((highlight, index) => {
                if (y > pageHeight - 40) {
                    doc.addPage();
                    y = 20;
                }

                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text(`Highlight ${index + 1}:`, margin, y);
                y += 8;

                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                const textLines = doc.splitTextToSize(highlight.text, maxWidth);
                doc.text(textLines, margin, y);
                y += textLines.length * 5 + 5;

                doc.setFontSize(9);
                doc.setTextColor(0, 0, 255);
                doc.textWithLink(`Source: ${highlight.source}`, margin, y, { url: highlight.source });
                y += 5;

                doc.setTextColor(100, 100, 100);
                doc.text(`Saved: ${highlight.date}`, margin, y);
                y += 15;

                doc.setTextColor(0, 0, 0);
            });

            if (y > pageHeight - 60) {
                doc.addPage();
                y = 20;
            }
            const uniqueSources = [...new Set(currentHighlights.map(h => h.source).filter(Boolean))];

            doc.setFontSize(11);
            doc.setTextColor(0, 0, 255);
            doc.setFont(undefined, 'bold');
            doc.text('All Links (unique)', margin, y);
            y += 8;

            uniqueSources.forEach(link => {
                const linkText = link.length > 80 ? link.substring(0, 80) + '...' : link;
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.textWithLink(linkText, margin, y, { url: link });
                y += 6;
            });
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `highlights-${timestamp}.pdf`;

            doc.save(filename);

            setTimeout(() => {
                loadingIndicator.style.display = 'none';
                exportPdfBtn.disabled = false;
                alert(`PDF exported successfully! Saved as: ${filename}`);
            }, 1000);

        } catch (error) {
            console.error('PDF export error:', error);
            loadingIndicator.style.display = 'none';
            exportPdfBtn.disabled = false;
            alert('Error generating PDF: ' + error.message);
        }
    });

    document.addEventListener('click', (e) => {
        if (!exportImportBtn.contains(e.target) && !exportImportMenu.contains(e.target)) {
            exportImportMenu.classList.add('hidden');
        }
    });

    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch {
            return dateString;
        }
    }

    function isTodayDate(dateString) {
        try {
            const date = new Date(dateString);
            const today = new Date();
            return date.toDateString() === today.toDateString();
        } catch {
            return false;
        }
    }

    // Refresh highlights every 3 seconds when popup is open
    setInterval(loadHighlights, 3000);

const tagInput = document.getElementById('tagInput');
const addTagBtn = document.getElementById('addTagBtn');
const tagList = document.getElementById('tagList');

addTagBtn.addEventListener('click', () => {
    const tag = tagInput.value.trim();
    if (!tag) return alert('Please enter a tag name!');
    currentTagFilter = tag;
    applyFilters();
    renderTagList();
    tagInput.value = '';
});

function renderTagList() {
    tagList.innerHTML = '';
    const allTags = new Set();
    currentHighlights.forEach(h => {
        if (h.tags) h.tags.forEach(t => allTags.add(t));
    });

    allTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.textContent = tag;
        if (tag === currentTagFilter) btn.classList.add('active');
        btn.addEventListener('click', () => {
            currentTagFilter = tag === currentTagFilter ? '' : tag;
            applyFilters();
            renderTagList();
        });
        tagList.appendChild(btn);
    });
}

});