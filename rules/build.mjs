#!/usr/bin/env node
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from 'url';

export const rulesDir = path.dirname(fileURLToPath(import.meta.url))

async function readFileJSON(filePath) {
  const data = await fs.promises.readFile(filePath, "utf-8");
  return JSON.parse(data);
}

export async function buildAutoconsentRules() {
  // merge rules from ./autoconsent into rules.autoconsent array
  const autoconsentDir = path.join(rulesDir, "autoconsent");
  const files = fs.readdirSync(autoconsentDir);
  return await Promise.all(
    files.map((file) => readFileJSON(path.join(autoconsentDir, file)))
  );
}

async function fetchJson(url) {
  return await new Promise((resolve) => {
    https.get(url, (res) => {
      res.setEncoding("utf-8");
      let content = "";
      res.on("data", (data) => (content += data));
      res.on("end", () => resolve(JSON.parse(content)));
    });
  });
}

export async function buildConsentOMaticRules() {
  // fetch ConsentOMatic rule set and merge with our custom rules
  const consentOMaticCommit = "master";
  const consentOMaticRulesListUrl = `https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/${consentOMaticCommit}/rules-list.json`;
  const consentOMaticInclude = [
    'didomi.io', 'oil', 'optanon', 'quantcast2', 'springer', 'wordpress_gdpr', 'sirdata', 'sourcepoint_frame', 'sourcepoint', 'instagram', 'facebook', 'twitch.tv'
  ];
  const comRules = {};
  const allComRules = (await fetchJson(consentOMaticRulesListUrl)).references;
  await Promise.all(consentOMaticInclude.map(async (name) => {
    const url = allComRules.find((url) => !!url.match(new RegExp(`${name}.json$`)));
    if (url) {
      const rule = (await fetchJson(url));
      // find key that golhold the rule
      const ruleKey = Object.keys(rule).find(key => rule[key].detectors !== undefined);
      if (ruleKey) {
        comRules[name] = rule[ruleKey];
      }
      return;
    }

    console.log('>>> No Consent-o-matic rule found for ', name);
  }));
  return comRules;
}

export function combineRules(autoconsent, consentomatic) {
  return {
    autoconsent,
    consentomatic,
  };
}

(async () => {
  const rules = combineRules(
    await buildAutoconsentRules(),
    await buildConsentOMaticRules()
  );
  fs.writeFile(
    path.join(rulesDir, "rules.json"),
    JSON.stringify(rules, undefined, "  "),
    () => console.log("Written rules.json")
  );
})();
