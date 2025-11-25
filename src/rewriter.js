const rewriteUrl = (url, baseUrl) => {
  try {
    const absoluteUrl = new URL(url, baseUrl).href;
    return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
  } catch {
    return url;
  }
};

const rewriteHtml = (html, baseUrl) => {
  let rewritten = html;

  rewritten = rewritten.replace(
    /(<a\s+[^>]*href=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(<img\s+[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(<img\s+[^>]*srcset=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => {
      const rewrittenSrcset = p2.split(',').map(part => {
        const [url, descriptor] = part.trim().split(/\s+/);
        const rewrittenUrl = rewriteUrl(url, baseUrl);
        return descriptor ? `${rewrittenUrl} ${descriptor}` : rewrittenUrl;
      }).join(', ');
      return `${p1}${rewrittenSrcset}${p3}`;
    }
  );

  rewritten = rewritten.replace(
    /(<link\s+[^>]*href=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(<script\s+[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(<iframe\s+[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(<form\s+[^>]*action=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(<video\s+[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(<audio\s+[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(<source\s+[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(<source\s+[^>]*srcset=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(<picture\s+[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(<meta\s+[^>]*content=["'])(\d+;\s*url=)([^"']+)(["'][^>]*>)/gi,
    (match, p1, p2, p3, p4) => `${p1}${p2}${rewriteUrl(p3, baseUrl)}${p4}`
  );

  rewritten = rewritten.replace(
    /(\sdata-(?:src|background|lazy|original|url|image|poster|thumbnail|href)[^=]*=["'])([^"']+)(["'])/gi,
    (match, p1, p2, p3) => `${p1}${rewriteUrl(p2, baseUrl)}${p3}`
  );

  rewritten = rewritten.replace(
    /(url\(["']?)([^"')]+)(["']?\))/gi,
    (match, p1, p2, p3) => {
      if (p2.startsWith('data:')) return match;
      return `${p1}${rewriteUrl(p2, baseUrl)}${p3}`;
    }
  );

  rewritten = rewritten.replace(
    /(<base\s+[^>]*href=["'])([^"']+)(["'][^>]*>)/gi,
    ''
  );

  return rewritten;
};

const rewriteCss = (css, baseUrl) => {
  return css.replace(
    /url\(["']?([^"')]+)["']?\)/gi,
    (match, url) => {
      if (url.startsWith('data:')) return match;
      return `url(${rewriteUrl(url, baseUrl)})`;
    }
  );
};

module.exports = {
  rewriteUrl,
  rewriteHtml,
  rewriteCss
};
