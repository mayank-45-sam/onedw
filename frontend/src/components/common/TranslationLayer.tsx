import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { globalMessages } from '@/i18n/globalMessages';

const IGNORE_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE', 'NOSCRIPT', 'SVG']);
const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'];

interface NodeState {
  origText?: string;
  attrOrig?: Record<string, string>;
}

/**
 * Automatically translates the rendered DOM whenever the app language is not
 * English. It walks text nodes and translatable attributes and swaps any text
 * that exactly matches a phrase in `globalMessages`. No page code changes are
 * needed — new content rendered by React is picked up via a MutationObserver.
 */
export function TranslationLayer() {
  const { lang } = useLanguage();
  const tracked = useRef<WeakMap<Text | Element, NodeState>>(new WeakMap());

  useEffect(() => {
    if (lang === 'en') {
      // Restore original English text captured from the DOM.
      const wm = tracked.current;
      const root = document.body;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      const seen = new Set<Node>();
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent) continue;
        if (seen.has(parent)) continue;
        seen.add(parent);
        const state = wm.get(parent);
        if (state?.attrOrig) {
          for (const [attr, orig] of Object.entries(state.attrOrig)) {
            parent.setAttribute(attr, orig);
          }
          wm.delete(parent);
        }
      }
      const twalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let tnode: Node | null;
      while ((tnode = twalker.nextNode())) {
        const state = wm.get(tnode as Text);
        if (state?.origText !== undefined) {
          (tnode as Text).data = state.origText;
          wm.delete(tnode as Text);
        }
      }
      return;
    }

    const dict = globalMessages[lang];
    if (!dict) return;

    const translateElement = (el: Element) => {
      if (IGNORE_TAGS.has(el.tagName)) return;
      const state: NodeState = {};
      let stateEntry = tracked.current.get(el);
      if (!stateEntry) stateEntry = state;
      for (const attr of TRANSLATABLE_ATTRS) {
        const val = el.getAttribute(attr);
        if (!val) continue;
        const trimmed = val.trim();
        if (!dict[trimmed]) continue;
        if (!stateEntry.attrOrig) stateEntry.attrOrig = {};
        if (stateEntry.attrOrig[attr] === undefined) stateEntry.attrOrig[attr] = val;
        el.setAttribute(attr, dict[trimmed]);
      }
      if (stateEntry.attrOrig) tracked.current.set(el, stateEntry);
    };

    const translateTree = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let el: Element | null;
      while ((el = walker.nextNode() as Element | null)) {
        translateElement(el);
      }
      const twalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = twalker.nextNode())) {
        const parent = node.parentElement;
        if (!parent || IGNORE_TAGS.has(parent.tagName)) continue;
        const text = node.textContent?.trim() ?? '';
        if (!dict[text]) continue;
        const stateEntry = tracked.current.get(node as Text) ?? {};
        if (stateEntry.origText === undefined) stateEntry.origText = node.textContent ?? '';
        (node as Text).data = dict[text];
        tracked.current.set(node as Text, stateEntry);
      }
    };

    translateTree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const added of Array.from(m.addedNodes)) {
            if (added.nodeType === Node.ELEMENT_NODE) translateTree(added);
            else if (added.nodeType === Node.TEXT_NODE && added.parentElement && !IGNORE_TAGS.has(added.parentElement.tagName)) {
              const text = added.textContent?.trim() ?? '';
              if (dict[text]) (added as Text).data = dict[text];
            }
          }
        } else if (m.type === 'attributes' && m.target instanceof Element) {
          translateElement(m.target);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: TRANSLATABLE_ATTRS });
    return () => observer.disconnect();
  }, [lang]);

  return null;
}
