#!/usr/bin/env node
'use strict';

const path = require('path');
const Jasmine = require('jasmine');
const SpecReporter = require('jasmine-spec-reporter').SpecReporter;
const tsNode = require('ts-node');

const projectRoot = path.join(__dirname, '../');
const projectBaseDir = path.join(projectRoot, 'src');

// Register ts-node so typescript is compiled on the fly.
require('ts-node').register({ project: path.join(projectRoot, 'src', 'tsconfig.spec.json') })

// Create a Jasmine runner and configure it.
const jasmine = new Jasmine({ projectBaseDir });
jasmine.loadConfig({});
jasmine.clearReporters();
jasmine.addReporter(new SpecReporter({ spec: { displayPending: true } }));

// Run the tests.
jasmine.execute([path.join(projectBaseDir, '**/*.spec.ts')]);
