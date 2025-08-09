import React from "react";
import { render } from "ink";
import { App } from "./components/App.js";

// パッケージバージョンの取得
const packageJson = { version: "0.1.0" }; // TODO: package.jsonから動的に取得

render(<App version={packageJson.version} />);