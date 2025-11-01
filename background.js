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

        // Skip restricted pages (chrome://, extensions, etc.)
        if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
            console.warn("Highlight Saver: Cannot inject into this page:", tab.url);
            return;
        }
        // Ask the user for a tag before saving
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (text, url) => {
                const tag = prompt("Add a tag for this highlight (e.g., Study, Work):") || "General";
                const newHighlight = {
                    text: text.trim(),
                    source: url,
                    date: new Date().toISOString(),
                    tags: [tag.trim()]
                };

                chrome.storage.local.get({ highlights: [] }, (result) => {
                    const highlights = result.highlights || [];

                    const isDuplicate = highlights.some(h =>
                        h.text.trim().toLowerCase() === newHighlight.text.toLowerCase() &&
                        h.source === newHighlight.source
                    );

                    if (!isDuplicate) {
                        const updated = [newHighlight, ...highlights];
                        chrome.storage.local.set({ highlights: updated }, () => {
                            chrome.runtime.sendMessage({
                                action: "highlightSaved",
                                data: newHighlight
                            });
                        });
                    }
                });
            },
            args: [info.selectionText.trim(), info.pageUrl]
        }).catch(err => {
            console.error("Script injection failed:", err);
        });
    }
});


// Handle messages (show notifications)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "highlightSaved") {
        const shortText = request.data.text.length > 50 
            ? request.data.text.substring(0, 50) + "..." 
            : request.data.text;

        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'logo.png',
            title: 'Highlight Saved!',
            message: `Saved: "${shortText}"`
        }, (notificationId) => {
            // Auto-clear notification after 3s
            setTimeout(() => chrome.notifications.clear(notificationId), 3000);
        });
    }
});
