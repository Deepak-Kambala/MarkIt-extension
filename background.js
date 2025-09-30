// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "saveHighlight",
        title: "Save Highlight",
        contexts: ["selection"]
    });
    console.log('Highlight Saver Pro extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "saveHighlight") {
        // Validate selection
        if (!info.selectionText || info.selectionText.trim().length === 0) {
            return;
        }

        // Execute script to save highlight
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: saveHighlightToStorage,
            args: [info.selectionText.trim(), info.pageUrl]
        });
    }
});

// Function to save highlight (executed in page context)
function saveHighlightToStorage(text, url) {
    const newHighlight = {
        text: text,
        source: url,
        date: new Date().toLocaleString()
    };

    chrome.storage.local.get({ highlights: [] }, (result) => {
        const highlights = result.highlights || [];
        
        // Check for duplicates (same text and URL)
        const isDuplicate = highlights.some(highlight => 
            highlight.text === newHighlight.text && 
            highlight.source === newHighlight.source
        );

        if (!isDuplicate) {
            // Add new highlight to beginning of array
            const updatedHighlights = [newHighlight, ...highlights];
            
            chrome.storage.local.set({ highlights: updatedHighlights }, () => {
                // Show notification
                chrome.runtime.sendMessage({
                    action: "highlightSaved",
                    data: newHighlight
                });
            });
        }
    });
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "highlightSaved") {
        // Show desktop notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'logo.png',
            title: 'Highlight Saved!',
            message: `Saved: "${request.data.text.substring(0, 50)}${request.data.text.length > 50 ? '...' : ''}"`
        });
    }
});