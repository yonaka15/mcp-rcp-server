# JSON-RPC クライアントツール

JSON-RPC APIにアクセスするためのコマンドラインツールです。

** This is just a private project, for your reference. **

## インストール

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build
```

## 使用方法

```bash
# ヘルプを表示
node build/index.js --help

# システム情報を取得
node build/index.js system-info

# エコー実行
node build/index.js echo "Hello, world!"

# メモ一覧を取得
node build/index.js notes list

# メモを取得
node build/index.js notes get <メモID>

# メモを作成
node build/index.js notes create "タイトル" "内容"

# メモを更新
node build/index.js notes update <メモID> "新しいタイトル" "新しい内容"

# メモを削除
node build/index.js notes delete <メモID>
```

## 拡張方法

新しいAPIエンドポイントをサポートするには、以下の手順に従います：

1. `src/types.ts`に必要な型を追加
2. `src/jsonRpcClient.ts`にメソッドを追加
3. `src/cli.ts`にコマンドとオプションを追加

## ライセンス

ISC
