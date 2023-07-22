(function () {
    'use strict';

    const enableLogs = false; // change this to enable debug logs

    function getRandomID() {
        if (crypto && typeof crypto.randomUUID !== "undefined") {
            return crypto.randomUUID();
        }
        return Math.random().toString();
    }

    class Deferred {
        constructor(id, timeout = 1000) {
            this.id = id;
            this.promise = new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
            this.timer = window.setTimeout(() => {
                this.reject(new Error("timeout"));
            }, timeout);
        }
    }
    const evalState = {
        pending: new Map(),
        sendContentMessage: null,
    };
    function requestEval(code) {
        const id = getRandomID();
        evalState.sendContentMessage({
            type: 'eval',
            id,
            code,
        });
        const deferred = new Deferred(id);
        evalState.pending.set(deferred.id, deferred);
        return deferred.promise;
    }
    function resolveEval(id, value) {
        const deferred = evalState.pending.get(id);
        if (deferred) {
            evalState.pending.delete(id);
            deferred.timer && window.clearTimeout(deferred.timer);
            deferred.resolve(value);
        }
        else {
            console.warn('no eval #', id);
        }
    }

    // get or create a style container for CSS overrides
    function getStyleElement(styleOverrideElementId = "autoconsent-css-rules") {
        const styleSelector = `style#${styleOverrideElementId}`;
        const existingElement = document.querySelector(styleSelector);
        if (existingElement && existingElement instanceof HTMLStyleElement) {
            return existingElement;
        }
        else {
            const parent = document.head ||
                document.getElementsByTagName("head")[0] ||
                document.documentElement;
            const css = document.createElement("style");
            css.id = styleOverrideElementId;
            parent.appendChild(css);
            return css;
        }
    }
    // hide elements with a CSS rule
    function hideElements(styleEl, selectors, method = 'display') {
        const hidingSnippet = method === "opacity" ? `opacity: 0` : `display: none`; // use display by default
        const rule = `${selectors.join(",")} { ${hidingSnippet} !important; z-index: -1 !important; pointer-events: none !important; } `;
        if (styleEl instanceof HTMLStyleElement) {
            styleEl.innerText += rule;
            return selectors.length > 0;
        }
        return false;
    }
    async function waitFor(predicate, maxTimes, interval) {
        const result = await predicate();
        if (!result && maxTimes > 0) {
            return new Promise((resolve) => {
                setTimeout(async () => {
                    resolve(waitFor(predicate, maxTimes - 1, interval));
                }, interval);
            });
        }
        return Promise.resolve(result);
    }
    function isElementVisible(elem) {
        if (!elem) {
            return false;
        }
        if (elem.offsetParent !== null) {
            return true;
        }
        else {
            const css = window.getComputedStyle(elem);
            if (css.position === 'fixed' && css.display !== "none") { // fixed elements may be visible even if the parent is not
                return true;
            }
        }
        return false;
    }

    function doEval(expr) {
        return requestEval(expr).catch((e) => {
            return false;
        });
    }
    function click(selectorOrElements, all = false) {
        let elem = [];
        if (typeof selectorOrElements === 'string') {
            elem = Array.from(document.querySelectorAll(selectorOrElements));
        }
        else {
            elem = selectorOrElements;
        }
        if (elem.length > 0) {
            if (all) {
                elem.forEach((e) => e.click());
            }
            else {
                elem[0].click();
            }
        }
        return elem.length > 0;
    }
    function elementExists(selector) {
        const exists = document.querySelector(selector) !== null;
        // enableLogs && console.log("[exists?]", selector, exists);
        return exists;
    }
    function elementVisible(selector, check) {
        const elem = document.querySelectorAll(selector);
        const results = new Array(elem.length);
        elem.forEach((e, i) => {
            // check for display: none
            results[i] = isElementVisible(e);
        });
        // enableLogs && console.log("[visible?]", selector, check, elem, results);
        if (check === "none") {
            return results.every(r => !r);
        }
        else if (results.length === 0) {
            return false;
        }
        else if (check === "any") {
            return results.some(r => r);
        }
        // all
        return results.every(r => r);
    }
    function waitForElement(selector, timeout = 10000) {
        const interval = 200;
        const times = Math.ceil((timeout) / interval);
        // enableLogs && console.log("[waitFor]", ruleStep.waitFor);
        return waitFor(() => document.querySelector(selector) !== null, times, interval);
    }
    function waitForVisible(selector, timeout = 10000, check = 'any') {
        const interval = 200;
        const times = Math.ceil((timeout) / interval);
        // enableLogs && console.log("[waitForVisible]", ruleStep.waitFor);
        return waitFor(() => elementVisible(selector, check), times, interval);
    }
    async function waitForThenClick(selector, timeout = 10000, all = false) {
        // enableLogs && console.log("[waitForThenClick]", ruleStep.waitForThenClick);
        await waitForElement(selector, timeout);
        return click(selector, all);
    }
    function wait(ms) {
        // enableLogs && console.log(`waiting for ${ruleStep.wait}ms`);
        return new Promise(resolve => {
            setTimeout(() => {
                // enableLogs && console.log(`done waiting`);
                resolve(true);
            }, ms);
        });
    }
    function hide(selectors, method) {
        // enableLogs && console.log("[hide]", ruleStep.hide, ruleStep.method);
        const styleEl = getStyleElement();
        return hideElements(styleEl, selectors, method);
    }
    function prehide(selectors) {
        const styleEl = getStyleElement('autoconsent-prehide');
        return hideElements(styleEl, selectors, "opacity");
    }
    function undoPrehide() {
        const existingElement = getStyleElement('autoconsent-prehide');
        if (existingElement) {
            existingElement.remove();
        }
        return !!existingElement;
    }

    /* eslint-disable no-restricted-syntax,no-await-in-loop,no-underscore-dangle */
    const defaultRunContext = {
        main: true,
        frame: false,
        urlPattern: "",
    };
    class AutoConsentCMPBase {
        constructor(name) {
            this.runContext = defaultRunContext;
            this.name = name;
        }
        get hasSelfTest() {
            throw new Error('Not Implemented');
        }
        get isIntermediate() {
            throw new Error('Not Implemented');
        }
        get isCosmetic() {
            throw new Error('Not Implemented');
        }
        checkRunContext() {
            const runCtx = {
                ...defaultRunContext,
                ...this.runContext,
            };
            const isTop = window.top === window;
            if (isTop && !runCtx.main) {
                return false;
            }
            if (!isTop && !runCtx.frame) {
                return false;
            }
            if (runCtx.urlPattern && !window.location.href.match(runCtx.urlPattern)) {
                return false;
            }
            return true;
        }
        detectCmp() {
            throw new Error('Not Implemented');
        }
        async detectPopup() {
            return false;
        }
        optOut() {
            throw new Error('Not Implemented');
        }
        optIn() {
            throw new Error('Not Implemented');
        }
        openCmp() {
            throw new Error('Not Implemented');
        }
        async test() {
            // try IAB by default
            return Promise.resolve(true);
        }
    }
    async function evaluateRuleStep(rule) {
        const results = [];
        if (rule.exists) {
            results.push(elementExists(rule.exists));
        }
        if (rule.visible) {
            results.push(elementVisible(rule.visible, rule.check));
        }
        if (rule.eval) {
            const res = doEval(rule.eval);
            results.push(res);
        }
        if (rule.waitFor) {
            results.push(waitForElement(rule.waitFor, rule.timeout));
        }
        if (rule.waitForVisible) {
            results.push(waitForVisible(rule.waitForVisible, rule.timeout, rule.check));
        }
        if (rule.click) {
            results.push(click(rule.click, rule.all));
        }
        if (rule.waitForThenClick) {
            results.push(waitForThenClick(rule.waitForThenClick, rule.timeout, rule.all));
        }
        if (rule.wait) {
            results.push(wait(rule.wait));
        }
        if (rule.hide) {
            results.push(hide(rule.hide, rule.method));
        }
        if (rule.if) {
            if (!rule.if.exists && !rule.if.visible) {
                console.error('invalid conditional rule', rule.if);
                return false;
            }
            const condition = await evaluateRuleStep(rule.if);
            if (condition) {
                results.push(_runRulesSequentially(rule.then));
            }
            else if (rule.else) {
                results.push(_runRulesSequentially(rule.else));
            }
        }
        if (results.length === 0) {
            return false;
        }
        // boolean and of results
        const all = await Promise.all(results);
        return all.reduce((a, b) => a && b, true);
    }
    async function _runRulesParallel(rules) {
        const results = rules.map(rule => evaluateRuleStep(rule));
        const detections = await Promise.all(results);
        return detections.every(r => !!r);
    }
    async function _runRulesSequentially(rules) {
        for (const rule of rules) {
            const result = await evaluateRuleStep(rule);
            if (!result && !rule.optional) {
                return false;
            }
        }
        return true;
    }
    class AutoConsentCMP extends AutoConsentCMPBase {
        constructor(config) {
            super(config.name);
            this.config = config;
            this.runContext = config.runContext || defaultRunContext;
        }
        get hasSelfTest() {
            return !!this.config.test;
        }
        get isIntermediate() {
            return !!this.config.intermediate;
        }
        get isCosmetic() {
            return !!this.config.cosmetic;
        }
        get prehideSelectors() {
            return this.config.prehideSelectors;
        }
        async detectCmp() {
            if (this.config.detectCmp) {
                return _runRulesParallel(this.config.detectCmp);
            }
            return false;
        }
        async detectPopup() {
            if (this.config.detectPopup) {
                return _runRulesSequentially(this.config.detectPopup);
            }
            return false;
        }
        async optOut() {
            if (this.config.optOut) {
                return _runRulesSequentially(this.config.optOut);
            }
            return false;
        }
        async optIn() {
            if (this.config.optIn) {
                return _runRulesSequentially(this.config.optIn);
            }
            return false;
        }
        async openCmp() {
            if (this.config.openCmp) {
                return _runRulesSequentially(this.config.openCmp);
            }
            return false;
        }
        async test() {
            if (this.hasSelfTest) {
                return _runRulesSequentially(this.config.test);
            }
            return super.test();
        }
    }

    const cookieSettingsButton = "#truste-show-consent";
    const shortcutOptOut = '#truste-consent-required';
    const shortcutOptIn = '#truste-consent-button';
    const popupContent = '#truste-consent-content';
    const bannerOverlay = '#trustarc-banner-overlay';
    const bannerContainer = '#truste-consent-track';
    class TrustArcTop extends AutoConsentCMPBase {
        constructor() {
            super("TrustArc-top");
            this.prehideSelectors = [
                ".trustarc-banner-container",
                `.truste_popframe,.truste_overlay,.truste_box_overlay,${bannerContainer}`,
            ];
            this.runContext = {
                main: true,
                frame: false,
            };
            this._shortcutButton = null; // indicates if the "reject all" button is detected
            this._optInDone = false;
        }
        get hasSelfTest() {
            return false;
        }
        get isIntermediate() {
            if (this._optInDone) {
                return false;
            }
            return !this._shortcutButton;
        }
        get isCosmetic() {
            return false;
        }
        async detectCmp() {
            const result = elementExists(`${cookieSettingsButton},${bannerContainer}`);
            if (result) {
                // additionally detect the opt-out button
                this._shortcutButton = document.querySelector(shortcutOptOut);
            }
            return result;
        }
        async detectPopup() {
            // not every element should exist, but if it does, it's a popup
            return elementVisible(`${popupContent},${bannerOverlay},${bannerContainer}`, 'all');
        }
        openFrame() {
            click(cookieSettingsButton);
        }
        async optOut() {
            if (this._shortcutButton) {
                this._shortcutButton.click();
                return true;
            }
            // hide elements permanently, so user doesn't see the popup
            hideElements(getStyleElement(), [".truste_popframe", ".truste_overlay", ".truste_box_overlay", bannerContainer]);
            click(cookieSettingsButton);
            // schedule cleanup
            setTimeout(() => {
                getStyleElement().remove();
            }, 10000);
            return true;
        }
        async optIn() {
            this._optInDone = true; // just a hack to force autoconsentDone
            return click(shortcutOptIn);
        }
        async openCmp() {
            // await tab.eval("truste.eu.clickListener()");
            return true;
        }
        async test() {
            //Test JS variable to check the user's preference
            //PrefCookie = undefined means no consent is set, PrefCookie = '0' means consent is set to required only 
            return await doEval("window && window.truste && window.truste.eu.bindMap.prefCookie === '0'");
        }
    }

    class TrustArcFrame extends AutoConsentCMPBase {
        constructor() {
            super("TrustArc-frame");
            this.runContext = {
                main: false,
                frame: true,
                urlPattern: "^https://consent-pref\\.trustarc\\.com/\\?",
            };
        }
        get hasSelfTest() {
            return false;
        }
        get isIntermediate() {
            return false;
        }
        get isCosmetic() {
            return false;
        }
        async detectCmp() {
            return true;
        }
        async detectPopup() {
            // we're already inside the popup
            return elementVisible("#defaultpreferencemanager", 'any') && elementVisible(".mainContent", 'any');
        }
        async navigateToSettings() {
            // wait for it to load
            await waitFor(async () => {
                return (elementExists(".shp") ||
                    elementVisible(".advance", 'any') ||
                    elementExists(".switch span:first-child"));
            }, 10, 500);
            // splash screen -> hit more information
            if (elementExists(".shp")) {
                click(".shp");
            }
            await waitForElement(".prefPanel", 5000);
            // go to advanced settings if not yet shown
            if (elementVisible(".advance", 'any')) {
                click(".advance");
            }
            // takes a while to load the opt-in/opt-out buttons
            return await waitFor(() => elementVisible(".switch span:first-child", 'any'), 5, 1000);
        }
        async optOut() {
            await waitFor(() => document.readyState === 'complete', 20, 100);
            await waitForElement(".mainContent[aria-hidden=false]", 5000);
            if (click(".rejectAll")) {
                return true;
            }
            if (elementExists('.prefPanel')) {
                await waitForElement('.prefPanel[style="visibility: visible;"]', 3000);
            }
            if (click("#catDetails0")) {
                click(".submit");
                return true;
            }
            if (click(".required")) {
                return true;
            }
            await this.navigateToSettings();
            click(".switch span:nth-child(1):not(.active)", true);
            click(".submit");
            // at this point, iframe usually closes. Sometimes we need to close manually, but we don't wait for it to report success
            waitForElement("#gwt-debug-close_id", 300000).then(() => {
                click("#gwt-debug-close_id");
            });
            return true;
        }
        async optIn() {
            if (click('.call')) {
                return true;
            }
            await this.navigateToSettings();
            click(".switch span:nth-child(2)", true);
            click(".submit");
            // at this point, iframe usually closes. Sometimes we need to close manually, but we don't wait for it to report success
            waitForElement("#gwt-debug-close_id", 300000).then(() => {
                click("#gwt-debug-close_id");
            });
            return true;
        }
    }

    class Cookiebot extends AutoConsentCMPBase {
        constructor() {
            super('Cybotcookiebot');
            this.prehideSelectors = ["#CybotCookiebotDialog,#dtcookie-container,#cookiebanner,#cb-cookieoverlay"];
        }
        get hasSelfTest() {
            return true;
        }
        get isIntermediate() {
            return false;
        }
        get isCosmetic() {
            return false;
        }
        async detectCmp() {
            return elementExists('#CybotCookiebotDialogBodyLevelButtonPreferences');
        }
        async detectPopup() {
            return elementExists('#CybotCookiebotDialog,#dtcookie-container,#cookiebanner,#cb-cookiebanner');
        }
        async optOut() {
            if (click('.cookie-alert-extended-detail-link')) {
                await waitForElement('.cookie-alert-configuration', 2000);
                click('.cookie-alert-configuration-input:checked', true);
                click('.cookie-alert-extended-button-secondary');
                return true;
            }
            if (elementExists('#dtcookie-container')) {
                return click('.h-dtcookie-decline');
            }
            if (click('.cookiebot__button--settings')) {
                return true;
            }
            if (click('#CybotCookiebotDialogBodyButtonDecline')) {
                return true;
            }
            click('.cookiebanner__link--details');
            click('.CybotCookiebotDialogBodyLevelButton:checked:enabled,input[id*="CybotCookiebotDialogBodyLevelButton"]:checked:enabled', true);
            click('#CybotCookiebotDialogBodyButtonDecline');
            click('input[id^=CybotCookiebotDialogBodyLevelButton]:checked', true);
            if (elementExists('#CybotCookiebotDialogBodyButtonAcceptSelected')) {
                click('#CybotCookiebotDialogBodyButtonAcceptSelected');
            }
            else {
                click('#CybotCookiebotDialogBodyLevelButtonAccept,#CybotCookiebotDialogBodyButtonAccept,#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection', true);
            }
            // some sites have custom submit buttons with no obvious selectors. In this case we just call the submitConsent API.
            if (await doEval('window.CookieConsent.hasResponse !== true')) {
                await doEval('window.Cookiebot.dialog.submitConsent()');
                await wait(500);
            }
            // site with 3rd confirm settings modal
            if (elementExists('#cb-confirmedSettings')) {
                await doEval('endCookieProcess()');
            }
            return true;
        }
        async optIn() {
            if (elementExists('#dtcookie-container')) {
                return click('.h-dtcookie-accept');
            }
            click('.CybotCookiebotDialogBodyLevelButton:not(:checked):enabled', true);
            click('#CybotCookiebotDialogBodyLevelButtonAccept');
            click('#CybotCookiebotDialogBodyButtonAccept');
            return true;
        }
        async test() {
            return doEval('window.CookieConsent.declined === true');
        }
    }

    class SourcePoint extends AutoConsentCMPBase {
        constructor() {
            super("Sourcepoint-frame");
            this.prehideSelectors = ["div[id^='sp_message_container_'],.message-overlay", '#sp_privacy_manager_container'];
            this.ccpaNotice = false;
            this.ccpaPopup = false;
            this.runContext = {
                main: false,
                frame: true,
            };
        }
        get hasSelfTest() {
            return false; // self-test is done by parent frame
        }
        get isIntermediate() {
            return false;
        }
        get isCosmetic() {
            return false;
        }
        async detectCmp() {
            const url = new URL(location.href);
            if (url.searchParams.has('message_id') && url.hostname === 'ccpa-notice.sp-prod.net') {
                this.ccpaNotice = true;
                return true;
            }
            if (url.hostname === 'ccpa-pm.sp-prod.net') {
                this.ccpaPopup = true;
                return true;
            }
            return (url.pathname === '/index.html' || url.pathname === '/privacy-manager/index.html')
                && (url.searchParams.has('message_id') || url.searchParams.has('requestUUID') || url.searchParams.has('consentUUID'));
        }
        async detectPopup() {
            if (this.ccpaNotice) {
                return true;
            }
            if (this.ccpaPopup) {
                return await waitForElement('.priv-save-btn', 2000);
            }
            // check for the paywall button, and bail if it exists to prevent broken opt out
            await waitForElement(".sp_choice_type_11,.sp_choice_type_12,.sp_choice_type_13,.sp_choice_type_ACCEPT_ALL", 2000);
            return !elementExists('.sp_choice_type_9');
        }
        async optIn() {
            await waitForElement(".sp_choice_type_11,.sp_choice_type_ACCEPT_ALL", 2000);
            if (click(".sp_choice_type_11")) {
                return true;
            }
            if (click('.sp_choice_type_ACCEPT_ALL')) {
                return true;
            }
            return false;
        }
        isManagerOpen() {
            return location.pathname === "/privacy-manager/index.html";
        }
        async optOut() {
            if (this.ccpaPopup) {
                // toggles with 2 buttons
                const toggles = document.querySelectorAll('.priv-purpose-container .sp-switch-arrow-block a.neutral.on .right');
                for (const t of toggles) {
                    click([t]);
                }
                // switch toggles
                const switches = document.querySelectorAll('.priv-purpose-container .sp-switch-arrow-block a.switch-bg.on');
                for (const t of switches) {
                    click([t]);
                }
                return click('.priv-save-btn');
            }
            if (!this.isManagerOpen()) {
                const actionable = await waitForElement('.sp_choice_type_12,.sp_choice_type_13');
                if (!actionable) {
                    return false;
                }
                if (!elementExists(".sp_choice_type_12")) {
                    // do not sell button
                    return click(".sp_choice_type_13");
                }
                click(".sp_choice_type_12");
                // the page may navigate at this point but that's okay
                await waitFor(() => this.isManagerOpen(), 200, 100);
            }
            await waitForElement('.type-modal', 20000);
            // reject all button is offered by some sites
            try {
                const rejectSelector1 = '.sp_choice_type_REJECT_ALL';
                const rejectSelector2 = '.reject-toggle';
                const path = await Promise.race([
                    waitForElement(rejectSelector1, 2000).then(success => success ? 0 : -1),
                    waitForElement(rejectSelector2, 2000).then(success => success ? 1 : -1),
                    waitForElement('.pm-features', 2000).then(success => success ? 2 : -1),
                ]);
                if (path === 0) {
                    await wait(1000);
                    return click(rejectSelector1);
                }
                else if (path === 1) {
                    click(rejectSelector2);
                }
                else if (path === 2) {
                    await waitForElement('.pm-features', 10000);
                    click('.checked > span', true);
                    click('.chevron');
                }
            }
            catch (e) {
            }
            // TODO: race condition: the popup disappears very quickly, so the background script may not receive a success report.
            return click('.sp_choice_type_SAVE_AND_EXIT');
        }
    }

    // Note: JS API is also available:
    // https://help.consentmanager.net/books/cmp/page/javascript-api
    class ConsentManager extends AutoConsentCMPBase {
        get hasSelfTest() {
            return this.apiAvailable;
        }
        get isIntermediate() {
            return false;
        }
        get isCosmetic() {
            return false;
        }
        constructor() {
            super("consentmanager.net");
            this.prehideSelectors = ["#cmpbox,#cmpbox2"];
            this.apiAvailable = false;
        }
        async detectCmp() {
            this.apiAvailable = await doEval('window.__cmp && typeof __cmp("getCMPData") === "object"');
            if (!this.apiAvailable) {
                return elementExists("#cmpbox");
            }
            else {
                return true;
            }
        }
        async detectPopup() {
            if (this.apiAvailable) {
                // wait before making this check because early in the page lifecycle this may incorrectly return
                // true, causing an opt-out when it is not needed.
                await wait(500);
                return await doEval("!__cmp('consentStatus').userChoiceExists");
            }
            return elementVisible("#cmpbox .cmpmore", 'any');
        }
        async optOut() {
            await wait(500);
            if (this.apiAvailable) {
                return await doEval("__cmp('setConsent', 0)");
            }
            if (click(".cmpboxbtnno")) {
                return true;
            }
            if (elementExists(".cmpwelcomeprpsbtn")) {
                click(".cmpwelcomeprpsbtn > a[aria-checked=true]", true);
                click(".cmpboxbtnsave");
                return true;
            }
            click(".cmpboxbtncustom");
            await waitForElement(".cmptblbox", 2000);
            click(".cmptdchoice > a[aria-checked=true]", true);
            click(".cmpboxbtnyescustomchoices");
            return true;
        }
        async optIn() {
            if (this.apiAvailable) {
                return await doEval("__cmp('setConsent', 1)");
            }
            return click(".cmpboxbtnyes");
        }
        async test() {
            if (this.apiAvailable) {
                return await doEval("__cmp('consentStatus').userChoiceExists");
            }
        }
    }

    class Evidon extends AutoConsentCMPBase {
        constructor() {
            super("Evidon");
        }
        get hasSelfTest() {
            return false;
        }
        get isIntermediate() {
            return false;
        }
        get isCosmetic() {
            return false;
        }
        async detectCmp() {
            return elementExists("#_evidon_banner");
        }
        async detectPopup() {
            return elementVisible("#_evidon_banner", 'any');
        }
        async optOut() {
            if (click("#_evidon-decline-button")) {
                return true;
            }
            hideElements(getStyleElement(), ["#evidon-prefdiag-overlay", "#evidon-prefdiag-background"]);
            click("#_evidon-option-button");
            await waitForElement("#evidon-prefdiag-overlay", 5000);
            click("#evidon-prefdiag-decline");
            return true;
        }
        async optIn() {
            return click("#_evidon-accept-button");
        }
    }

    class Onetrust extends AutoConsentCMPBase {
        constructor() {
            super("Onetrust");
            this.prehideSelectors = ["#onetrust-banner-sdk,#onetrust-consent-sdk,.onetrust-pc-dark-filter,.js-consent-banner"];
            this.runContext = {
                urlPattern: '^(?!.*https://www\\.nba\\.com/)'
            };
        }
        get hasSelfTest() {
            return true;
        }
        get isIntermediate() {
            return false;
        }
        get isCosmetic() {
            return false;
        }
        async detectCmp() {
            return elementExists("#onetrust-banner-sdk");
        }
        async detectPopup() {
            return elementVisible("#onetrust-banner-sdk", 'all');
        }
        async optOut() {
            if (elementExists("#onetrust-pc-btn-handler")) { // "show purposes" button inside a popup
                click("#onetrust-pc-btn-handler");
            }
            else { // otherwise look for a generic "show settings" button
                click(".ot-sdk-show-settings,button.js-cookie-settings");
            }
            await waitForElement('#onetrust-consent-sdk', 2000);
            await wait(1000);
            click("#onetrust-consent-sdk input.category-switch-handler:checked,.js-editor-toggle-state:checked", true); // optional step
            await wait(1000);
            await waitForElement(".save-preference-btn-handler,.js-consent-save", 2000);
            click(".save-preference-btn-handler,.js-consent-save");
            // popup doesn't disappear immediately
            await waitFor(() => elementVisible("#onetrust-banner-sdk", 'none'), 10, 500);
            return true;
        }
        async optIn() {
            return click("#onetrust-accept-btn-handler,.js-accept-cookies");
        }
        async test() {
            return await doEval("window.OnetrustActiveGroups.split(',').filter(s => s.length > 0).length <= 1");
        }
    }

    class Klaro extends AutoConsentCMPBase {
        constructor() {
            super("Klaro");
            this.prehideSelectors = [".klaro"];
            this.settingsOpen = false;
        }
        get hasSelfTest() {
            return true;
        }
        get isIntermediate() {
            return false;
        }
        get isCosmetic() {
            return false;
        }
        async detectCmp() {
            if (elementExists('.klaro > .cookie-modal')) {
                this.settingsOpen = true;
                return true;
            }
            return elementExists(".klaro > .cookie-notice");
        }
        async detectPopup() {
            return elementVisible(".klaro > .cookie-notice,.klaro > .cookie-modal", 'any');
        }
        async optOut() {
            if (click('.klaro .cn-decline')) {
                return true;
            }
            if (!this.settingsOpen) {
                click('.klaro .cn-learn-more');
                await waitForElement('.klaro > .cookie-modal', 2000);
                this.settingsOpen = true;
            }
            if (click('.klaro .cn-decline')) {
                return true;
            }
            click('.cm-purpose:not(.cm-toggle-all) > input:not(.half-checked)', true);
            return click('.cm-btn-accept');
        }
        async optIn() {
            if (click('.klaro .cm-btn-accept-all')) {
                return true;
            }
            if (this.settingsOpen) {
                click('.cm-purpose:not(.cm-toggle-all) > input.half-checked', true);
                return click('.cm-btn-accept');
            }
            return click('.klaro .cookie-notice .cm-btn-success');
        }
        async test() {
            return await doEval('klaro.getManager().config.services.every(c => c.required || !klaro.getManager().consents[c.name])');
        }
    }

    class Uniconsent extends AutoConsentCMPBase {
        constructor() {
            super("Uniconsent");
        }
        get prehideSelectors() {
            return ['.unic', '.modal:has(.unic)'];
        }
        get hasSelfTest() {
            return true;
        }
        get isIntermediate() {
            return false;
        }
        get isCosmetic() {
            return false;
        }
        async detectCmp() {
            return elementExists(".unic .unic-box,.unic .unic-bar");
        }
        async detectPopup() {
            return elementVisible(".unic .unic-box,.unic .unic-bar", 'any');
        }
        async optOut() {
            await waitForElement(".unic button", 1000);
            document.querySelectorAll(".unic button").forEach((button) => {
                const text = button.textContent;
                if (text.includes('Manage Options') || text.includes('Optionen verwalten')) {
                    button.click();
                }
            });
            if (await waitForElement('.unic input[type=checkbox]', 1000)) {
                await waitForElement('.unic button', 1000);
                document.querySelectorAll('.unic input[type=checkbox]').forEach((c) => {
                    if (c.checked) {
                        c.click();
                    }
                });
                for (const b of document.querySelectorAll('.unic button')) {
                    const text = b.textContent;
                    for (const pattern of ['Confirm Choices', 'Save Choices', 'Auswahl speichern']) {
                        if (text.includes(pattern)) {
                            b.click();
                            await wait(500); // give it some time to close the popup
                            return true;
                        }
                    }
                }
            }
            return false;
        }
        async optIn() {
            return waitForThenClick(".unic #unic-agree");
        }
        async test() {
            await wait(1000);
            const res = elementExists(".unic .unic-box,.unic .unic-bar");
            return !res;
        }
    }

    class Conversant extends AutoConsentCMPBase {
        constructor() {
            super("Conversant");
            this.prehideSelectors = [".cmp-root"];
        }
        get hasSelfTest() {
            return true;
        }
        get isIntermediate() {
            return false;
        }
        get isCosmetic() {
            return false;
        }
        async detectCmp() {
            return elementExists(".cmp-root .cmp-receptacle");
        }
        async detectPopup() {
            return elementVisible(".cmp-root .cmp-receptacle", 'any');
        }
        async optOut() {
            if (!(await waitForThenClick(".cmp-main-button:not(.cmp-main-button--primary)"))) {
                return false;
            }
            if (!(await waitForElement(".cmp-view-tab-tabs"))) {
                return false;
            }
            await waitForThenClick(".cmp-view-tab-tabs > :first-child");
            await waitForThenClick(".cmp-view-tab-tabs > .cmp-view-tab--active:first-child");
            for (const item of Array.from(document.querySelectorAll('.cmp-accordion-item'))) {
                item.querySelector('.cmp-accordion-item-title').click();
                await waitFor(() => !!item.querySelector('.cmp-accordion-item-content.cmp-active'), 10, 50);
                const content = item.querySelector('.cmp-accordion-item-content.cmp-active');
                content.querySelectorAll('.cmp-toggle-actions .cmp-toggle-deny:not(.cmp-toggle-deny--active)').forEach((e) => e.click());
                content.querySelectorAll('.cmp-toggle-actions .cmp-toggle-checkbox:not(.cmp-toggle-checkbox--active)').forEach((e) => e.click());
                // await waitFor(() => !item.querySelector('.cmp-toggle-deny--active,.cmp-toggle-checkbox--active'), 5, 50); // this may take a long time
            }
            await click(".cmp-main-button:not(.cmp-main-button--primary)");
            return true;
        }
        async optIn() {
            return waitForThenClick(".cmp-main-button.cmp-main-button--primary");
        }
        async test() {
            return document.cookie.includes('cmp-data=0');
        }
    }

    class Tiktok extends AutoConsentCMPBase {
        constructor() {
            super("tiktok.com");
            this.runContext = {
                urlPattern: 'tiktok'
            };
        }
        get hasSelfTest() {
            return true;
        }
        get isIntermediate() {
            return false;
        }
        get isCosmetic() {
            return false;
        }
        getShadowRoot() {
            const container = document.querySelector('tiktok-cookie-banner');
            if (!container) {
                return null;
            }
            return container.shadowRoot;
        }
        async detectCmp() {
            return elementExists("tiktok-cookie-banner");
        }
        async detectPopup() {
            const banner = this.getShadowRoot().querySelector('.tiktok-cookie-banner');
            return isElementVisible(banner);
        }
        async optOut() {
            const declineButton = this.getShadowRoot().querySelector('.button-wrapper button:first-child');
            if (declineButton) {
                declineButton.click();
                return true;
            }
            else {
                return false;
            }
        }
        async optIn() {
            const acceptButton = this.getShadowRoot().querySelector('.button-wrapper button:last-child');
            if (acceptButton) {
                acceptButton.click();
                return true;
            }
            else {
                return false;
            }
        }
        async test() {
            const match = document.cookie.match(/cookie-consent=([^;]+)/);
            if (!match) {
                return false;
            }
            const value = JSON.parse(decodeURIComponent(match[1]));
            return Object.values(value).every(x => typeof x !== 'boolean' || x === false);
        }
    }

    class Airbnb extends AutoConsentCMPBase {
        constructor() {
            super("airbnb");
            this.runContext = {
                urlPattern: '^https://(www\\.)?airbnb\\.[^/]+/'
            };
            this.prehideSelectors = [
                "div[data-testid=main-cookies-banner-container]",
                "div:has(> div:first-child):has(> div:last-child):has(> section [data-testid=\"strictly-necessary-cookies\"])"
            ];
        }
        get hasSelfTest() {
            return true;
        }
        get isIntermediate() {
            return false;
        }
        get isCosmetic() {
            return false;
        }
        async detectCmp() {
            return elementExists('div[data-testid=main-cookies-banner-container]');
        }
        async detectPopup() {
            return elementVisible('div[data-testid=main-cookies-banner-container', 'any');
        }
        async optOut() {
            await waitForThenClick('div[data-testid=main-cookies-banner-container] button._snbhip0');
            let check;
            // eslint-disable-next-line no-cond-assign
            while (check = document.querySelector('[data-testid=modal-container] button[aria-checked=true]:not([disabled])')) { // each click may toggle multiple checkboxes
                check.click();
            }
            return waitForThenClick('button[data-testid=save-btn]');
        }
        async optIn() {
            return waitForThenClick('div[data-testid=main-cookies-banner-container] button._148dgdpk');
        }
        async test() {
            return await waitFor(() => !!document.cookie.match('OptanonAlertBoxClosed'), 20, 200);
        }
    }

    const rules$1 = [
        new TrustArcTop(),
        new TrustArcFrame(),
        new Cookiebot(),
        new SourcePoint(),
        new ConsentManager(),
        new Evidon(),
        new Onetrust(),
        new Klaro(),
        new Uniconsent(),
        new Conversant(),
        new Tiktok(),
        new Airbnb(),
    ];
    function createAutoCMP(config) {
        return new AutoConsentCMP(config);
    }

    const rules = rules$1;

    /**
     * This code is in most parts copied from https://github.com/cavi-au/Consent-O-Matic/blob/master/Extension/Tools.js
     * which is licened under the MIT.
     */
    class Tools {
        static getBase() {
            return Tools.base;
        }
        static setBase(base) {
            Tools.base = base;
        }
        static findElement(options, parent = null, multiple = false) {
            let possibleTargets = null;
            if (parent != null) {
                possibleTargets = Array.from(parent.querySelectorAll(options.selector));
            }
            else {
                if (Tools.base != null) {
                    possibleTargets = Array.from(Tools.base.querySelectorAll(options.selector));
                }
                else {
                    possibleTargets = Array.from(document.querySelectorAll(options.selector));
                }
            }
            if (options.textFilter != null) {
                possibleTargets = possibleTargets.filter(possibleTarget => {
                    const textContent = possibleTarget.textContent.toLowerCase();
                    if (Array.isArray(options.textFilter)) {
                        let foundText = false;
                        for (const text of options.textFilter) {
                            if (textContent.indexOf(text.toLowerCase()) !== -1) {
                                foundText = true;
                                break;
                            }
                        }
                        return foundText;
                    }
                    else if (options.textFilter != null) {
                        return textContent.indexOf(options.textFilter.toLowerCase()) !== -1;
                    }
                });
            }
            if (options.styleFilters != null) {
                possibleTargets = possibleTargets.filter(possibleTarget => {
                    const styles = window.getComputedStyle(possibleTarget);
                    let keep = true;
                    for (const styleFilter of options.styleFilters) {
                        const option = styles[styleFilter.option];
                        if (styleFilter.negated) {
                            keep = keep && option !== styleFilter.value;
                        }
                        else {
                            keep = keep && option === styleFilter.value;
                        }
                    }
                    return keep;
                });
            }
            if (options.displayFilter != null) {
                possibleTargets = possibleTargets.filter(possibleTarget => {
                    if (options.displayFilter) {
                        //We should be displayed
                        return possibleTarget.offsetHeight !== 0;
                    }
                    else {
                        //We should not be displayed
                        return possibleTarget.offsetHeight === 0;
                    }
                });
            }
            if (options.iframeFilter != null) {
                possibleTargets = possibleTargets.filter(( /* possibleTarget */) => {
                    if (options.iframeFilter) {
                        //We should be inside an iframe
                        return window.location !== window.parent.location;
                    }
                    else {
                        //We should not be inside an iframe
                        return window.location === window.parent.location;
                    }
                });
            }
            if (options.childFilter != null) {
                possibleTargets = possibleTargets.filter(possibleTarget => {
                    const oldBase = Tools.base;
                    Tools.setBase(possibleTarget);
                    const childResults = Tools.find(options.childFilter);
                    Tools.setBase(oldBase);
                    return childResults.target != null;
                });
            }
            if (multiple) {
                return possibleTargets;
            }
            else {
                if (possibleTargets.length > 1) {
                    console.warn("Multiple possible targets: ", possibleTargets, options, parent);
                }
                return possibleTargets[0];
            }
        }
        static find(options, multiple = false) {
            const results = [];
            if (options.parent != null) {
                const parent = Tools.findElement(options.parent, null, multiple);
                if (parent != null) {
                    if (parent instanceof Array) {
                        parent.forEach(p => {
                            const targets = Tools.findElement(options.target, p, multiple);
                            if (targets instanceof Array) {
                                targets.forEach(target => {
                                    results.push({
                                        parent: p,
                                        target: target
                                    });
                                });
                            }
                            else {
                                results.push({
                                    parent: p,
                                    target: targets
                                });
                            }
                        });
                        return results;
                    }
                    else {
                        const targets = Tools.findElement(options.target, parent, multiple);
                        if (targets instanceof Array) {
                            targets.forEach(target => {
                                results.push({
                                    parent: parent,
                                    target: target
                                });
                            });
                        }
                        else {
                            results.push({
                                parent: parent,
                                target: targets
                            });
                        }
                    }
                }
            }
            else {
                const targets = Tools.findElement(options.target, null, multiple);
                if (targets instanceof Array) {
                    targets.forEach(target => {
                        results.push({
                            parent: null,
                            target: target
                        });
                    });
                }
                else {
                    results.push({
                        parent: null,
                        target: targets
                    });
                }
            }
            if (results.length === 0) {
                results.push({
                    parent: null,
                    target: null
                });
            }
            if (multiple) {
                return results;
            }
            else {
                if (results.length !== 1) {
                    console.warn("Multiple results found, even though multiple false", results);
                }
                return results[0];
            }
        }
    }
    Tools.base = null;

    function matches(config) {
        const result = Tools.find(config);
        if (config.type === "css") {
            return !!result.target;
        }
        else if (config.type === "checkbox") {
            return !!result.target && result.target.checked;
        }
    }
    async function executeAction(config, param) {
        switch (config.type) {
            case "click":
                return clickAction(config);
            case "list":
                return listAction(config, param);
            case "consent":
                return consentAction(config, param);
            case "ifcss":
                return ifCssAction(config, param);
            case "waitcss":
                return waitCssAction(config);
            case "foreach":
                return forEachAction(config, param);
            case "hide":
                return hideAction(config);
            case "slide":
                return slideAction(config);
            case "close":
                return closeAction();
            case "wait":
                return waitAction(config);
            case "eval":
                return evalAction(config);
            case "runrooted":
                return runrootedAction(config, param);
            case "multiclick":
                return multiclickAction(config);
            case "ifallowall":
                return ifAllowAllAction(config, param);
            case "ifallownone":
                return ifAllowNoneAction(config, param);
            case "nop":
                break;
            case "runmethod":
                throw "'runmethod' action is not supported";
            default:
                throw "Unknown action type: " + config.type;
        }
    }
    const STEP_TIMEOUT = 0;
    function waitTimeout(timeout) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, timeout);
        });
    }
    async function clickAction(config) {
        const result = Tools.find(config);
        if (result.target != null) {
            result.target.click();
        }
        return waitTimeout(STEP_TIMEOUT);
    }
    async function multiclickAction(config) {
        const results = Tools.find(config, true);
        results.forEach((result) => {
            if (result.target != null) {
                result.target.click();
            }
        });
        return waitTimeout(STEP_TIMEOUT);
    }
    async function listAction(config, param) {
        for (const action of config.actions) {
            await executeAction(action, param);
        }
    }
    async function consentAction(config, consentTypes) {
        for (const consentConfig of config.consents) {
            const shouldEnable = consentTypes.indexOf(consentConfig.type) !== -1;
            if (consentConfig.matcher && consentConfig.toggleAction) {
                const isEnabled = matches(consentConfig.matcher);
                if (isEnabled !== shouldEnable) {
                    await executeAction(consentConfig.toggleAction);
                }
            }
            else {
                if (shouldEnable) {
                    await executeAction(consentConfig.trueAction);
                }
                else {
                    await executeAction(consentConfig.falseAction);
                }
            }
        }
    }
    async function ifCssAction(config, param) {
        const result = Tools.find(config);
        if (!result.target) {
            if (config.trueAction) {
                await executeAction(config.trueAction, param);
            }
        }
        else {
            if (config.falseAction) {
                await executeAction(config.falseAction, param);
            }
        }
    }
    async function runrootedAction(config, params) {
        if (!config.action) {
            throw new Error('Missing action in "runrooted" action');
        }
        //Save root
        let oldRoot = Tools.getBase();
        //Reset to null root
        if (config.ignoreOldRoot === true) {
            Tools.setBase(null);
        }
        //Find new root
        let result = Tools.find(config);
        if (result.target !== null) {
            //Set new root
            Tools.setBase(result.target);
            //RUN
            await executeAction(config.action, params);
        }
        //Set old base back
        Tools.setBase(oldRoot);
    }
    async function ifAllowAllAction(config, consentTypes) {
        const allTrue = !Object.values(consentTypes).includes(false);
        if (allTrue) {
            await executeAction(config.trueAction, consentTypes);
        }
        else {
            await executeAction(config.falseAction, consentTypes);
        }
    }
    async function ifAllowNoneAction(config, consentTypes) {
        const allFalse = Object.values(consentTypes).includes(false);
        if (allFalse) {
            await executeAction(config.trueAction, consentTypes);
        }
        else {
            await executeAction(config.falseAction, consentTypes);
        }
    }
    async function waitCssAction(config) {
        await new Promise(resolve => {
            let numRetries = config.retries || 10;
            const waitTime = config.waitTime || 250;
            const checkCss = () => {
                const result = Tools.find(config);
                if ((config.negated && result.target) ||
                    (!config.negated && !result.target)) {
                    if (numRetries > 0) {
                        numRetries -= 1;
                        setTimeout(checkCss, waitTime);
                    }
                    else {
                        resolve();
                    }
                }
                else {
                    resolve();
                }
            };
            checkCss();
        });
    }
    async function forEachAction(config, param) {
        const results = Tools.find(config, true);
        const oldBase = Tools.base;
        for (const result of results) {
            if (result.target) {
                Tools.setBase(result.target);
                await executeAction(config.action, param);
            }
        }
        Tools.setBase(oldBase);
    }
    async function hideAction(config) {
        const result = Tools.find(config);
        if (result.target) {
            result.target.classList.add("Autoconsent-Hidden");
            // result.target.setAttribute("style", "display: none;");
        }
    }
    async function slideAction(config) {
        const result = Tools.find(config);
        const dragResult = Tools.find(config.dragTarget);
        if (result.target) {
            const targetBounds = result.target.getBoundingClientRect();
            const dragTargetBounds = dragResult.target.getBoundingClientRect();
            let yDiff = dragTargetBounds.top - targetBounds.top;
            let xDiff = dragTargetBounds.left - targetBounds.left;
            if (this.config.axis.toLowerCase() === "y") {
                xDiff = 0;
            }
            if (this.config.axis.toLowerCase() === "x") {
                yDiff = 0;
            }
            const screenX = window.screenX + targetBounds.left + targetBounds.width / 2.0;
            const screenY = window.screenY + targetBounds.top + targetBounds.height / 2.0;
            const clientX = targetBounds.left + targetBounds.width / 2.0;
            const clientY = targetBounds.top + targetBounds.height / 2.0;
            const mouseDown = document.createEvent("MouseEvents");
            mouseDown.initMouseEvent("mousedown", true, true, window, 0, screenX, screenY, clientX, clientY, false, false, false, false, 0, result.target);
            const mouseMove = document.createEvent("MouseEvents");
            mouseMove.initMouseEvent("mousemove", true, true, window, 0, screenX + xDiff, screenY + yDiff, clientX + xDiff, clientY + yDiff, false, false, false, false, 0, result.target);
            const mouseUp = document.createEvent("MouseEvents");
            mouseUp.initMouseEvent("mouseup", true, true, window, 0, screenX + xDiff, screenY + yDiff, clientX + xDiff, clientY + yDiff, false, false, false, false, 0, result.target);
            result.target.dispatchEvent(mouseDown);
            await this.waitTimeout(10);
            result.target.dispatchEvent(mouseMove);
            await this.waitTimeout(10);
            result.target.dispatchEvent(mouseUp);
        }
    }
    async function waitAction(config) {
        await waitTimeout(config.waitTime);
    }
    async function closeAction() {
        window.close();
    }
    async function evalAction(config) {
        console.log("eval!", config.code);
        return new Promise(resolve => {
            try {
                if (config.async) {
                    window.eval(config.code);
                    setTimeout(() => {
                        resolve(window.eval("window.__consentCheckResult"));
                    }, config.timeout || 250);
                }
                else {
                    resolve(window.eval(config.code));
                }
            }
            catch (e) {
                console.warn("eval error", e, config.code);
                resolve(false);
            }
        });
    }

    class ConsentOMaticCMP {
        constructor(name, config) {
            this.name = name;
            this.config = config;
            this.methods = new Map();
            this.runContext = defaultRunContext;
            this.isCosmetic = false;
            config.methods.forEach(methodConfig => {
                if (methodConfig.action) {
                    this.methods.set(methodConfig.name, methodConfig.action);
                }
            });
            this.hasSelfTest = false;
        }
        get isIntermediate() {
            return false; // TODO: support UTILITY rules
        }
        checkRunContext() {
            return true;
        }
        async detectCmp() {
            return this.config.detectors.some((detectorConfig) => {
                const presentMatchers = Array.isArray(detectorConfig.presentMatcher)
                    ? detectorConfig.presentMatcher
                    : [detectorConfig.presentMatcher].filter(Boolean);
                if (!presentMatchers.length) {
                    return false;
                }
                return presentMatchers.every(presentMatcher => !!matches(presentMatcher));
            });
        }
        async detectPopup() {
            return this.config.detectors.some(detectorConfig => {
                const showingMatchers = Array.isArray(detectorConfig.showingMatcher)
                    ? detectorConfig.showingMatcher
                    : [detectorConfig.showingMatcher].filter(Boolean);
                if (!showingMatchers.length) {
                    return true;
                }
                return showingMatchers.every((showingMatcher) => !!matches(showingMatcher));
            });
        }
        async executeAction(method, param) {
            if (this.methods.has(method)) {
                return executeAction(this.methods.get(method), param);
            }
            return true;
        }
        async optOut() {
            await this.executeAction("HIDE_CMP");
            await this.executeAction("OPEN_OPTIONS");
            await this.executeAction("HIDE_CMP");
            await this.executeAction("DO_CONSENT", []);
            await this.executeAction("SAVE_CONSENT", []);
            return true;
        }
        async optIn() {
            await this.executeAction("HIDE_CMP");
            await this.executeAction("OPEN_OPTIONS");
            await this.executeAction("HIDE_CMP");
            await this.executeAction("DO_CONSENT", ['D', 'A', 'B', 'E', 'F', 'X']);
            await this.executeAction("SAVE_CONSENT", ['D', 'A', 'B', 'E', 'F', 'X']);
            return true;
        }
        async openCmp() {
            await this.executeAction("HIDE_CMP");
            await this.executeAction("OPEN_OPTIONS");
            return true;
        }
        async test() {
            return true;
        }
    }

    function filterCMPs(rules, config) {
        return rules.filter((cmp) => {
            return ((!config.disabledCmps || !config.disabledCmps.includes(cmp.name)) // CMP is not disabled
                &&
                    (config.enableCosmeticRules || !cmp.isCosmetic) // CMP is not cosmetic or cosmetic rules are enabled
            );
        });
    }
    class AutoConsent {
        constructor(sendContentMessage, config = null, declarativeRules = null) {
            this.id = getRandomID();
            this.rules = [];
            this.foundCmp = null;
            this.state = {
                lifecycle: 'loading',
                prehideOn: false,
                findCmpAttempts: 0,
                detectedCmps: [],
                detectedPopups: [],
                selfTest: null,
            };
            evalState.sendContentMessage = sendContentMessage;
            this.sendContentMessage = sendContentMessage;
            this.rules = [...rules];
            this.updateState({ lifecycle: 'loading' });
            if (config) {
                this.initialize(config, declarativeRules);
            }
            else {
                if (declarativeRules) {
                    this.parseRules(declarativeRules);
                }
                const initMsg = {
                    type: "init",
                    url: window.location.href,
                };
                sendContentMessage(initMsg);
                this.updateState({ lifecycle: 'waitingForInitResponse' });
            }
        }
        initialize(config, declarativeRules) {
            this.config = config;
            if (!config.enabled) {
                return;
            }
            if (declarativeRules) {
                this.parseRules(declarativeRules);
            }
            this.rules = filterCMPs(this.rules, config);
            if (config.enablePrehide) {
                if (document.documentElement) {
                    this.prehideElements(); // prehide as early as possible to prevent flickering
                }
                else {
                    // we're injected really early
                    const delayedPrehide = () => {
                        window.removeEventListener('DOMContentLoaded', delayedPrehide);
                        this.prehideElements();
                    };
                    window.addEventListener('DOMContentLoaded', delayedPrehide);
                }
            }
            // start detection
            if (document.readyState === 'loading') {
                const onReady = () => {
                    window.removeEventListener('DOMContentLoaded', onReady);
                    this.start();
                };
                window.addEventListener('DOMContentLoaded', onReady);
            }
            else {
                this.start();
            }
            this.updateState({ lifecycle: 'initialized' });
        }
        parseRules(declarativeRules) {
            Object.keys(declarativeRules.consentomatic).forEach((name) => {
                this.addConsentomaticCMP(name, declarativeRules.consentomatic[name]);
            });
            declarativeRules.autoconsent.forEach((rule) => {
                this.addCMP(rule);
            });
        }
        addCMP(config) {
            this.rules.push(createAutoCMP(config));
        }
        addConsentomaticCMP(name, config) {
            this.rules.push(new ConsentOMaticCMP(`com_${name}`, config));
        }
        // start the detection process, possibly with a delay
        start() {
            if (window.requestIdleCallback) {
                window.requestIdleCallback(() => this._start(), { timeout: 500 });
            }
            else {
                this._start();
            }
        }
        async _start() {
            this.updateState({ lifecycle: 'started' });
            const foundCmps = await this.findCmp(this.config.detectRetries);
            this.updateState({ detectedCmps: foundCmps.map(c => c.name) });
            if (foundCmps.length === 0) {
                if (this.config.enablePrehide) {
                    this.undoPrehide();
                }
                this.updateState({ lifecycle: 'nothingDetected' });
                return false;
            }
            this.updateState({ lifecycle: 'cmpDetected' });
            // we resort to cosmetic rules only if no non-cosmetic rules are found
            let foundPopups = await this.detectPopups(foundCmps.filter(r => !r.isCosmetic));
            if (foundPopups.length === 0) {
                foundPopups = await this.detectPopups(foundCmps.filter(r => r.isCosmetic));
            }
            if (foundPopups.length === 0) {
                if (this.config.enablePrehide) {
                    this.undoPrehide();
                }
                return false;
            }
            this.updateState({ lifecycle: 'openPopupDetected' });
            if (foundPopups.length > 1) {
                const errorDetails = {
                    msg: `Found multiple CMPs, check the detection rules.`,
                    cmps: foundPopups.map((cmp) => cmp.name),
                };
                this.sendContentMessage({
                    type: 'autoconsentError',
                    details: errorDetails,
                });
            }
            this.foundCmp = foundPopups[0];
            if (this.config.autoAction === 'optOut') {
                return await this.doOptOut();
            }
            else if (this.config.autoAction === 'optIn') {
                return await this.doOptIn();
            }
            else {
                return true;
            }
        }
        async findCmp(retries) {
            this.updateState({ findCmpAttempts: this.state.findCmpAttempts + 1 });
            const foundCMPs = [];
            for (const cmp of this.rules) {
                try {
                    if (!cmp.checkRunContext()) {
                        continue;
                    }
                    const result = await cmp.detectCmp();
                    if (result) {
                        enableLogs && console.log(`Found CMP: ${cmp.name} ${window.location.href}`);
                        this.sendContentMessage({
                            type: 'cmpDetected',
                            url: location.href,
                            cmp: cmp.name,
                        }); // notify the browser
                        foundCMPs.push(cmp);
                    }
                }
                catch (e) {
                }
            }
            if (foundCMPs.length === 0 && retries > 0) {
                return new Promise((resolve) => {
                    setTimeout(async () => {
                        const result = this.findCmp(retries - 1);
                        resolve(result);
                    }, 500);
                });
            }
            return foundCMPs;
        }
        async detectPopups(cmps) {
            const result = [];
            const popupLookups = cmps.map((cmp) => this.waitForPopup(cmp).then((isOpen) => {
                if (isOpen) {
                    this.updateState({ detectedPopups: this.state.detectedPopups.concat([cmp.name]) });
                    this.sendContentMessage({
                        type: 'popupFound',
                        cmp: cmp.name,
                        url: location.href,
                    }); // notify the browser
                    result.push(cmp);
                }
            }).catch(() => null));
            await Promise.all(popupLookups);
            return result;
        }
        async doOptOut() {
            this.updateState({ lifecycle: 'runningOptOut' });
            let optOutResult;
            if (!this.foundCmp) {
                optOutResult = false;
            }
            else {
                optOutResult = await this.foundCmp.optOut();
            }
            if (this.config.enablePrehide) {
                this.undoPrehide();
            }
            this.sendContentMessage({
                type: 'optOutResult',
                cmp: this.foundCmp ? this.foundCmp.name : 'none',
                result: optOutResult,
                scheduleSelfTest: this.foundCmp && this.foundCmp.hasSelfTest,
                url: location.href,
            });
            if (optOutResult && !this.foundCmp.isIntermediate) {
                this.sendContentMessage({
                    type: 'autoconsentDone',
                    cmp: this.foundCmp.name,
                    isCosmetic: this.foundCmp.isCosmetic,
                    url: location.href,
                });
                this.updateState({ lifecycle: 'done' });
            }
            else {
                this.updateState({ lifecycle: optOutResult ? 'optOutSucceeded' : 'optOutFailed' });
            }
            return optOutResult;
        }
        async doOptIn() {
            this.updateState({ lifecycle: 'runningOptIn' });
            let optInResult;
            if (!this.foundCmp) {
                optInResult = false;
            }
            else {
                optInResult = await this.foundCmp.optIn();
            }
            if (this.config.enablePrehide) {
                this.undoPrehide();
            }
            this.sendContentMessage({
                type: 'optInResult',
                cmp: this.foundCmp ? this.foundCmp.name : 'none',
                result: optInResult,
                scheduleSelfTest: false,
                url: location.href,
            });
            if (optInResult && !this.foundCmp.isIntermediate) {
                this.sendContentMessage({
                    type: 'autoconsentDone',
                    cmp: this.foundCmp.name,
                    isCosmetic: this.foundCmp.isCosmetic,
                    url: location.href,
                });
                this.updateState({ lifecycle: 'done' });
            }
            else {
                this.updateState({ lifecycle: optInResult ? 'optInSucceeded' : 'optInFailed' });
            }
            return optInResult;
        }
        async doSelfTest() {
            let selfTestResult;
            if (!this.foundCmp) {
                selfTestResult = false;
            }
            else {
                selfTestResult = await this.foundCmp.test();
            }
            this.sendContentMessage({
                type: 'selfTestResult',
                cmp: this.foundCmp ? this.foundCmp.name : 'none',
                result: selfTestResult,
                url: location.href,
            });
            this.updateState({ selfTest: selfTestResult });
            return selfTestResult;
        }
        async waitForPopup(cmp, retries = 5, interval = 500) {
            const isOpen = await cmp.detectPopup();
            if (!isOpen && retries > 0) {
                return new Promise((resolve) => setTimeout(() => resolve(this.waitForPopup(cmp, retries - 1, interval)), interval));
            }
            return isOpen;
        }
        prehideElements() {
            // hide rules not specific to a single CMP rule
            const globalHidden = [
                "#didomi-popup,.didomi-popup-container,.didomi-popup-notice,.didomi-consent-popup-preferences,#didomi-notice,.didomi-popup-backdrop,.didomi-screen-medium",
            ];
            const selectors = this.rules.reduce((selectorList, rule) => {
                if (rule.prehideSelectors) {
                    return [...selectorList, ...rule.prehideSelectors];
                }
                return selectorList;
            }, globalHidden);
            this.updateState({ prehideOn: true });
            return prehide(selectors);
        }
        undoPrehide() {
            this.updateState({ prehideOn: false });
            return undoPrehide();
        }
        updateState(change) {
            Object.assign(this.state, change);
            this.sendContentMessage({
                type: 'report',
                instanceId: this.id,
                url: window.location.href,
                mainFrame: window.top === window.self,
                state: this.state,
            });
        }
        async receiveMessageCallback(message) {
            switch (message.type) {
                case 'initResp':
                    this.initialize(message.config, message.rules);
                    break;
                case 'optIn':
                    await this.doOptIn();
                    break;
                case 'optOut':
                    await this.doOptOut();
                    break;
                case 'selfTest':
                    await this.doSelfTest();
                    break;
                case 'evalResp':
                    resolveEval(message.id, message.result);
                    break;
            }
        }
    }

    const consent = new AutoConsent(chrome.runtime.sendMessage);
    chrome.runtime.onMessage.addListener((message) => {
        return Promise.resolve(consent.receiveMessageCallback(message));
    });
    chrome.runtime.connect({ name: `instance-${consent.id}` });

})();
