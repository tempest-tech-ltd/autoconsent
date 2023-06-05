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

    async function init() {
        const autoconsentConfig = await storageGet('config');
        const enabledCheckbox = document.querySelector('input#enabled');
        const optOutRadio = document.querySelector('input#optout');
        const optInRadio = document.querySelector('input#optin');
        const promptRadio = document.querySelector('input#prompt');
        const prehideOnRadio = document.querySelector('input#prehide-on');
        const prehideOffRadio = document.querySelector('input#prehide-off');
        const cosmeticOnRadio = document.querySelector('input#cosmetic-on');
        const cosmeticOffRadio = document.querySelector('input#cosmetic-off');
        const retriesInput = document.querySelector('input#retries');
        // enable proceed button when necessary
        const [currentTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        const tabId = currentTab.id;
        const detectedKey = `detected${tabId}`;
        console.log('detectedKey', detectedKey);
        const frameId = await storageGet(detectedKey);
        console.log('frameId', frameId, typeof frameId);
        if (typeof frameId === 'number') {
            const proceedButton = document.createElement('button');
            proceedButton.innerText = 'Manage popup';
            proceedButton.id = 'proceed';
            proceedButton.addEventListener('click', () => {
                storageRemove(detectedKey);
                showOptOutStatus(tabId, "working");
                chrome.tabs.sendMessage(tabId, {
                    type: "optOut",
                }, {
                    frameId,
                });
                proceedButton.remove();
                window.close();
            });
            document.body.prepend(proceedButton);
        }
        // set form initial values
        enabledCheckbox.checked = autoconsentConfig.enabled;
        retriesInput.value = autoconsentConfig.detectRetries.toString();
        if (autoconsentConfig.autoAction === 'optIn') {
            optInRadio.checked = true;
        }
        else if (autoconsentConfig.autoAction === 'optOut') {
            optOutRadio.checked = true;
        }
        else {
            promptRadio.checked = true;
        }
        if (autoconsentConfig.enablePrehide) {
            prehideOnRadio.checked = true;
        }
        else {
            prehideOffRadio.checked = true;
        }
        if (autoconsentConfig.enableCosmeticRules) {
            cosmeticOnRadio.checked = true;
        }
        else {
            cosmeticOffRadio.checked = true;
        }
        // set form event listeners
        enabledCheckbox.addEventListener('change', () => {
            autoconsentConfig.enabled = enabledCheckbox.checked;
            storageSet({ config: autoconsentConfig });
        });
        retriesInput.addEventListener('change', () => {
            autoconsentConfig.detectRetries = parseInt(retriesInput.value, 10);
            storageSet({ config: autoconsentConfig });
        });
        function modeChange() {
            if (optInRadio.checked) {
                autoconsentConfig.autoAction = 'optIn';
            }
            else if (optOutRadio.checked) {
                autoconsentConfig.autoAction = 'optOut';
            }
            else {
                autoconsentConfig.autoAction = null;
            }
            storageSet({ config: autoconsentConfig });
        }
        optInRadio.addEventListener('change', modeChange);
        optOutRadio.addEventListener('change', modeChange);
        promptRadio.addEventListener('change', modeChange);
        function prehideChange() {
            autoconsentConfig.enablePrehide = prehideOnRadio.checked;
            storageSet({ config: autoconsentConfig });
        }
        prehideOnRadio.addEventListener('change', prehideChange);
        prehideOffRadio.addEventListener('change', prehideChange);
        function cosmeticChange() {
            autoconsentConfig.enableCosmeticRules = cosmeticOnRadio.checked;
            storageSet({ config: autoconsentConfig });
        }
        cosmeticOnRadio.addEventListener('change', cosmeticChange);
        cosmeticOffRadio.addEventListener('change', cosmeticChange);
    }
    init();

})();
