Web Proxy Site
概要
Croxy Proxyのような仕組みを使ったウェブプロキシサイトです。ユーザーが入力したURLにプロキシ経由でアクセスでき、about:blankを使ってURLを隠すことができます。

プロジェクト構造
server.js - Express.jsベースのプロキシサーバー（エントリーポイント）
src/validation.js - SSRF対策とURL検証モジュール
src/proxyPipeline.js - プロキシリクエスト処理とストリーミングモジュール
src/rewriter.js - HTML/CSSのURL書き換えモジュール
public/index.html - フロントエンドUI
public/style.css - スタイリング
public/script.js - クライアントサイドのJavaScript（about:blank機能含む）
package.json - Node.js依存関係管理
render.yaml - Renderデプロイ設定
技術スタック
Node.js (v20)
Express.js
undici（モダンなHTTPクライアント、ストリーミング対応）
iconv-lite（文字エンコーディング処理）
cors
zlib（圧縮/展開処理）
実装済み機能
✅ URLを入力してプロキシ経由でウェブサイトにアクセス ✅ about:blank機能でURLを隠す（window.open()を使用） ✅ HTMLリンクを自動的に書き換えてプロキシ経由にする ✅ 画像、CSS、JavaScriptリソースの書き換え ✅ srcset、video、audio、source、data-*属性など包括的なURL書き換え ✅ プライベートIPアドレス範囲のブロック（10.0.0.0/8、172.16.0.0/12、192.168.0.0/16等） ✅ IPv6プライベート範囲のブロック（fc00::/7、fe80::/10等） ✅ IPv4-mapped IPv6アドレスの正規化とブロック ✅ DNS解決による内部IPアドレスへのアクセス防止 ✅ HTTPリダイレクトの手動制御（最大5回、各ホップでvalidateUrl再実行） ✅ 303リダイレクトとPOST→GETリダイレクトの適切な処理 ✅ POST/PUT/PATCHリクエストボディのバッファリング（10MB制限） ✅ 圧縮レスポンスの処理（gzip、brotli、deflate） ✅ HTML/CSSの展開→書き換え→再圧縮フロー ✅ 文字エンコーディング対応（UTF-8、Shift_JIS、ISO-8859-1等） ✅ Content-Typeとcharsetの保持（application/xhtml+xmlも維持） ✅ Cookie、Authorization、Set-Cookieヘッダーの転送 ✅ ストリーミングレスポンス（非書き換え対象のリソース） ✅ キャッシュ制御ヘッダー ✅ 美しいレスポンシブUI

アーキテクチャの詳細
SSRF対策
IPv4プライベート範囲: 10.0.0.0/8、172.16.0.0/12、192.168.0.0/16、127.0.0.0/8、169.254.0.0/16
IPv6プライベート範囲: ::1、fc00::/7、fe80::/10
IPv4-mapped IPv6アドレスの正規化とブロック
DNS解決による内部IPアドレスへのアクセス防止
リダイレクト先URLの再検証（各ホップで実行）
リクエスト処理
リクエストボディのバッファリング（POST/PUT/PATCH、最大10MB）
リダイレクト時のボディ再送信対応
303および301/302のPOST→GET変換
レスポンス処理
書き換え対象（HTML/CSS/XHTML）:
レスポンスボディをバッファリング
Content-Encodingに基づき展開（gzip/br/deflate）
Content-Typeからcharsetを検出（デフォルト: utf-8）
iconv-liteでcharsetに基づきデコード
HTML/CSSのURL書き換え
iconv-liteで元のcharsetにエンコード
元のContent-Encodingで再圧縮
Content-Type、Content-Length、Content-Encodingヘッダーを正しく設定
非書き換え対象: 圧縮されたままストリーミング
文字エンコーディング対応
Content-Typeヘッダーからcharsetを抽出
iconv-liteで多様なエンコーディングをサポート（UTF-8、Shift_JIS、ISO-8859-1、EUC-JP等）
元のContent-Typeとcharsetを保持（application/xhtml+xmlも維持）
デコード/エンコードエラー時はUTF-8にフォールバック
既知の制限事項
⚠️ JavaScriptで動的に生成されるコンテンツは書き換えられません ⚠️ WebSocketやSSE（Server-Sent Events）はサポートされていません ⚠️ 一部の高度なウェブサイト（SPA、複雑な認証フローなど）は正しく動作しない可能性があります ⚠️ 大きなPOSTボディ（>10MB）は拒否されます

セキュリティに関する注意
このプロキシサイトは学習・個人使用を目的としています。 本番環境や公開サービスとして使用する場合は、以下の改善を強く推奨します：

レート制限の実装
アクセスログの記録
HTTPS強制
CSP（Content Security Policy）ヘッダーの追加
より厳格なURL検証
ローカル実行
npm install
npm start

サーバーはポート5000で起動します。

Renderへのデプロイ方法
方法1: render.yamlを使用（推奨）
Renderアカウントにログイン
新しいWeb Serviceを作成
このGitHubリポジトリを接続
render.yamlが自動的に検出されます
デプロイを開始
方法2: 手動設定
Render.comで以下の設定を使用：

Build Command: npm install
Start Command: npm start
Environment: Node
Replitからのデプロイ
Replitの「Deploy」ボタンをクリックすると、自動的にデプロイ設定が適用されます。

今後の改善案
より堅牢な実装にするには：

セキュリティ強化: レート制限、アクセス制御、詳細なロギング
テストの追加: ユニットテストとセキュリティテスト
WebSocketサポート: リアルタイム通信の対応
パフォーマンス最適化: キャッシング戦略の実装
最終更新
2025年11月25日 - 完全な書き直し完了

undiciへの移行（ストリーミング対応）
モジュール化（src/ディレクトリ構造）
包括的なSSRF対策
about:blank URLリダイレクト機能
圧縮レスポンスの透過的処理
文字エンコーディング対応（iconv-lite）
