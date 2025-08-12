import React from "react";
import { render } from "ink";
import { App } from "./components/App";
import { clearTerminal } from "./lib/terminal";

// パッケージバージョンの取得
const packageJson = { version: "0.1.0" }; // TODO: package.jsonから動的に取得

// 起動時に画面をクリア（scrollback含む）
clearTerminal({ scrollback: true });

render(<App version={packageJson.version} />);
