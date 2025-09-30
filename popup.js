document.addEventListener('DOMContentLoaded', function() {
    const highlightsContainer = document.getElementById('highlightsContainer');
    const clearBtn = document.getElementById('clearBtn');
    const exportBtn = document.getElementById('exportBtn');
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

    // Export to PDF - SIMPLIFIED AND GUARANTEED TO WORK
    exportBtn.addEventListener('click', function() {
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
        exportBtn.disabled = true;

        try {
            // Use the local jsPDF library
            const doc = new jspdf.jsPDF();

            // Add title
            doc.setFontSize(20);
            doc.text('My Highlights Export', 20, 20);

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
                doc.text(`Source: ${highlight.source}`, margin, y);
                y += 5;

                // Date
                doc.setTextColor(100, 100, 100);
                doc.text(`Saved: ${highlight.date}`, margin, y);
                y += 15;

                // Reset text color
                doc.setTextColor(0, 0, 0);
            });

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `highlights-${timestamp}.pdf`;

            // Save the PDF - this should trigger download
            doc.save(filename);

            // Hide loading indicator
            setTimeout(() => {
                loadingIndicator.style.display = 'none';
                exportBtn.disabled = false;
                alert(`PDF exported successfully! Saved as: ${filename}`);
            }, 1000);

        } catch (error) {
            console.error('PDF export error:', error);
            loadingIndicator.style.display = 'none';
            exportBtn.disabled = false;
            alert('Error generating PDF: ' + error.message);
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