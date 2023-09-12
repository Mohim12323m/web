'use strict';

/**
 * DONE 1) urls (local, test, main)
 * DONE 2) desktop/mobile mode
 * DONE 3) real/headless mode
 * DONE 4) use private window (always reset cookies)
 *
 * DONE a) ONE test = SEQUENCE of actions (each action may fail = whole test failed)
 *
 * DONE - local chromium correct startup
 * DONE - test login/password -- settings.js
 * DONE - where/how to store gpx -- tests/gpx
 * TODO - report tests/png via tg -- later
 */

import { Builder } from 'selenium-webdriver';
import { Options, ServiceBuilder } from 'selenium-webdriver/chrome.js';
import compareImages from 'resemblejs/compareImages.js';
import chalk from 'chalk';

import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';

import { IMPICIT_WAIT } from './settings.mjs';

console.debug = () => {}; // suppress selenium's console.debug

const { url, stop, verbose, mobile, headless, tests } = parseArgs();

let failed = 0;
let successful = 0;

console.log();
await cycleTests();

console.log();
failed > 0 && console.log(chalk.red('failed', failed));
successful > 0 && console.log(chalk.green('successful', successful));

console.log();
process.exitCode = failed > 0 ? 1 : 0;

async function cycleTests() {
    for (let i = 0; i < tests.length; i++) {
        await runTest({ file: tests[i], info: `[${i + 1}/${tests.length}]` });
        if (failed > 0 && stop) {
            break;
        }
    }
}

async function timer(callback) {
    const started = Date.now();
    await callback(); // async
    return Date.now() - started;
}

async function runTest({ file, info }) {
    let runtime = 0;
    await (async function () {
        let driver = null;
        try {
            let error = null;

            driver = await prepareDriver();
            await driver.manage().setTimeouts({ implicit: IMPICIT_WAIT });

            const { default: test } = await import('./tests/' + file);

            try {
                runtime += await timer(() => test({ driver, url, mobile, headless }));
            } catch (e) {
                error = e;
            }

            try {
                // don't validate screenshot if test was failed with error
                await manageScreenshot({ driver, file, validate: error === null });
            } catch (e) {
                // test's error is more important than screenshot's
                error === null && (error = e);
            }

            if (error) {
                throw error;
            }
        } finally {
            (await driver) && driver.quit();
        }
    })().then(
        () => {
            successful++;
            console.log(info, file, chalk.bgGreenBright('OK'), Number(runtime / 1000).toFixed(2) + 's');
        },
        (error) => {
            failed++;
            const message = verbose ? error : error.message.replace(/\n.*/g, ''); // keep 1st line
            console.log(info, file, chalk.bgRedBright('FAILED'), message);
        }
    );
}

async function manageScreenshot({ driver, file, validate = true }) {
    mkdirSync('screenshots/diff', { recursive: true });
    mkdirSync('screenshots/latest', { recursive: true });
    mkdirSync('screenshots/trusted', { recursive: true });

    const ss = await driver.takeScreenshot();

    const tag = (process.env.npm_lifecycle_event ?? 'test').replace(/[^a-z]/g, '-') + '-'; // yarn command as tag
    const name = tag + (mobile ? 'mobile-' : '') + (headless ? 'headless-' : '') + file.replaceAll('.mjs', '') + '.png';

    const diff = 'screenshots/diff/' + name;
    const latest = 'screenshots/latest/' + name;
    const trusted = 'screenshots/trusted/' + name;

    writeFileSync(latest, ss, { encoding: 'base64' });

    if (validate && existsSync(trusted)) {
        const options = {
            output: {
                largeImageThreshold: 0,
                outputDiff: true,
                errorColor: {
                    red: 255,
                    green: 0,
                    blue: 255,
                },
                // errorType: 'movement',
                // transparency: 0.5,
            },
            scaleToSameSize: true,
            ignore: 'antialiasing',
        };
        const resemble = await compareImages(latest, trusted, options);
        if (resemble.misMatchPercentage > 0) {
            writeFileSync(diff, resemble.getBuffer());
            throw new Error('screenshot mismatch ' + resemble.misMatchPercentage + '%');
        }
    }
}

async function prepareDriver() {
    const width = 1280;
    const height = 720;
    const deviceName = 'Samsung Galaxy S20 Ultra';

    const options = new Options();

    options.addArguments('--incognito');

    mobile && options.setMobileEmulation({ deviceName });
    headless && options.headless().windowSize({ width, height });

    const tryHomeBinary = process.env.HOME + '/bin/chromium';
    existsSync(tryHomeBinary) && options.setChromeBinaryPath(tryHomeBinary);

    const driver = await new Builder().forBrowser('chrome');

    driver.setChromeOptions(options);

    if (verbose) {
        driver.setChromeService(new ServiceBuilder().loggingTo('/tmp/log').enableVerboseLogging());
    }

    return driver.build();
}

function parseArgs() {
    let url = null;
    const tests = [];
    let stop = false;
    let verbose = false;
    let mobile = false;
    let headless = false;

    process.argv.slice(2).forEach((a) => {
        if (a.match(/^(http:|https:)/)) {
            url = a;
        } else if (a.match(/^--/)) {
            a === '--mobile' && (mobile = true);
            a === '--headless' && (headless = true);
            a === '--verbose' && (verbose = true);
            a === '--stop' && (stop = true);
        } else {
            if (existsSync('src/tests/' + a + '.mjs')) {
                tests.push(a + '.mjs');
            } else if (existsSync('src/tests/' + a)) {
                tests.push(a);
            } else {
                throw Error('unknown test:', a);
            }
        }
    });
    if (tests.length === 0) {
        readdirSync('src/tests/')
            .sort()
            .forEach((file) => {
                file.match(/\.mjs$/) && tests.push(file);
            });
    }
    return { url, tests, stop, verbose, mobile, headless };
}
