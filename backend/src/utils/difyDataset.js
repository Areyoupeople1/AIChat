const axios = require('axios');
const http = require('http');

const directAgent = new http.Agent({ keepAlive: false });
const client = axios.create({ proxy: false, httpAgent: directAgent });

function headers() {
  return {
    Authorization: `Bearer ${process.env.DIFY_DATASET_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

const BASE = () => `${process.env.DIFY_BASE_URL}/datasets/${process.env.DIFY_DATASET_ID}`;

// 把文章内容拼成纯文本供 RAG 检索
function articleToText(article) {
  return [
    `标题：${article.title}`,
    article.summary ? `摘要：${article.summary}` : '',
    article.tags    ? `标签：${article.tags}`    : '',
    article.content ? `内容：${article.content}` : '',
  ].filter(Boolean).join('\n');
}

// 新增文档，返回 dify_doc_id
async function createDocument(article) {
  const { data } = await client.post(`${BASE()}/document/create_by_text`, {
    name: article.title,
    text: articleToText(article),
    indexing_technique: 'high_quality',
    process_rule: { mode: 'automatic' },
  }, { headers: headers() });
  return data?.document?.id || null;
}

// 更新文档
async function updateDocument(difyDocId, article) {
  await client.post(
    `${BASE()}/documents/${difyDocId}/update_by_text`,
    {
      name: article.title,
      text: articleToText(article),
    },
    { headers: headers() }
  );
}

// 删除文档
async function deleteDocument(difyDocId) {
  await client.delete(`${BASE()}/documents/${difyDocId}`, { headers: headers() });
}

module.exports = { createDocument, updateDocument, deleteDocument };
