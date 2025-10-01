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

    let currentHighlights = [];
    let isPdfReady = false;

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

    function loadHighlights() {
        chrome.storage.local.get({ highlights: [] }, function(result) {
            currentHighlights = result.highlights || [];
            displayHighlights(currentHighlights);
            updateStats(currentHighlights);
        });
    }

    function displayHighlights(highlights) {
        highlightsContainer.innerHTML = '';

        if (!highlights || highlights.length === 0) {
            showNoHighlights();
            return;
        }

        const sortedHighlights = highlights.sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedHighlights.forEach((highlight, index) => {
            const highlightElement = createHighlightElement(highlight, index);
            highlightsContainer.appendChild(highlightElement);
        });
    }

    function createHighlightElement(highlight, index) {
        const div = document.createElement('div');
        div.className = 'highlight-item';

        const displayText = highlight.text.length > 200 
            ? highlight.text.substring(0, 200) + '...' 
            : highlight.text;

        let domain = 'Unknown source';
        try {
            domain = new URL(highlight.source).hostname;
        } catch (e) {
            domain = highlight.source;
        }

        const isToday = isTodayDate(highlight.date);
        
        div.innerHTML = `
            ${isToday ? '<div class="new-badge">NEW</div>' : ''}
            <div class="highlight-text">"${escapeHtml(displayText)}"</div>
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

    function showNoHighlights() {
        highlightsContainer.innerHTML = `
            <div class="no-highlights">
                <div class="icon">📚</div>
                <h3>No Highlights Yet</h3>
                <p>Select text on any webpage, right-click, and choose<br>"Save Highlight" to save your first highlight!</p>
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

    // open All links
    openAllBtn.addEventListener('click', function() {
        if (currentHighlights.length === 0) {
            alert('No highlights with links to open!');
            return;
        }

        const uniqueSources = [...new Set(currentHighlights.map(h => h.source))];

        if (confirm(`Open all ${uniqueSources.length} unique links in new tabs?`)) {
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

                    // Merge with current highlights and remove duplicates by source+text
                    const mergedHighlights = [...currentHighlights];

                    importedHighlights.forEach(h => {
                        if (!mergedHighlights.some(ch => ch.text === h.text && ch.source === h.source)) {
                            mergedHighlights.push(h);
                        }
                    });

                    // Save merged highlights
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

    // Export to PDF - SIMPLIFIED AND GUARANTEED TO WORK
    exportPdfBtn.addEventListener('click', function() {
        if (currentHighlights.length === 0) {
            alert('No highlights to export!');
            return;
        }

        if (!isPdfReady) {
            alert('PDF library is still loading. Please wait a moment and try again.');
            return;
        }

        // Show loading indicator
        loadingIndicator.style.display = 'block';
        exportPdfBtn.disabled = true;

        try {
            // Use the local jsPDF library
            const doc = new jspdf.jsPDF();

            // Add title
            doc.setFontSize(20);
            doc.text('My MarkIt Highlights', 20, 20);

            // Add export info
            doc.setFontSize(12);
            doc.text(`Exported on: ${new Date().toLocaleString()}`, 20, 35);
            doc.text(`Total Highlights: ${currentHighlights.length}`, 20, 45);

            let y = 60;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 20;
            const maxWidth = 170;

            // Add each highlight
            currentHighlights.forEach((highlight, index) => {
                // Check if we need a new page
                if (y > pageHeight - 40) {
                    doc.addPage();
                    y = 20;
                }

                // Highlight number
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text(`Highlight ${index + 1}:`, margin, y);
                y += 8;

                // Highlight text
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                const textLines = doc.splitTextToSize(highlight.text, maxWidth);
                doc.text(textLines, margin, y);
                y += textLines.length * 5 + 5;

                // Source
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 255);
                doc.textWithLink(`Source: ${highlight.source}`, margin, y, { url: highlight.source });
                y += 5;

                // Date
                doc.setTextColor(100, 100, 100);
                doc.text(`Saved: ${highlight.date}`, margin, y);
                y += 15;

                // Reset text color
                doc.setTextColor(0, 0, 0);
            });

            // 🔁 Repeat "All Links" at the bottom (optional)
            if (y > pageHeight - 60) {
                doc.addPage();
                y = 20;
            }
            const uniqueSources = [...new Set(currentHighlights.map(h => h.source).filter(Boolean))];

            doc.setFontSize(11);
            doc.setTextColor(0, 0, 255);
            doc.setFont(undefined, 'bold');
            doc.text('All Links(unique)', margin, y);
            y += 8;

            uniqueSources.forEach(link => {
                const linkText = link.length > 80 ? link.substring(0, 80) + '...' : link;
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.textWithLink(linkText, margin, y, { url: link });
                y += 6;
            });
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `highlights-${timestamp}.pdf`;

            // Save the PDF - this should trigger download
            doc.save(filename);

            // Hide loading indicator
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
});