import * as fs from "fs";
import * as path from "path";

const files = fs.readdirSync(path.join(__dirname, "..", "/rules/tempest_rules")).filter(file => file !== "rules.json" && file.endsWith(".json"));
fs.writeFileSync(path.join(__dirname, "..", "rules/tempest_rules", "rules.json"), JSON.stringify(files));