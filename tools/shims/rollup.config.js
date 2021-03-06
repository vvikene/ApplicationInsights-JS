import nodeResolve from "rollup-plugin-node-resolve";
import {uglify} from "rollup-plugin-uglify";
import replace from "rollup-plugin-replace";
import minify from 'rollup-plugin-minify-es';
import { es3Poly, es3Check } from "@microsoft/applicationinsights-rollup-es3";

const version = require("./package.json").version;
const inputName = "./dist-esm/applicationinsights-shims";
const outputName = "applicationinsights-shims";
const distPath = "./dist/";
const banner = [
  "/*!",
  ` * Application Insights JavaScript SDK - Shim functions, ${version}`,
  " * Copyright (c) Microsoft and contributors. All rights reserved.",
  " */"
].join("\n");

const replaceValues = {
  "// Copyright (c) Microsoft Corporation. All rights reserved.": "",
  "// Licensed under the MIT License.": ""
};

const browserUmdRollupConfigFactory = (isProduction) => {
  const browserRollupConfig = {
    input: `${inputName}.js`,
    output: {
      file: `./browser/${outputName}.js`,
      banner: banner,
      format: "umd",
      name: "Microsoft.ApplicationInsights.Shims",
      sourcemap: false
    },
    plugins: [
      replace({
        delimiters: ["", ""],
        values: replaceValues
      }),
      nodeResolve(),
      es3Poly(),
      es3Check()
    ]
  };

  if (isProduction) {
    browserRollupConfig.output.file = `./browser/${outputName}.min.js`;
    browserRollupConfig.plugins.push(
      uglify({
        ie8: true,
        toplevel: true,
        compress: {
          passes:3,
          unsafe: true
        },
        output: {
          preamble: banner,
          webkit:true
        }
      })
    );
  }
  return browserRollupConfig;
};

const moduleRollupConfigFactory = (format, isProduction) => {
  const moduleRollupConfig = {
    input: `${inputName}.js`,
    output: {
      file: `${distPath}${format}/${outputName}.js`,
      banner: banner,
      format: format,
      name: "Microsoft.ApplicationInsights.Shims",
      sourcemap: false
    },
    plugins: [
      replace({
        delimiters: ["", ""],
        values: replaceValues
      }),
      nodeResolve(),
      es3Poly(),
      es3Check()
    ]
  };

  if (isProduction) {
    moduleRollupConfig.output.file = `${distPath}${format}/${outputName}.min.js`;
    if (format != "esm") {
      moduleRollupConfig.plugins.push(
        uglify({
          ie8: true,
          toplevel: true,
          compress: {
            passes:3,
            unsafe: true,
          },
          output: {
            preamble: banner,
            webkit:true
          }
        })
      );
    } else {
      moduleRollupConfig.plugins.push(
        minify({
          ie8: true,
          toplevel: true,
          compress: {
            passes:3,
            unsafe: true,
          },
          output: {
            preamble: banner,
            webkit:true
          }
        })
      );
    }
  }

  return moduleRollupConfig;
};

export default [
  browserUmdRollupConfigFactory(true),
  browserUmdRollupConfigFactory(false),
  moduleRollupConfigFactory('esm', true),
  moduleRollupConfigFactory('esm', false),
  moduleRollupConfigFactory('umd', true),
  moduleRollupConfigFactory('umd', false)
];
