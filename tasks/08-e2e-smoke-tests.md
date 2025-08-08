# 08: E2E スモークテスト

- 目的: `child_process` をモックして UI の基本フローを通し、回帰を防ぐ。
- 成果物: 起動→入力→Q 実行→出力表示→終了までの一連テスト。

作業項目
- Vitest で `vi.spyOn(child_process, 'spawn')` を使い、擬似的な stdout/stderr/exit を流す。
- Ink コンポーネントはテストレンダラを使用し、テキスト出力を検証。
- タイムアウトやエラー終了のケースも加える。

受け入れ条件
- 正常/異常の主要シナリオが Red→Green→Refactor を経てテスト化される。
