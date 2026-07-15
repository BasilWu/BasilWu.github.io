#!/usr/bin/env node
/**
 * MosStack Studio — Blog Builder
 * Markdown → HTML 靜態文章生成器
 *
 * 使用方式：
 *   node build-blog.js                    → 生成 blog/ 目錄下所有文章
 *   node build-blog.js --watch            → 監聽 blog/posts/ 變動自動重建
 *
 * 文章放在 blog/posts/*.md，front matter 格式：
 * ---
 * title: 文章標題
 * slug: url-slug
 * date: 2026-06-29
 * category: 費用指南
 * description: Meta description
 * readTime: 8
 * ---
 */

const fs = require('fs');
const path = require('path');

// ── 簡易 Markdown 解析器（不依賴外部套件）──
function parseMarkdown(md) {
  // front matter
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let frontMatter = {};
  let body = md;
  if (fmMatch) {
    fmMatch[1].split('\n').forEach(line => {
      const [key, ...val] = line.split(':');
      if (key && val.length) frontMatter[key.trim()] = val.join(':').trim();
    });
    body = fmMatch[2];
  }

  // Convert Markdown to HTML
  let html = body
    // Code blocks
    .replace(/```([\w]*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="blog-code"><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`)
    // Tables
    .replace(/^\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/gm, parseTable)
    // Headings
    .replace(/^### (.+)$/gm, (_, t) => `<h3 id="${slugify(t)}">${t}</h3>`)
    .replace(/^## (.+)$/gm, (_, t) => `<h2 id="${slugify(t)}">${t}</h2>`)
    .replace(/^# (.+)$/gm, (_, t) => `<h1>${t}</h1>`)
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="blog-inline-code">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/((?:^- .+\n?)+)/gm, block => {
      const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('\n');
      return `<ul>\n${items}\n</ul>\n`;
    })
    // Ordered lists
    .replace(/((?:^\d+\. .+\n?)+)/gm, block => {
      const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('\n');
      return `<ol>\n${items}\n</ol>\n`;
    })
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Paragraphs (wrap non-tag lines)
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    // Cleanup double newlines
    .replace(/\n{3,}/g, '\n\n');

  return { frontMatter, html };
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slugify(str) {
  return str.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '');
}

function parseTable(match) {
  const lines = match.trim().split('\n');
  const headers = lines[0].split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`);
  const rows = lines.slice(2).map(row => {
    const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`);
    return `<tr>${cells.join('')}</tr>`;
  });
  return `<div class="blog-table-wrap"><table class="blog-table"><thead><tr>${headers.join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

// ── TOC 生成 ──
function generateTOC(html) {
  const headings = [];
  const re = /<h([23]) id="([^"]+)">([^<]+)<\/h[23]>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    headings.push({ level: parseInt(m[1]), id: m[2], text: m[3] });
  }
  if (headings.length < 2) return '';
  const items = headings.map(h =>
    `<li class="toc__item toc__item--h${h.level}"><a class="toc__link" href="#${h.id}">${h.text}</a></li>`
  ).join('\n');
  return `<nav class="blog-toc" aria-label="文章目錄"><p class="blog-toc__title">目錄</p><ul class="toc__list">${items}</ul></nav>`;
}

// ── HTML 模板 ──
function generateArticleHTML({ title, slug, date, category, description, readTime, wordCount, bodyHtml, toc }) {
  const dateFormatted = date || '2026-06-29';
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `https://mosstack.studio/blog/${slug}.html#post`,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": `https://mosstack.studio/blog/${slug}.html`
        },
        "headline": title,
        "description": description,
        "datePublished": `${dateFormatted}T08:00:00+08:00`,
        "dateModified": `${dateFormatted}T08:00:00+08:00`,
        "author": {
          "@type": "Organization",
          "@id": "https://mosstack.studio/#business",
          "name": "MosStack Studio"
        },
        "publisher": {
          "@type": "Organization",
          "@id": "https://mosstack.studio/#business",
          "name": "MosStack Studio",
          "logo": {
            "@type": "ImageObject",
            "url": "https://mosstack.studio/assets/favicon-32.png",
            "width": 32,
            "height": 32
          }
        },
        "url": `https://mosstack.studio/blog/${slug}.html`,
        "inLanguage": "zh-TW",
        "articleSection": category || "Web Development",
        "wordCount": wordCount || 2000,
        "timeRequired": `PT${readTime || 8}M`
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "首頁", "item": "https://mosstack.studio/" },
          { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://mosstack.studio/blog.html" },
          { "@type": "ListItem", "position": 3, "name": title, "item": `https://mosstack.studio/blog/${slug}.html` }
        ]
      }
    ]
  });

  return `<!DOCTYPE html>
<html lang="zh-TW" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <script>document.documentElement.setAttribute("data-theme",localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"));</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${description}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://mosstack.studio/blog/${slug}.html" />
  <script type="application/ld+json">${schema}</script>
  <title>${title} — MosStack Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600;700;900&display=swap" rel="stylesheet">
  <link rel="icon" type="image/x-icon" href="/assets/favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />
  <meta name="theme-color" content="#080c14" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://mosstack.studio/blog/${slug}.html" />
  <meta property="og:image" content="https://mosstack.studio/assets/og-image.jpg" />
  <meta property="og:locale" content="zh_TW" />
  <meta property="og:site_name" content="MosStack Studio" />
  <meta property="article:published_time" content="${dateFormatted}T08:00:00+08:00" />
  <meta property="article:author" content="https://mosstack.studio/" />
  <meta property="article:section" content="${category || 'Web Development'}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="https://mosstack.studio/assets/og-image.jpg" />
  <link rel="stylesheet" href="/style.css" />
  <style>
    /* ── BLOG ARTICLE STYLES ── */
    .blog-breadcrumb {
      padding: var(--space-6) 0 0;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .blog-breadcrumb a { color: var(--color-text-muted); text-decoration: none; }
    .blog-breadcrumb a:hover { color: var(--color-text); }
    .blog-breadcrumb__sep { margin: 0 var(--space-2); }

    .blog-article {
      padding: var(--space-10) 0 var(--space-24);
    }
    .blog-article__layout {
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: var(--space-16);
      align-items: start;
    }
    @media (max-width: 900px) {
      .blog-article__layout { grid-template-columns: 1fr; }
      .blog-toc { display: none; }
    }

    .blog-article__header {
      margin-bottom: var(--space-10);
      padding-bottom: var(--space-8);
      border-bottom: 1px solid var(--color-divider);
    }
    .blog-article__tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: var(--color-tag-bg);
      color: var(--color-tag-text);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      margin-bottom: var(--space-4);
    }
    .blog-article__title {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: 0;
      line-height: 1.15;
      margin-bottom: var(--space-5);
    }
    .blog-article__meta {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: 13px;
      color: var(--color-text-faint);
      flex-wrap: wrap;
    }
    .blog-article__meta-dot {
      width: 3px; height: 3px;
      border-radius: 50%;
      background: var(--color-text-faint);
    }

    /* ── ARTICLE BODY TYPOGRAPHY ── */
    .blog-body { max-width: 720px; }
    .blog-body h2 {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: 0;
      margin: var(--space-12) 0 var(--space-4);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-divider);
    }
    .blog-body h3 {
      font-size: var(--text-base);
      font-weight: 600;
      color: var(--color-text);
      margin: var(--space-8) 0 var(--space-3);
    }
    .blog-body p {
      font-size: var(--text-base);
      line-height: 1.75;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-5);
    }
    .blog-body ul, .blog-body ol {
      padding-left: var(--space-6);
      margin-bottom: var(--space-5);
    }
    .blog-body li {
      font-size: var(--text-base);
      line-height: 1.7;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-2);
    }
    .blog-body strong { color: var(--color-text); font-weight: 600; }
    .blog-body blockquote {
      border-left: 3px solid var(--color-border);
      padding-left: var(--space-5);
      margin: var(--space-6) 0;
      color: var(--color-text-muted);
      font-style: italic;
    }
    .blog-body hr {
      border: none;
      border-top: 1px solid var(--color-divider);
      margin: var(--space-10) 0;
    }
    .blog-body a {
      color: var(--color-text);
      text-decoration: underline;
      text-decoration-color: var(--color-border);
      text-underline-offset: 3px;
      transition: text-decoration-color var(--transition-interactive);
    }
    .blog-body a:hover { text-decoration-color: var(--color-text); }

    /* Tables */
    .blog-table-wrap { overflow-x: auto; margin: var(--space-6) 0; }
    .blog-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }
    .blog-table th {
      text-align: left;
      font-weight: 600;
      color: var(--color-text);
      background: var(--color-surface-offset);
      padding: var(--space-3) var(--space-4);
      border-bottom: 2px solid var(--color-border);
    }
    .blog-table td {
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-divider);
      color: var(--color-text-secondary);
      vertical-align: top;
    }
    .blog-table tr:last-child td { border-bottom: none; }

    /* Code */
    .blog-code {
      background: var(--color-surface-offset);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-5);
      overflow-x: auto;
      margin: var(--space-5) 0;
      font-size: 14px;
      line-height: 1.6;
    }
    .blog-inline-code {
      background: var(--color-surface-offset);
      border: 1px solid var(--color-divider);
      border-radius: var(--radius-sm);
      padding: 1px 6px;
      font-size: 0.9em;
      color: var(--color-text);
    }

    /* TOC */
    .blog-toc {
      position: sticky;
      top: calc(var(--space-16) + var(--space-8));
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
    }
    .blog-toc__title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-accent);
      margin-bottom: var(--space-4);
    }
    .blog-toc__title::before {
      content: '';
      width: 16px;
      height: 1px;
      background: currentColor;
      opacity: 0.7;
    }
    .toc__list { list-style: none; padding: 0; }
    .toc__item { margin-bottom: var(--space-1); }
    .toc__item--h3 { padding-left: var(--space-3); }
    .toc__link {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      text-decoration: none;
      line-height: 1.5;
      display: block;
      padding: 2px 0;
      transition: color var(--transition-interactive);
    }
    .toc__link:hover { color: var(--color-text); }
    .toc__link.is-active { color: var(--color-accent); font-weight: 600; }

    /* CTA Block */
    .blog-cta {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
      margin-top: var(--space-12);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-6);
      flex-wrap: wrap;
    }
    .blog-cta__text h3 {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: 0;
      margin-bottom: var(--space-2);
    }
    .blog-cta__text p {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }
    .blog-cta__badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-accent);
      margin-bottom: var(--space-3);
    }
  </style>
</head>
<body>
<div class="article-progress" aria-hidden="true"></div>
  <nav class="nav">
    <div class="nav__inner">
      <a href="/" class="nav__logo">MosStack</a>
      <ul class="nav__links">
        <li><a href="/portfolio.html">精選案例</a></li>
        <li><a href="/services.html">服務項目</a></li>
        <li><a href="/blog.html" class="nav__link--active">Blog</a></li>
        <li><a href="/#studio">關於工作室</a></li>
        <li><a href="/contact.html">聯絡我們</a></li>
      </ul>
      <div class="nav__right">
        <button class="theme-toggle" type="button" data-theme-toggle aria-label="切換深色模式">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <a href="/contact.html" class="btn btn--primary nav__cta">免費諮詢</a>
        <button class="hamburger" id="hamburger" type="button" aria-label="開啟選單" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </nav>
  <div class="mobile-nav" id="mobileNav" aria-hidden="true">
    <ul>
      <li><a href="/portfolio.html">精選案例</a></li>
      <li><a href="/services.html">服務項目</a></li>
      <li><a href="/blog.html">Blog</a></li>
      <li><a href="/#studio">關於工作室</a></li>
      <li><a href="/contact.html">聯絡我們</a></li>
      <li><a href="/contact.html" class="btn btn--primary" style="display:inline-flex;margin-top:var(--space-2)">免費諮詢</a></li>
    </ul>
  </div>

  <main>
    <div class="container">
      <nav class="blog-breadcrumb" aria-label="麵包屑">
        <a href="/">首頁</a>
        <span class="blog-breadcrumb__sep">›</span>
        <a href="/blog.html">Blog</a>
        <span class="blog-breadcrumb__sep">›</span>
        <span>${title}</span>
      </nav>
    </div>

    <article class="blog-article">
      <div class="container">
        <header class="blog-article__header">
          <span class="blog-article__tag">${category || 'Blog'}</span>
          <h1 class="blog-article__title">${title}</h1>
          <div class="blog-article__meta">
            <span>MosStack Studio</span>
            <span class="blog-article__meta-dot"></span>
            <span>${dateFormatted}</span>
            <span class="blog-article__meta-dot"></span>
            <span>${readTime || 8} min read</span>
          </div>
        </header>

        <div class="blog-article__layout">
          <div class="blog-body">
            ${bodyHtml}

            <!-- CTA -->
            <div class="blog-cta">
              <div class="blog-cta__text">
                <span class="blog-cta__badge">目前接受新專案</span>
                <h3>需要類似的系統或網站？</h3>
                <p>告訴我們你在建什麼，我們提供免費 30 分鐘需求諮詢，沒有模糊報價。</p>
              </div>
              <a href="/contact.html" class="btn btn--primary">免費 30 分鐘諮詢 →</a>
            </div>
          </div>

          <aside>
            ${toc}
          </aside>
        </div>
      </div>
    </article>
  </main>

  <footer>
    <div class="footer__inner">
      <div class="footer__brand">
        <p class="footer__brand-name">MosStack Studio</p>
        <p class="footer__tagline">位於台中的全端接案工作室，專注於電商、品牌官網、預約系統與 B2B 後台開發。</p>
      </div>
      <div class="footer__col">
        <p class="footer__col-title">瀏覽</p>
        <nav class="footer__list">
          <a href="/portfolio.html">精選案例</a>
          <a href="/services.html">服務項目</a>
          <a href="/blog.html">Blog</a>
          <a href="/contact.html">聯絡我們</a>
        </nav>
      </div>
      <div class="footer__col">
        <p class="footer__col-title">聯絡</p>
        <nav class="footer__list">
          <a href="https://wa.me/886980054850" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href="https://line.me/ti/p/hz6EePU4Ha" target="_blank" rel="noopener noreferrer">LINE</a>
          <a href="https://github.com/BasilWu" target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
      </div>
    </div>
    <div class="footer__bottom">
      <div class="footer__bottom-inner">
        <p>© 2026 MosStack Studio. 版權所有。</p>
        <div class="footer__legal">
          <span>位於台中，服務來自各地的客戶。</span>
          <a href="/privacy.html">隱私權政策</a>
        </div>
      </div>
    </div>
  </footer>

  <div class="float-contact" aria-label="快速聯絡">
    <a href="https://wa.me/886980054850?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E8%AB%AE%E8%A9%A2%E7%B6%B2%E7%AB%99%E9%96%8B%E7%99%BC%E5%B0%88%E6%A1%88" target="_blank" rel="noopener noreferrer" class="float-btn float-btn--whatsapp" aria-label="WhatsApp">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    </a>
    <a href="https://line.me/ti/p/hz6EePU4Ha" target="_blank" rel="noopener noreferrer" class="float-btn float-btn--line" aria-label="Line">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
    </a>
  </div>

  <script>
    // Theme toggle
    (function(){
      const btn = document.querySelector('[data-theme-toggle]');
      if (!btn) return;
      btn.addEventListener('click', function(){
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
      });
    })();

    // Hamburger
    (function(){
      const btn = document.getElementById('hamburger');
      const nav = document.getElementById('mobileNav');
      if (!btn || !nav) return;
      btn.addEventListener('click', function(){
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        nav.setAttribute('aria-hidden', String(open));
        nav.classList.toggle('is-open', !open);
      });
    })();

    // Active TOC link on scroll
    (function(){
      const links = document.querySelectorAll('.toc__link');
      if (!links.length) return;
      const headings = Array.from(document.querySelectorAll('.blog-body h2, .blog-body h3'));
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            links.forEach(l => l.classList.remove('is-active'));
            const active = document.querySelector('.toc__link[href="#' + e.target.id + '"]');
            if (active) active.classList.add('is-active');
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      headings.forEach(h => observer.observe(h));
    })();
  </script>
</body>
</html>`;
}

// ── 文章定義（從 docs/ 草稿轉換）──
const ARTICLES = [
  {
    title: '預約系統開發要多少錢？2026 台灣行情完整解析',
    slug: 'appointment-system-cost-taiwan-2026',
    date: '2026-06-29',
    category: '費用指南',
    description: '預約系統開發要多少錢？2026 年台灣行情從 SaaS 月租到客製開發一次整理。附實際報價範圍、功能比較與選購建議，幫服務業老闆找到最划算的方案。',
    readTime: 8,
    mdFile: null, // null = use inline content below
    inlineContent: null // will be set from parsed articles
  },
  {
    title: '網頁設計費用怎麼算？台中網頁設計報價懶人包（2026）',
    slug: 'web-design-cost-taichung-2026',
    date: '2026-06-29',
    category: '費用指南',
    description: '台中網頁設計費用一次看懂！2026 年一頁式、形象站、電商、客製系統完整報價範圍，加上選廠商避坑指南，讓你不再被模糊報價搞混。',
    readTime: 7,
  },
  {
    title: '自架電商 vs 蝦皮開店：品牌電商該怎麼選？',
    slug: 'self-hosted-ecommerce-vs-shopee-taiwan',
    date: '2026-06-29',
    category: '電商',
    description: '蝦皮開店抽成吃掉你的利潤？2026 年自架電商 vs 蝦皮完整比較，從費用、品牌控制、顧客資料到長期經營，幫品牌電商老闆做出最划算的選擇。',
    readTime: 8,
  },
  {
    title: '為什麼你的網站該用 Next.js 而不是 WordPress？',
    slug: 'nextjs-vs-wordpress-website-development',
    date: '2026-06-29',
    category: '技術',
    description: 'WordPress 慢、外掛地雷、維護成本高？2026 年用 Next.js 開發網站的 6 大優勢完整解析，附實際效能數據與適用場景比較。',
    readTime: 9,
  },
  {
    title: 'LINE Bot 串接與客服自動化：中小企業導入指南（2026）',
    slug: 'line-bot-automation-sme-guide-2026',
    date: '2026-06-29',
    category: 'LINE',
    description: 'LINE 訊息接不完？2026 年中小企業 LINE Bot 導入完整指南，涵蓋費用、功能規劃、常見使用情境與選廠商建議，讓你的 LINE 客服從人工變自動。',
    readTime: 10,
  },
  {
    title: '形象官網要花多少錢？2026 台中品牌官網製作費用行情',
    slug: 'brand-website-cost-taiwan-2026',
    date: '2026-07-15',
    category: '費用指南',
    description: '形象官網要花多少錢？2026 年台中品牌官網行情一次整理：套版、半客製、全客製報價區間、台中與台北價差、報價單避坑重點，讓你在詢價前心裡先有底。',
    readTime: 7,
  }
];

// ── 主程式：從草稿 MD 生成文章 HTML ──
function buildFromSourceMd(sourceMdPath, outputDir) {
  const raw = fs.readFileSync(sourceMdPath, 'utf8');

  // 分割每篇文章（以 # 文章 開頭）
  const articleChunks = raw.split(/\n---\n\n---\n\n# /).map((chunk, i) => i === 0 ? chunk : '# ' + chunk);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  ARTICLES.forEach((meta, idx) => {
    // 找到對應的 chunk（chunk 0 是文件前言，文章從 chunk 1 開始）
    let chunk = articleChunks[idx + 1] || '';

    // 移除 front matter 部分（目標關鍵字、建議 Meta 等說明）
    // 保留從第一個 ## 開始的正文
    const bodyStart = chunk.indexOf('\n## ');
    const bodyMd = bodyStart >= 0 ? chunk.slice(bodyStart) : chunk;

    // 移除 CTA 連結行（會用統一的 HTML CTA 取代）
    const cleanMd = bodyMd
      .replace(/\*\*\[立即填表.+?\]\(.+?\)\*\*/g, '')
      .replace(/\*\*\[想脫離.+?\]\(.+?\)\*\*/g, '')
      .replace(/\*\*\[立即預約.+?\]\(.+?\)\*\*/g, '')
      .replace(/\*\*\[如果你正在.+?\]\(.+?\)\*\*/g, '');

    const { html } = parseMarkdown(cleanMd);
    const toc = generateTOC(html);
    const plain = cleanMd.replace(/<[^>]+>/g, '');
    const cjkCount = (plain.match(/[\u4e00-\u9fff]/g) || []).length;
    const latinCount = (plain.match(/[A-Za-z0-9]+/g) || []).length;
    const wordCount = cjkCount + latinCount;

    const articleHtml = generateArticleHTML({
      ...meta,
      bodyHtml: html,
      toc,
      wordCount
    });

    const outPath = path.join(outputDir, `${meta.slug}.html`);
    fs.writeFileSync(outPath, articleHtml, 'utf8');
    console.log(`✅ Generated: ${outPath}`);
  });

  console.log(`\n🎉 Built ${ARTICLES.length} articles to ${outputDir}/`);
}

// ── Entry point ──
const sourceMd = path.resolve(__dirname, 'docs/mosstack_seo_articles.md');
const outputDir = path.resolve(__dirname, 'blog');

if (!fs.existsSync(sourceMd)) {
  console.error('❌ Source file not found:', sourceMd);
  process.exit(1);
}

buildFromSourceMd(sourceMd, outputDir);
