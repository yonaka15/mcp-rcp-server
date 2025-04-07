import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

// JSON-RPCサーバーのベースURL
const JSON_RPC_URL = "http://127.0.0.1:3030";

// JSONレスポンス型定義
interface JsonRpcResponse<T = any> {
  jsonrpc: string;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
  id: number | string;
}

// ノート関連の型定義
interface Note {
  id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

// システム情報型定義
interface SystemInfo {
  app_name: string;
  version: string;
  os: string;
  arch: string;
}

// サーバーインスタンスの作成
const server = new McpServer({
  name: "notes-rpc-server",
  version: "1.0.0",
  capabilities: {
    tools: {}
  }
});

// JSON-RPCリクエストを送信する関数
async function sendJsonRpcRequest(method: string, params: any = {}) {
  try {
    const response = await axios.post<JsonRpcResponse>(JSON_RPC_URL, {
      jsonrpc: "2.0",
      method,
      params,
      id: Date.now()
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.error) {
      throw new Error(`RPC Error: ${response.data.error.message}`);
    }

    return response.data.result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`HTTP Error ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('サーバーからの応答がありません。サーバーが起動しているか確認してください。');
      } else {
        throw new Error(`リクエスト設定エラー: ${error.message}`);
      }
    }
    throw error;
  }
}

// システム情報取得ツール
server.tool(
  "system_info",
  "システム情報を取得する",
  {},
  async () => {
    try {
      const info = await sendJsonRpcRequest("system_info") as SystemInfo;
      
      return {
        content: [
          {
            type: "text",
            text: `アプリケーション: ${info.app_name} v${info.version}\nOS: ${info.os} (${info.arch})`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error)
          }
        ]
      };
    }
  }
);

// メモ一覧取得ツール
server.tool(
  "list_notes",
  "すべてのメモを一覧表示する",
  {},
  async () => {
    try {
      const notes = await sendJsonRpcRequest("notes_list") as Note[];
      
      if (notes.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "メモがありません"
            }
          ]
        };
      }

      const formattedNotes = notes.map((note: Note) => {
        const updatedDate = new Date(note.updated_at * 1000).toLocaleString();
        return `[${note.id}] ${note.title}\n更新: ${updatedDate}\n内容プレビュー: ${note.content.substring(0, 50)}...`;
      }).join("\n\n");
      
      return {
        content: [
          {
            type: "text",
            text: `全 ${notes.length} 件のメモ:\n\n${formattedNotes}`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error)
          }
        ]
      };
    }
  }
);

// メモ取得ツール
server.tool(
  "get_note",
  "指定IDのメモを取得する",
  {
    id: z.string().describe("メモID")
  },
  async ({ id }) => {
    try {
      const note = await sendJsonRpcRequest("notes_get", { id }) as Note | null;
      
      if (!note) {
        return {
          content: [
            {
              type: "text",
              text: `ID ${id} のメモは見つかりませんでした`
            }
          ]
        };
      }

      const createdDate = new Date(note.created_at * 1000).toLocaleString();
      const updatedDate = new Date(note.updated_at * 1000).toLocaleString();
      
      return {
        content: [
          {
            type: "text",
            text: `ID: ${note.id}\nタイトル: ${note.title}\n内容: ${note.content}\n作成日時: ${createdDate}\n更新日時: ${updatedDate}`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error)
          }
        ]
      };
    }
  }
);

// メモ作成ツール
server.tool(
  "create_note",
  "新しいメモを作成する",
  {
    title: z.string().describe("メモのタイトル"),
    content: z.string().describe("メモの内容")
  },
  async ({ title, content }) => {
    try {
      const note = await sendJsonRpcRequest("notes_create", { title, content }) as Note;
      
      const createdDate = new Date(note.created_at * 1000).toLocaleString();
      const updatedDate = new Date(note.updated_at * 1000).toLocaleString();
      
      return {
        content: [
          {
            type: "text",
            text: `メモが作成されました:\nID: ${note.id}\nタイトル: ${note.title}\n内容: ${note.content}\n作成日時: ${createdDate}\n更新日時: ${updatedDate}`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error)
          }
        ]
      };
    }
  }
);

// メモ更新ツール
server.tool(
  "update_note",
  "メモを更新する",
  {
    id: z.string().describe("メモID"),
    title: z.string().optional().describe("新しいタイトル（省略可）"),
    content: z.string().optional().describe("新しい内容（省略可）")
  },
  async ({ id, title, content }) => {
    try {
      const params: any = { id };
      if (title !== undefined) params.title = title;
      if (content !== undefined) params.content = content;
      
      const note = await sendJsonRpcRequest("notes_update", params) as Note | null;
      
      if (!note) {
        return {
          content: [
            {
              type: "text",
              text: `ID ${id} のメモは見つかりませんでした`
            }
          ]
        };
      }

      const createdDate = new Date(note.created_at * 1000).toLocaleString();
      const updatedDate = new Date(note.updated_at * 1000).toLocaleString();
      
      return {
        content: [
          {
            type: "text",
            text: `メモが更新されました:\nID: ${note.id}\nタイトル: ${note.title}\n内容: ${note.content}\n作成日時: ${createdDate}\n更新日時: ${updatedDate}`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error)
          }
        ]
      };
    }
  }
);

// メモ削除ツール
server.tool(
  "delete_note",
  "メモを削除する",
  {
    id: z.string().describe("メモID")
  },
  async ({ id }) => {
    try {
      const result = await sendJsonRpcRequest("notes_delete", { id }) as boolean;
      
      return {
        content: [
          {
            type: "text",
            text: result 
              ? `ID ${id} のメモが削除されました` 
              : `ID ${id} のメモは見つかりませんでした`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error)
          }
        ]
      };
    }
  }
);

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Notes MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
