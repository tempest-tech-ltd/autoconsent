const fs = require("fs");
const path = require("path");
const { program } = require("commander");

interface PlaywrightReport {
  config: any[];
  suites: PlaywrightSuite[];
  errors: unknown[];
  stats: {
    startTime: string;
    duration: number;
    expected: number;
    skipped: number;
    unexpected: number;
    flaky: number;
  };
}

interface PlaywrightSuite {
  title: String;
  file: String;
  column: Number;
  line: Number;
  specs: PlaywrightSpec[];
  suites: PlaywrightSuite[];
}

interface PlaywrightSpec {
  title: String;
  ok: Boolean;
  tags: string[];
  tests: PlaytwrightTest[];
}

interface PlaytwrightTest {
  timeout: Number;
  annotations: string[];
  expectedStatus: String;
  projectId: String;
  projectName: String;
  results: any[];
  status: String;
}

function extractSpecsFromSuites(suites: PlaywrightSuite[], filterFn: (spec: PlaywrightSpec) => boolean): PlaywrightSpec[] {
  return suites.reduce((acc, suite) => {
    if (suite.specs.length > 0) {
      const filteredSpecs = suite.specs.filter(filterFn);
      if (filteredSpecs.length > 0) {
        acc.push(...filteredSpecs);
      }
    }

    if (suite.suites?.length > 0) {
      acc.push(...extractSpecsFromSuites(suite.suites, filterFn));
    }
    return acc;
  }, new Array<PlaywrightSpec>());
}

function compare(previousReport: string, lastReport: string) {
  if (!fs.existsSync(lastReport)) {
    console.log(
      JSON.stringify({
        newErrorsCount: 0,
        brokenWebsites: "",
      })
    );
    return;
  }

  const previousResults: PlaywrightReport = (() => {
    if (!fs.existsSync(previousReport)) {
      return {
        config: [],
        suites: [],
        errors: [],
        stats: {
          startTime: "",
          duration: 0,
          expected: 0,
          skipped: 0,
          unexpected: 0,
          flaky: 0,
        },
      };
    }

    return JSON.parse(fs.readFileSync(previousReport, "utf-8"));
  })();
  const lastResults: PlaywrightReport = JSON.parse(
    fs.readFileSync(lastReport, "utf-8")
  );

  const newErrors =
    (lastResults.stats?.unexpected ?? 0) -
    (previousResults.stats?.unexpected ?? 0);

  if (newErrors > 0) {
    const previousFailedSpecs = extractSpecsFromSuites(previousResults.suites ?? [],
      (spec) => spec.tests.some((test) => test.status === "unexpected"));
    const previousSuccessSpecs = extractSpecsFromSuites(previousResults.suites ?? [], (spec) => spec.tests.every(test => test.status !== "unexpected"));

    const lastFailedSpecs = extractSpecsFromSuites(lastResults.suites ?? [],
      (spec) => spec.tests.some((test) => test.status === "unexpected"));

    // failing specs that were already present in the previous report but which were not failing
    const existingRulesNewlyFailed = lastFailedSpecs.filter(spec => !previousFailedSpecs.includes(spec) && previousSuccessSpecs.includes(spec));

    // failing specs which were not existing in the previous report (new rules that are failing)
    const newRulesFailed = lastFailedSpecs.filter(spec => !previousFailedSpecs.includes(spec) && !previousSuccessSpecs.includes(spec));

    const result = {
      newErrorsCount: existingRulesNewlyFailed.length + newRulesFailed.length,
      brokenWebsites: existingRulesNewlyFailed.map(spec => `"${spec.title}"`).join(" "),
      newRuleBrokenWebsites: newRulesFailed.map(spec => `"${spec.title}"`).join(" ")
    };

    console.log(JSON.stringify(result));
  } else {
    console.log(
      JSON.stringify({
        newErrorsCount: 0,
        brokenWebsites: "",
        newRuleBrokenWebsites: ""
      })
    );
  }
}

program.command("compare <previousReport> <lastReport>").action(compare);

program.parse();
