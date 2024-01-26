const fs = require('fs');
const path = require('path');
const { program } = require('commander');

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
    }
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

function filterSuiteBySpecs(suites: PlaywrightSuite[], filterFn: (spec: PlaywrightSpec) => boolean): PlaywrightSuite[] {
    return suites.reduce((acc, suite) => {
        if (suite.specs.length > 0) {
            const filteredSpecs = suite.specs.filter(filterFn);
            if (filteredSpecs.length > 0) {
                acc.push({
                    ...suite,
                    specs: filteredSpecs
                });
            }
        }
        
        if (suite.suites?.length > 0) {
            acc.push(...filterSuiteBySpecs(suite.suites, filterFn));
        }
        return acc;
    }, new Array<PlaywrightSuite>());
}

function compare(previousReport: string, lastReport: string) {

    if (!fs.existsSync(previousReport)) {
        console.log('Error: file not found: ', previousReport);
    }
    if (!fs.existsSync(lastReport)) {
        console.log('Error: file not found: ', lastReport);
    }


    const previousResults: PlaywrightReport = JSON.parse(fs.readFileSync(previousReport, 'utf-8'));
    const lastResults: PlaywrightReport = JSON.parse(fs.readFileSync(lastReport, 'utf-8'));

    const newErrors = (lastResults.stats?.unexpected ?? 0) - (previousResults.stats?.unexpected ?? 0);

    // Will find which websites newly failed
    if (newErrors > 0) {
        const previousErroredSuites = filterSuiteBySpecs(previousResults.suites ?? [], (spec) => spec.tests.some(test => test.status === "unexpected"));
        const previousErroredSpecsNames = new Set(previousErroredSuites.reduce((acc, suite) => {
            acc.push(...suite.specs.map(spec => `${suite.title} > ${spec.title}`));
            return acc;
        }, new Array<String>()));

        const lastErroredSuites = filterSuiteBySpecs(lastResults.suites ?? [], (spec) => spec.tests.some(test => test.status === "unexpected"));

        const newErrored = lastErroredSuites.reduce((acc, suite) => {
            suite.specs.forEach((spec) => {
                const label = `${suite.title} > ${spec.title}`;
                if (!previousErroredSpecsNames.has(label)) {
                    acc.push(label);
                }
            });
            return acc;
        }, new Array<string>());

        const result = {
            newErrorsCount: newErrored.length,
            newErrorsLabels: newErrored
        };

        console.log(JSON.stringify(result));
    } else {
        console.log(JSON.stringify({
            newErrorsCount: 0,
            newErrorsLabel: []
        }));
    }
}

program
    .command('compare <previousReport> <lastReport>')
    .action(compare);

program.parse();