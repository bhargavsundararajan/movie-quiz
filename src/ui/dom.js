// Minimal DOM helpers (keeps UI modules declarative, no framework).

/**
 * Create an element. props: {class, text, html, onClick, attrs:{}, ...domProps}
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  const { class: cls, className, text, html, onClick, attrs, ...rest } = props;
  if (cls || className) node.className = cls || className;
  if (text != null) node.textContent = text;
  if (html != null) node.innerHTML = html;
  if (onClick) node.addEventListener('click', onClick);
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const [k, v] of Object.entries(rest)) node[k] = v;
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function mount(root, ...nodes) {
  clear(root);
  nodes.forEach((n) => n && root.append(n));
  return root;
}
