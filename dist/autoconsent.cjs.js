var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/web.ts
var web_exports = {};
__export(web_exports, {
  default: () => AutoConsent
});
module.exports = __toCommonJS(web_exports);

// lib/consentomatic/tools.ts
var _Tools = class _Tools {
  static getBase() {
    return _Tools.base;
  }
  static setBase(base) {
    _Tools.base = base;
  }
  static findElement(options, parent = null, multiple = false) {
    let possibleTargets = null;
    if (parent != null) {
      possibleTargets = Array.from(parent.querySelectorAll(options.selector));
    } else {
      if (_Tools.base != null) {
        possibleTargets = Array.from(
          _Tools.base.querySelectorAll(options.selector)
        );
      } else {
        possibleTargets = Array.from(
          document.querySelectorAll(options.selector)
        );
      }
    }
    if (options.textFilter != null) {
      possibleTargets = possibleTargets.filter((possibleTarget) => {
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
        } else if (options.textFilter != null) {
          return textContent.indexOf(options.textFilter.toLowerCase()) !== -1;
        }
      });
    }
    if (options.styleFilters != null) {
      possibleTargets = possibleTargets.filter((possibleTarget) => {
        const styles = window.getComputedStyle(possibleTarget);
        let keep = true;
        for (const styleFilter of options.styleFilters) {
          const option = styles[styleFilter.option];
          if (styleFilter.negated) {
            keep = keep && option !== styleFilter.value;
          } else {
            keep = keep && option === styleFilter.value;
          }
        }
        return keep;
      });
    }
    if (options.displayFilter != null) {
      possibleTargets = possibleTargets.filter((possibleTarget) => {
        if (options.displayFilter) {
          return possibleTarget.offsetHeight !== 0;
        } else {
          return possibleTarget.offsetHeight === 0;
        }
      });
    }
    if (options.iframeFilter != null) {
      possibleTargets = possibleTargets.filter(() => {
        if (options.iframeFilter) {
          return window.location !== window.parent.location;
        } else {
          return window.location === window.parent.location;
        }
      });
    }
    if (options.childFilter != null) {
      possibleTargets = possibleTargets.filter((possibleTarget) => {
        const oldBase = _Tools.base;
        _Tools.setBase(possibleTarget);
        const childResults = _Tools.find(options.childFilter);
        _Tools.setBase(oldBase);
        return childResults.target != null;
      });
    }
    if (multiple) {
      return possibleTargets;
    } else {
      if (possibleTargets.length > 1) {
        console.warn(
          "Multiple possible targets: ",
          possibleTargets,
          options,
          parent
        );
      }
      return possibleTargets[0];
    }
  }
  static find(options, multiple = false) {
    const results = [];
    if (options.parent != null) {
      const parent = _Tools.findElement(options.parent, null, multiple);
      if (parent != null) {
        if (parent instanceof Array) {
          parent.forEach((p) => {
            const targets = _Tools.findElement(options.target, p, multiple);
            if (targets instanceof Array) {
              targets.forEach((target) => {
                results.push({
                  parent: p,
                  target
                });
              });
            } else {
              results.push({
                parent: p,
                target: targets
              });
            }
          });
          return results;
        } else {
          const targets = _Tools.findElement(options.target, parent, multiple);
          if (targets instanceof Array) {
            targets.forEach((target) => {
              results.push({
                parent,
                target
              });
            });
          } else {
            results.push({
              parent,
              target: targets
            });
          }
        }
      }
    } else {
      const targets = _Tools.findElement(options.target, null, multiple);
      if (targets instanceof Array) {
        targets.forEach((target) => {
          results.push({
            parent: null,
            target
          });
        });
      } else {
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
    } else {
      if (results.length !== 1) {
        console.warn(
          "Multiple results found, even though multiple false",
          results
        );
      }
      return results[0];
    }
  }
};
_Tools.base = null;
var Tools = _Tools;

// lib/consentomatic/index.ts
function matches(config) {
  const result = Tools.find(config);
  if (config.type === "css") {
    return !!result.target;
  } else if (config.type === "checkbox") {
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
var STEP_TIMEOUT = 0;
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
    } else {
      if (shouldEnable) {
        await executeAction(consentConfig.trueAction);
      } else {
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
  } else {
    if (config.falseAction) {
      await executeAction(config.falseAction, param);
    }
  }
}
async function runrootedAction(config, params) {
  if (!config.action) {
    throw new Error('Missing action in "runrooted" action');
  }
  const oldRoot = Tools.getBase();
  if (config.ignoreOldRoot === true) {
    Tools.setBase(null);
  }
  const result = Tools.find(config);
  if (result.target !== null) {
    Tools.setBase(result.target);
    await executeAction(config.action, params);
  }
  Tools.setBase(oldRoot);
}
async function ifAllowAllAction(config, consentTypes) {
  const allTrue = !Object.values(consentTypes).includes(false);
  if (allTrue) {
    await executeAction(config.trueAction, consentTypes);
  } else {
    await executeAction(config.falseAction, consentTypes);
  }
}
async function ifAllowNoneAction(config, consentTypes) {
  const allFalse = Object.values(consentTypes).includes(false);
  if (allFalse) {
    await executeAction(config.trueAction, consentTypes);
  } else {
    await executeAction(config.falseAction, consentTypes);
  }
}
async function waitCssAction(config) {
  await new Promise((resolve) => {
    let numRetries = config.retries || 10;
    const waitTime = config.waitTime || 250;
    const checkCss = () => {
      const result = Tools.find(config);
      if (config.negated && result.target || !config.negated && !result.target) {
        if (numRetries > 0) {
          numRetries -= 1;
          setTimeout(checkCss, waitTime);
        } else {
          resolve();
        }
      } else {
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
    const screenX = window.screenX + targetBounds.left + targetBounds.width / 2;
    const screenY = window.screenY + targetBounds.top + targetBounds.height / 2;
    const clientX = targetBounds.left + targetBounds.width / 2;
    const clientY = targetBounds.top + targetBounds.height / 2;
    const mouseDown = document.createEvent("MouseEvents");
    mouseDown.initMouseEvent(
      "mousedown",
      true,
      true,
      window,
      0,
      screenX,
      screenY,
      clientX,
      clientY,
      false,
      false,
      false,
      false,
      0,
      result.target
    );
    const mouseMove = document.createEvent("MouseEvents");
    mouseMove.initMouseEvent(
      "mousemove",
      true,
      true,
      window,
      0,
      screenX + xDiff,
      screenY + yDiff,
      clientX + xDiff,
      clientY + yDiff,
      false,
      false,
      false,
      false,
      0,
      result.target
    );
    const mouseUp = document.createEvent("MouseEvents");
    mouseUp.initMouseEvent(
      "mouseup",
      true,
      true,
      window,
      0,
      screenX + xDiff,
      screenY + yDiff,
      clientX + xDiff,
      clientY + yDiff,
      false,
      false,
      false,
      false,
      0,
      result.target
    );
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
  return new Promise((resolve) => {
    try {
      if (config.async) {
        window.eval(config.code);
        setTimeout(() => {
          resolve(window.eval("window.__consentCheckResult"));
        }, config.timeout || 250);
      } else {
        resolve(window.eval(config.code));
      }
    } catch (e) {
      console.warn("eval error", e, config.code);
      resolve(false);
    }
  });
}

// lib/config.ts
var enableLogs = false;

// lib/utils.ts
function getStyleElement(styleOverrideElementId = "autoconsent-css-rules") {
  const styleSelector = `style#${styleOverrideElementId}`;
  const existingElement = document.querySelector(styleSelector);
  if (existingElement && existingElement instanceof HTMLStyleElement) {
    return existingElement;
  } else {
    const parent = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
    const css = document.createElement("style");
    css.id = styleOverrideElementId;
    parent.appendChild(css);
    return css;
  }
}
function hideElements(styleEl, selectors, method = "display") {
  const hidingSnippet = method === "opacity" ? `opacity: 0` : `display: none`;
  const rule = `${selectors.join(
    ","
  )} { ${hidingSnippet} !important; z-index: -1 !important; pointer-events: none !important; } `;
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
  } else {
    const css = window.getComputedStyle(elem);
    if (css.position === "fixed" && css.display !== "none") {
      return true;
    }
  }
  return false;
}

// lib/rule-executors.ts
function click(selector, all = false) {
  const elem = elementSelector(selector);
  enableLogs && console.log("[click]", selector, all, elem);
  if (elem.length > 0) {
    if (all) {
      elem.forEach((e) => e.click());
    } else {
      elem[0].click();
    }
  }
  return elem.length > 0;
}
function elementExists(selector) {
  const exists = elementSelector(selector).length > 0;
  return exists;
}
function elementVisible(selector, check) {
  const elem = elementSelector(selector);
  const results = new Array(elem.length);
  elem.forEach((e, i) => {
    results[i] = isElementVisible(e);
  });
  if (check === "none") {
    return results.every((r) => !r);
  } else if (results.length === 0) {
    return false;
  } else if (check === "any") {
    return results.some((r) => r);
  }
  return results.every((r) => r);
}
function waitForElement(selector, timeout = 1e4) {
  const interval = 200;
  const times = Math.ceil(timeout / interval);
  enableLogs && console.log("[waitForElement]", selector);
  return waitFor(
    () => elementSelector(selector).length > 0,
    times,
    interval
  );
}
function waitForVisible(selector, timeout = 1e4, check = "any") {
  const interval = 200;
  const times = Math.ceil(timeout / interval);
  return waitFor(
    () => elementVisible(selector, check),
    times,
    interval
  );
}
async function waitForThenClick2(selector, timeout = 1e4, all = false) {
  await waitForElement(selector, timeout);
  return click(selector, all);
}
function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}
function hide(selectors, method) {
  const styleEl = getStyleElement();
  return hideElements(styleEl, selectors, method);
}
function prehide(selectors) {
  const styleEl = getStyleElement("autoconsent-prehide");
  enableLogs && console.log("[prehide]", styleEl, location.href);
  return hideElements(styleEl, selectors, "opacity");
}
function undoPrehide() {
  const existingElement = getStyleElement("autoconsent-prehide");
  enableLogs && console.log("[undoprehide]", existingElement, location.href);
  if (existingElement) {
    existingElement.remove();
  }
  return !!existingElement;
}
function querySingleReplySelector(selector, parent = document) {
  if (selector.startsWith("aria/")) {
    return [];
  }
  if (selector.startsWith("xpath/")) {
    const xpath = selector.slice(6);
    const result = document.evaluate(xpath, parent, null, XPathResult.ANY_TYPE, null);
    let node = null;
    const elements = [];
    while (node = result.iterateNext()) {
      elements.push(node);
    }
    return elements;
  }
  if (selector.startsWith("text/")) {
    return [];
  }
  if (selector.startsWith("pierce/")) {
    return [];
  }
  if (parent.shadowRoot) {
    return Array.from(parent.shadowRoot.querySelectorAll(selector));
  }
  return Array.from(parent.querySelectorAll(selector));
}
function querySelectorChain(selectors) {
  let parent = document;
  let matches2;
  for (const selector of selectors) {
    matches2 = querySingleReplySelector(selector, parent);
    if (matches2.length === 0) {
      return [];
    }
    parent = matches2[0];
  }
  return matches2;
}
function elementSelector(selector) {
  if (typeof selector === "string") {
    return querySingleReplySelector(selector);
  }
  return querySelectorChain(selector);
}

// lib/random.ts
function getRandomID() {
  if (crypto && typeof crypto.randomUUID !== "undefined") {
    return crypto.randomUUID();
  }
  return Math.random().toString();
}

// lib/eval-handler.ts
var Deferred = class {
  constructor(id, timeout = 1e3) {
    this.id = id;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    this.timer = window.setTimeout(() => {
      this.reject(new Error("timeout"));
    }, timeout);
  }
};
var evalState = {
  pending: /* @__PURE__ */ new Map(),
  sendContentMessage: null
};
function requestEval(code) {
  const id = getRandomID();
  evalState.sendContentMessage({
    type: "eval",
    id,
    code
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
  } else {
    console.warn("no eval #", id);
  }
}

// lib/eval-snippets.ts
var snippets = {
  // code-based rules
  EVAL_0: () => console.log(1),
  EVAL_CONSENTMANAGER_1: () => window.__cmp && typeof __cmp("getCMPData") === "object",
  EVAL_CONSENTMANAGER_2: () => !__cmp("consentStatus").userChoiceExists,
  EVAL_CONSENTMANAGER_3: () => __cmp("setConsent", 0),
  EVAL_CONSENTMANAGER_4: () => __cmp("setConsent", 1),
  EVAL_CONSENTMANAGER_5: () => __cmp("consentStatus").userChoiceExists,
  EVAL_COOKIEBOT_1: () => !!window.Cookiebot,
  EVAL_COOKIEBOT_2: () => !window.Cookiebot.hasResponse && window.Cookiebot.dialog?.visible === true,
  EVAL_COOKIEBOT_3: () => window.Cookiebot.withdraw() || true,
  EVAL_COOKIEBOT_4: () => window.Cookiebot.hide() || true,
  EVAL_COOKIEBOT_5: () => window.Cookiebot.declined === true,
  EVAL_KLARO_1: () => klaro.getManager().config.services.every((c) => c.required || !klaro.getManager().consents[c.name]),
  EVAL_ONETRUST_1: () => window.OnetrustActiveGroups.split(",").filter((s) => s.length > 0).length <= 1,
  EVAL_TRUSTARC_TOP: () => window && window.truste && window.truste.eu.bindMap.prefCookie === "0",
  // declarative rules
  EVAL_ADROLL_0: () => !document.cookie.includes("__adroll_fpc"),
  EVAL_ALMACMP_0: () => document.cookie.includes('"name":"Google","consent":false'),
  EVAL_AFFINITY_SERIF_COM_0: () => document.cookie.includes("serif_manage_cookies_viewed") && !document.cookie.includes("serif_allow_analytics"),
  EVAL_AXEPTIO_0: () => document.cookie.includes("axeptio_authorized_vendors=%2C%2C"),
  EVAL_BING_0: () => document.cookie.includes("AL=0") && document.cookie.includes("AD=0") && document.cookie.includes("SM=0"),
  EVAL_BLOCKSY_0: () => document.cookie.includes("blocksy_cookies_consent_accepted=no"),
  EVAL_BORLABS_0: () => !JSON.parse(decodeURIComponent(document.cookie.split(";").find((c) => c.indexOf("borlabs-cookie") !== -1).split("=", 2)[1])).consents.statistics,
  EVAL_BUNDESREGIERUNG_DE_0: () => document.cookie.match("cookie-allow-tracking=0"),
  EVAL_CANVA_0: () => !document.cookie.includes("gtm_fpc_engagement_event"),
  EVAL_CC_BANNER2_0: () => !!document.cookie.match(/sncc=[^;]+D%3Dtrue/),
  EVAL_CLICKIO_0: () => document.cookie.includes("__lxG__consent__v2_daisybit="),
  EVAL_CLINCH_0: () => document.cookie.includes("ctc_rejected=1"),
  EVAL_COINBASE_0: () => JSON.parse(decodeURIComponent(document.cookie.match(/cm_(eu|default)_preferences=([0-9a-zA-Z\\{\\}\\[\\]%:]*);?/)[2])).consent.length <= 1,
  EVAL_COMPLIANZ_BANNER_0: () => document.cookie.includes("cmplz_banner-status=dismissed"),
  EVAL_COMPLIANZ_CATEGORIES_0: () => !!document.cookie.match(/cmplz_[^=]+=deny/),
  EVAL_COMPLIANZ_OPTIN_0: () => !!document.cookie.match(/cookieconsent_preferences_disabled=[^;]+/),
  EVAL_COOKIE_LAW_INFO_0: () => CLI.disableAllCookies() || CLI.reject_close() || true,
  EVAL_COOKIE_LAW_INFO_1: () => document.cookie.indexOf("cookielawinfo-checkbox-non-necessary=yes") === -1,
  EVAL_COOKIE_MANAGER_POPUP_0: () => JSON.parse(document.cookie.split(";").find((c) => c.trim().startsWith("CookieLevel")).split("=")[1]).social === false,
  EVAL_COOKIEALERT_0: () => document.querySelector("body").removeAttribute("style") || true,
  EVAL_COOKIEALERT_1: () => document.querySelector("body").removeAttribute("style") || true,
  EVAL_COOKIEALERT_2: () => window.CookieConsent.declined === true,
  EVAL_COOKIEFIRST_0: () => ((o) => o.performance === false && o.functional === false && o.advertising === false)(JSON.parse(decodeURIComponent(document.cookie.split(";").find((c) => c.indexOf("cookiefirst") !== -1).trim()).split("=")[1])),
  EVAL_COOKIEFIRST_1: () => document.querySelectorAll("button[data-cookiefirst-accent-color=true][role=checkbox]:not([disabled])").forEach((i) => i.getAttribute("aria-checked") == "true" && i.click()) || true,
  EVAL_COOKIEINFORMATION_0: () => CookieInformation.declineAllCategories() || true,
  EVAL_COOKIEINFORMATION_1: () => CookieInformation.submitAllCategories() || true,
  EVAL_COOKIEINFORMATION_2: () => document.cookie.includes("CookieInformationConsent="),
  EVAL_COOKIEYES_0: () => document.cookie.includes("advertisement:no"),
  EVAL_DAILYMOTION_0: () => !!document.cookie.match("dm-euconsent-v2"),
  EVAL_DSGVO_0: () => !document.cookie.includes("sp_dsgvo_cookie_settings"),
  EVAL_DUNELM_0: () => document.cookie.includes("cc_functional=0") && document.cookie.includes("cc_targeting=0"),
  EVAL_ETSY_0: () => document.querySelectorAll(".gdpr-overlay-body input").forEach((toggle) => {
    toggle.checked = false;
  }) || true,
  EVAL_ETSY_1: () => document.querySelector(".gdpr-overlay-view button[data-wt-overlay-close]").click() || true,
  EVAL_EU_COOKIE_COMPLIANCE_0: () => document.cookie.indexOf("cookie-agreed=2") === -1,
  EVAL_EU_COOKIE_LAW_0: () => !document.cookie.includes("euCookie"),
  EVAL_EZOIC_0: () => ezCMP.handleAcceptAllClick(),
  EVAL_EZOIC_1: () => !!document.cookie.match(/ezCMPCookieConsent=[^;]+\|2=0\|3=0\|4=0/),
  EVAL_GOOGLE_0: () => !!document.cookie.match(/SOCS=CAE/),
  EVAL_IUBENDA_0: () => document.querySelectorAll(".purposes-item input[type=checkbox]:not([disabled])").forEach((x) => {
    if (x.checked)
      x.click();
  }) || true,
  EVAL_IUBENDA_1: () => !!document.cookie.match(/_iub_cs-\d+=/),
  EVAL_JQUERY_COOKIEBAR_0: () => !document.cookie.includes("cookies-state=accepted"),
  EVAL_MEDIAVINE_0: () => document.querySelectorAll('[data-name="mediavine-gdpr-cmp"] input[type=checkbox]').forEach((x) => x.checked && x.click()) || true,
  EVAL_MICROSOFT_0: () => Array.from(document.querySelectorAll("div > button")).filter((el) => el.innerText.match("Reject|Ablehnen"))[0].click() || true,
  EVAL_MICROSOFT_1: () => Array.from(document.querySelectorAll("div > button")).filter((el) => el.innerText.match("Accept|Annehmen"))[0].click() || true,
  EVAL_MICROSOFT_2: () => !!document.cookie.match("MSCC"),
  EVAL_MOOVE_0: () => document.querySelectorAll("#moove_gdpr_cookie_modal input").forEach((i) => {
    if (!i.disabled && i.name !== "moove_gdpr_strict_cookies")
      i.checked = false;
  }) || true,
  EVAL_ONENINETWO_0: () => document.cookie.includes("CC_ADVERTISING=NO") && document.cookie.includes("CC_ANALYTICS=NO"),
  EVAL_OPERA_0: () => document.cookie.includes("cookie_consent_essential=true") && !document.cookie.includes("cookie_consent_marketing=true"),
  EVAL_PAYPAL_0: () => document.cookie.includes("cookie_prefs") === true,
  EVAL_PRIMEBOX_0: () => !document.cookie.includes("cb-enabled=accepted"),
  EVAL_PUBTECH_0: () => document.cookie.includes("euconsent-v2") && (document.cookie.match(/.YAAAAAAAAAAA/) || document.cookie.match(/.aAAAAAAAAAAA/) || document.cookie.match(/.YAAACFgAAAAA/)),
  EVAL_REDDIT_0: () => document.cookie.includes("eu_cookie={%22opted%22:true%2C%22nonessential%22:false}"),
  EVAL_SIBBO_0: () => !!window.localStorage.getItem("euconsent-v2"),
  EVAL_SIRDATA_0: () => document.cookie.includes("euconsent-v2"),
  EVAL_SNIGEL_0: () => !!document.cookie.match("snconsent"),
  EVAL_STEAMPOWERED_0: () => JSON.parse(decodeURIComponent(document.cookie.split(";").find((s) => s.trim().startsWith("cookieSettings")).split("=")[1])).preference_state === 2,
  EVAL_TAKEALOT_0: () => document.body.classList.remove("freeze") || (document.body.style = "") || true,
  EVAL_TARTEAUCITRON_0: () => tarteaucitron.userInterface.respondAll(false) || true,
  EVAL_TARTEAUCITRON_1: () => tarteaucitron.userInterface.respondAll(true) || true,
  EVAL_TARTEAUCITRON_2: () => document.cookie.match(/tarteaucitron=[^;]*/)[0].includes("false"),
  EVAL_TEALIUM_0: () => typeof window.utag !== "undefined" && typeof utag.gdpr === "object",
  EVAL_TEALIUM_1: () => utag.gdpr.setConsentValue(false) || true,
  EVAL_TEALIUM_2: () => utag.gdpr.setConsentValue(true) || true,
  EVAL_TEALIUM_3: () => utag.gdpr.getConsentState() !== 1,
  EVAL_TESTCMP_0: () => window.results.results[0] === "button_clicked",
  EVAL_TESTCMP_COSMETIC_0: () => window.results.results[0] === "banner_hidden",
  EVAL_THEFREEDICTIONARY_0: () => cmpUi.showPurposes() || cmpUi.rejectAll() || true,
  EVAL_THEFREEDICTIONARY_1: () => cmpUi.allowAll() || true,
  EVAL_THEVERGE_0: () => document.cookie.includes("_duet_gdpr_acknowledged=1"),
  EVAL_UBUNTU_COM_0: () => document.cookie === "_cookies_accepted=essential",
  EVAL_UK_COOKIE_CONSENT_0: () => !document.cookie.includes("catAccCookies"),
  EVAL_USERCENTRICS_API_0: () => typeof UC_UI === "object",
  EVAL_USERCENTRICS_API_1: () => !!UC_UI.closeCMP(),
  EVAL_USERCENTRICS_API_2: () => !!UC_UI.denyAllConsents(),
  EVAL_USERCENTRICS_API_3: () => !!UC_UI.acceptAllConsents(),
  EVAL_USERCENTRICS_API_4: () => !!UC_UI.closeCMP(),
  EVAL_USERCENTRICS_API_5: () => UC_UI.areAllConsentsAccepted() === true,
  EVAL_USERCENTRICS_API_6: () => UC_UI.areAllConsentsAccepted() === false,
  EVAL_USERCENTRICS_BUTTON_0: () => JSON.parse(localStorage.getItem("usercentrics")).consents.every((c) => c.isEssential || !c.consentStatus),
  EVAL_WAITROSE_0: () => Array.from(document.querySelectorAll("label[id$=cookies-deny-label]")).forEach((e) => e.click()) || true,
  EVAL_WAITROSE_1: () => document.cookie.includes("wtr_cookies_advertising=0") && document.cookie.includes("wtr_cookies_analytics=0"),
  EVAL_WP_COOKIE_NOTICE_0: () => document.cookie.includes("wpl_viewed_cookie=no"),
  EVAL_XING_0: () => document.cookie.includes("userConsent=%7B%22marketing%22%3Afalse"),
  EVAL_YOUTUBE_DESKTOP_0: () => !!document.cookie.match(/SOCS=CAE/),
  EVAL_YOUTUBE_MOBILE_0: () => !!document.cookie.match(/SOCS=CAE/)
};
function getFunctionBody(snippetFunc) {
  const snippetStr = snippetFunc.toString();
  return snippetStr.substring(snippetStr.indexOf("=>") + 2);
}

// lib/cmps/base.ts
var defaultRunContext = {
  main: true,
  frame: false,
  urlPattern: ""
};
var AutoConsentCMPBase = class {
  constructor(autoconsentInstance) {
    this.runContext = defaultRunContext;
    this.autoconsent = autoconsentInstance;
  }
  get hasSelfTest() {
    throw new Error("Not Implemented");
  }
  get isIntermediate() {
    throw new Error("Not Implemented");
  }
  get isCosmetic() {
    throw new Error("Not Implemented");
  }
  mainWorldEval(snippetId) {
    const snippet = snippets[snippetId];
    if (!snippet) {
      console.warn("Snippet not found", snippetId);
      return Promise.resolve(false);
    }
    if (this.autoconsent.config.isMainWorld) {
      enableLogs && console.log("inline eval:", snippetId, snippet);
      let result = false;
      try {
        result = !!snippet.call(globalThis);
      } catch (e) {
        enableLogs && console.error("error evaluating rule", snippetId, e);
      }
      return Promise.resolve(result);
    }
    const snippetSrc = getFunctionBody(snippet);
    enableLogs && console.log("async eval:", snippetId, snippetSrc);
    return requestEval(snippetSrc).catch((e) => {
      enableLogs && console.error("error evaluating rule", snippetId, e);
      return false;
    });
  }
  checkRunContext() {
    const runCtx = {
      ...defaultRunContext,
      ...this.runContext
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
    throw new Error("Not Implemented");
  }
  async detectPopup() {
    return false;
  }
  optOut() {
    throw new Error("Not Implemented");
  }
  optIn() {
    throw new Error("Not Implemented");
  }
  openCmp() {
    throw new Error("Not Implemented");
  }
  async test() {
    return Promise.resolve(true);
  }
};
var AutoConsentCMP = class extends AutoConsentCMPBase {
  constructor(config, autoconsentInstance) {
    super(autoconsentInstance);
    this.config = config;
    this.name = config.name;
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
      return this._runRulesParallel(this.config.detectCmp);
    }
    return false;
  }
  async detectPopup() {
    if (this.config.detectPopup) {
      return this._runRulesSequentially(this.config.detectPopup);
    }
    return false;
  }
  async optOut() {
    if (this.config.optOut) {
      enableLogs && console.log("Initiated optOut()", this.config.optOut);
      return this._runRulesSequentially(this.config.optOut);
    }
    return false;
  }
  async optIn() {
    if (this.config.optIn) {
      enableLogs && console.log("Initiated optIn()", this.config.optIn);
      return this._runRulesSequentially(this.config.optIn);
    }
    return false;
  }
  async openCmp() {
    if (this.config.openCmp) {
      return this._runRulesSequentially(this.config.openCmp);
    }
    return false;
  }
  async test() {
    if (this.hasSelfTest) {
      return this._runRulesSequentially(this.config.test);
    }
    return super.test();
  }
  async evaluateRuleStep(rule) {
    const results = [];
    if (rule.exists) {
      results.push(elementExists(rule.exists));
    }
    if (rule.visible) {
      results.push(elementVisible(rule.visible, rule.check));
    }
    if (rule.eval) {
      const res = this.mainWorldEval(rule.eval);
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
      results.push(waitForThenClick2(rule.waitForThenClick, rule.timeout, rule.all));
    }
    if (rule.wait) {
      results.push(wait(rule.wait));
    }
    if (rule.hide) {
      results.push(hide(rule.hide, rule.method));
    }
    if (rule.if) {
      if (!rule.if.exists && !rule.if.visible) {
        console.error("invalid conditional rule", rule.if);
        return false;
      }
      const condition = await this.evaluateRuleStep(rule.if);
      enableLogs && console.log("Condition is", condition);
      if (condition) {
        results.push(this._runRulesSequentially(rule.then));
      } else if (rule.else) {
        results.push(this._runRulesSequentially(rule.else));
      }
    }
    if (rule.any) {
      for (const step of rule.any) {
        if (await this.evaluateRuleStep(step)) {
          return true;
        }
      }
      return false;
    }
    if (results.length === 0) {
      enableLogs && console.warn("Unrecognized rule", rule);
      return false;
    }
    const all = await Promise.all(results);
    return all.reduce((a, b) => a && b, true);
  }
  async _runRulesParallel(rules) {
    const results = rules.map((rule) => this.evaluateRuleStep(rule));
    const detections = await Promise.all(results);
    return detections.every((r) => !!r);
  }
  async _runRulesSequentially(rules) {
    for (const rule of rules) {
      enableLogs && console.log("Running rule...", rule);
      const result = await this.evaluateRuleStep(rule);
      enableLogs && console.log("...rule result", result);
      if (!result && !rule.optional) {
        return false;
      }
    }
    return true;
  }
};

// lib/cmps/consentomatic.ts
var ConsentOMaticCMP = class {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.methods = /* @__PURE__ */ new Map();
    this.runContext = defaultRunContext;
    this.isCosmetic = false;
    config.methods.forEach((methodConfig) => {
      if (methodConfig.action) {
        this.methods.set(methodConfig.name, methodConfig.action);
      }
    });
    this.hasSelfTest = false;
  }
  get isIntermediate() {
    return false;
  }
  checkRunContext() {
    return true;
  }
  async detectCmp() {
    return this.config.detectors.some((detectorConfig) => {
      const presentMatchers = Array.isArray(detectorConfig.presentMatcher) ? detectorConfig.presentMatcher : [detectorConfig.presentMatcher].filter(Boolean);
      if (!presentMatchers.length) {
        return false;
      }
      return presentMatchers.every(
        (presentMatcher) => !!matches(presentMatcher)
      );
    });
  }
  async detectPopup() {
    return this.config.detectors.some((detectorConfig) => {
      const showingMatchers = Array.isArray(detectorConfig.showingMatcher) ? detectorConfig.showingMatcher : [detectorConfig.showingMatcher].filter(Boolean);
      if (!showingMatchers.length) {
        return true;
      }
      return showingMatchers.every(
        (showingMatcher) => !!matches(showingMatcher)
      );
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
    await this.executeAction("DO_CONSENT", ["D", "A", "B", "E", "F", "X"]);
    await this.executeAction("SAVE_CONSENT", ["D", "A", "B", "E", "F", "X"]);
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
};

// lib/cmps/trustarc-top.ts
var cookieSettingsButton = "#truste-show-consent";
var shortcutOptOut = "#truste-consent-required";
var shortcutOptIn = "#truste-consent-button";
var popupContent = "#truste-consent-content";
var bannerOverlay = "#trustarc-banner-overlay";
var bannerContainer = "#truste-consent-track";
var TrustArcTop = class extends AutoConsentCMPBase {
  constructor(autoconsentInstance) {
    super(autoconsentInstance);
    this.name = "TrustArc-top";
    this.prehideSelectors = [
      ".trustarc-banner-container",
      `.truste_popframe,.truste_overlay,.truste_box_overlay,${bannerContainer}`
    ];
    this.runContext = {
      main: true,
      frame: false
    };
    this._shortcutButton = null;
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
      this._shortcutButton = document.querySelector(shortcutOptOut);
    }
    return result;
  }
  async detectPopup() {
    return elementVisible(`${popupContent},${bannerOverlay},${bannerContainer}`, "all");
  }
  openFrame() {
    click(cookieSettingsButton);
  }
  async optOut() {
    if (this._shortcutButton) {
      this._shortcutButton.click();
      return true;
    }
    hideElements(
      getStyleElement(),
      [".truste_popframe", ".truste_overlay", ".truste_box_overlay", bannerContainer]
    );
    click(cookieSettingsButton);
    setTimeout(() => {
      getStyleElement().remove();
    }, 1e4);
    return true;
  }
  async optIn() {
    this._optInDone = true;
    return click(shortcutOptIn);
  }
  async openCmp() {
    return true;
  }
  async test() {
    return await this.mainWorldEval("EVAL_TRUSTARC_TOP");
  }
};

// lib/cmps/trustarc-frame.ts
var TrustArcFrame = class extends AutoConsentCMPBase {
  constructor() {
    super(...arguments);
    this.name = "TrustArc-frame";
    this.runContext = {
      main: false,
      frame: true,
      urlPattern: "^https://consent-pref\\.trustarc\\.com/\\?"
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
    return elementVisible("#defaultpreferencemanager", "any") && elementVisible(".mainContent", "any");
  }
  async navigateToSettings() {
    await waitFor(
      async () => {
        return elementExists(".shp") || elementVisible(".advance", "any") || elementExists(".switch span:first-child");
      },
      10,
      500
    );
    if (elementExists(".shp")) {
      click(".shp");
    }
    await waitForElement(".prefPanel", 5e3);
    if (elementVisible(".advance", "any")) {
      click(".advance");
    }
    return await waitFor(
      () => elementVisible(".switch span:first-child", "any"),
      5,
      1e3
    );
  }
  async optOut() {
    await waitFor(() => document.readyState === "complete", 20, 100);
    await waitForElement(".mainContent[aria-hidden=false]", 5e3);
    if (click(".rejectAll")) {
      return true;
    }
    if (elementExists(".prefPanel")) {
      await waitForElement('.prefPanel[style="visibility: visible;"]', 3e3);
    }
    if (click("#catDetails0")) {
      click(".submit");
      waitForThenClick("#gwt-debug-close_id", 5e3);
      return true;
    }
    if (click(".required")) {
      waitForThenClick("#gwt-debug-close_id", 5e3);
      return true;
    }
    await this.navigateToSettings();
    click(".switch span:nth-child(1):not(.active)", true);
    click(".submit");
    waitForThenClick("#gwt-debug-close_id", 3e5);
    return true;
  }
  async optIn() {
    if (click(".call")) {
      return true;
    }
    await this.navigateToSettings();
    click(".switch span:nth-child(2)", true);
    click(".submit");
    waitForElement("#gwt-debug-close_id", 3e5).then(() => {
      click("#gwt-debug-close_id");
    });
    return true;
  }
};

// lib/cmps/cookiebot.ts
var Cookiebot = class extends AutoConsentCMPBase {
  constructor() {
    super(...arguments);
    this.name = "Cybotcookiebot";
    this.prehideSelectors = ["#CybotCookiebotDialog,#CybotCookiebotDialogBodyUnderlay,#dtcookie-container,#cookiebanner,#cb-cookieoverlay,.modal--cookie-banner,#cookiebanner_outer,#CookieBanner"];
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
    return await this.mainWorldEval("EVAL_COOKIEBOT_1");
  }
  async detectPopup() {
    return await waitFor(() => {
      return this.mainWorldEval("EVAL_COOKIEBOT_2");
    }, 10, 500);
  }
  async optOut() {
    await wait(500);
    let res = await this.mainWorldEval("EVAL_COOKIEBOT_3");
    await wait(500);
    res = res && await this.mainWorldEval("EVAL_COOKIEBOT_4");
    return res;
  }
  async optIn() {
    if (elementExists("#dtcookie-container")) {
      return click(".h-dtcookie-accept");
    }
    click(".CybotCookiebotDialogBodyLevelButton:not(:checked):enabled", true);
    click("#CybotCookiebotDialogBodyLevelButtonAccept");
    click("#CybotCookiebotDialogBodyButtonAccept");
    return true;
  }
  async test() {
    await wait(500);
    return await this.mainWorldEval("EVAL_COOKIEBOT_5");
  }
};

// lib/cmps/sourcepoint-frame.ts
var SourcePoint = class extends AutoConsentCMPBase {
  constructor() {
    super(...arguments);
    this.name = "Sourcepoint-frame";
    this.prehideSelectors = ["div[id^='sp_message_container_'],.message-overlay", "#sp_privacy_manager_container"];
    this.ccpaNotice = false;
    this.ccpaPopup = false;
    this.runContext = {
      main: false,
      frame: true
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
    const url = new URL(location.href);
    if (url.searchParams.has("message_id") && url.hostname === "ccpa-notice.sp-prod.net") {
      this.ccpaNotice = true;
      return true;
    }
    if (url.hostname === "ccpa-pm.sp-prod.net") {
      this.ccpaPopup = true;
      return true;
    }
    return (url.pathname === "/index.html" || url.pathname === "/privacy-manager/index.html" || url.pathname === "/ccpa_pm/index.html") && (url.searchParams.has("message_id") || url.searchParams.has("requestUUID") || url.searchParams.has("consentUUID"));
  }
  async detectPopup() {
    if (this.ccpaNotice) {
      return true;
    }
    if (this.ccpaPopup) {
      return await waitForElement(".priv-save-btn", 2e3);
    }
    await waitForElement(".sp_choice_type_11,.sp_choice_type_12,.sp_choice_type_13,.sp_choice_type_ACCEPT_ALL,.sp_choice_type_SAVE_AND_EXIT", 2e3);
    return !elementExists(".sp_choice_type_9");
  }
  async optIn() {
    await waitForElement(".sp_choice_type_11,.sp_choice_type_ACCEPT_ALL", 2e3);
    if (click(".sp_choice_type_11")) {
      return true;
    }
    if (click(".sp_choice_type_ACCEPT_ALL")) {
      return true;
    }
    return false;
  }
  isManagerOpen() {
    return location.pathname === "/privacy-manager/index.html" || location.pathname === "/ccpa_pm/index.html";
  }
  async optOut() {
    if (this.ccpaPopup) {
      const toggles = document.querySelectorAll(".priv-purpose-container .sp-switch-arrow-block a.neutral.on .right");
      for (const t of toggles) {
        t.click();
      }
      const switches = document.querySelectorAll(".priv-purpose-container .sp-switch-arrow-block a.switch-bg.on");
      for (const t of switches) {
        t.click();
      }
      return click(".priv-save-btn");
    }
    if (!this.isManagerOpen()) {
      const actionable = await waitForElement(".sp_choice_type_12,.sp_choice_type_13");
      if (!actionable) {
        return false;
      }
      if (!elementExists(".sp_choice_type_12")) {
        return click(".sp_choice_type_13");
      }
      click(".sp_choice_type_12");
      await waitFor(
        () => this.isManagerOpen(),
        200,
        100
      );
    }
    await waitForElement(".type-modal", 2e4);
    waitForThenClick2(".ccpa-stack .pm-switch[aria-checked=true] .slider", 500, true);
    try {
      const rejectSelector1 = ".sp_choice_type_REJECT_ALL";
      const rejectSelector2 = ".reject-toggle";
      const path = await Promise.race([
        waitForElement(rejectSelector1, 2e3).then((success) => success ? 0 : -1),
        waitForElement(rejectSelector2, 2e3).then((success) => success ? 1 : -1),
        waitForElement(".pm-features", 2e3).then((success) => success ? 2 : -1)
      ]);
      if (path === 0) {
        await wait(1e3);
        return click(rejectSelector1);
      } else if (path === 1) {
        click(rejectSelector2);
      } else if (path === 2) {
        await waitForElement(".pm-features", 1e4);
        click(".checked > span", true);
        click(".chevron");
      }
    } catch (e) {
      enableLogs && console.warn(e);
    }
    return click(".sp_choice_type_SAVE_AND_EXIT");
  }
};

// lib/cmps/consentmanager.ts
var ConsentManager = class extends AutoConsentCMPBase {
  constructor() {
    super(...arguments);
    this.name = "consentmanager.net";
    this.prehideSelectors = ["#cmpbox,#cmpbox2"];
    this.apiAvailable = false;
  }
  get hasSelfTest() {
    return this.apiAvailable;
  }
  get isIntermediate() {
    return false;
  }
  get isCosmetic() {
    return false;
  }
  async detectCmp() {
    this.apiAvailable = await this.mainWorldEval("EVAL_CONSENTMANAGER_1");
    if (!this.apiAvailable) {
      return elementExists("#cmpbox");
    } else {
      return true;
    }
  }
  async detectPopup() {
    if (this.apiAvailable) {
      await wait(500);
      return await this.mainWorldEval("EVAL_CONSENTMANAGER_2");
    }
    return elementVisible("#cmpbox .cmpmore", "any");
  }
  async optOut() {
    await wait(500);
    if (this.apiAvailable) {
      return await this.mainWorldEval("EVAL_CONSENTMANAGER_3");
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
    await waitForElement(".cmptblbox", 2e3);
    click(".cmptdchoice > a[aria-checked=true]", true);
    click(".cmpboxbtnyescustomchoices");
    return true;
  }
  async optIn() {
    if (this.apiAvailable) {
      return await this.mainWorldEval("EVAL_CONSENTMANAGER_4");
    }
    return click(".cmpboxbtnyes");
  }
  async test() {
    if (this.apiAvailable) {
      return await this.mainWorldEval("EVAL_CONSENTMANAGER_5");
    }
  }
};

// lib/cmps/evidon.ts
var Evidon = class extends AutoConsentCMPBase {
  constructor() {
    super(...arguments);
    this.name = "Evidon";
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
    return elementVisible("#_evidon_banner", "any");
  }
  async optOut() {
    if (click("#_evidon-decline-button")) {
      return true;
    }
    hideElements(getStyleElement(), ["#evidon-prefdiag-overlay", "#evidon-prefdiag-background"]);
    click("#_evidon-option-button");
    await waitForElement("#evidon-prefdiag-overlay", 5e3);
    click("#evidon-prefdiag-decline");
    return true;
  }
  async optIn() {
    return click("#_evidon-accept-button");
  }
};

// lib/cmps/onetrust.ts
var Onetrust = class extends AutoConsentCMPBase {
  constructor() {
    super(...arguments);
    this.name = "Onetrust";
    this.prehideSelectors = ["#onetrust-banner-sdk,#onetrust-consent-sdk,.onetrust-pc-dark-filter,.js-consent-banner"];
    this.runContext = {
      urlPattern: "^(?!.*https://www\\.nba\\.com/)"
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
    return elementVisible("#onetrust-banner-sdk", "all");
  }
  async optOut() {
    if (elementVisible("#onetrust-reject-all-handler,.js-reject-cookies", "any")) {
      return click("#onetrust-reject-all-handler,.js-reject-cookies");
    }
    if (elementExists("#onetrust-pc-btn-handler")) {
      click("#onetrust-pc-btn-handler");
    } else {
      click(".ot-sdk-show-settings,button.js-cookie-settings");
    }
    await waitForElement("#onetrust-consent-sdk", 2e3);
    await wait(1e3);
    click("#onetrust-consent-sdk input.category-switch-handler:checked,.js-editor-toggle-state:checked", true);
    await wait(1e3);
    await waitForElement(".save-preference-btn-handler,.js-consent-save", 2e3);
    click(".save-preference-btn-handler,.js-consent-save");
    await waitForVisible("#onetrust-banner-sdk", 5e3, "none");
    return true;
  }
  async optIn() {
    return click("#onetrust-accept-btn-handler,.js-accept-cookies");
  }
  async test() {
    return await waitFor(
      () => this.mainWorldEval("EVAL_ONETRUST_1"),
      10,
      500
    );
  }
};

// lib/cmps/klaro.ts
var Klaro = class extends AutoConsentCMPBase {
  constructor() {
    super(...arguments);
    this.name = "Klaro";
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
    if (elementExists(".klaro > .cookie-modal")) {
      this.settingsOpen = true;
      return true;
    }
    return elementExists(".klaro > .cookie-notice");
  }
  async detectPopup() {
    return elementVisible(".klaro > .cookie-notice,.klaro > .cookie-modal", "any");
  }
  async optOut() {
    if (click(".klaro .cn-decline")) {
      return true;
    }
    if (!this.settingsOpen) {
      click(".klaro .cn-learn-more");
      await waitForElement(".klaro > .cookie-modal", 2e3);
      this.settingsOpen = true;
    }
    if (click(".klaro .cn-decline")) {
      return true;
    }
    click(".cm-purpose:not(.cm-toggle-all) > input:not(.half-checked)", true);
    return click(".cm-btn-accept");
  }
  async optIn() {
    if (click(".klaro .cm-btn-accept-all")) {
      return true;
    }
    if (this.settingsOpen) {
      click(".cm-purpose:not(.cm-toggle-all) > input.half-checked", true);
      return click(".cm-btn-accept");
    }
    return click(".klaro .cookie-notice .cm-btn-success");
  }
  async test() {
    return await this.mainWorldEval("EVAL_KLARO_1");
  }
};

// lib/cmps/uniconsent.ts
var Uniconsent = class extends AutoConsentCMPBase {
  constructor() {
    super(...arguments);
    this.name = "Uniconsent";
  }
  get prehideSelectors() {
    return [".unic", ".modal:has(.unic)"];
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
    return elementVisible(".unic .unic-box,.unic .unic-bar", "any");
  }
  async optOut() {
    await waitForElement(".unic button", 1e3);
    document.querySelectorAll(".unic button").forEach((button) => {
      const text = button.textContent;
      if (text.includes("Manage Options") || text.includes("Optionen verwalten")) {
        button.click();
      }
    });
    if (await waitForElement(".unic input[type=checkbox]", 1e3)) {
      await waitForElement(".unic button", 1e3);
      document.querySelectorAll(".unic input[type=checkbox]").forEach((c) => {
        if (c.checked) {
          c.click();
        }
      });
      for (const b of document.querySelectorAll(".unic button")) {
        const text = b.textContent;
        for (const pattern of ["Confirm Choices", "Save Choices", "Auswahl speichern"]) {
          if (text.includes(pattern)) {
            b.click();
            await wait(500);
            return true;
          }
        }
      }
    }
    return false;
  }
  async optIn() {
    return waitForThenClick2(".unic #unic-agree");
  }
  async test() {
    await wait(1e3);
    const res = elementExists(".unic .unic-box,.unic .unic-bar");
    return !res;
  }
};

// lib/cmps/conversant.ts
var Conversant = class extends AutoConsentCMPBase {
  constructor() {
    super(...arguments);
    this.prehideSelectors = [".cmp-root"];
    this.name = "Conversant";
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
    return elementVisible(".cmp-root .cmp-receptacle", "any");
  }
  async optOut() {
    if (!await waitForThenClick2(".cmp-main-button:not(.cmp-main-button--primary)")) {
      return false;
    }
    if (!await waitForElement(".cmp-view-tab-tabs")) {
      return false;
    }
    await waitForThenClick2(".cmp-view-tab-tabs > :first-child");
    await waitForThenClick2(".cmp-view-tab-tabs > .cmp-view-tab--active:first-child");
    for (const item of Array.from(document.querySelectorAll(".cmp-accordion-item"))) {
      item.querySelector(".cmp-accordion-item-title").click();
      await waitFor(() => !!item.querySelector(".cmp-accordion-item-content.cmp-active"), 10, 50);
      const content = item.querySelector(".cmp-accordion-item-content.cmp-active");
      content.querySelectorAll(".cmp-toggle-actions .cmp-toggle-deny:not(.cmp-toggle-deny--active)").forEach((e) => e.click());
      content.querySelectorAll(".cmp-toggle-actions .cmp-toggle-checkbox:not(.cmp-toggle-checkbox--active)").forEach((e) => e.click());
    }
    await click(".cmp-main-button:not(.cmp-main-button--primary)");
    return true;
  }
  async optIn() {
    return waitForThenClick2(".cmp-main-button.cmp-main-button--primary");
  }
  async test() {
    return document.cookie.includes("cmp-data=0");
  }
};

// lib/cmps/tiktok.ts
var Tiktok = class extends AutoConsentCMPBase {
  constructor() {
    super(...arguments);
    this.name = "tiktok.com";
    this.runContext = {
      urlPattern: "tiktok"
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
    const container = document.querySelector("tiktok-cookie-banner");
    if (!container) {
      return null;
    }
    return container.shadowRoot;
  }
  async detectCmp() {
    return elementExists("tiktok-cookie-banner");
  }
  async detectPopup() {
    const banner = this.getShadowRoot().querySelector(".tiktok-cookie-banner");
    return isElementVisible(banner);
  }
  async optOut() {
    const declineButton = this.getShadowRoot().querySelector(".button-wrapper button:first-child");
    if (declineButton) {
      enableLogs && console.log("[clicking]", declineButton);
      declineButton.click();
      return true;
    } else {
      enableLogs && console.log("no decline button found");
      return false;
    }
  }
  async optIn() {
    const acceptButton = this.getShadowRoot().querySelector(".button-wrapper button:last-child");
    if (acceptButton) {
      enableLogs && console.log("[clicking]", acceptButton);
      acceptButton.click();
      return true;
    } else {
      enableLogs && console.log("no accept button found");
      return false;
    }
  }
  async test() {
    const match = document.cookie.match(/cookie-consent=([^;]+)/);
    if (!match) {
      return false;
    }
    const value = JSON.parse(decodeURIComponent(match[1]));
    return Object.values(value).every((x) => typeof x !== "boolean" || x === false);
  }
};

// lib/cmps/airbnb.ts
var Airbnb = class extends AutoConsentCMPBase {
  constructor() {
    super(...arguments);
    this.runContext = {
      urlPattern: "^https://(www\\.)?airbnb\\.[^/]+/"
    };
    this.prehideSelectors = [
      "div[data-testid=main-cookies-banner-container]",
      'div:has(> div:first-child):has(> div:last-child):has(> section [data-testid="strictly-necessary-cookies"])'
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
    return elementExists("div[data-testid=main-cookies-banner-container]");
  }
  async detectPopup() {
    return elementVisible("div[data-testid=main-cookies-banner-container", "any");
  }
  async optOut() {
    await waitForThenClick2("div[data-testid=main-cookies-banner-container] button._snbhip0");
    let check;
    while (check = document.querySelector("[data-testid=modal-container] button[aria-checked=true]:not([disabled])")) {
      check.click();
    }
    return waitForThenClick2("button[data-testid=save-btn]");
  }
  async optIn() {
    return waitForThenClick2("div[data-testid=main-cookies-banner-container] button._148dgdpk");
  }
  async test() {
    return await waitFor(
      () => !!document.cookie.match("OptanonAlertBoxClosed"),
      20,
      200
    );
  }
};

// lib/cmps/all.ts
var dynamicCMPs = [
  TrustArcTop,
  TrustArcFrame,
  Cookiebot,
  SourcePoint,
  ConsentManager,
  Evidon,
  Onetrust,
  Klaro,
  Uniconsent,
  Conversant,
  Tiktok,
  Airbnb
];

// lib/web.ts
function filterCMPs(rules, config) {
  return rules.filter((cmp) => {
    return (!config.disabledCmps || !config.disabledCmps.includes(cmp.name)) && (config.enableCosmeticRules || !cmp.isCosmetic);
  });
}
var AutoConsent = class {
  constructor(sendContentMessage, config = null, declarativeRules = null) {
    this.id = getRandomID();
    this.rules = [];
    this.foundCmp = null;
    this.state = {
      lifecycle: "loading",
      prehideOn: false,
      findCmpAttempts: 0,
      detectedCmps: [],
      detectedPopups: [],
      selfTest: null
    };
    evalState.sendContentMessage = sendContentMessage;
    this.sendContentMessage = sendContentMessage;
    this.rules = [];
    enableLogs && console.log("autoconsent init", window.location.href);
    this.updateState({ lifecycle: "loading" });
    this.addDynamicRules();
    if (config) {
      this.initialize(config, declarativeRules);
    } else {
      if (declarativeRules) {
        this.parseDeclarativeRules(declarativeRules);
      }
      const initMsg = {
        type: "init",
        url: window.location.href
      };
      sendContentMessage(initMsg);
      this.updateState({ lifecycle: "waitingForInitResponse" });
    }
  }
  initialize(config, declarativeRules) {
    this.config = config;
    if (!config.enabled) {
      enableLogs && console.log("autoconsent is disabled");
      return;
    }
    if (declarativeRules) {
      this.parseDeclarativeRules(declarativeRules);
    }
    this.rules = filterCMPs(this.rules, config);
    if (config.enablePrehide) {
      if (document.documentElement) {
        this.prehideElements();
      } else {
        const delayedPrehide = () => {
          window.removeEventListener("DOMContentLoaded", delayedPrehide);
          this.prehideElements();
        };
        window.addEventListener("DOMContentLoaded", delayedPrehide);
      }
    }
    if (document.readyState === "loading") {
      const onReady = () => {
        window.removeEventListener("DOMContentLoaded", onReady);
        this.start();
      };
      window.addEventListener("DOMContentLoaded", onReady);
    } else {
      this.start();
    }
    this.updateState({ lifecycle: "initialized" });
  }
  addDynamicRules() {
    dynamicCMPs.forEach((cmp) => {
      this.rules.push(new cmp(this));
    });
  }
  parseDeclarativeRules(declarativeRules) {
    Object.keys(declarativeRules.consentomatic).forEach((name) => {
      this.addConsentomaticCMP(name, declarativeRules.consentomatic[name]);
    });
    declarativeRules.autoconsent.forEach((ruleset) => {
      this.addDeclarativeCMP(ruleset);
    });
  }
  addDeclarativeCMP(ruleset) {
    this.rules.push(new AutoConsentCMP(ruleset, this));
  }
  addConsentomaticCMP(name, config) {
    this.rules.push(new ConsentOMaticCMP(`com_${name}`, config));
  }
  // start the detection process, possibly with a delay
  start() {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => this._start(), { timeout: 500 });
    } else {
      this._start();
    }
  }
  async _start() {
    enableLogs && console.log(`Detecting CMPs on ${window.location.href}`);
    this.updateState({ lifecycle: "started" });
    const foundCmps = await this.findCmp(this.config.detectRetries);
    this.updateState({ detectedCmps: foundCmps.map((c) => c.name) });
    if (foundCmps.length === 0) {
      enableLogs && console.log("no CMP found", location.href);
      if (this.config.enablePrehide) {
        this.undoPrehide();
      }
      this.updateState({ lifecycle: "nothingDetected" });
      return false;
    }
    this.updateState({ lifecycle: "cmpDetected" });
    let foundPopups = await this.detectPopups(foundCmps.filter((r) => !r.isCosmetic));
    if (foundPopups.length === 0) {
      foundPopups = await this.detectPopups(foundCmps.filter((r) => r.isCosmetic));
    }
    if (foundPopups.length === 0) {
      enableLogs && console.log("no popup found");
      if (this.config.enablePrehide) {
        this.undoPrehide();
      }
      return false;
    }
    this.updateState({ lifecycle: "openPopupDetected" });
    if (this.config.enablePrehide && !this.state.prehideOn) {
      this.prehideElements();
    }
    if (foundPopups.length > 1) {
      const errorDetails = {
        msg: `Found multiple CMPs, check the detection rules.`,
        cmps: foundPopups.map((cmp) => cmp.name)
      };
      enableLogs && console.warn(errorDetails.msg, errorDetails.cmps);
      this.sendContentMessage({
        type: "autoconsentError",
        details: errorDetails
      });
    }
    this.foundCmp = foundPopups[0];
    if (this.config.autoAction === "optOut") {
      return await this.doOptOut();
    } else if (this.config.autoAction === "optIn") {
      return await this.doOptIn();
    } else {
      enableLogs && console.log("waiting for opt-out signal...", location.href);
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
            type: "cmpDetected",
            url: location.href,
            cmp: cmp.name
          });
          foundCMPs.push(cmp);
        }
      } catch (e) {
        enableLogs && console.warn(`error detecting ${cmp.name}`, e);
      }
    }
    if (foundCMPs.length === 0 && retries > 0) {
      await wait(500);
      return this.findCmp(retries - 1);
    }
    return foundCMPs;
  }
  async detectPopups(cmps) {
    const result = [];
    const popupLookups = cmps.map((cmp) => this.waitForPopup(cmp).then((isOpen) => {
      if (isOpen) {
        this.updateState({ detectedPopups: this.state.detectedPopups.concat([cmp.name]) });
        this.sendContentMessage({
          type: "popupFound",
          cmp: cmp.name,
          url: location.href
        });
        result.push(cmp);
      }
    }).catch((e) => {
      enableLogs && console.warn(`error waiting for a popup for ${cmp.name}`, e);
      return null;
    }));
    await Promise.all(popupLookups);
    return result;
  }
  async doOptOut() {
    this.updateState({ lifecycle: "runningOptOut" });
    let optOutResult;
    if (!this.foundCmp) {
      enableLogs && console.log("no CMP to opt out");
      optOutResult = false;
    } else {
      enableLogs && console.log(`CMP ${this.foundCmp.name}: opt out on ${window.location.href}`);
      optOutResult = await this.foundCmp.optOut();
      enableLogs && console.log(`${this.foundCmp.name}: opt out result ${optOutResult}`);
    }
    if (this.config.enablePrehide) {
      this.undoPrehide();
    }
    this.sendContentMessage({
      type: "optOutResult",
      cmp: this.foundCmp ? this.foundCmp.name : "none",
      result: optOutResult,
      scheduleSelfTest: this.foundCmp && this.foundCmp.hasSelfTest,
      url: location.href
    });
    if (optOutResult && !this.foundCmp.isIntermediate) {
      this.sendContentMessage({
        type: "autoconsentDone",
        cmp: this.foundCmp.name,
        isCosmetic: this.foundCmp.isCosmetic,
        url: location.href
      });
      this.updateState({ lifecycle: "done" });
    } else {
      this.updateState({ lifecycle: optOutResult ? "optOutSucceeded" : "optOutFailed" });
    }
    return optOutResult;
  }
  async doOptIn() {
    this.updateState({ lifecycle: "runningOptIn" });
    let optInResult;
    if (!this.foundCmp) {
      enableLogs && console.log("no CMP to opt in");
      optInResult = false;
    } else {
      enableLogs && console.log(`CMP ${this.foundCmp.name}: opt in on ${window.location.href}`);
      optInResult = await this.foundCmp.optIn();
      enableLogs && console.log(`${this.foundCmp.name}: opt in result ${optInResult}`);
    }
    if (this.config.enablePrehide) {
      this.undoPrehide();
    }
    this.sendContentMessage({
      type: "optInResult",
      cmp: this.foundCmp ? this.foundCmp.name : "none",
      result: optInResult,
      scheduleSelfTest: false,
      // self-tests are only for opt-out at the moment
      url: location.href
    });
    if (optInResult && !this.foundCmp.isIntermediate) {
      this.sendContentMessage({
        type: "autoconsentDone",
        cmp: this.foundCmp.name,
        isCosmetic: this.foundCmp.isCosmetic,
        url: location.href
      });
      this.updateState({ lifecycle: "done" });
    } else {
      this.updateState({ lifecycle: optInResult ? "optInSucceeded" : "optInFailed" });
    }
    return optInResult;
  }
  async doSelfTest() {
    let selfTestResult;
    if (!this.foundCmp) {
      enableLogs && console.log("no CMP to self test");
      selfTestResult = false;
    } else {
      enableLogs && console.log(`CMP ${this.foundCmp.name}: self-test on ${window.location.href}`);
      selfTestResult = await this.foundCmp.test();
    }
    this.sendContentMessage({
      type: "selfTestResult",
      cmp: this.foundCmp ? this.foundCmp.name : "none",
      result: selfTestResult,
      url: location.href
    });
    this.updateState({ selfTest: selfTestResult });
    return selfTestResult;
  }
  async waitForPopup(cmp, retries = 5, interval = 500) {
    enableLogs && console.log("checking if popup is open...", cmp.name);
    const isOpen = await cmp.detectPopup().catch((e) => {
      enableLogs && console.warn(`error detecting popup for ${cmp.name}`, e);
      return false;
    });
    if (!isOpen && retries > 0) {
      await wait(interval);
      return this.waitForPopup(cmp, retries - 1, interval);
    }
    enableLogs && console.log(cmp.name, `popup is ${isOpen ? "open" : "not open"}`);
    return isOpen;
  }
  prehideElements() {
    const globalHidden = [
      "#didomi-popup,.didomi-popup-container,.didomi-popup-notice,.didomi-consent-popup-preferences,#didomi-notice,.didomi-popup-backdrop,.didomi-screen-medium"
    ];
    const selectors = this.rules.reduce((selectorList, rule) => {
      if (rule.prehideSelectors) {
        return [...selectorList, ...rule.prehideSelectors];
      }
      return selectorList;
    }, globalHidden);
    this.updateState({ prehideOn: true });
    setTimeout(() => {
      if (this.config.enablePrehide && this.state.prehideOn && !["runningOptOut", "runningOptIn"].includes(this.state.lifecycle)) {
        enableLogs && console.log("Process is taking too long, unhiding elements");
        this.undoPrehide();
      }
    }, this.config.prehideTimeout || 2e3);
    return prehide(selectors);
  }
  undoPrehide() {
    this.updateState({ prehideOn: false });
    return undoPrehide();
  }
  updateState(change) {
    Object.assign(this.state, change);
    this.sendContentMessage({
      type: "report",
      instanceId: this.id,
      url: window.location.href,
      mainFrame: window.top === window.self,
      state: this.state
    });
  }
  async receiveMessageCallback(message) {
    if (enableLogs && !["evalResp", "report"].includes(message.type)) {
      console.log("received from background", message, window.location.href);
    }
    switch (message.type) {
      case "initResp":
        this.initialize(message.config, message.rules);
        break;
      case "optIn":
        await this.doOptIn();
        break;
      case "optOut":
        await this.doOptOut();
        break;
      case "selfTest":
        await this.doSelfTest();
        break;
      case "evalResp":
        resolveEval(message.id, message.result);
        break;
    }
  }
};
