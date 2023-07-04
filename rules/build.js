#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const https = require("https");

const rules = {
  autoconsent: [],
  consentomatic: {}
};

async function readFileJSON(filePath) {
  const data = await fs.promises.readFile(filePath, "utf-8")
  return JSON.parse(data);
}

// merge rules from ./autoconsent into rules.autoconsent array
const autoconsentDir = path.join(__dirname, "autoconsent");
const files = fs.readdirSync(autoconsentDir);
const buildAutoconsent = Promise.all(
  files.map(file => readFileJSON(path.join(autoconsentDir, file)))
).then(r => (rules.autoconsent = r));

// fetch ConsentOMatic rule set and merge with our custom rules
const consentOMaticCommit = "master";
const consentOMaticBaseUrl = `https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/${consentOMaticCommit}/rules/`;
const consentOMaticDir = path.join(__dirname, "consentomatic");
const consentOMaticInclude = [
  'didomi.io', 'oil', 'optanon', 'quantcast2', 'springer', 'wordpress_gdpr', 'sirdata', 'sourcepoint_frame', 'sourcepoint', 'instagram', 'facebook', 'twitch.tv'
]
const buildConsentOMatic = (async () => {
  const comRules = {};

  await Promise.allSettled(consentOMaticInclude.map(async cmp => {
    try {

      const [cmpName, rule] = await new Promise((resolve, reject) => {
        https.get(`${consentOMaticBaseUrl}${cmp}.json`, res => {
          res.setEncoding("utf-8");
          let content = "";
          res.on("data", data => (content += data));
          res.on("end", () => {
            if (res.statusCode !== 200) {
              reject(`Error with "${consentOMaticBaseUrl}${cmp}.json", status code ${res.statusCode}.`);
              return;
            }

            const json = JSON.parse(content);
            const { $schema, ...rest } = json;
            const cmpName = Object.keys(rest)?.[0] ?? null;

            if (cmpName) {
              resolve([cmpName, rest[cmpName]]);
            } else {
              reject(`Wrong rule format for "${consentOMaticBaseUrl}${cmp}.json"`);
            }
          });
        });
      });

      comRules[cmpName] = rule;
    } catch(e) {
      console.log('Error while getting consent-o-matic rules', e);
    }
  }));
  try {
    const extraRules = fs.readdirSync(consentOMaticDir);
    await Promise.all(
      extraRules.map(async file => {
        const rule = await readFileJSON(path.join(consentOMaticDir, file));
        // rule name is file name with JSON extension removed
        comRules[file.substring(0, file.length - 5)] = rule;
      })
    );
  } catch(e) {
  }
  rules.consentomatic = comRules;
})();

Promise.all([buildAutoconsent, buildConsentOMatic]).then(() => {
  fs.writeFile(
    path.join(__dirname, "rules.json"),
    JSON.stringify(rules, undefined, "  "),
    () => console.log("Written rules.json")
  );
});
