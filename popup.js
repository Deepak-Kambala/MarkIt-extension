document.addEventListener('DOMContentLoaded', function () {
    const highlightsContainer = document.getElementById('highlightsContainer');
    const clearBtn = document.getElementById('clearBtn');
    const openAllBtn = document.getElementById('openAllBtn');
    const exportImportMenu = document.getElementById('exportImportMenu');
    const exportImportBtn = document.getElementById('exportImportBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const importJsonBtn = document.getElementById('importJsonBtn');
    const totalCount = document.getElementById('totalCount');
    const todayCount = document.getElementById('todayCount');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Search and filter elements
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResultsInfo = document.getElementById('searchResultsInfo');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Pagination elements
    const paginationContainer = document.getElementById('paginationContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const paginationInfo = document.getElementById('paginationInfo');

    let currentHighlights = [];
    let filteredHighlights = [];
    let displayedCount = 0; // Track how many we've displayed
    let isPdfReady = false;
    let currentSearchTerm = '';
    let currentDateFilter = 'all';

    const HIGHLIGHTS_PER_PAGE = 5;

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
    searchInput.addEventListener('input', function (e) {
        currentSearchTerm = e.target.value.trim();

        if (currentSearchTerm) {
            clearSearchBtn.classList.add('visible');
        } else {
            clearSearchBtn.classList.remove('visible');
        }

        applyFilters();
    });

    // Clear search button
    clearSearchBtn.addEventListener('click', function () {
        searchInput.value = '';
        currentSearchTerm = '';
        clearSearchBtn.classList.remove('visible');
        applyFilters();
        searchInput.focus();
    });

    // Filter buttons event listeners
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDateFilter = this.dataset.filter;
            applyFilters();
        });
    });

    // Load More button event listener
    loadMoreBtn.addEventListener('click', function () {
        loadMoreHighlights();
    });

    function loadHighlights() {
        chrome.storage.local.get({ highlights: [] }, function (result) {
            const newHighlights = result.highlights || [];
            // Only re-render if the highlights have actually changed.
            if (JSON.stringify(newHighlights) !== JSON.stringify(currentHighlights)) {
                console.log('Highlights have changed, reloading...');
                currentHighlights = newHighlights;
                applyFilters();
                updateStats(currentHighlights);
            }
        });
    }

    function applyFilters() {
        // Reset pagination
        displayedCount = 0;

        // Start with all highlights
        filteredHighlights = [...currentHighlights];

        // Apply date filter
        filteredHighlights = filterByDate(filteredHighlights, currentDateFilter);

        // Apply search filter
        if (currentSearchTerm) {
            filteredHighlights = searchHighlights(filteredHighlights, currentSearchTerm);
        }

        // Sort by date (newest first)
        filteredHighlights.sort((a, b) => new Date(b.date) - new Date(a.date));

        displayHighlights(true); // true = clear and start fresh
        updateSearchInfo(filteredHighlights.length, currentHighlights.length);
    }

    function filterByDate(highlights, filter) {
        if (filter === 'all') return highlights;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return highlights.filter(h => {
            const highlightDate = new Date(h.date);

            switch (filter) {
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

    function displayHighlights(clearContainer = false) {
        // If clearContainer is true, clear and reset
        if (clearContainer) {
            highlightsContainer.innerHTML = '';
            displayedCount = 0;
        }

        if (!filteredHighlights || filteredHighlights.length === 0) {
            if (currentSearchTerm || currentDateFilter !== 'all') {
                showNoResults();
            } else {
                showNoHighlights();
            }
            paginationContainer.style.display = 'none';
            return;
        }

        // Calculate how many to show
        const endIndex = Math.min(displayedCount + HIGHLIGHTS_PER_PAGE, filteredHighlights.length);
        const highlightsToShow = filteredHighlights.slice(displayedCount, endIndex);

        // Add highlights to display
        highlightsToShow.forEach((highlight) => {
            const originalIndex = currentHighlights.findIndex(h =>
                h.text === highlight.text && h.date === highlight.date && h.source === highlight.source
            );
            const highlightElement = createHighlightElement(highlight, originalIndex);
            highlightElement.classList.add('fade-in');
            highlightsContainer.appendChild(highlightElement);
        });

        // Update displayed count
        displayedCount = endIndex;

        // Update pagination UI
        updatePaginationUI();
    }

    function loadMoreHighlights() {
        displayHighlights(false); // false = append, don't clear
    }

    function updatePaginationUI() {
        const totalFilteredCount = filteredHighlights.length;
        const hasMore = displayedCount < totalFilteredCount;

        if (totalFilteredCount > HIGHLIGHTS_PER_PAGE) {
            paginationContainer.style.display = 'block';
            paginationInfo.textContent = `Showing ${displayedCount} of ${totalFilteredCount} highlights`;

            if (hasMore) {
                loadMoreBtn.disabled = false;
                const remaining = totalFilteredCount - displayedCount;
                const nextBatch = Math.min(HIGHLIGHTS_PER_PAGE, remaining);
                loadMoreBtn.textContent = `Load More`;
            } else {
                loadMoreBtn.disabled = true;
                loadMoreBtn.textContent = 'All highlights loaded';
            }
        } else {
            paginationContainer.style.display = 'none';
        }
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
                <div style="position: relative;">
                    <button class="copy-btn" data-index="${index}" data-text="${escapeHtml(highlight.text)}" data-source="${escapeHtml(highlight.source)}">
                        Copy
                    </button>
                    <div class="copy-tooltip">Copied!</div>
                    <div class="copy-options">
                        <div class="copy-option-item" data-action="copy-text">Copy Text Only</div>
                        <div class="copy-option-item" data-action="copy-with-source">Copy with Source</div>
                        <div class="copy-option-item" data-action="copy-markdown">Copy as Markdown</div>
                    </div>
                </div>
                <button class="delete-btn" data-index="${index}">Delete</button>
            </div>
        `;

        // Copy button functionality
        const copyBtn = div.querySelector('.copy-btn');
        const copyTooltip = div.querySelector('.copy-tooltip');
        const copyOptions = div.querySelector('.copy-options');
        const copyOptionItems = div.querySelectorAll('.copy-option-item');

        // Simple click - copy text only
        copyBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const text = highlight.text;
            copyToClipboard(text, copyBtn, copyTooltip);
        });

        // Right-click or long press - show options
        copyBtn.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            e.stopPropagation();
            copyOptions.classList.toggle('show');
        });

        // Handle copy option selections
        copyOptionItems.forEach(item => {
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                const action = this.dataset.action;
                let textToCopy = '';

                switch (action) {
                    case 'copy-text':
                        textToCopy = highlight.text;
                        break;
                    case 'copy-with-source':
                        textToCopy = `"${highlight.text}"\n\nSource: ${highlight.source}`;
                        break;
                    case 'copy-markdown':
                        textToCopy = `> ${highlight.text}\n\n[Source](${highlight.source})`;
                        break;
                }

                copyToClipboard(textToCopy, copyBtn, copyTooltip);
                copyOptions.classList.remove('show');
            });
        });

        // Close options when clicking outside
        document.addEventListener('click', function (e) {
            if (!copyBtn.contains(e.target) && !copyOptions.contains(e.target)) {
                copyOptions.classList.remove('show');
            }
        });

        const deleteBtn = div.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function () {
            deleteHighlight(index);
        });

        return div;
    }

    // Copy to clipboard function with visual feedback
    async function copyToClipboard(text, button, tooltip) {
        try {
            // Modern Clipboard API (preferred)
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }

            // Visual feedback
            showCopySuccess(button, tooltip);
        } catch (err) {
            console.error('Failed to copy:', err);
            showCopyError(button, tooltip);
        }
    }

    function showCopySuccess(button, tooltip) {
        // Change button appearance
        const originalText = button.textContent;

        button.classList.add('copied');
        button.textContent = '✓ Copied';

        // Show tooltip
        tooltip.textContent = 'Copied!';
        tooltip.classList.add('show');

        // Reset after 2 seconds
        setTimeout(() => {
            button.classList.remove('copied');
            button.textContent = originalText;
            tooltip.classList.remove('show');
        }, 2000);
    }

    function showCopyError(button, tooltip) {
        tooltip.textContent = 'Failed to copy';
        tooltip.style.background = '#ef4444';
        tooltip.classList.add('show');

        setTimeout(() => {
            tooltip.classList.remove('show');
            tooltip.style.background = '#1e293b';
        }, 2000);
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
        chrome.storage.local.set({ highlights: updatedHighlights }, function () {
            loadHighlights();
        });
    }

    // Clear all highlights
    clearBtn.addEventListener('click', function () {
        if (currentHighlights.length === 0) {
            alert('No highlights to clear!');
            return;
        }

        if (confirm(`Are you sure you want to delete all ${currentHighlights.length} highlights? This action cannot be undone.`)) {
            chrome.storage.local.set({ highlights: [] }, function () {
                loadHighlights();
            });
        }
    });

    // Open all links
    openAllBtn.addEventListener('click', function () {
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

    // Export to JSON
    exportJsonBtn.addEventListener('click', function () {
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

    // Export to CSV
    exportCsvBtn.addEventListener('click', function () {
        if (currentHighlights.length === 0) {
            alert('No highlights to export!');
            return;
        }

        const headers = ['Text', 'Source', 'Date'];
        const rows = currentHighlights.map(h => [
            `"${h.text.replace(/"/g, '""')}"`,
            `"${h.source.replace(/"/g, '""')}"`,
            `"${h.date}"`
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `highlights-${timestamp}.csv`;
        a.click();

        URL.revokeObjectURL(url);
    });

    // Import from JSON
    importJsonBtn.addEventListener('click', function () {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = function (event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
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

                    chrome.storage.local.set({ highlights: mergedHighlights }, function () {
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

    // Export to PDF
    exportPdfBtn.addEventListener('click', function () {
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
            console.log("Rxporting PDF");
            
            const doc = new jspdf.jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);

            // Helper function to add header/footer
            function addPageDecoration(pageNum, totalPages) {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                doc.text('Generated by MarkIt', margin, pageHeight - 10);
            }

            // Cover Page with purple header
            doc.setFillColor(102, 126, 234);
            doc.rect(0, 0, pageWidth, 80, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(32);
            doc.setFont(undefined, 'bold');
            doc.text('MarkIt Highlights', pageWidth / 2, 40, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text('Your Saved Web Highlights', pageWidth / 2, 55, { align: 'center' });

            // Summary Box
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(margin, 100, contentWidth, 60, 3, 3, 'F');
            
            doc.setTextColor(51, 65, 85);
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('Summary', margin + 10, 115);

            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text(`Total Highlights: ${currentHighlights.length}`, margin + 10, 130);
            doc.text(`Export Date: ${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}`, margin + 10, 140);
            
            const uniqueSources = [...new Set(currentHighlights.map(h => {
                try { return new URL(h.source).hostname; } catch { return h.source; }
            }))];
            doc.text(`Unique Sources: ${uniqueSources.length}`, margin + 10, 150);

            // Table of Contents
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(51, 65, 85);
            doc.text('Table of Contents', margin, 185);

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 116, 139);
            
            let tocY = 200;
            const maxTocItems = 15;
            currentHighlights.slice(0, maxTocItems).forEach((highlight, index) => {
                const preview = highlight.text.substring(0, 60) + (highlight.text.length > 60 ? '...' : '');
                doc.text(`${index + 1}. ${preview}`, margin + 5, tocY);
                tocY += 6;
            });

            if (currentHighlights.length > maxTocItems) {
                doc.setTextColor(150, 150, 150);
                doc.text(`... and ${currentHighlights.length - maxTocItems} more`, margin + 5, tocY);
            }

            // Start highlights on new page
            doc.addPage();
            let y = 30;
            let pageNum = 2;

            currentHighlights.forEach((highlight, index) => {
                // Check if we need a new page
                const estimatedHeight = 50 + (Math.ceil(highlight.text.length / 80) * 5);
                if (y + estimatedHeight > pageHeight - 30) {
                    addPageDecoration(pageNum, '?');
                    doc.addPage();
                    y = 30;
                    pageNum++;
                }

                // Highlight Card Background
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(226, 232, 240);
                doc.roundedRect(margin, y - 5, contentWidth, estimatedHeight, 2, 2, 'FD');

                // Highlight Number Badge
                doc.setFillColor(102, 126, 234);
                doc.circle(margin + 8, y + 2, 5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                doc.text(`${index + 1}`, margin + 8, y + 3.5, { align: 'center' });

                // Highlight Text
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                const textLines = doc.splitTextToSize(`"${highlight.text}"`, contentWidth - 30);
                doc.text(textLines, margin + 18, y + 2);
                y += textLines.length * 5 + 8;

                // Divider line
                doc.setDrawColor(241, 245, 249);
                doc.line(margin + 10, y, pageWidth - margin - 10, y);
                y += 5;

                // Source
                doc.setFontSize(9);
                doc.setTextColor(102, 126, 234);
                doc.setFont(undefined, 'bold');
                doc.text('Source:', margin + 10, y);
                
                doc.setFont(undefined, 'normal');
                doc.setTextColor(59, 130, 246);
                let domain = highlight.source;
                try {
                    domain = new URL(highlight.source).hostname;
                } catch (e) {}
                
                const sourceText = domain.length > 50 ? domain.substring(0, 50) + '...' : domain;
                doc.textWithLink(sourceText, margin + 30, y, { url: highlight.source });
                y += 6;

                // Date
                doc.setTextColor(100, 116, 139);
                doc.setFont(undefined, 'bold');
                doc.text('Saved:', margin + 10, y);
                
                doc.setFont(undefined, 'normal');
                doc.setTextColor(148, 163, 184);
                doc.text(formatDate(highlight.date), margin + 30, y);
                y += 15;
            });

            // Add Links Appendix
            addPageDecoration(pageNum, '?');
            doc.addPage();
            pageNum++;
            y = 30;

            // Appendix Header
            doc.setFillColor(102, 126, 234);
            doc.rect(0, 20, pageWidth, 25, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('All Unique Sources', pageWidth / 2, 35, { align: 'center' });

            y = 60;
            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85);
            doc.setFont(undefined, 'normal');

            uniqueSources.forEach((source, index) => {
                if (y > pageHeight - 30) {
                    addPageDecoration(pageNum, '?');
                    doc.addPage();
                    y = 30;
                    pageNum++;
                }

                doc.setFont(undefined, 'bold');
                doc.text(`${index + 1}.`, margin, y);
                
                doc.setFont(undefined, 'normal');
                doc.setTextColor(59, 130, 246);
                
                const fullUrl = currentHighlights.find(h => {
                    try { return new URL(h.source).hostname === source; } catch { return h.source === source; }
                })?.source || source;
                
                const linkText = source.length > 70 ? source.substring(0, 70) + '...' : source;
                doc.textWithLink(linkText, margin + 8, y, { url: fullUrl });
                doc.setTextColor(51, 65, 85);
                y += 7;
            });

            // Update all page numbers
            const totalPages = pageNum;
            for (let i = 2; i <= totalPages; i++) {
                doc.setPage(i);
                addPageDecoration(i, totalPages);
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `markit-highlights-${timestamp}.pdf`;

            doc.save(filename);

            setTimeout(() => {
                loadingIndicator.style.display = 'none';
                exportPdfBtn.disabled = false;
                alert(`✓ PDF exported successfully!\n\nFilename: ${filename}\nHighlights: ${currentHighlights.length}\nPages: ${totalPages}`);
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
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
});