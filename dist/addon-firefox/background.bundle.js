(function () {
    'use strict';

    const manifestVersion = chrome.runtime.getManifest().manifest_version;
    // Storage abstraction: MV2 keeps everything in memory, MV3 uses chrome.storage
    const storage = {};
    async function storageSet(obj) {
        if (manifestVersion === 2) {
            Object.assign(storage, obj);
            return;
        }
        return chrome.storage.local.set(obj);
    }
    async function storageGet(key) {
        if (key === null) {
            if (manifestVersion === 2) {
                return storage;
            }
            return await chrome.storage.local.get(null);
        }
        if (manifestVersion === 2) {
            return storage[key];
        }
        return (await chrome.storage.local.get(key))?.[key];
    }
    async function storageRemove(key) {
        if (manifestVersion === 2) {
            delete storage[key];
            return;
        }
        return chrome.storage.local.remove(key);
    }

    async function showOptOutStatus(tabId, status, cmp = '') {
        let title = "";
        let icon = "icons/cookie-idle.png";
        if (status === "success") {
            title = `Opt out successful! (${cmp})`;
            icon = "icons/party.png";
        }
        else if (status === "complete") {
            title = `Opt out complete! (${cmp})`;
            icon = "icons/tick.png";
        }
        else if (status === "working") {
            title = `Processing... (${cmp})`;
            icon = "icons/cog.png";
        }
        else if (status === "verified") {
            title = `Verified (${cmp})`;
            icon = "icons/verified.png";
        }
        else if (status === "idle") {
            title = "Idle";
            icon = "icons/cookie-idle.png";
        }
        else if (status === "available") {
            title = `Click to opt out (${cmp})`;
            icon = "icons/cookie.png";
        }
        const action = chrome.action || chrome.pageAction;
        if (chrome.pageAction) {
            chrome.pageAction.show(tabId);
        }
        await action.setTitle({
            tabId,
            title,
        });
        await action.setIcon({
            tabId,
            path: icon,
        });
    }

    /**
     * Mapping of tabIds to Port connections to open devtools panels.
     * This is kept in memory, as the values are only relevant while the background service worker is
     * alive. Once the service worker stops, Ports to devtools will be severed, and the panel will
     * reestablish the connection.
     */
    const openDevToolsPanels = new Map();
    async function loadRules() {
        const res = await fetch("./rules.json");
        storageSet({
            rules: await res.json(),
        });
    }
    async function initConfig() {
        console.log('init sw');
        const storedConfig = await storageGet('config');
        console.log('storedConfig', storedConfig);
        if (!storedConfig) {
            console.log('init config');
            const defaultConfig = {
                enabled: true,
                autoAction: 'optOut',
                disabledCmps: [],
                enablePrehide: true,
                enableCosmeticRules: true,
                detectRetries: 20,
            };
            await storageSet({
                config: defaultConfig,
            });
        }
        else if (typeof storedConfig.enableCosmeticRules === 'undefined') { // upgrade from old versions
            storedConfig.enableCosmeticRules = true;
            await storageSet({
                config: storedConfig,
            });
        }
    }
    async function evalInTab(tabId, frameId, code) {
        if (manifestVersion === 2) {
            return new Promise((resolve) => {
                chrome.tabs.executeScript(tabId, {
                    frameId,
                    code: `!!window.eval(decodeURIComponent("${encodeURIComponent(code)}"))`
                }, (resultArr) => {
                    resolve([{
                            result: resultArr[0],
                            frameId,
                        }]);
                });
            });
        }
        return chrome.scripting.executeScript({
            target: {
                tabId,
                frameIds: [frameId],
            },
            world: "MAIN",
            args: [code],
            func: (code) => {
                try {
                    return window.eval(code);
                }
                catch (e) {
                    // ignore CSP errors
                    console.warn('eval error', code, e);
                    return;
                }
            },
        });
    }
    async function getTabReports(tabId) {
        const storageKey = `reports-${tabId}`;
        return (await chrome.storage.session.get(storageKey))[storageKey] || {};
    }
    async function updateTabReports(tabId, frameId, msg) {
        const reportsForTab = await getTabReports(tabId);
        reportsForTab[frameId] = msg;
        await chrome.storage.session.set({ [`reports-${tabId}`]: reportsForTab });
    }
    chrome.runtime.onInstalled.addListener(() => {
        loadRules();
        initConfig();
    });
    if (manifestVersion === 2) {
        // always load rules on startup in MV2
        loadRules();
        initConfig();
    }
    chrome.tabs.onRemoved.addListener((tabId) => {
        storageRemove(`detected${tabId}`);
    });
    chrome.runtime.onMessage.addListener(async (msg, sender) => {
        const tabId = sender.tab.id;
        const frameId = sender.frameId;
        const rules = await storageGet("rules");
        const autoconsentConfig = await storageGet('config');
        switch (msg.type) {
            case "init":
                if (frameId === 0) {
                    await showOptOutStatus(tabId, 'idle');
                }
                chrome.tabs.sendMessage(tabId, {
                    type: "initResp",
                    rules,
                    config: autoconsentConfig,
                }, {
                    frameId,
                });
                break;
            case "eval":
                evalInTab(tabId, frameId, msg.code).then(([result]) => {
                    chrome.tabs.sendMessage(tabId, {
                        id: msg.id,
                        type: "evalResp",
                        result: result.result,
                    }, {
                        frameId,
                    });
                });
                break;
            case "popupFound":
                await showOptOutStatus(tabId, "available", msg.cmp);
                storageSet({
                    [`detected${tabId}`]: frameId,
                });
                break;
            case "optOutResult":
            case "optInResult":
                if (msg.result) {
                    await showOptOutStatus(tabId, "working", msg.cmp);
                    if (msg.scheduleSelfTest) {
                        await storageSet({
                            [`selfTest${tabId}`]: frameId,
                        });
                    }
                }
                break;
            case "selfTestResult":
                if (msg.result) {
                    await showOptOutStatus(tabId, "verified", msg.cmp);
                }
                break;
            case "autoconsentDone": {
                await showOptOutStatus(tabId, "success", msg.cmp);
                // sometimes self-test needs to be done in another frame
                const selfTestKey = `selfTest${tabId}`;
                const selfTestFrameId = (await chrome.storage.local.get(selfTestKey))?.[selfTestKey];
                if (typeof selfTestFrameId === 'number') {
                    storageRemove(selfTestKey);
                    chrome.tabs.sendMessage(tabId, {
                        type: "selfTest",
                    }, {
                        frameId: selfTestFrameId,
                    });
                }
                break;
            }
            case "autoconsentError":
                console.error('Error:', msg.details);
                break;
            case "report":
                if (sender.tab && openDevToolsPanels.has(sender.tab.id)) {
                    openDevToolsPanels.get(sender.tab.id).postMessage({
                        tabId: sender.tab.id,
                        frameId: sender.frameId,
                        ...msg,
                    });
                }
                updateTabReports(sender.tab.id, sender.frameId, msg);
                break;
        }
    });
    if (manifestVersion === 2) { // MV3 handles this inside the popup
        chrome.pageAction.onClicked.addListener(async (tab) => {
            const tabId = tab.id;
            const detectedKey = `detected${tabId}`;
            const frameId = await storageGet(detectedKey);
            if (typeof frameId === 'number') {
                storageRemove(detectedKey);
                await showOptOutStatus(tabId, "working");
                chrome.tabs.sendMessage(tabId, {
                    type: "optOut",
                }, {
                    frameId,
                });
            }
        });
    }
    // Communicate with devtools panels
    chrome.runtime.onConnect.addListener(function (devToolsConnection) {
        if (devToolsConnection.name.startsWith('instance-')) {
            // connection from an autoconsent instance - used to detect frame destruction
            const tabId = devToolsConnection.sender?.tab?.id;
            const instanceId = devToolsConnection.name.slice('instance-'.length);
            if (tabId && instanceId) {
                devToolsConnection.onDisconnect.addListener(() => {
                    if (openDevToolsPanels.has(tabId)) {
                        openDevToolsPanels.get(tabId).postMessage({
                            type: 'instanceTerminated',
                            tabId,
                            instanceId,
                        });
                    }
                    // remove stored frame data
                    updateTabReports(tabId, devToolsConnection.sender.frameId, undefined);
                });
            }
        }
        else if (devToolsConnection.name === 'devtools-panel') {
            let tabId = -1;
            // add the listener
            devToolsConnection.onMessage.addListener(async (message) => {
                tabId = message.tabId;
                if (message.type === 'init') {
                    // save the message channel for this tab
                    openDevToolsPanels.set(tabId, devToolsConnection);
                    // dump data cached in bg to the panel
                    const reportsForTab = await getTabReports(tabId);
                    Object.keys(reportsForTab || {}).forEach((frameId) => {
                        devToolsConnection.postMessage({
                            tabId,
                            frameId,
                            ...reportsForTab[parseInt(frameId, 10)]
                        });
                    });
                }
            });
            devToolsConnection.onDisconnect.addListener(function () {
                openDevToolsPanels.delete(tabId);
            });
        }
    });
    chrome.tabs.onRemoved.addListener((tabId) => {
        chrome.storage.session.remove(`reports-${tabId}`);
    });

})();
