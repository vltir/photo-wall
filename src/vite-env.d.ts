declare module '*.svelte' {
  import type { Component } from 'svelte';
  const component: Component<any, any, any>;
  export default component;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}